import { Modal, App, Setting, Notice } from 'obsidian';
import {
	RecipeTemplate,
	TemplateCategory,
	BufferCalcSettings
} from '../types';
import { TemplateDatabase } from '../data/templates';

export class TemplateSelectorModal extends Modal {
	private templateDatabase: TemplateDatabase;
	private settings: BufferCalcSettings;
	private onTemplateSelect: (template: RecipeTemplate) => void;
	private selectedCategory: TemplateCategory | 'all' = 'all';
	private selectedType: 'buffer' | 'stock' | 'dilution' | 'all' = 'all';
	private searchQuery: string = '';

	constructor(
		app: App,
		settings: BufferCalcSettings,
		onTemplateSelect: (template: RecipeTemplate) => void
	) {
		super(app);
		this.settings = settings;
		this.onTemplateSelect = onTemplateSelect;
		this.templateDatabase = TemplateDatabase.getInstance();
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('buffer-calc-template-selector');

		this.setTitle('レシピテンプレートを選択');

		this.createFilterControls();
		this.createTemplateList();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private createFilterControls(): void {
		const { contentEl } = this;

		const filtersContainer = contentEl.createEl('div', { cls: 'template-filters' });

		// Search input
		const searchContainer = filtersContainer.createEl('div', { cls: 'filter-group' });
		searchContainer.createEl('label', { text: '検索:' });
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'テンプレート名、説明、タグで検索...',
			cls: 'template-search-input'
		});

		searchInput.addEventListener('input', () => {
			this.searchQuery = searchInput.value;
			this.updateTemplateList();
		});

		// Category filter
		const categoryContainer = filtersContainer.createEl('div', { cls: 'filter-group' });
		categoryContainer.createEl('label', { text: 'カテゴリー:' });
		const categorySelect = categoryContainer.createEl('select', { cls: 'template-filter-select' });
		
		categorySelect.createEl('option', { value: 'all', text: 'すべて' });
		this.templateDatabase.getAllCategories().forEach(category => {
			const option = categorySelect.createEl('option', {
				value: category,
				text: this.templateDatabase.getCategoryDisplayName(category)
			});
		});

		categorySelect.addEventListener('change', () => {
			this.selectedCategory = categorySelect.value as TemplateCategory | 'all';
			this.updateTemplateList();
		});

		// Type filter
		const typeContainer = filtersContainer.createEl('div', { cls: 'filter-group' });
		typeContainer.createEl('label', { text: 'タイプ:' });
		const typeSelect = typeContainer.createEl('select', { cls: 'template-filter-select' });

		typeSelect.createEl('option', { value: 'all', text: 'すべて' });
		typeSelect.createEl('option', { value: 'buffer', text: 'バッファー' });
		typeSelect.createEl('option', { value: 'stock', text: 'ストック溶液' });
		typeSelect.createEl('option', { value: 'dilution', text: '希釈計算' });

