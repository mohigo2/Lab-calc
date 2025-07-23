import {
	Plugin,
	MarkdownPostProcessorContext,
	PluginSettingTab,
	Setting,
	App,
	Modal,
	Notice
} from 'obsidian';

import {
	BufferCalcSettings,
	BufferCalcBlockContent,
	BufferCalcData,
	CalculationResult,
	DEFAULT_SETTINGS,
	Reagent
} from './types';

import { BufferCalcSettingTab } from './settings';
import { CalculationEngine } from './calculations/engine';
import { ReagentDatabase } from './data/reagents';
import { BufferCalcUI } from './ui/buffer-calc-ui';
import { TemplateDatabase } from './data/templates';
import { TemplateSelectorModal } from './ui/template-selector';

export default class BufferCalcPlugin extends Plugin {
	settings: BufferCalcSettings;
	calculationEngine: CalculationEngine;
	reagentDatabase: ReagentDatabase;
	private settingsTab: BufferCalcSettingTab;

	async onload() {
		console.log('Loading Buffer Calc plugin');

		// Load plugin settings
		await this.loadSettings();

		// Initialize calculation engine and reagent database
		this.calculationEngine = new CalculationEngine(this.settings);
		this.reagentDatabase = new ReagentDatabase();
		await this.reagentDatabase.initialize();

		// Register code block processors for different calculation types
		this.registerMarkdownCodeBlockProcessor(
			'buffer', 
			this.bufferCalcBlockHandler.bind(this, 'buffer'),
			100
		);
		this.registerMarkdownCodeBlockProcessor(
			'buffer-calc', 
			this.bufferCalcBlockHandler.bind(this, 'buffer'),
			100
		);
		this.registerMarkdownCodeBlockProcessor(
			'stock', 
			this.bufferCalcBlockHandler.bind(this, 'stock'),
			100
		);
		this.registerMarkdownCodeBlockProcessor(
			'stock-solution', 
			this.bufferCalcBlockHandler.bind(this, 'stock'),
			100
		);
		this.registerMarkdownCodeBlockProcessor(
			'dilution', 
			this.bufferCalcBlockHandler.bind(this, 'dilution'),
			100
		);

		// Add settings tab
		this.settingsTab = new BufferCalcSettingTab(this.app, this);
		this.addSettingTab(this.settingsTab);

		// Register commands
		this.addCommand({
			id: 'insert-buffer-calc',
			name: 'Insert Buffer Calculation',
			callback: () => {
				this.insertBufferCalcBlock();
			}
		});

		this.addCommand({
			id: 'open-recipe-manager',
			name: 'Open Recipe Manager',
			callback: () => {
				new RecipeManagerModal(this.app, this).open();
			}
		});

		this.addCommand({
			id: 'insert-saved-recipe',
			name: 'Insert Saved Recipe',
			callback: () => {
				new RecipeInsertModal(this.app, this).open();
			}
		});

		this.addCommand({
			id: 'manage-reagents',
			name: 'Manage Custom Reagents',
			callback: () => {
				new ReagentManagerModal(this.app, this).open();
			}
		});

		this.addCommand({
			id: 'insert-from-template',
			name: 'Insert Recipe from Template',
			callback: () => {
				this.insertFromTemplate();
			}
		});

		console.log('Buffer Calc plugin loaded successfully');
	}

	onunload() {
		console.log('Unloading Buffer Calc plugin');
	}

	async bufferCalcBlockHandler(
		blockType: string,
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		try {
			// Parse the block content
			const blockContent = this.parseBlockContent(blockType, source);
			console.log('Parsed block content:', blockContent);
			
			// Create UI container
			el.empty();
			el.addClass('buffer-calc-container');
			
			// Initialize the UI component
			const ui = new BufferCalcUI(
				el,
				blockContent,
				this.calculationEngine,
				this.reagentDatabase,
				this.settings,
				ctx
			);

			await ui.render();
			
		} catch (error) {
			console.error('Buffer Calc block handler error:', error);
			el.createEl('div', {
				text: `Error processing buffer calculation: ${error.message}`,
				cls: 'buffer-calc-error'
			});
		}
	}

