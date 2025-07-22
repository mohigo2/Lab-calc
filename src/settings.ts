import {
	App,
	PluginSettingTab,
	Setting,
	DropdownComponent,
	SliderComponent,
	ToggleComponent,
	TextComponent,
	ButtonComponent,
	Notice,
	Modal
} from 'obsidian';

import BufferCalcPlugin from './main';
import {
	BufferCalcSettings,
	VolumeUnit,
	ConcentrationUnit,
	Reagent
} from './types';

export class BufferCalcSettingTab extends PluginSettingTab {
	plugin: BufferCalcPlugin;

	constructor(app: App, plugin: BufferCalcPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Header
		containerEl.createEl('h1', { text: 'Buffer Calc Settings' });

		this.addGeneralSettings();
		this.addUnitsSettings();
		this.addDisplaySettings();
		this.addReagentSettings();
		this.addDataManagement();
	}

	private addGeneralSettings(): void {
		const { containerEl } = this;

		// General Settings Section
		containerEl.createEl('h2', { text: 'General Settings' });

		new Setting(containerEl)
			.setName('Enable auto-suggestions')
			.setDesc('Enable reagent name suggestions while typing')
			.addToggle((toggle: ToggleComponent) => {
				toggle
					.setValue(this.plugin.settings.enableSuggestions)
					.onChange(async (value: boolean) => {
						this.plugin.settings.enableSuggestions = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Show calculation steps')
			.setDesc('Display detailed calculation steps in results')
			.addToggle((toggle: ToggleComponent) => {
				toggle
					.setValue(this.plugin.settings.showCalculationSteps)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showCalculationSteps = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Decimal places')
			.setDesc('Number of decimal places to show in results')
			.addSlider((slider: SliderComponent) => {
				slider
					.setLimits(0, 5, 1)
					.setValue(this.plugin.settings.decimalPlaces)
					.setDynamicTooltip()
					.onChange(async (value: number) => {
						this.plugin.settings.decimalPlaces = value;
						await this.plugin.saveSettings();
					});
			});
	}

	private addUnitsSettings(): void {
		const { containerEl } = this;

		// Units Settings Section
		containerEl.createEl('h2', { text: 'Default Units' });

		new Setting(containerEl)
			.setName('Default volume unit')
			.setDesc('Default unit for volumes in calculations')
			.addDropdown((dropdown: DropdownComponent) => {
				const options: Record<string, string> = {
					[VolumeUnit.LITER]: 'Liter (L)',
					[VolumeUnit.MILLILITER]: 'Milliliter (mL)',
					[VolumeUnit.MICROLITER]: 'Microliter (µL)',
					[VolumeUnit.NANOLITER]: 'Nanoliter (nL)'
				};

				for (const [key, value] of Object.entries(options)) {
					dropdown.addOption(key, value);
				}

				dropdown
					.setValue(this.plugin.settings.defaultVolumeUnit)
					.onChange(async (value: string) => {
						this.plugin.settings.defaultVolumeUnit = value as VolumeUnit;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Default concentration unit')
			.setDesc('Default unit for concentrations in calculations')
			.addDropdown((dropdown: DropdownComponent) => {
				const options: Record<string, string> = {
					[ConcentrationUnit.MOLAR]: 'Molar (M)',
					[ConcentrationUnit.MILLIMOLAR]: 'Millimolar (mM)',
					[ConcentrationUnit.MICROMOLAR]: 'Micromolar (µM)',
					[ConcentrationUnit.NANOMOLAR]: 'Nanomolar (nM)',
					[ConcentrationUnit.PERCENT_W_V]: 'Percent (w/v)',
					[ConcentrationUnit.PERCENT_W_W]: 'Percent (w/w)',
					[ConcentrationUnit.PERCENT_V_V]: 'Percent (v/v)',
					[ConcentrationUnit.MG_ML]: 'mg/mL',
					[ConcentrationUnit.UG_ML]: 'µg/mL'
				};

				for (const [key, value] of Object.entries(options)) {
					dropdown.addOption(key, value);
				}

				dropdown
					.setValue(this.plugin.settings.defaultConcentrationUnit)
					.onChange(async (value: string) => {
						this.plugin.settings.defaultConcentrationUnit = value as ConcentrationUnit;
						await this.plugin.saveSettings();
					});
			});
	}

	private addDisplaySettings(): void {
		const { containerEl } = this;

		// Display Settings Section
		containerEl.createEl('h2', { text: 'Display Settings' });

		new Setting(containerEl)
			.setName('Default template')
			.setDesc('Default template for new buffer calculations')
			.addDropdown((dropdown: DropdownComponent) => {
				dropdown.addOption('buffer', 'Buffer Preparation');
				dropdown.addOption('stock', 'Stock Solution');
				dropdown.addOption('dilution', 'Serial Dilution');

				dropdown
					.setValue(this.plugin.settings.defaultTemplate)
					.onChange(async (value: string) => {
						this.plugin.settings.defaultTemplate = value;
						await this.plugin.saveSettings();
					});
			});
	}

	private addReagentSettings(): void {
		const { containerEl } = this;

		// Custom Reagents Section
		containerEl.createEl('h2', { text: 'Custom Reagents' });

		const reagentContainer = containerEl.createEl('div', { cls: 'buffer-calc-reagent-list' });

		const updateReagentList = () => {
			reagentContainer.empty();

			if (this.plugin.settings.customReagents.length === 0) {
				reagentContainer.createEl('p', { 
					text: 'No custom reagents added yet.',
					cls: 'buffer-calc-no-reagents'
				});
			} else {
				this.plugin.settings.customReagents.forEach((reagent, index) => {
					const reagentEl = reagentContainer.createEl('div', { cls: 'buffer-calc-reagent-item' });

					const infoEl = reagentEl.createEl('div', { cls: 'buffer-calc-reagent-info' });
					infoEl.createEl('strong', { text: reagent.name });
					infoEl.createEl('span', { text: ` (MW: ${reagent.molecularWeight} g/mol)` });

					const actionsEl = reagentEl.createEl('div', { cls: 'buffer-calc-reagent-actions' });
					
					const editBtn = actionsEl.createEl('button', { text: 'Edit', cls: 'mod-cta' });
					editBtn.addEventListener('click', () => {
						this.openReagentEditor(reagent, index, updateReagentList);
					});

					const deleteBtn = actionsEl.createEl('button', { text: 'Delete', cls: 'mod-destructive' });
					deleteBtn.addEventListener('click', async () => {
						this.plugin.settings.customReagents.splice(index, 1);
						await this.plugin.saveSettings();
						updateReagentList();
						new Notice('Reagent deleted');
					});
				});
			}
		};

		updateReagentList();

		new Setting(containerEl)
			.setName('Add custom reagent')
			.setDesc('Add a new reagent to your personal database')
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText('Add Reagent')
					.setClass('mod-cta')
					.onClick(() => {
						this.openReagentEditor(null, -1, updateReagentList);
					});
			});
	}

	private addDataManagement(): void {
		const { containerEl } = this;

		// Data Management Section
		containerEl.createEl('h2', { text: 'Data Management' });

		new Setting(containerEl)
			.setName('Export settings')
			.setDesc('Export your plugin settings to a file')
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText('Export')
					.onClick(() => {
						this.exportSettings();
					});
			});

		new Setting(containerEl)
			.setName('Import settings')
			.setDesc('Import plugin settings from a file')
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText('Import')
					.onClick(() => {
						this.importSettings();
					});
			});

		new Setting(containerEl)
			.setName('Reset to defaults')
			.setDesc('Reset all settings to their default values')
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText('Reset')
					.setClass('mod-destructive')
					.onClick(async () => {
						if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
							this.plugin.settings = { ...this.plugin.settings, ...require('./types').DEFAULT_SETTINGS };
							await this.plugin.saveSettings();
							this.display();
							new Notice('Settings reset to defaults');
						}
					});
			});
	}

	private openReagentEditor(reagent: Reagent | null, index: number, callback: () => void): void {
		const modal = new ReagentEditorModal(
			this.app,
			reagent,
			async (updatedReagent: Reagent) => {
				if (index >= 0) {
					// Edit existing
					this.plugin.settings.customReagents[index] = updatedReagent;
				} else {
					// Add new
					this.plugin.settings.customReagents.push(updatedReagent);
				}
				await this.plugin.saveSettings();
				callback();
				new Notice(`Reagent ${reagent ? 'updated' : 'added'} successfully`);
			}
		);
		modal.open();
	}

	private async exportSettings(): Promise<void> {
		try {
			const data = JSON.stringify(this.plugin.settings, null, 2);
			const blob = new Blob([data], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			
			const a = document.createElement('a');
			a.href = url;
			a.download = 'buffer-calc-settings.json';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			
			new Notice('Settings exported successfully');
		} catch (error) {
			new Notice('Failed to export settings');
			console.error('Export error:', error);
		}
	}

	private async importSettings(): Promise<void> {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		
		input.onchange = (e: any) => {
			const file = e.target.files[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = async (e: any) => {
				try {
					const imported = JSON.parse(e.target.result);
					this.plugin.settings = { ...this.plugin.settings, ...imported };
					await this.plugin.saveSettings();
					this.display();
					new Notice('Settings imported successfully');
				} catch (error) {
					new Notice('Invalid settings file');
					console.error('Import error:', error);
				}
			};
			reader.readAsText(file);
		};

		input.click();
	}
}

class ReagentEditorModal extends Modal {
	reagent: Reagent | null;
	onSave: (reagent: Reagent) => void;
	private nameInput: TextComponent;
	private mwInput: TextComponent;
	private casInput: TextComponent;
	private categoryInput: TextComponent;

	constructor(app: App, reagent: Reagent | null, onSave: (reagent: Reagent) => void) {
		super(app);
		this.reagent = reagent;
		this.onSave = onSave;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: this.reagent ? 'Edit Reagent' : 'Add New Reagent' });

		// Name field
		new Setting(contentEl)
			.setName('Reagent name')
			.setDesc('Common name of the reagent')
			.addText((text: TextComponent) => {
				this.nameInput = text;
				text.setValue(this.reagent?.name || '')
					.setPlaceholder('e.g., Tris-HCl');
			});

		// Molecular weight field
		new Setting(contentEl)
			.setName('Molecular weight')
			.setDesc('Molecular weight in g/mol')
			.addText((text: TextComponent) => {
				this.mwInput = text;
				text.setValue(this.reagent?.molecularWeight?.toString() || '')
					.setPlaceholder('e.g., 157.6');
			});

		// CAS number (optional)
		new Setting(contentEl)
			.setName('CAS number')
			.setDesc('CAS registry number (optional)')
			.addText((text: TextComponent) => {
				this.casInput = text;
				text.setValue(this.reagent?.cas || '')
					.setPlaceholder('e.g., 77-86-1');
			});

		// Category (optional)
		new Setting(contentEl)
			.setName('Category')
			.setDesc('Reagent category (optional)')
			.addText((text: TextComponent) => {
				this.categoryInput = text;
				text.setValue(this.reagent?.category || '')
					.setPlaceholder('e.g., Buffer, Salt, Enzyme');
			});

		// Buttons
		const buttonContainer = contentEl.createEl('div', { cls: 'buffer-calc-modal-buttons' });

		const saveButton = buttonContainer.createEl('button', { text: 'Save', cls: 'mod-cta' });
		saveButton.addEventListener('click', () => this.save());

		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());
	}

	private save(): void {
		const name = this.nameInput.getValue().trim();
		const mw = parseFloat(this.mwInput.getValue());

		if (!name) {
			new Notice('Please enter a reagent name');
			return;
		}

		if (isNaN(mw) || mw <= 0) {
			new Notice('Please enter a valid molecular weight');
			return;
		}

		const reagent: Reagent = {
			name: name,
			molecularWeight: mw,
			cas: this.casInput.getValue().trim() || undefined,
			category: this.categoryInput.getValue().trim() || undefined
		};

		this.onSave(reagent);
		this.close();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}