		typeSelect.addEventListener('change', () => {
			this.selectedType = typeSelect.value as 'buffer' | 'stock' | 'dilution' | 'all';
			this.updateTemplateList();
		});
	}

	private createTemplateList(): void {
		const { contentEl } = this;

		// Create container for template list
		let listContainer = contentEl.querySelector('.template-list-container') as HTMLElement;
		if (listContainer) {
			listContainer.remove();
		}

		listContainer = contentEl.createEl('div', { cls: 'template-list-container' });
		this.updateTemplateList();
	}

	private updateTemplateList(): void {
		const listContainer = this.contentEl.querySelector('.template-list-container') as HTMLElement;
		if (!listContainer) return;

		listContainer.empty();

		const templates = this.getFilteredTemplates();

		if (templates.length === 0) {
			listContainer.createEl('div', {
				text: '条件に一致するテンプレートが見つかりません',
				cls: 'template-no-results'
			});
			return;
		}

		// Group templates by category
		const templatesByCategory = this.groupTemplatesByCategory(templates);

		Object.entries(templatesByCategory).forEach(([category, categoryTemplates]) => {
			if (categoryTemplates.length === 0) return;

			const categorySection = listContainer.createEl('div', { cls: 'template-category-section' });
			
			categorySection.createEl('h3', { 
				text: this.templateDatabase.getCategoryDisplayName(category as TemplateCategory),
				cls: 'template-category-title'
			});

			const templatesGrid = categorySection.createEl('div', { cls: 'templates-grid' });

			categoryTemplates.forEach(template => {
				this.createTemplateCard(templatesGrid, template);
			});
		});
	}

	private getFilteredTemplates(): RecipeTemplate[] {
		let templates = this.templateDatabase.getBuiltInTemplates();

		// Apply search filter
		if (this.searchQuery) {
			templates = this.templateDatabase.searchTemplates(this.searchQuery);
		}

		// Apply category filter
		if (this.selectedCategory !== 'all') {
			templates = templates.filter(template => template.category === this.selectedCategory);
		}

		// Apply type filter
		if (this.selectedType !== 'all') {
			templates = templates.filter(template => template.type === this.selectedType);
		}

		return templates;
	}

	private groupTemplatesByCategory(templates: RecipeTemplate[]): Record<string, RecipeTemplate[]> {
		const grouped: Record<string, RecipeTemplate[]> = {};

		templates.forEach(template => {
			const category = template.category;
			if (!grouped[category]) {
				grouped[category] = [];
			}
			grouped[category].push(template);
		});

		return grouped;
	}

	private createTemplateCard(container: HTMLElement, template: RecipeTemplate): void {
		const card = container.createEl('div', { cls: 'template-card' });
		card.setAttribute('data-template-id', template.id);

		// Template header
		const header = card.createEl('div', { cls: 'template-card-header' });
		header.createEl('h4', { text: template.name, cls: 'template-card-title' });
		
		const badges = header.createEl('div', { cls: 'template-badges' });
		badges.createEl('span', {
			text: template.type,
			cls: `template-badge template-badge-${template.type}`
		});
		badges.createEl('span', {
			text: template.difficulty,
			cls: `template-badge template-badge-${template.difficulty}`
		});

		// Template description
		card.createEl('p', { text: template.description, cls: 'template-card-description' });

		// Template details
		const details = card.createEl('div', { cls: 'template-card-details' });
		
		if (template.estimatedTime) {
			const timeDetail = details.createEl('div', { cls: 'template-detail' });
			timeDetail.createEl('span', { text: '⏱️', cls: 'template-detail-icon' });
			timeDetail.createEl('span', { text: template.estimatedTime });
		}

		if (template.author) {
			const authorDetail = details.createEl('div', { cls: 'template-detail' });
			authorDetail.createEl('span', { text: '👤', cls: 'template-detail-icon' });
			authorDetail.createEl('span', { text: template.author });
		}

		// Template tags
		if (template.tags.length > 0) {
			const tagsContainer = card.createEl('div', { cls: 'template-tags' });
			template.tags.slice(0, 3).forEach(tag => {
				tagsContainer.createEl('span', { text: tag, cls: 'template-tag' });
			});
			if (template.tags.length > 3) {
				tagsContainer.createEl('span', { text: `+${template.tags.length - 3}`, cls: 'template-tag template-tag-more' });
			}
		}

		// Template actions
		const actions = card.createEl('div', { cls: 'template-card-actions' });
		
		const previewButton = actions.createEl('button', {
			text: 'プレビュー',
			cls: 'template-action-button template-preview-button'
		});

		const useButton = actions.createEl('button', {
			text: '使用する',
			cls: 'template-action-button template-use-button mod-cta'
		});

		// Event listeners
		previewButton.addEventListener('click', () => {
			this.showTemplatePreview(template);
		});

		useButton.addEventListener('click', () => {
			this.selectTemplate(template);
		});

		// Make the entire card clickable for selection
		card.addEventListener('click', (e) => {
			if (e.target === card || (e.target as HTMLElement).classList.contains('template-card-title') || 
				(e.target as HTMLElement).classList.contains('template-card-description')) {
				this.selectTemplate(template);
			}
		});
	}

	private showTemplatePreview(template: RecipeTemplate): void {
		const previewModal = new TemplatePreviewModal(this.app, template);
		previewModal.open();
	}

	private selectTemplate(template: RecipeTemplate): void {
		this.onTemplateSelect(template);
		this.close();
		new Notice(`テンプレート「${template.name}」を適用しました`);
	}
}

class TemplatePreviewModal extends Modal {
	private template: RecipeTemplate;