	private parseBlockContent(blockType: string, source: string): BufferCalcBlockContent {
		try {
			console.log(`Parsing ${blockType} block source:`, source);
			
			// Handle empty blocks
			if (!source.trim()) {
				console.log('Empty source, using default content');
				return this.getDefaultBlockContent(blockType);
			}

			// Try to parse as YAML first, then JSON, then plain text
			let parsedData: any;
			
			// Simple YAML-like parsing for common cases
			if (source.includes(':') && !source.trim().startsWith('{')) {
				console.log('Parsing as YAML');
				parsedData = this.parseSimpleYAML(source);
			} else {
				// Try JSON parsing
				try {
					console.log('Parsing as JSON');
					parsedData = JSON.parse(source);
				} catch {
					// Fallback to simple key-value parsing
					console.log('Parsing as key-value pairs');
					parsedData = this.parseKeyValuePairs(source);
				}
			}

			console.log('Parsed data:', parsedData);
			console.log('Data type:', typeof parsedData);
			console.log('Data keys:', Object.keys(parsedData));
			if (parsedData.components) {
				console.log('Components type:', typeof parsedData.components, Array.isArray(parsedData.components));
			}

			const result = {
				type: blockType as 'buffer' | 'stock' | 'dilution',
				data: parsedData,
				options: parsedData.options || {}
			};
			
			console.log(`Final parsed block content for ${blockType}:`, result);
			return result;

		} catch (error) {
			console.error('Error parsing block content:', error);
			return this.getDefaultBlockContent(blockType);
		}
	}

	private parseSimpleYAML(source: string): any {
		const lines = source.split('\n');
		const result: any = { components: [] };
		let currentComponent: any = null;
		let inComponentsSection = false;

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (!trimmedLine || trimmedLine.startsWith('#')) continue;

			// Check if we're entering components section
			if (trimmedLine === 'components:') {
				inComponentsSection = true;
				continue;
			}

			// Handle component items (lines starting with -)
			if (trimmedLine.startsWith('-') && inComponentsSection) {
				// Save previous component
				if (currentComponent) {
					result.components.push(currentComponent);
				}
				// Start new component
				currentComponent = {};
				// Handle inline component properties
				const afterDash = trimmedLine.substring(1).trim();
				if (afterDash.includes(':')) {
					const [key, ...valueParts] = afterDash.split(':');
					const value = valueParts.join(':').trim();
					const cleanKey = key.trim();
					currentComponent[cleanKey] = isNaN(Number(value)) ? value : Number(value);
				}
				continue;
			}

			// Handle properties
			if (trimmedLine.includes(':')) {
				const [key, ...valueParts] = trimmedLine.split(':');
				const value = valueParts.join(':').trim();
				const cleanKey = key.trim();

				// If we're in a component and this line is indented, it's a component property
				if (currentComponent && inComponentsSection && line.startsWith('    ')) {
					currentComponent[cleanKey] = isNaN(Number(value)) ? value : Number(value);
				} else if (!inComponentsSection || !line.startsWith('    ')) {
					// Top-level property or end of components section
					if (cleanKey !== 'components') {
						inComponentsSection = false;
						result[cleanKey] = isNaN(Number(value)) ? value : Number(value);
					}
				}
			}
		}

		// Don't forget the last component
		if (currentComponent) {
			result.components.push(currentComponent);
		}

		// Ensure components is always an array
		if (!Array.isArray(result.components)) {
			result.components = [];
		}

