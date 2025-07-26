import {
	MarkdownPostProcessorContext,
	Notice
} from 'obsidian';

import {
	BufferCalcBlockContent,
	BufferData,
	StockData,
	DilutionData,
	SerialDilutionData,
	SerialDilutionResult,
	CalculationResult,
	BufferCalcSettings,
	VolumeUnit,
	ConcentrationUnit,
	ComponentInput,
	StepDisplayFormat,
	ConcentrationInputMode
} from '../types';

import { CalculationEngine } from '../calculations/engine';
import { ReagentDatabase } from '../data/reagents';
import { ConversionUtils } from '../utils/conversions';
import { MobileOptimization } from '../utils/mobile-optimization';

export class BufferCalcUI {
	private container: HTMLElement;
	private blockContent: BufferCalcBlockContent;
	private calculationEngine: CalculationEngine;
	private reagentDatabase: ReagentDatabase;
	private settings: BufferCalcSettings;
	private context: MarkdownPostProcessorContext;
	private plugin?: any; // BufferCalcPlugin instance
	private lastResult: CalculationResult | null = null;
	private mobileOptimization: MobileOptimization;

	constructor(
		container: HTMLElement,
		blockContent: BufferCalcBlockContent,
		calculationEngine: CalculationEngine,
		reagentDatabase: ReagentDatabase,
		settings: BufferCalcSettings,
		context: MarkdownPostProcessorContext,
		plugin?: any
	) {
		this.container = container;
		this.blockContent = blockContent;
		this.calculationEngine = calculationEngine;
		this.reagentDatabase = reagentDatabase;
		this.settings = settings;
		this.context = context;
		this.plugin = plugin;
		this.mobileOptimization = MobileOptimization.getInstance();
	}

	async render(): Promise<void> {
		try {
			this.container.empty();
			this.container.addClass('buffer-calc-ui');
			
			// モバイル最適化の適用
			this.applyMobileOptimizations();

			console.log(`Rendering UI for type: ${this.blockContent.type}`, this.blockContent);

			switch (this.blockContent.type) {
				case 'buffer':
					await this.renderBufferCalculator();
					break;
				case 'stock':
					console.log('Rendering stock calculator...');
					await this.renderStockCalculator();
					break;
				case 'dilution':
					console.log('Rendering dilution calculator...');
					await this.renderDilutionCalculator();
					break;
				case 'serial-dilution':
					console.log('Rendering serial dilution calculator...');
					await this.renderSerialDilutionCalculator();
					break;
				default:
					this.container.createEl('div', {
						text: `Unknown calculation type: ${this.blockContent.type}`,
						cls: 'buffer-calc-error'
					});
			}
			
			console.log(`UI rendering completed for type: ${this.blockContent.type}`);
		} catch (error) {
			console.error(`UI rendering error for type ${this.blockContent.type}:`, error);
			this.container.createEl('div', {
				text: `エラー: ${error.message}`,
				cls: 'buffer-calc-error'
			});
		}
	}

	private async renderBufferCalculator(): Promise<void> {
		const data = this.blockContent.data as BufferData;
		
		// Header
		const header = this.container.createEl('div', { cls: 'buffer-calc-header' });
		this.createEditableTitle(header, data);

		// Controls container
		const controls = this.container.createEl('div', { cls: 'buffer-calc-controls' });

		// Total volume input
		const volumeContainer = controls.createEl('div', { cls: 'buffer-calc-volume-input' });
		volumeContainer.createEl('label', { text: '総体積:' });
		
		const volumeInput = volumeContainer.createEl('input', {
			type: 'number',
			value: data.totalVolume.toString(),
			cls: 'buffer-calc-input-number'
		});
		
		const volumeUnitSelect = volumeContainer.createEl('select', { cls: 'buffer-calc-unit-select' });
		this.populateVolumeUnits(volumeUnitSelect, data.volumeUnit || this.settings.defaultVolumeUnit);

		volumeInput.addEventListener('input', () => this.updateCalculation());
		volumeUnitSelect.addEventListener('change', () => this.updateCalculation());

		// Components section
		const componentsContainer = this.container.createEl('div', { cls: 'buffer-calc-components' });
		componentsContainer.createEl('h4', { text: '成分' });

		const componentsList = componentsContainer.createEl('div', { cls: 'buffer-calc-components-list' });
		
		// Render existing components (ensure components is an array)
		const components = Array.isArray(data.components) ? data.components : [];
		components.forEach((component, index) => {
			this.renderComponent(componentsList, component, index);
		});

		// Add component button
		const addButton = componentsContainer.createEl('button', {
			text: '+ 成分を追加',
			cls: 'buffer-calc-add-button mod-cta'
		});
		
		addButton.addEventListener('click', () => {
			const newComponent: ComponentInput = {
				name: '',
				stockConc: 100,
				stockUnit: this.settings.defaultConcentrationUnit,
				finalConc: 10,
				finalUnit: this.settings.defaultConcentrationUnit
			};
			
			// Ensure components array exists
			if (!Array.isArray(data.components)) {
				data.components = [];
			}
			data.components.push(newComponent);
			this.renderComponent(componentsList, newComponent, data.components.length - 1);
			this.updateCalculation();
		});

		// Results container
		const resultsContainer = this.container.createEl('div', { cls: 'buffer-calc-results' });

		// Initial calculation
		this.updateCalculation();
	}

	private renderComponent(container: HTMLElement, component: ComponentInput, index: number): void {
		const componentEl = container.createEl('div', { cls: 'buffer-calc-component' });
		
		// Component header with delete button
		const componentHeader = componentEl.createEl('div', { cls: 'buffer-calc-component-header' });
		componentHeader.createEl('span', { text: `成分 ${index + 1}` });
		
		const deleteButton = componentHeader.createEl('button', {
			text: '×',
			cls: 'buffer-calc-delete-button'
		});
		
		deleteButton.addEventListener('click', () => {
			const data = this.blockContent.data as BufferData;
			if (Array.isArray(data.components)) {
				data.components.splice(index, 1);
			}
			this.render(); // Re-render entire component list
		});

		// Reagent name input with suggestions
		const nameContainer = componentEl.createEl('div', { cls: 'buffer-calc-input-group' });
		nameContainer.createEl('label', { text: '試薬:' });
		
		const nameInput = nameContainer.createEl('input', {
			type: 'text',
			value: component.name,
			placeholder: '試薬名を入力...',
			cls: 'buffer-calc-reagent-input'
		});

		const suggestionsContainer = nameContainer.createEl('div', { 
			cls: 'buffer-calc-suggestions'
		});
		suggestionsContainer.style.display = 'none';

		// Setup autocomplete
		this.setupReagentAutocomplete(nameInput, suggestionsContainer, (reagent) => {
			component.name = reagent.name;
			nameInput.value = reagent.name;
			this.updateCalculation();
		});

		nameInput.addEventListener('input', () => {
			component.name = nameInput.value;
			this.updateCalculation();
		});

		// Stock concentration
		const stockContainer = componentEl.createEl('div', { cls: 'buffer-calc-input-group' });
		stockContainer.createEl('label', { text: 'ストック濃度:' });
		
		const stockInput = stockContainer.createEl('input', {
			type: 'number',
			value: component.stockConc.toString(),
			cls: 'buffer-calc-input-number'
		});
		
		const stockUnitSelect = stockContainer.createEl('select', { cls: 'buffer-calc-unit-select' });
		this.populateConcentrationUnits(stockUnitSelect, component.stockUnit);

		stockInput.addEventListener('input', () => {
			component.stockConc = parseFloat(stockInput.value) || 0;
			this.updateCalculation();
		});
		
		stockUnitSelect.addEventListener('change', () => {
			component.stockUnit = stockUnitSelect.value as ConcentrationUnit;
			this.updateCalculation();
		});

		// Final concentration
		const finalContainer = componentEl.createEl('div', { cls: 'buffer-calc-input-group' });
		finalContainer.createEl('label', { text: '最終濃度:' });
		
		const finalInput = finalContainer.createEl('input', {
			type: 'number',
			value: component.finalConc.toString(),
			cls: 'buffer-calc-input-number'
		});
		
		const finalUnitSelect = finalContainer.createEl('select', { cls: 'buffer-calc-unit-select' });
		this.populateConcentrationUnits(finalUnitSelect, component.finalUnit);

		finalInput.addEventListener('input', () => {
			component.finalConc = parseFloat(finalInput.value) || 0;
			this.updateCalculation();
		});
		
		finalUnitSelect.addEventListener('change', () => {
			component.finalUnit = finalUnitSelect.value as ConcentrationUnit;
			this.updateCalculation();
		});

		// Lot number (optional)
		const lotContainer = componentEl.createEl('div', { cls: 'buffer-calc-input-group' });
		lotContainer.createEl('label', { text: 'ロット番号（任意）:' });
		
		const lotInput = lotContainer.createEl('input', {
			type: 'text',
			value: component.lotNumber || '',
			placeholder: '例: ABC123',
			cls: 'buffer-calc-lot-input'
		});

		lotInput.addEventListener('input', () => {
			component.lotNumber = lotInput.value || undefined;
		});
	}

