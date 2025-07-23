import {
	MarkdownPostProcessorContext,
	Notice
} from 'obsidian';

import {
	BufferCalcBlockContent,
	BufferData,
	StockData,
	DilutionData,
	CalculationResult,
	BufferCalcSettings,
	VolumeUnit,
	ConcentrationUnit,
	ComponentInput
} from '../types';

import { CalculationEngine } from '../calculations/engine';
import { ReagentDatabase } from '../data/reagents';
import { ConversionUtils } from '../utils/conversions';

export class BufferCalcUI {
	private container: HTMLElement;
	private blockContent: BufferCalcBlockContent;
	private calculationEngine: CalculationEngine;
	private reagentDatabase: ReagentDatabase;
	private settings: BufferCalcSettings;
	private context: MarkdownPostProcessorContext;
	private lastResult: CalculationResult | null = null;

	constructor(
		container: HTMLElement,
		blockContent: BufferCalcBlockContent,
		calculationEngine: CalculationEngine,
		reagentDatabase: ReagentDatabase,
		settings: BufferCalcSettings,
		context: MarkdownPostProcessorContext
	) {
		this.container = container;
		this.blockContent = blockContent;
		this.calculationEngine = calculationEngine;
		this.reagentDatabase = reagentDatabase;
		this.settings = settings;
		this.context = context;
	}

	async render(): Promise<void> {
		try {
			this.container.empty();
			this.container.addClass('buffer-calc-ui');

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
		header.createEl('h3', { text: data.name || 'バッファー計算', cls: 'buffer-calc-title' });

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
			{ value: ConcentrationUnit.NANOMOLAR, label: 'nM' },
			{ value: ConcentrationUnit.PERCENT_W_V, label: '% (w/v)' },
			{ value: ConcentrationUnit.MG_ML, label: 'mg/mL' },
			{ value: ConcentrationUnit.UG_ML, label: 'µg/mL' }
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
		header.createEl('h3', { text: data.name || 'ストック溶液計算', cls: 'buffer-calc-title' });

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
		header.createEl('h3', { text: data.name || '希釈計算', cls: 'buffer-calc-title' });

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
}