	constructor(app: App, template: RecipeTemplate) {
		super(app);
		this.template = template;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('template-preview-modal');

		this.setTitle(`テンプレートプレビュー: ${this.template.name}`);

		// Template info
		const infoSection = contentEl.createEl('div', { cls: 'template-preview-info' });
		
		infoSection.createEl('h3', { text: this.template.name });
		infoSection.createEl('p', { text: this.template.description });

		const metaInfo = infoSection.createEl('div', { cls: 'template-meta-info' });
		metaInfo.createEl('span', { text: `タイプ: ${this.template.type}` });
		metaInfo.createEl('span', { text: `難易度: ${this.template.difficulty}` });
		if (this.template.estimatedTime) {
			metaInfo.createEl('span', { text: `所要時間: ${this.template.estimatedTime}` });
		}

		// Template content preview
		const contentSection = contentEl.createEl('div', { cls: 'template-preview-content' });
		contentSection.createEl('h4', { text: 'テンプレート内容:' });

		const codeBlock = contentSection.createEl('pre', { cls: 'template-preview-code' });
		const yamlContent = this.generateYAMLPreview(this.template);
		codeBlock.createEl('code', { text: yamlContent });

		// Notes and references
		if (this.template.template.notes || this.template.references) {
			const notesSection = contentEl.createEl('div', { cls: 'template-preview-notes' });
			
			if (this.template.template.notes) {
				notesSection.createEl('h4', { text: '注意事項:' });
				notesSection.createEl('p', { text: this.template.template.notes });
			}

			if (this.template.references && this.template.references.length > 0) {
				notesSection.createEl('h4', { text: '参考文献:' });
				const refList = notesSection.createEl('ul');
				this.template.references.forEach(ref => {
					refList.createEl('li', { text: ref });
				});
			}
		}

		// Close button
		const closeButton = contentEl.createEl('button', {
			text: '閉じる',
			cls: 'template-preview-close-button mod-cta'
		});
		closeButton.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private generateYAMLPreview(template: RecipeTemplate): string {
		const data = template.template;
		let yaml = '';

		if (template.type === 'buffer') {
			const bufferData = data as any;
			yaml = `\`\`\`buffer
name: ${bufferData.name}
totalVolume: ${bufferData.totalVolume}
volumeUnit: ${bufferData.volumeUnit}
components:`;
			if (bufferData.components) {
				bufferData.components.forEach((comp: any) => {
					yaml += `
  - name: ${comp.name}
    stockConc: ${comp.stockConc}
    stockUnit: ${comp.stockUnit}
    finalConc: ${comp.finalConc}
    finalUnit: ${comp.finalUnit}`;
				});
			}
			if (bufferData.notes) {
				yaml += `
notes: ${bufferData.notes}`;
			}
			yaml += '\n```';
		} else if (template.type === 'stock') {
			const stockData = data as any;
			yaml = `\`\`\`stock
name: ${stockData.name}
reagentName: ${stockData.reagentName}
molecularWeight: ${stockData.molecularWeight}
targetConcentration: ${stockData.targetConcentration}
concentrationUnit: ${stockData.concentrationUnit}
volume: ${stockData.volume}
volumeUnit: ${stockData.volumeUnit}`;
			if (stockData.purity) {
				yaml += `
purity: ${stockData.purity}`;
			}
			if (stockData.solvent) {
				yaml += `
solvent: ${stockData.solvent}`;
			}
			if (stockData.notes) {
				yaml += `
notes: ${stockData.notes}`;
			}
			yaml += '\n```';
		} else if (template.type === 'dilution') {
			const dilutionData = data as any;
			yaml = `\`\`\`dilution
name: ${dilutionData.name}
stockConcentration: ${dilutionData.stockConcentration}
stockConcentrationUnit: ${dilutionData.stockConcentrationUnit}
finalConcentration: ${dilutionData.finalConcentration}
finalConcentrationUnit: ${dilutionData.finalConcentrationUnit}
finalVolume: ${dilutionData.finalVolume}
volumeUnit: ${dilutionData.volumeUnit}`;
			if (dilutionData.notes) {
				yaml += `
notes: ${dilutionData.notes}`;
			}
			yaml += '\n```';
		}

		return yaml;
	}
}