	private setupReagentAutocomplete(
		input: HTMLInputElement,
		container: HTMLElement,
		onSelect: (reagent: any) => void
	): void {
		let debounceTimer: NodeJS.Timeout;

		input.addEventListener('input', () => {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				const query = input.value.trim();
				
				if (query.length < 2) {
					container.style.display = 'none';
					return;
				}

				const suggestions = this.reagentDatabase.searchReagents(query);
				
				if (suggestions.length === 0) {
					container.style.display = 'none';
					return;
				}

				container.empty();
				container.style.display = 'block';

				suggestions.slice(0, 10).forEach(reagent => {
					const suggestionEl = container.createEl('div', { 
						cls: 'buffer-calc-suggestion-item',
						text: `${reagent.name} (MW: ${reagent.molecularWeight})`
					});

					suggestionEl.addEventListener('click', () => {
						onSelect(reagent);
						container.style.display = 'none';
					});
				});
			}, 300);
		});

		// Hide suggestions when clicking outside
		document.addEventListener('click', (e) => {
			if (!container.contains(e.target as Node) && !input.contains(e.target as Node)) {
				container.style.display = 'none';
			}
		});
	}

	private populateVolumeUnits(select: HTMLSelectElement, selectedUnit: VolumeUnit): void {
		const units = [
			{ value: VolumeUnit.LITER, label: 'L' },
			{ value: VolumeUnit.MILLILITER, label: 'mL' },
			{ value: VolumeUnit.MICROLITER, label: 'µL' },
			{ value: VolumeUnit.NANOLITER, label: 'nL' }
		];

		units.forEach(unit => {
			const option = select.createEl('option', {
				value: unit.value,
				text: unit.label
			});
			if (unit.value === selectedUnit) {
				option.selected = true;
			}
		});
	}

	private populateConcentrationUnits(select: HTMLSelectElement, selectedUnit: ConcentrationUnit): void {
		const units = [
			{ value: ConcentrationUnit.MOLAR, label: 'M' },
			{ value: ConcentrationUnit.MILLIMOLAR, label: 'mM' },
			{ value: ConcentrationUnit.MICROMOLAR, label: 'µM' },
			{ value: ConcentrationUnit.NANOMOLAR, label: 'nM' }
		];

		units.forEach(unit => {
			const option = select.createEl('option', {
				value: unit.value,
				text: unit.label
			});
			if (unit.value === selectedUnit) {
				option.selected = true;
			}
		});
	}

	private async updateCalculation(): Promise<void> {
		const data = this.blockContent.data as BufferData;
		
		// Get current values from inputs
		const volumeInput = this.container.querySelector('.buffer-calc-input-number') as HTMLInputElement;
		const volumeUnitSelect = this.container.querySelector('.buffer-calc-unit-select') as HTMLSelectElement;
		
		if (volumeInput && volumeUnitSelect) {
			data.totalVolume = parseFloat(volumeInput.value) || 0;
			data.volumeUnit = volumeUnitSelect.value as VolumeUnit;
		}

		try {
			const result = this.calculationEngine.calculateBuffer(data);
			this.lastResult = result;
			this.renderResults(result);
			
			// 履歴に追加（エラーがない場合のみ）
			if (result.errors.length === 0 && this.plugin) {
				this.plugin.addToHistory('buffer', data.name || 'バッファー計算', data, result);
			}
		} catch (error) {
			console.error('Calculation error:', error);
			this.renderError(error.message);
		}
	}

	private renderResults(result: CalculationResult): void {
		let resultsContainer = this.container.querySelector('.buffer-calc-results') as HTMLElement;
		
		if (!resultsContainer) {
			resultsContainer = this.container.createEl('div', { cls: 'buffer-calc-results' });
		}
		
		resultsContainer.empty();

		// Show errors first
		if (result.errors.length > 0) {
			const errorsContainer = resultsContainer.createEl('div', { cls: 'buffer-calc-errors' });
			errorsContainer.createEl('h4', { text: 'エラー', cls: 'buffer-calc-error-title' });
			
			result.errors.forEach(error => {
				errorsContainer.createEl('div', {
					text: error.message,
					cls: 'buffer-calc-error-item'
				});
			});
			return;
		}

		// Results header
		resultsContainer.createEl('h4', { text: '調製手順' });

		// Component results
		if (result.components.length > 0) {
			const instructionsList = resultsContainer.createEl('ol', { cls: 'buffer-calc-instructions' });

			result.components.forEach((component, index) => {
				const instruction = instructionsList.createEl('li', { cls: 'buffer-calc-instruction-item' });
				
				const reagentInfo = this.reagentDatabase.getReagentByName(component.reagent.name);
				const displayVolume = component.optimizedVolumeDisplay;
				
				instruction.createEl('strong', { text: component.reagent.name });
				instruction.createEl('span', { text: `: ${displayVolume} を添加` });
				
				if (component.percentOfTotal) {
					instruction.createEl('span', { 
						text: ` (${component.percentOfTotal.toFixed(1)}%)`,
						cls: 'buffer-calc-percentage'
					});
				}

				// Add external links if reagent found in database
				if (reagentInfo) {
					const linksContainer = instruction.createEl('div', { cls: 'buffer-calc-links' });
					const links = this.reagentDatabase.getExternalLinks(reagentInfo);
					
					links.forEach(link => {
						const linkEl = linksContainer.createEl('a', {
							text: link.name,
							href: link.url,
							cls: 'buffer-calc-external-link'
						});
						linkEl.setAttribute('target', '_blank');
						linkEl.setAttribute('rel', 'noopener');
					});
				}
			});

			// Solvent instruction
			console.log('Solvent display debug:');
			console.log('- result.solventVolume:', result.solventVolume);
			console.log('- Condition (> 0):', result.solventVolume > 0);
			
			if (result.solventVolume > 0) {
				console.log('- Adding solvent instruction to UI');
				const solventInstruction = instructionsList.createEl('li', { cls: 'buffer-calc-instruction-item' });
				const data = this.blockContent.data as BufferData;
				const solventDisplay = ConversionUtils.optimizeVolumeDisplay(result.solventVolume, data.volumeUnit || this.settings.defaultVolumeUnit);
				
				console.log('- Solvent display:', solventDisplay);
				solventInstruction.createEl('span', { text: `水またはバッファーを加えて総体積を ${solventDisplay.value.toFixed(this.settings.decimalPlaces)} ${solventDisplay.unit} にする` });
			} else {
				console.log('- Solvent instruction NOT added (volume <= 0)');
			}
		}

		// Warnings
		if (result.warnings.length > 0) {
			const warningsContainer = resultsContainer.createEl('div', { cls: 'buffer-calc-warnings' });
			warningsContainer.createEl('h5', { text: '警告' });
			
			result.warnings.forEach(warning => {
				const warningEl = warningsContainer.createEl('div', { 
					text: warning.message,
					cls: `buffer-calc-warning buffer-calc-warning-${warning.severity}`
				});
			});
		}

		// Show calculation steps if enabled
		if (this.settings.showCalculationSteps && result.calculationSteps && result.calculationSteps.length > 0) {
			const stepsContainer = resultsContainer.createEl('div', { cls: 'buffer-calc-steps' });
			stepsContainer.createEl('h5', { text: '計算ステップ' });
			
			result.calculationSteps.forEach(step => {
				const stepEl = stepsContainer.createEl('div', { cls: 'buffer-calc-step' });
				stepEl.createEl('strong', { text: `${step.step}. ${step.description}` });
				
				if (step.formula) {
					stepEl.createEl('div', { 
						text: step.formula,
						cls: 'buffer-calc-formula'
					});
				}
				
				stepEl.createEl('div', { 
					text: `結果: ${step.result.toFixed(this.settings.decimalPlaces)} ${step.unit}`,
					cls: 'buffer-calc-step-result'
				});
			});
		}

		// Export button
		const exportButton = resultsContainer.createEl('button', {
			text: 'レシピをエクスポート',
			cls: 'buffer-calc-export-button'
		});
		
		exportButton.addEventListener('click', () => {
			this.exportRecipe(result);
		});
	}

	private renderError(message: string): void {
		let resultsContainer = this.container.querySelector('.buffer-calc-results') as HTMLElement;
		
		if (!resultsContainer) {
			resultsContainer = this.container.createEl('div', { cls: 'buffer-calc-results' });
		}
		
		resultsContainer.empty();
		resultsContainer.createEl('div', {
			text: `Error: ${message}`,
			cls: 'buffer-calc-error'
		});
	}

	private async renderStockCalculator(): Promise<void> {
		try {
			const data = this.blockContent.data as StockData;
			console.log('Stock calculator - Starting render with data:', data);
		
		// Header
		const header = this.container.createEl('div', { cls: 'buffer-calc-header' });
		this.createEditableStockTitle(header, data);

		// Controls container
		const controls = this.container.createEl('div', { cls: 'buffer-calc-controls' });

		// Reagent name input
		const reagentContainer = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		reagentContainer.createEl('label', { text: '試薬名:' });
		
		const reagentInput = reagentContainer.createEl('input', {
			type: 'text',
			value: data.reagentName || '',
			placeholder: '試薬名を入力...',
			cls: 'buffer-calc-reagent-input'
		});

		const suggestionsContainer = reagentContainer.createEl('div', { 
			cls: 'buffer-calc-suggestions'
		});
		suggestionsContainer.style.display = 'none';

		reagentInput.addEventListener('input', () => {
			data.reagentName = reagentInput.value;
			this.updateStockCalculation();
		});

		// Molecular weight input
		const mwContainer = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		mwContainer.createEl('label', { text: '分子量 (g/mol):' });
		
		const mwInput = mwContainer.createEl('input', {
			type: 'number',
			value: data.molecularWeight?.toString() || '',
			placeholder: '例: 58.44',
			cls: 'buffer-calc-input-number'
		});

		mwInput.addEventListener('input', () => {
			data.molecularWeight = parseFloat(mwInput.value) || undefined;
			this.updateStockCalculation();
		});

		// Setup reagent autocomplete (after mwInput is defined)
		this.setupReagentAutocomplete(reagentInput, suggestionsContainer, (reagent) => {
			data.reagentName = reagent.name;
			reagentInput.value = reagent.name;
			if (reagent.molecularWeight) {
				data.molecularWeight = reagent.molecularWeight;
				mwInput.value = reagent.molecularWeight.toString();
			}
			this.updateStockCalculation();
		});

		// Target concentration
		const concContainer = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		concContainer.createEl('label', { text: '目標濃度:' });
		
		const concInput = concContainer.createEl('input', {
			type: 'number',
			value: data.targetConcentration.toString(),
			cls: 'buffer-calc-input-number'
		});

		const concUnitSelect = concContainer.createEl('select', { cls: 'buffer-calc-unit-select' });
		this.populateConcentrationUnits(concUnitSelect, data.concentrationUnit);

		concInput.addEventListener('input', () => {
			data.targetConcentration = parseFloat(concInput.value) || 0;
			this.updateStockCalculation();
		});

		concUnitSelect.addEventListener('change', () => {
			data.concentrationUnit = concUnitSelect.value as ConcentrationUnit;
			this.updateStockCalculation();
		});

		// Volume input
		const volumeContainer = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		volumeContainer.createEl('label', { text: '体積:' });
		
		const volumeInput = volumeContainer.createEl('input', {
			type: 'number',
			value: data.volume.toString(),
			cls: 'buffer-calc-input-number'
		});

		const volumeUnitSelect = volumeContainer.createEl('select', { cls: 'buffer-calc-unit-select' });
		this.populateVolumeUnits(volumeUnitSelect, data.volumeUnit);

		volumeInput.addEventListener('input', () => {
			data.volume = parseFloat(volumeInput.value) || 0;
			this.updateStockCalculation();
		});

		volumeUnitSelect.addEventListener('change', () => {
			data.volumeUnit = volumeUnitSelect.value as VolumeUnit;
			this.updateStockCalculation();
		});

		// Purity input (optional)
		const purityContainer = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		purityContainer.createEl('label', { text: '純度 (%, 任意):' });
		
		const purityInput = purityContainer.createEl('input', {
			type: 'number',
			value: data.purity?.toString() || '100',
			placeholder: '100',
			cls: 'buffer-calc-input-number'
		});
		purityInput.setAttribute('min', '0');
		purityInput.setAttribute('max', '100');

		purityInput.addEventListener('input', () => {
			const purity = parseFloat(purityInput.value);
			data.purity = (purity > 0 && purity <= 100) ? purity : undefined;
			this.updateStockCalculation();
		});

		// Solvent input (optional)
		const solventContainer = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		solventContainer.createEl('label', { text: '溶媒 (任意):' });
		
		const solventInput = solventContainer.createEl('input', {
			type: 'text',
			value: data.solvent || '水',
			placeholder: '水',
			cls: 'buffer-calc-input-text'
		});

		solventInput.addEventListener('input', () => {
			data.solvent = solventInput.value;
			this.updateStockCalculation();
		});

		// Results container
		const resultsContainer = this.container.createEl('div', { cls: 'buffer-calc-results' });

			// Initial calculation
			this.updateStockCalculation();
			console.log('Stock calculator - Render completed successfully');
		} catch (error) {
			console.error('Stock calculator render error:', error);
			this.container.createEl('div', {
				text: `Stock calculator error: ${error.message}`,
				cls: 'buffer-calc-error'
			});
		}
	}

	private async renderDilutionCalculator(): Promise<void> {
		try {
			const data = this.blockContent.data as DilutionData;
			console.log('Dilution calculator - Starting render with data:', data);
		
		// Header
		const header = this.container.createEl('div', { cls: 'buffer-calc-header' });
		this.createEditableDilutionTitle(header, data);

		// Controls container
		const controls = this.container.createEl('div', { cls: 'buffer-calc-controls' });

		// Stock concentration
		const stockConcContainer = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		stockConcContainer.createEl('label', { text: 'ストック濃度:' });
		
		const stockConcInput = stockConcContainer.createEl('input', {
			type: 'number',
			value: data.stockConcentration.toString(),
			cls: 'buffer-calc-input-number'
		});

		const stockConcUnitSelect = stockConcContainer.createEl('select', { cls: 'buffer-calc-unit-select' });
		this.populateConcentrationUnits(stockConcUnitSelect, data.stockConcentrationUnit);

		stockConcInput.addEventListener('input', () => {
			data.stockConcentration = parseFloat(stockConcInput.value) || 0;
			this.updateDilutionCalculation();
		});

		stockConcUnitSelect.addEventListener('change', () => {
			data.stockConcentrationUnit = stockConcUnitSelect.value as ConcentrationUnit;
			this.updateDilutionCalculation();
		});

		// Final concentration
		const finalConcContainer = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		finalConcContainer.createEl('label', { text: '最終濃度:' });
		
		const finalConcInput = finalConcContainer.createEl('input', {
			type: 'number',
			value: data.finalConcentration.toString(),
			cls: 'buffer-calc-input-number'
		});

		const finalConcUnitSelect = finalConcContainer.createEl('select', { cls: 'buffer-calc-unit-select' });
		this.populateConcentrationUnits(finalConcUnitSelect, data.finalConcentrationUnit);

		finalConcInput.addEventListener('input', () => {
			data.finalConcentration = parseFloat(finalConcInput.value) || 0;
			this.updateDilutionCalculation();
		});

		finalConcUnitSelect.addEventListener('change', () => {
			data.finalConcentrationUnit = finalConcUnitSelect.value as ConcentrationUnit;
			this.updateDilutionCalculation();
		});

		// Final volume
		const finalVolumeContainer = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		finalVolumeContainer.createEl('label', { text: '最終体積:' });
		
		const finalVolumeInput = finalVolumeContainer.createEl('input', {
			type: 'number',
			value: data.finalVolume.toString(),
			cls: 'buffer-calc-input-number'
		});

		const finalVolumeUnitSelect = finalVolumeContainer.createEl('select', { cls: 'buffer-calc-unit-select' });
		this.populateVolumeUnits(finalVolumeUnitSelect, data.volumeUnit);

		finalVolumeInput.addEventListener('input', () => {
			data.finalVolume = parseFloat(finalVolumeInput.value) || 0;
			this.updateDilutionCalculation();
		});

		finalVolumeUnitSelect.addEventListener('change', () => {
			data.volumeUnit = finalVolumeUnitSelect.value as VolumeUnit;
			this.updateDilutionCalculation();
		});

		// Dilution factor (calculated and displayed)
		const dilutionFactorContainer = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		dilutionFactorContainer.createEl('label', { text: '希釈倍率 (自動計算):' });
		const dilutionFactorDisplay = dilutionFactorContainer.createEl('span', {
			text: '---',
			cls: 'buffer-calc-calculated-value'
		});

		// Results container
		const resultsContainer = this.container.createEl('div', { cls: 'buffer-calc-results' });

		// Store dilution factor display for updates
		(this as any).dilutionFactorDisplay = dilutionFactorDisplay;

			// Initial calculation
			this.updateDilutionCalculation();
			console.log('Dilution calculator - Render completed successfully');
		} catch (error) {
			console.error('Dilution calculator render error:', error);
			this.container.createEl('div', {
				text: `Dilution calculator error: ${error.message}`,
				cls: 'buffer-calc-error'
			});
		}
	}

	private exportRecipe(result: CalculationResult): void {
		if (!result || result.components.length === 0) {
			new Notice('エクスポートする計算結果がありません');
			return;
		}

		const data = this.blockContent.data as BufferData;
		let exportText = `# ${data.name || 'バッファーレシピ'}\n\n`;
		exportText += `**総体積:** ${data.totalVolume} ${data.volumeUnit || this.settings.defaultVolumeUnit}\n\n`;
		exportText += `## 成分\n\n`;

		result.components.forEach((component, index) => {
			exportText += `${index + 1}. **${component.reagent.name}**: ${component.optimizedVolumeDisplay}`;
			if (component.percentOfTotal) {
				exportText += ` (${component.percentOfTotal.toFixed(1)}%)`;
			}
			exportText += `\n`;
			exportText += `   - ストック: ${component.stockConcentration} ${component.stockConcentrationUnit}\n`;
			exportText += `   - 最終: ${component.finalConcentration} ${component.finalConcentrationUnit}\n`;
			if (component.lotNumber) {
				exportText += `   - ロット: ${component.lotNumber}\n`;
			}
			exportText += `\n`;
		});

		if (result.solventVolume > 0) {
			const solventDisplay = ConversionUtils.optimizeVolumeDisplay(result.solventVolume, data.volumeUnit || this.settings.defaultVolumeUnit);
			exportText += `**溶媒**: 水を加えて ${solventDisplay.value.toFixed(this.settings.decimalPlaces)} ${solventDisplay.unit} にする\n\n`;
		}

		if (result.warnings.length > 0) {
			exportText += `## 警告\n\n`;
			result.warnings.forEach(warning => {
				exportText += `- ${warning.message}\n`;
			});
			exportText += `\n`;
		}

		exportText += `*Buffer Calc により ${new Date().toLocaleDateString()} に生成*\n`;

		// Copy to clipboard
		navigator.clipboard.writeText(exportText).then(() => {
			new Notice('レシピをクリップボードにエクスポートしました');
		}).catch(() => {
			new Notice('レシピのクリップボードへのコピーに失敗しました');
		});
	}

	private async updateStockCalculation(): Promise<void> {
		const data = this.blockContent.data as StockData;
		
		console.log('Updating stock calculation with data:', data);
		
		try {
			const result = this.calculationEngine.calculateStock(data);
			console.log('Stock calculation result:', result);
			this.lastResult = result;
			this.renderStockResults(result);
			
			// 履歴に追加（エラーがない場合のみ）
			if (result.errors.length === 0 && this.plugin) {
				this.plugin.addToHistory('stock', data.name || 'ストック溶液計算', data, result);
			}
		} catch (error) {
			console.error('Stock calculation error:', error);
			console.error('Error stack:', error.stack);
			this.renderError(error.message);
		}
	}

	private async updateDilutionCalculation(): Promise<void> {
		const data = this.blockContent.data as DilutionData;
		
		console.log('Updating dilution calculation with data:', data);
		
		try {
			const result = this.calculationEngine.calculateDilution(data);
			console.log('Dilution calculation result:', result);
			this.lastResult = result;
			
			// Update dilution factor display
			if ((this as any).dilutionFactorDisplay && data.stockConcentration > 0 && data.finalConcentration > 0) {
				const dilutionFactor = data.stockConcentration / data.finalConcentration;
				(this as any).dilutionFactorDisplay.textContent = `${dilutionFactor.toFixed(1)}×`;
			}
			
			this.renderDilutionResults(result);
			
			// 履歴に追加（エラーがない場合のみ）
			if (result.errors.length === 0 && this.plugin) {
				this.plugin.addToHistory('dilution', data.name || '希釈計算', data, result);
			}
		} catch (error) {
			console.error('Dilution calculation error:', error);
			console.error('Error stack:', error.stack);
			this.renderError(error.message);
		}
	}

	private renderStockResults(result: CalculationResult): void {
		let resultsContainer = this.container.querySelector('.buffer-calc-results') as HTMLElement;
		
		if (!resultsContainer) {
			resultsContainer = this.container.createEl('div', { cls: 'buffer-calc-results' });
		}
		
		resultsContainer.empty();

		// Show errors first
		if (result.errors.length > 0) {
			const errorsContainer = resultsContainer.createEl('div', { cls: 'buffer-calc-errors' });
			errorsContainer.createEl('h4', { text: 'エラー', cls: 'buffer-calc-error-title' });
			
			result.errors.forEach(error => {
				errorsContainer.createEl('div', {
					text: error.message,
					cls: 'buffer-calc-error-item'
				});
			});
			return;
		}

		// Results header
		resultsContainer.createEl('h4', { text: 'ストック溶液調製手順' });

		// Stock preparation instructions
		if (result.components.length > 0) {
			const instructionsList = resultsContainer.createEl('ol', { cls: 'buffer-calc-instructions' });
			
			const component = result.components[0]; // Stock solutions have one component
			
			// Mass calculation instruction
			const massInstruction = instructionsList.createEl('li', { cls: 'buffer-calc-instruction-item' });
			massInstruction.createEl('strong', { text: component.reagent.name });
			massInstruction.createEl('span', { text: `: ${component.optimizedVolumeDisplay} を計量` });
			
			// Dissolution instruction
			const dissolutionInstruction = instructionsList.createEl('li', { cls: 'buffer-calc-instruction-item' });
			const data = this.blockContent.data as StockData;
			const solventName = data.solvent || '蒸留水';
			dissolutionInstruction.createEl('span', { 
				text: `${solventName}に溶解し、総体積を ${data.volume} ${data.volumeUnit} にメスアップする` 
			});
		}

		// Show calculation steps if enabled
		if (this.settings.showCalculationSteps && result.calculationSteps && result.calculationSteps.length > 0) {
			const stepsContainer = resultsContainer.createEl('div', { cls: 'buffer-calc-steps' });
			stepsContainer.createEl('h5', { text: '計算ステップ' });
			
			result.calculationSteps.forEach(step => {
				const stepEl = stepsContainer.createEl('div', { cls: 'buffer-calc-step' });
				stepEl.createEl('strong', { text: `${step.step}. ${step.description}` });
				
				if (step.formula) {
					stepEl.createEl('div', { 
						text: step.formula,
						cls: 'buffer-calc-formula'
					});
				}
				
				stepEl.createEl('div', { 
					text: `結果: ${step.result.toFixed(this.settings.decimalPlaces)} ${step.unit}`,
					cls: 'buffer-calc-step-result'
				});
			});
		}

		// Warnings
		if (result.warnings.length > 0) {
			const warningsContainer = resultsContainer.createEl('div', { cls: 'buffer-calc-warnings' });
			warningsContainer.createEl('h5', { text: '警告' });
			
			result.warnings.forEach(warning => {
				const warningEl = warningsContainer.createEl('div', { 
					text: warning.message,
					cls: `buffer-calc-warning buffer-calc-warning-${warning.severity}`
				});
			});
		}
	}

	private renderDilutionResults(result: CalculationResult): void {
		let resultsContainer = this.container.querySelector('.buffer-calc-results') as HTMLElement;
		
		if (!resultsContainer) {
			resultsContainer = this.container.createEl('div', { cls: 'buffer-calc-results' });
		}
		
		resultsContainer.empty();

		// Show errors first
		if (result.errors.length > 0) {
			const errorsContainer = resultsContainer.createEl('div', { cls: 'buffer-calc-errors' });
			errorsContainer.createEl('h4', { text: 'エラー', cls: 'buffer-calc-error-title' });
			
			result.errors.forEach(error => {
				errorsContainer.createEl('div', {
					text: error.message,
					cls: 'buffer-calc-error-item'
				});
			});
			return;
		}

		// Results header
		resultsContainer.createEl('h4', { text: '希釈手順' });

		// Dilution instructions
		if (result.components.length > 0) {
			const instructionsList = resultsContainer.createEl('ol', { cls: 'buffer-calc-instructions' });
			
			const component = result.components[0]; // Dilution has one component (the stock)
			const data = this.blockContent.data as DilutionData;
			
			// Stock volume instruction
			const stockInstruction = instructionsList.createEl('li', { cls: 'buffer-calc-instruction-item' });
			stockInstruction.createEl('span', { text: `ストック溶液: ${component.optimizedVolumeDisplay} を取る` });
			
			// Solvent volume instruction
			const solventInstruction = instructionsList.createEl('li', { cls: 'buffer-calc-instruction-item' });
			const solventVolume = result.solventVolume;
			const solventDisplay = ConversionUtils.optimizeVolumeDisplay(solventVolume, data.volumeUnit);
			solventInstruction.createEl('span', { 
				text: `溶媒を加えて総体積を ${data.finalVolume} ${data.volumeUnit} にする（溶媒: ${solventDisplay.value.toFixed(this.settings.decimalPlaces)} ${solventDisplay.unit}）`
			});
		}

		// Show calculation steps if enabled
		if (this.settings.showCalculationSteps && result.calculationSteps && result.calculationSteps.length > 0) {
			const stepsContainer = resultsContainer.createEl('div', { cls: 'buffer-calc-steps' });
			stepsContainer.createEl('h5', { text: '計算ステップ' });
			
			result.calculationSteps.forEach(step => {
				const stepEl = stepsContainer.createEl('div', { cls: 'buffer-calc-step' });
				stepEl.createEl('strong', { text: `${step.step}. ${step.description}` });
				
				if (step.formula) {
					stepEl.createEl('div', { 
						text: step.formula,
						cls: 'buffer-calc-formula'
					});
				}
				
				stepEl.createEl('div', { 
					text: `結果: ${step.result.toFixed(this.settings.decimalPlaces)} ${step.unit}`,
					cls: 'buffer-calc-step-result'
				});
			});
		}

		// Warnings
		if (result.warnings.length > 0) {
			const warningsContainer = resultsContainer.createEl('div', { cls: 'buffer-calc-warnings' });
			warningsContainer.createEl('h5', { text: '警告' });
			
			result.warnings.forEach(warning => {
				const warningEl = warningsContainer.createEl('div', { 
					text: warning.message,
					cls: `buffer-calc-warning buffer-calc-warning-${warning.severity}`
				});
			});
		}
	}

	/**
	 * モバイル最適化の適用
	 */
	private applyMobileOptimizations(): void {
		const viewportInfo = this.mobileOptimization.getViewportInfo();

		// モバイルクラスの追加
		if (viewportInfo.isMobile) {
			this.container.addClass('mobile-optimized');
		}
		if (viewportInfo.isTablet) {
			this.container.addClass('tablet-optimized');
		}
		if (viewportInfo.isTouchDevice) {
			this.container.addClass('touch-device');
		}

		// アクセシビリティの改善
		this.mobileOptimization.improveAccessibility(this.container);

		// 入力フィールドとボタンの最適化
		setTimeout(() => {
			this.optimizeInputElements();
			this.optimizeButtons();
		}, 100);
	}

	/**
	 * 入力要素の最適化
	 */
	private optimizeInputElements(): void {
		const inputs = this.container.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
		inputs.forEach(input => {
			this.mobileOptimization.optimizeInputField(input);
		});
	}

	/**
	 * ボタン要素の最適化
	 */
	private optimizeButtons(): void {
		const buttons = this.container.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
		buttons.forEach(button => {
			this.mobileOptimization.optimizeButton(button);
		});
	}

	/**
	 * 編集可能なタイトルを作成
	 */
	private createEditableTitle(container: HTMLElement, data: BufferData): void {
		const titleContainer = container.createEl('div', { cls: 'buffer-calc-title-container' });
		
		// タイトル表示用要素
		const titleDisplay = titleContainer.createEl('h3', { 
			text: data.name || 'バッファー計算', 
			cls: 'buffer-calc-title editable-title'
		});
		
		// 編集ボタン
		const editButton = titleContainer.createEl('button', {
			text: '✎',
			cls: 'buffer-calc-edit-title-btn',
			attr: { 'aria-label': 'タイトルを編集' }
		});

		// 編集用入力フィールド（初期は非表示）
		const titleInput = titleContainer.createEl('input', {
			type: 'text',
			value: data.name || '',
			cls: 'buffer-calc-title-input',
			attr: { 'placeholder': 'バッファー名を入力...' }
		});
		titleInput.style.display = 'none';

		// 編集モードの切り替え
		let isEditing = false;

		const enterEditMode = () => {
			if (isEditing) return;
			isEditing = true;
			
			titleDisplay.style.display = 'none';
			editButton.style.display = 'none';
			titleInput.style.display = 'inline-block';
			titleInput.value = data.name || '';
			titleInput.focus();
			titleInput.select();
		};

		const exitEditMode = (save: boolean = false) => {
			if (!isEditing) return;
			isEditing = false;

			if (save) {
				const newName = titleInput.value.trim();
				data.name = newName || undefined;
				titleDisplay.textContent = newName || 'バッファー計算';
			}

			titleDisplay.style.display = 'inline-block';
			editButton.style.display = 'inline-block';
			titleInput.style.display = 'none';
		};

		// イベントリスナー
		editButton.addEventListener('click', enterEditMode);
		titleDisplay.addEventListener('click', enterEditMode);

		titleInput.addEventListener('blur', () => exitEditMode(true));
		titleInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				exitEditMode(true);
			} else if (e.key === 'Escape') {
				e.preventDefault();
				exitEditMode(false);
			}
		});
	}

	/**
	 * ストック計算用の編集可能なタイトルを作成
	 */
	private createEditableStockTitle(container: HTMLElement, data: StockData): void {
		const titleContainer = container.createEl('div', { cls: 'buffer-calc-title-container' });
		
		// タイトル表示用要素
		const titleDisplay = titleContainer.createEl('h3', { 
			text: data.name || 'ストック溶液計算', 
			cls: 'buffer-calc-title editable-title'
		});
		
		// 編集ボタン
		const editButton = titleContainer.createEl('button', {
			text: '✎',
			cls: 'buffer-calc-edit-title-btn',
			attr: { 'aria-label': 'タイトルを編集' }
		});

		// 編集用入力フィールド（初期は非表示）
		const titleInput = titleContainer.createEl('input', {
			type: 'text',
			value: data.name || '',
			cls: 'buffer-calc-title-input',
			attr: { 'placeholder': 'ストック名を入力...' }
		});
		titleInput.style.display = 'none';

		// 編集モードの切り替え
		let isEditing = false;

		const enterEditMode = () => {
			if (isEditing) return;
			isEditing = true;
			
			titleDisplay.style.display = 'none';
			editButton.style.display = 'none';
			titleInput.style.display = 'inline-block';
			titleInput.value = data.name || '';
			titleInput.focus();
			titleInput.select();
		};

		const exitEditMode = (save: boolean = false) => {
			if (!isEditing) return;
			isEditing = false;

			if (save) {
				const newName = titleInput.value.trim();
				data.name = newName || undefined;
				titleDisplay.textContent = newName || 'ストック溶液計算';
			}

			titleDisplay.style.display = 'inline-block';
			editButton.style.display = 'inline-block';
			titleInput.style.display = 'none';
		};

		// イベントリスナー
		editButton.addEventListener('click', enterEditMode);
		titleDisplay.addEventListener('click', enterEditMode);

		titleInput.addEventListener('blur', () => exitEditMode(true));
		titleInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				exitEditMode(true);
			} else if (e.key === 'Escape') {
				e.preventDefault();
				exitEditMode(false);
			}
		});
	}

	/**
	 * 希釈計算用の編集可能なタイトルを作成
	 */
	private createEditableDilutionTitle(container: HTMLElement, data: DilutionData): void {
		const titleContainer = container.createEl('div', { cls: 'buffer-calc-title-container' });
		
		// タイトル表示用要素
		const titleDisplay = titleContainer.createEl('h3', { 
			text: data.name || '希釈計算', 
			cls: 'buffer-calc-title editable-title'
		});
		
		// 編集ボタン
		const editButton = titleContainer.createEl('button', {
			text: '✎',
			cls: 'buffer-calc-edit-title-btn',
			attr: { 'aria-label': 'タイトルを編集' }
		});

		// 編集用入力フィールド（初期は非表示）
		const titleInput = titleContainer.createEl('input', {
			type: 'text',
			value: data.name || '',
			cls: 'buffer-calc-title-input',
			attr: { 'placeholder': '希釈名を入力...' }
		});
		titleInput.style.display = 'none';

		// 編集モードの切り替え
		let isEditing = false;

		const enterEditMode = () => {
			if (isEditing) return;
			isEditing = true;
			
			titleDisplay.style.display = 'none';
			editButton.style.display = 'none';
			titleInput.style.display = 'inline-block';
			titleInput.value = data.name || '';
			titleInput.focus();
			titleInput.select();
		};

		const exitEditMode = (save: boolean = false) => {
			if (!isEditing) return;
			isEditing = false;

			if (save) {
				const newName = titleInput.value.trim();
				data.name = newName || undefined;
				titleDisplay.textContent = newName || '希釈計算';
			}

			titleDisplay.style.display = 'inline-block';
			editButton.style.display = 'inline-block';
			titleInput.style.display = 'none';
		};

		// イベントリスナー
		editButton.addEventListener('click', enterEditMode);
		titleDisplay.addEventListener('click', enterEditMode);

		titleInput.addEventListener('blur', () => exitEditMode(true));
		titleInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				exitEditMode(true);
			} else if (e.key === 'Escape') {
				e.preventDefault();
				exitEditMode(false);
			}
		});
	}

	private async renderSerialDilutionCalculator(): Promise<void> {
		const data = this.blockContent.data as SerialDilutionData;
		
		// Header
		const header = this.container.createEl('div', { cls: 'buffer-calc-header' });
		this.createSerialDilutionEditableTitle(header, data);

		// Controls container
		const controls = this.container.createEl('div', { cls: 'buffer-calc-controls' });

		// Stock solution section
		const stockSection = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		
		const stockRow = stockSection.createEl('div', { cls: 'buffer-calc-input-row' });
		stockRow.createEl('label', { text: 'ストック濃度:', cls: 'buffer-calc-label' });
		
		const stockConcInput = stockRow.createEl('input', {
			type: 'number',
			value: data.stockConcentration?.toString() || '',
			cls: 'buffer-calc-input'
		}) as HTMLInputElement;
		
		const stockUnitSelect = stockRow.createEl('select', { cls: 'buffer-calc-select' }) as HTMLSelectElement;
		this.populateConcentrationUnits(stockUnitSelect, data.stockUnit);

		// Cell culture parameters section
		const cellSection = controls.createEl('div', { cls: 'buffer-calc-section' });
		
		// Cell volume
		const cellVolumeRow = cellSection.createEl('div', { cls: 'buffer-calc-input-row' });
		cellVolumeRow.createEl('label', { text: '細胞溶液の量:', cls: 'buffer-calc-label' });
		
		const cellVolumeInput = cellVolumeRow.createEl('input', {
			type: 'number',
			value: data.cellVolume?.toString() || '',
			cls: 'buffer-calc-input'
		}) as HTMLInputElement;
		
		const cellVolumeUnitSelect = cellVolumeRow.createEl('select', { cls: 'buffer-calc-select' }) as HTMLSelectElement;
		this.populateVolumeUnits(cellVolumeUnitSelect, data.cellVolumeUnit);

		// Addition volume
		const additionVolumeRow = cellSection.createEl('div', { cls: 'buffer-calc-input-row' });
		additionVolumeRow.createEl('label', { text: '細胞への添加量:', cls: 'buffer-calc-label' });
		
		const additionVolumeInput = additionVolumeRow.createEl('input', {
			type: 'number',
			value: data.additionVolume?.toString() || '',
			cls: 'buffer-calc-input'
		}) as HTMLInputElement;
		
		const additionVolumeUnitSelect = additionVolumeRow.createEl('select', { cls: 'buffer-calc-select' }) as HTMLSelectElement;
		this.populateVolumeUnits(additionVolumeUnitSelect, data.additionVolumeUnit);

		// Dilution parameters section
		const dilutionSection = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		
		// Dilution volume
		const dilutionVolumeRow = dilutionSection.createEl('div', { cls: 'buffer-calc-input-row' });
		dilutionVolumeRow.createEl('label', { text: '各希釈段階での作成量:', cls: 'buffer-calc-label' });
		
		const dilutionVolumeInput = dilutionVolumeRow.createEl('input', {
			type: 'number',
			value: data.dilutionVolume?.toString() || '',
			cls: 'buffer-calc-input'
		}) as HTMLInputElement;
		
		const dilutionVolumeUnitSelect = dilutionVolumeRow.createEl('select', { cls: 'buffer-calc-select' }) as HTMLSelectElement;
		this.populateVolumeUnits(dilutionVolumeUnitSelect, data.dilutionVolumeUnit);

		// Target concentrations section
		const targetSection = controls.createEl('div', { cls: 'buffer-calc-section' });
		targetSection.createEl('div', { 
			text: '最終目標濃度',
			cls: 'buffer-calc-label-text'
		});
		

		// Target concentrations container
		const targetConcentrationsContainer = targetSection.createEl('div', { cls: 'serial-dilution-targets-container' });
		
		// Target settings container for better layout
		const targetSettingsContainer = targetSection.createEl('div', { cls: 'serial-dilution-target-settings' });
		
		// Target input mode selector
		const inputModeRow = targetSettingsContainer.createEl('div', { cls: 'buffer-calc-input-row' });
		inputModeRow.createEl('label', { text: '入力形式:', cls: 'buffer-calc-label' });
		
		const inputModeSelect = inputModeRow.createEl('select', { cls: 'buffer-calc-select' }) as HTMLSelectElement;
		inputModeSelect.createEl('option', { value: ConcentrationInputMode.STANDARD, text: '標準形式' });
		inputModeSelect.createEl('option', { value: ConcentrationInputMode.EXPONENTIAL, text: '指数形式' });
		inputModeSelect.value = data.targetInputMode || ConcentrationInputMode.EXPONENTIAL;

		// Target unit selector (only for standard mode)
		const targetUnitRow = targetSettingsContainer.createEl('div', { cls: 'buffer-calc-input-row' });
		targetUnitRow.createEl('label', { text: '濃度単位:', cls: 'buffer-calc-label' });
		
		const targetUnitSelect = targetUnitRow.createEl('select', { cls: 'buffer-calc-select' }) as HTMLSelectElement;
		this.populateConcentrationUnits(targetUnitSelect, data.targetUnit);

		// Add concentration button removed per user request

		// Display format section
		const displaySection = controls.createEl('div', { cls: 'buffer-calc-input-group' });
		
		const displayFormatRow = displaySection.createEl('div', { cls: 'buffer-calc-input-row' });
		displayFormatRow.createEl('label', { text: '手順表示:', cls: 'buffer-calc-label' });
		
		const displayFormatSelect = displayFormatRow.createEl('select', { cls: 'buffer-calc-select' }) as HTMLSelectElement;
		displayFormatSelect.createEl('option', { value: StepDisplayFormat.TEXT, text: '文字形式' });
		displayFormatSelect.createEl('option', { value: StepDisplayFormat.TABLE, text: '表形式' });
		displayFormatSelect.value = data.stepDisplayFormat || StepDisplayFormat.TEXT;

		// Results container
		const resultsContainer = this.container.createEl('div', { cls: 'buffer-calc-results' });

		// Toggle unit selector visibility based on input mode
		const toggleUnitSelector = () => {
			const isExponential = inputModeSelect.value === ConcentrationInputMode.EXPONENTIAL;
			targetUnitRow.style.display = isExponential ? 'none' : 'flex';
		};

		// Initialize data.targetInputMode with current selection
		data.targetInputMode = inputModeSelect.value as ConcentrationInputMode;
		
		// Initial toggle
		toggleUnitSelector();

		// Event listeners
		const recalculate = () => {
			try {
				// Update data object
				data.stockConcentration = parseFloat(stockConcInput.value) || 0;
				data.stockUnit = stockUnitSelect.value as ConcentrationUnit;
				data.cellVolume = parseFloat(cellVolumeInput.value) || 0;
				data.cellVolumeUnit = cellVolumeUnitSelect.value as VolumeUnit;
				data.additionVolume = parseFloat(additionVolumeInput.value) || 0;
				data.additionVolumeUnit = additionVolumeUnitSelect.value as VolumeUnit;
				data.dilutionVolume = parseFloat(dilutionVolumeInput.value) || 0;
				data.dilutionVolumeUnit = dilutionVolumeUnitSelect.value as VolumeUnit;
				data.targetUnit = targetUnitSelect.value as ConcentrationUnit;
				data.targetInputMode = inputModeSelect.value as ConcentrationInputMode;
				data.stepDisplayFormat = displayFormatSelect.value as StepDisplayFormat;

				// Calculate results
				const result = this.calculationEngine.calculateSerialDilution(data);
				this.renderSerialDilutionResults(resultsContainer, result, data);
			} catch (error) {
				console.error('Serial dilution calculation error:', error);
				resultsContainer.innerHTML = `<div class="buffer-calc-error">計算エラー: ${error.message}</div>`;
			}
		};

		// Add event listeners
		[stockConcInput, stockUnitSelect, cellVolumeInput, cellVolumeUnitSelect,
		 additionVolumeInput, additionVolumeUnitSelect, dilutionVolumeInput, 
		 dilutionVolumeUnitSelect, targetUnitSelect, displayFormatSelect].forEach(element => {
			element.addEventListener('input', recalculate);
			element.addEventListener('change', recalculate);
		});

		inputModeSelect.addEventListener('change', () => {
			data.targetInputMode = inputModeSelect.value as ConcentrationInputMode;
			toggleUnitSelector();
			this.renderTargetConcentrations(targetConcentrationsContainer, data);
			recalculate();
		});


		// addConcentrationBtn event listener removed per user request

		// Initial rendering and calculation
		this.renderTargetConcentrations(targetConcentrationsContainer, data);
		recalculate();
	}

	private renderTargetConcentrations(container: HTMLElement, data: SerialDilutionData): void {
		container.empty();
		
		if (!data.targetConcentrations || data.targetConcentrations.length === 0) {
			data.targetConcentrations = [100, 10, 1, 0.1];
		}

		data.targetConcentrations.forEach((concentration, index) => {
			const concentrationRow = container.createEl('div', { cls: 'buffer-calc-input-row serial-dilution-target-row' });
			
			const isExponentialMode = data.targetInputMode === ConcentrationInputMode.EXPONENTIAL;
			
			if (isExponentialMode) {
				// Exponential input mode: show coefficient input and M unit
				const exponentialContainer = concentrationRow.createEl('div', { cls: 'exponential-input-container' });
				
				// Force horizontal layout with inline styles (final solution)
				exponentialContainer.style.display = 'flex';
				exponentialContainer.style.flexDirection = 'row';
				exponentialContainer.style.alignItems = 'center';
				exponentialContainer.style.flexWrap = 'nowrap';
				exponentialContainer.style.gap = '0.25rem';
				exponentialContainer.style.minWidth = '120px';
				exponentialContainer.style.whiteSpace = 'nowrap';
				
				const prefixSpan = exponentialContainer.createEl('span', { text: '10^', cls: 'exponential-prefix' });
				prefixSpan.style.flexShrink = '0';
				prefixSpan.style.whiteSpace = 'nowrap';
				prefixSpan.style.display = 'inline-block';
				
				const exponentInput = exponentialContainer.createEl('input', {
					type: 'number',
					value: this.concentrationToExponent(concentration).toString(),
					cls: 'buffer-calc-input exponential-input',
					attr: { step: '0.1', placeholder: '-6' }
				}) as HTMLInputElement;
				exponentInput.style.flexShrink = '0';
				exponentInput.style.display = 'inline-block';
				
				const unitSpan = exponentialContainer.createEl('span', { text: ' M', cls: 'exponential-unit' });
				unitSpan.style.flexShrink = '0';
				unitSpan.style.whiteSpace = 'nowrap';
				unitSpan.style.display = 'inline-block';
				
				// Store reference for event handling
				(concentrationRow as any).concentrationInput = exponentInput;
			} else {
				// Standard input mode: number input only (unit controlled globally)
				const concentrationInput = concentrationRow.createEl('input', {
					type: 'number',
					value: concentration.toString(),
					cls: 'buffer-calc-input',
					attr: { step: '0.1' }
				}) as HTMLInputElement;
				
				// Store reference for event handling
				(concentrationRow as any).concentrationInput = concentrationInput;
			}

			// Button container for better layout
			const buttonContainer = concentrationRow.createEl('div', { cls: 'serial-dilution-target-buttons' });

			const insertAboveBtn = buttonContainer.createEl('button', {
				text: '↑',
				cls: 'buffer-calc-button buffer-calc-button-small serial-dilution-insert-btn',
				attr: { title: '上に追加' }
			});

			const insertBelowBtn = buttonContainer.createEl('button', {
				text: '↓',
				cls: 'buffer-calc-button buffer-calc-button-small serial-dilution-insert-btn',
				attr: { title: '下に追加' }
			});

			const removeBtn = buttonContainer.createEl('button', {
				text: '×',
				cls: 'buffer-calc-button buffer-calc-button-danger buffer-calc-button-small serial-dilution-remove-btn',
				attr: { title: '削除' }
			});

			// Event listeners
			const concentrationInput = (concentrationRow as any).concentrationInput;
			if (concentrationInput) {
				concentrationInput.addEventListener('input', () => {
					if (isExponentialMode) {
						// Convert exponent back to concentration in µM
						const exponent = parseFloat(concentrationInput.value) || -6;
						data.targetConcentrations[index] = this.exponentToConcentration(exponent);
					} else {
						data.targetConcentrations[index] = parseFloat(concentrationInput.value) || 0;
					}
					// Trigger recalculation through parent
					concentrationInput.dispatchEvent(new Event('change', { bubbles: true }));
				});
			}

			insertAboveBtn.addEventListener('click', () => {
				this.insertConcentrationAt(data, index, 'before');
				data.targetInputMode = (document.querySelector('.serial-dilution-target-settings select') as HTMLSelectElement)?.value as ConcentrationInputMode;
				this.renderTargetConcentrations(container, data);
				// Trigger recalculation
				insertAboveBtn.dispatchEvent(new Event('change', { bubbles: true }));
			});

			insertBelowBtn.addEventListener('click', () => {
				this.insertConcentrationAt(data, index, 'after');
				data.targetInputMode = (document.querySelector('.serial-dilution-target-settings select') as HTMLSelectElement)?.value as ConcentrationInputMode;
				this.renderTargetConcentrations(container, data);
				// Trigger recalculation
				insertBelowBtn.dispatchEvent(new Event('change', { bubbles: true }));
			});

			removeBtn.addEventListener('click', () => {
				data.targetConcentrations.splice(index, 1);
				data.targetInputMode = (document.querySelector('.serial-dilution-target-settings select') as HTMLSelectElement)?.value as ConcentrationInputMode;
				this.renderTargetConcentrations(container, data);
				// Trigger recalculation
				container.dispatchEvent(new Event('change', { bubbles: true }));
			});

			// Don't allow removing if only one concentration
			if (data.targetConcentrations.length === 1) {
				removeBtn.style.visibility = 'hidden';
			}
		});
	}

	private insertConcentrationAt(data: SerialDilutionData, index: number, position: 'before' | 'after'): void {
		const newConcentration = 1.0; // Default value
		const insertIndex = position === 'before' ? index : index + 1;
		data.targetConcentrations.splice(insertIndex, 0, newConcentration);
	}

	private renderSerialDilutionResults(container: HTMLElement, result: SerialDilutionResult, data: SerialDilutionData): void {
		container.empty();

		if (result.errors.length > 0) {
			const errorContainer = container.createEl('div', { cls: 'buffer-calc-errors' });
			errorContainer.createEl('h3', { text: 'エラー' });
			result.errors.forEach(error => {
				errorContainer.createEl('div', { 
					text: error.message, 
					cls: 'buffer-calc-error-item' 
				});
			});
			return;
		}

		// Protocol summary removed per user request

		// Dilution steps (format depends on user choice)
		const stepsContainer = container.createEl('div', { cls: 'serial-dilution-steps' });
		
		const displayFormat = data.stepDisplayFormat || StepDisplayFormat.TEXT;
		
		if (displayFormat === StepDisplayFormat.TABLE) {
			// Table format
			const stepsTable = stepsContainer.createEl('table', { cls: 'serial-dilution-table' });
			const headerRow = stepsTable.createEl('tr');
			headerRow.createEl('th', { text: 'ステップ' });
			headerRow.createEl('th', { text: '元濃度' });
			headerRow.createEl('th', { text: '目標濃度' });
			headerRow.createEl('th', { text: 'Stock量' });
			headerRow.createEl('th', { text: '溶媒量' });
			headerRow.createEl('th', { text: '希釈倍率' });
			
			result.steps.forEach(step => {
				const row = stepsTable.createEl('tr');
				row.createEl('td', { text: step.name });
				row.createEl('td', { text: `${step.fromConcentration.toFixed(this.settings.decimalPlaces)} ${step.concentrationUnit}` });
				row.createEl('td', { text: `${step.toConcentration.toFixed(this.settings.decimalPlaces)} ${step.concentrationUnit}` });
				row.createEl('td', { text: `${step.stockVolume.toFixed(this.settings.decimalPlaces)} ${step.volumeUnit}` });
				row.createEl('td', { text: `${step.solventVolume.toFixed(this.settings.decimalPlaces)} ${step.volumeUnit}` });
				row.createEl('td', { text: `${step.dilutionFactor.toFixed(1)}倍` });
			});
		} else {
			// Text format (numbered list)
			const stepsList = stepsContainer.createEl('ol');
			result.steps.forEach(step => {
				stepsList.createEl('li', { text: step.description });
			});
		}

		// Warnings
		if (result.warnings.length > 0) {
			const warningsContainer = container.createEl('div', { cls: 'buffer-calc-warnings' });
			warningsContainer.createEl('h3', { text: '警告' });
			result.warnings.forEach(warning => {
				const warningEl = warningsContainer.createEl('div', { 
					text: warning.message,
					cls: `buffer-calc-warning-item buffer-calc-warning-${warning.severity}`
				});
			});
		}

		// Export buttons
		if (result.exportData) {
			const exportContainer = container.createEl('div', { cls: 'serial-dilution-export' });
			
			const exportButtons = exportContainer.createEl('div', { cls: 'buffer-calc-export-buttons' });
			
			const csvBtn = exportButtons.createEl('button', {
				text: 'CSV形式でコピー',
				cls: 'buffer-calc-button buffer-calc-button-secondary'
			});
			
			const markdownBtn = exportButtons.createEl('button', {
				text: 'Markdown形式でコピー',
				cls: 'buffer-calc-button buffer-calc-button-secondary'
			});

			csvBtn.addEventListener('click', () => {
				navigator.clipboard.writeText(result.exportData!.csvFormat);
				new Notice('CSV形式でクリップボードにコピーしました');
			});

			markdownBtn.addEventListener('click', () => {
				navigator.clipboard.writeText(result.exportData!.markdownFormat);
				new Notice('Markdown形式でクリップボードにコピーしました');
			});
		}
	}

	private createSerialDilutionEditableTitle(container: HTMLElement, data: SerialDilutionData): void {
		const titleContainer = container.createEl('div', { cls: 'buffer-calc-title-container' });
		
		const titleDisplay = titleContainer.createEl('span', {
			text: data.name || 'Serial Dilution Protocol',
			cls: 'buffer-calc-title'
		});
		
		const editButton = titleContainer.createEl('button', {
			text: '✏️',
			cls: 'buffer-calc-edit-button',
			attr: { title: 'タイトルを編集' }
		});

		const titleInput = titleContainer.createEl('input', {
			type: 'text',
			value: data.name || 'Serial Dilution Protocol',
			cls: 'buffer-calc-title-input'
		}) as HTMLInputElement;
		titleInput.style.display = 'none';

		let isEditing = false;

		const enterEditMode = () => {
			if (isEditing) return;
			isEditing = true;
			
			titleDisplay.style.display = 'none';
			editButton.style.display = 'none';
			titleInput.style.display = 'inline-block';
			titleInput.focus();
			titleInput.select();
		};

		const exitEditMode = (save: boolean = false) => {
			if (!isEditing) return;
			isEditing = false;

			if (save) {
				const newName = titleInput.value.trim();
				data.name = newName || undefined;
				titleDisplay.textContent = newName || 'Serial Dilution Protocol';
			}

			titleDisplay.style.display = 'inline-block';
			editButton.style.display = 'inline-block';
			titleInput.style.display = 'none';
		};

		// Event listeners
		editButton.addEventListener('click', enterEditMode);
		titleDisplay.addEventListener('click', enterEditMode);

		titleInput.addEventListener('blur', () => exitEditMode(true));
		titleInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				exitEditMode(true);
			} else if (e.key === 'Escape') {
				e.preventDefault();
				exitEditMode(false);
			}
		});
	}

	private formatConcentrationDisplay(
		concentration: number, 
		unit: ConcentrationUnit
	): string {
		return `${concentration.toFixed(this.settings.decimalPlaces)} ${unit}`;
	}

	/**
	 * Convert concentration in µM to exponent for 10^x M display
	 */
	private concentrationToExponent(concentrationInMicroMolar: number): number {
		if (concentrationInMicroMolar <= 0) return -6;
		const concentrationInMolar = concentrationInMicroMolar / 1000000; // µM to M
		return Math.log10(concentrationInMolar);
	}

	/**
	 * Convert exponent to concentration in µM
	 */
	private exponentToConcentration(exponent: number): number {
		const concentrationInMolar = Math.pow(10, exponent);
		return concentrationInMolar * 1000000; // M to µM
	}

}