		return result;
	}

	private parseKeyValuePairs(source: string): any {
		const result: any = {};
		const lines = source.split('\n');

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (!trimmedLine) continue;

			const colonIndex = trimmedLine.indexOf(':');
			if (colonIndex > 0) {
				const key = trimmedLine.substring(0, colonIndex).trim();
				const value = trimmedLine.substring(colonIndex + 1).trim();
				result[key] = isNaN(Number(value)) ? value : Number(value);
			}
		}

		return result;
	}

	private getDefaultBlockContent(blockType: string): BufferCalcBlockContent {
		const defaultData: BufferCalcData = blockType === 'buffer' ? {
			totalVolume: 1000,
			volumeUnit: this.settings.defaultVolumeUnit,
			components: []
		} : blockType === 'stock' ? {
			reagentName: '',
			targetConcentration: 100,
			concentrationUnit: this.settings.defaultConcentrationUnit,
			volume: 10,
			volumeUnit: this.settings.defaultVolumeUnit
		} : {
			stockConcentration: 1000,
			stockConcentrationUnit: this.settings.defaultConcentrationUnit,
			finalConcentration: 100,
			finalConcentrationUnit: this.settings.defaultConcentrationUnit,
			finalVolume: 100,
			volumeUnit: this.settings.defaultVolumeUnit
		};

		return {
			type: blockType as 'buffer' | 'stock' | 'dilution',
			data: defaultData
		};
	}

	private insertBufferCalcBlock() {
		const activeView = this.app.workspace.getActiveViewOfType(null as any);
		
		if (activeView && 'editor' in activeView) {
			const editor = (activeView as any).editor;
			const cursor = editor.getCursor();
			
			const template = `\`\`\`buffer
name: My Buffer
totalVolume: 1000
volumeUnit: mL
components:
  - name: Tris-HCl
    stockConc: 1
    stockUnit: M
    finalConc: 50
    finalUnit: mM
  - name: NaCl
    stockConc: 5
    stockUnit: M
    finalConc: 150
    finalUnit: mM
\`\`\``;

			editor.replaceRange(template, cursor);
			editor.setCursor(cursor.line + 1, 0);
		} else {
			new Notice('Please open a note to insert buffer calculation');
		}
	}

	private insertFromTemplate() {
		const templateSelector = new TemplateSelectorModal(
			this.app,
			this.settings,
			(template) => {
				this.insertTemplateIntoEditor(template);
			}
		);
		templateSelector.open();
	}

	private insertTemplateIntoEditor(template: any) {
		const activeView = this.app.workspace.getActiveViewOfType(null as any);
		
		if (activeView && 'editor' in activeView) {
			const editor = (activeView as any).editor;
			const cursor = editor.getCursor();
			
			const yamlContent = this.templateToYAML(template);
			editor.replaceRange(yamlContent, cursor);
			editor.setCursor(cursor.line + 1, 0);
		} else {
			new Notice('Please open a note to insert template');
		}
	}

	private templateToYAML(template: any): string {
		const data = template.template;
		let yaml = '';

		if (template.type === 'buffer') {
			yaml = `\`\`\`buffer
name: ${data.name}
totalVolume: ${data.totalVolume}
volumeUnit: ${data.volumeUnit}
components:`;
			if (data.components) {
				data.components.forEach((comp: any) => {
					yaml += `
  - name: ${comp.name}
    stockConc: ${comp.stockConc}
    stockUnit: ${comp.stockUnit}
    finalConc: ${comp.finalConc}
    finalUnit: ${comp.finalUnit}`;
				});
			}
			if (data.notes) {
				yaml += `
notes: ${data.notes}`;
			}
			yaml += '\n```';
		} else if (template.type === 'stock') {
			yaml = `\`\`\`stock
name: ${data.name}
reagentName: ${data.reagentName}
molecularWeight: ${data.molecularWeight}
targetConcentration: ${data.targetConcentration}
concentrationUnit: ${data.concentrationUnit}
volume: ${data.volume}
volumeUnit: ${data.volumeUnit}`;
			if (data.purity) {
				yaml += `
purity: ${data.purity}`;
			}
			if (data.solvent) {
				yaml += `
solvent: ${data.solvent}`;
			}
			if (data.notes) {
				yaml += `
notes: ${data.notes}`;
			}
			yaml += '\n```';
		} else if (template.type === 'dilution') {
			yaml = `\`\`\`dilution
name: ${data.name}
stockConcentration: ${data.stockConcentration}
stockConcentrationUnit: ${data.stockConcentrationUnit}
finalConcentration: ${data.finalConcentration}
finalConcentrationUnit: ${data.finalConcentrationUnit}
finalVolume: ${data.finalVolume}
volumeUnit: ${data.volumeUnit}`;
			if (data.notes) {
				yaml += `
notes: ${data.notes}`;
			}
			yaml += '\n```';
		}

		return yaml;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		
		// Update calculation engine with new settings
		if (this.calculationEngine) {
			this.calculationEngine.updateSettings(this.settings);
		}

		// Refresh all rendered buffer calc blocks
		this.app.workspace.trigger('buffer-calc:settings-changed');
	}
}

class RecipeManagerModal extends Modal {
	plugin: BufferCalcPlugin;

	constructor(app: App, plugin: BufferCalcPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Recipe Manager' });
		contentEl.createEl('p', { text: 'Recipe management functionality will be implemented here.' });
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class RecipeInsertModal extends Modal {
	plugin: BufferCalcPlugin;

	constructor(app: App, plugin: BufferCalcPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Insert Saved Recipe' });
		contentEl.createEl('p', { text: 'Recipe insertion functionality will be implemented here.' });
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class ReagentManagerModal extends Modal {
	plugin: BufferCalcPlugin;

	constructor(app: App, plugin: BufferCalcPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Manage Custom Reagents' });
		contentEl.createEl('p', { text: 'Reagent management functionality will be implemented here.' });
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}