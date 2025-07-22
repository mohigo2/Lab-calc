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
		this.container.empty();
		this.container.addClass('buffer-calc-ui');

		switch (this.blockContent.type) {
			case 'buffer':
				await this.renderBufferCalculator();
				break;
			case 'stock':
				await this.renderStockCalculator();
				break;
			case 'dilution':
				await this.renderDilutionCalculator();
				break;
			default:
				this.container.createEl('div', {
					text: `Unknown calculation type: ${this.blockContent.type}`,
					cls: 'buffer-calc-error'
				});
		}
	}

	private async renderBufferCalculator(): Promise<void> {
		const data = this.blockContent.data as BufferData;
		
		// Header
		const header = this.container.createEl('div', { cls: 'buffer-calc-header' });
		header.createEl('h3', { text: data.name || 'Buffer Calculation', cls: 'buffer-calc-title' });

		// Controls container
		const controls = this.container.createEl('div', { cls: 'buffer-calc-controls' });

		// Total volume input
		const volumeContainer = controls.createEl('div', { cls: 'buffer-calc-volume-input' });
		volumeContainer.createEl('label', { text: 'Total Volume:' });
		
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
		componentsContainer.createEl('h4', { text: 'Components' });

		const componentsList = componentsContainer.createEl('div', { cls: 'buffer-calc-components-list' });
		
		// Render existing components (ensure components is an array)
		const components = Array.isArray(data.components) ? data.components : [];
		components.forEach((component, index) => {
			this.renderComponent(componentsList, component, index);
		});

		// Add component button
		const addButton = componentsContainer.createEl('button', {
			text: '+ Add Component',
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
		componentHeader.createEl('span', { text: `Component ${index + 1}` });
		
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
		nameContainer.createEl('label', { text: 'Reagent:' });
		
		const nameInput = nameContainer.createEl('input', {
			type: 'text',
			value: component.name,
			placeholder: 'Enter reagent name...',
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
		stockContainer.createEl('label', { text: 'Stock Concentration:' });
		
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
		finalContainer.createEl('label', { text: 'Final Concentration:' });
		
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
		lotContainer.createEl('label', { text: 'Lot # (optional):' });
		
		const lotInput = lotContainer.createEl('input', {
			type: 'text',
			value: component.lotNumber || '',
			placeholder: 'e.g., ABC123',
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
			errorsContainer.createEl('h4', { text: 'Errors', cls: 'buffer-calc-error-title' });
			
			result.errors.forEach(error => {
				errorsContainer.createEl('div', {
					text: error.message,
					cls: 'buffer-calc-error-item'
				});
			});
			return;
		}

		// Results header
		resultsContainer.createEl('h4', { text: 'Preparation Instructions' });

		// Component results
		if (result.components.length > 0) {
			const instructionsList = resultsContainer.createEl('ol', { cls: 'buffer-calc-instructions' });

			result.components.forEach((component, index) => {
				const instruction = instructionsList.createEl('li', { cls: 'buffer-calc-instruction-item' });
				
				const reagentInfo = this.reagentDatabase.getReagentByName(component.reagent.name);
				const displayVolume = component.optimizedVolumeDisplay;
				
				instruction.createEl('strong', { text: component.reagent.name });
				instruction.createEl('span', { text: `: Add ${displayVolume}` });
				
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
				solventInstruction.createEl('span', { text: `Add water or buffer to make up to total volume: ${solventDisplay.value.toFixed(this.settings.decimalPlaces)} ${solventDisplay.unit}` });
			} else {
				console.log('- Solvent instruction NOT added (volume <= 0)');
			}
		}

		// Warnings
		if (result.warnings.length > 0) {
			const warningsContainer = resultsContainer.createEl('div', { cls: 'buffer-calc-warnings' });
			warningsContainer.createEl('h5', { text: 'Warnings' });
			
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
			stepsContainer.createEl('h5', { text: 'Calculation Steps' });
			
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
					text: `Result: ${step.result.toFixed(this.settings.decimalPlaces)} ${step.unit}`,
					cls: 'buffer-calc-step-result'
				});
			});
		}

		// Export button
		const exportButton = resultsContainer.createEl('button', {
			text: 'Export Recipe',
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
		// Placeholder for stock solution calculator
		this.container.createEl('div', {
			text: 'Stock solution calculator - Implementation coming soon',
			cls: 'buffer-calc-placeholder'
		});
	}

	private async renderDilutionCalculator(): Promise<void> {
		// Placeholder for dilution calculator
		this.container.createEl('div', {
			text: 'Dilution calculator - Implementation coming soon',
			cls: 'buffer-calc-placeholder'
		});
	}

	private exportRecipe(result: CalculationResult): void {
		if (!result || result.components.length === 0) {
			new Notice('No calculation results to export');
			return;
		}

		const data = this.blockContent.data as BufferData;
		let exportText = `# ${data.name || 'Buffer Recipe'}\n\n`;
		exportText += `**Total Volume:** ${data.totalVolume} ${data.volumeUnit || this.settings.defaultVolumeUnit}\n\n`;
		exportText += `## Components\n\n`;

		result.components.forEach((component, index) => {
			exportText += `${index + 1}. **${component.reagent.name}**: ${component.optimizedVolumeDisplay}`;
			if (component.percentOfTotal) {
				exportText += ` (${component.percentOfTotal.toFixed(1)}%)`;
			}
			exportText += `\n`;
			exportText += `   - Stock: ${component.stockConcentration} ${component.stockConcentrationUnit}\n`;
			exportText += `   - Final: ${component.finalConcentration} ${component.finalConcentrationUnit}\n`;
			if (component.lotNumber) {
				exportText += `   - Lot: ${component.lotNumber}\n`;
			}
			exportText += `\n`;
		});

		if (result.solventVolume > 0) {
			const solventDisplay = ConversionUtils.optimizeVolumeDisplay(result.solventVolume, data.volumeUnit || this.settings.defaultVolumeUnit);
			exportText += `**Solvent**: Add water to ${solventDisplay.value.toFixed(this.settings.decimalPlaces)} ${solventDisplay.unit}\n\n`;
		}

		if (result.warnings.length > 0) {
			exportText += `## Warnings\n\n`;
			result.warnings.forEach(warning => {
				exportText += `- ${warning.message}\n`;
			});
			exportText += `\n`;
		}

		exportText += `*Generated by Buffer Calc on ${new Date().toLocaleDateString()}*\n`;

		// Copy to clipboard
		navigator.clipboard.writeText(exportText).then(() => {
			new Notice('Recipe exported to clipboard');
		}).catch(() => {
			new Notice('Failed to copy recipe to clipboard');
		});
	}
}