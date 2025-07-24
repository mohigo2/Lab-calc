import { App, Modal, Setting, Notice, TextComponent, TextAreaComponent, ColorComponent } from 'obsidian';
import { ReagentCategory, CategoryStats, BufferCalcSettings } from '../types';
import { CategoryManager } from '../utils/category-manager';

export class ReagentCategoryModal extends Modal {
	private settings: BufferCalcSettings;
	private onSave: (settings: BufferCalcSettings) => void;
	private categories: ReagentCategory[] = [];
	private categoryStats: CategoryStats[] = [];

	constructor(
		app: App,
		settings: BufferCalcSettings,
		onSave: (settings: BufferCalcSettings) => void
	) {
		super(app);
		this.settings = settings;
		this.onSave = onSave;
		this.categories = CategoryManager.getAllCategories(settings);
		this.categoryStats = CategoryManager.generateCategoryStats(settings);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('reagent-category-modal');

		// タイトル
		contentEl.createEl('h2', { text: '試薬カテゴリー管理' });

		// 統計セクション
		this.renderStatsSection(contentEl);

		// カテゴリー一覧セクション
		this.renderCategoriesSection(contentEl);

		// 新規カテゴリー作成セクション
		this.renderCreateCategorySection(contentEl);

		// アクションボタン
		this.renderActionButtons(contentEl);
	}

	private renderStatsSection(container: HTMLElement) {
		const statsSection = container.createDiv('category-stats-section');
		statsSection.createEl('h3', { text: 'カテゴリー統計' });

		const statsGrid = statsSection.createDiv('stats-grid');
		
		// 総カテゴリー数
		const totalCard = statsGrid.createDiv('stat-card');
		totalCard.createDiv('stat-value').setText(this.categories.length.toString());
		totalCard.createDiv('stat-label').setText('総カテゴリー数');

		// カスタムカテゴリー数
		const customCount = this.categories.filter(cat => !cat.isBuiltIn).length;
		const customCard = statsGrid.createDiv('stat-card');
		customCard.createDiv('stat-value').setText(customCount.toString());
		customCard.createDiv('stat-label').setText('カスタムカテゴリー');

		// 試薬総数
		const totalReagents = this.settings.customReagents.length;
		const reagentCard = statsGrid.createDiv('stat-card');
		reagentCard.createDiv('stat-value').setText(totalReagents.toString());
		reagentCard.createDiv('stat-label').setText('登録試薬数');

		// 分類済み試薬数
		const categorizedReagents = this.settings.customReagents.filter(r => r.category).length;
		const categorizedCard = statsGrid.createDiv('stat-card');
		categorizedCard.createDiv('stat-value').setText(categorizedReagents.toString());
		categorizedCard.createDiv('stat-label').setText('分類済み試薬');
	}

	private renderCategoriesSection(container: HTMLElement) {
		const categoriesSection = container.createDiv('categories-section');
		categoriesSection.createEl('h3', { text: 'カテゴリー一覧' });

		const categoriesList = categoriesSection.createDiv('categories-list');

		this.categories.forEach(category => {
			const categoryItem = categoriesList.createDiv('category-item');
			
			// カテゴリーヘッダー
			const header = categoryItem.createDiv('category-header');
			
			const titleSection = header.createDiv('category-title-section');
			const icon = titleSection.createSpan('category-icon');
			icon.setText(category.icon || '📂');
			if (category.color) {
				icon.style.color = category.color;
			}
			
			const nameEl = titleSection.createSpan('category-name');
			nameEl.setText(category.name);
			
			if (category.isBuiltIn) {
				titleSection.createSpan('built-in-badge').setText('組み込み');
			}

			// 統計情報
			const stats = this.categoryStats.find(s => s.categoryId === category.id);
			const statsEl = header.createDiv('category-stats');
			statsEl.setText(`${stats?.reagentCount || 0} 個の試薬`);

			// アクション
			const actions = header.createDiv('category-actions');
			
			if (!category.isBuiltIn) {
				const editBtn = actions.createEl('button', { 
					text: '編集',
					cls: 'category-action-button'
				});
				editBtn.onclick = () => this.editCategory(category);

				const deleteBtn = actions.createEl('button', { 
					text: '削除',
					cls: 'category-action-button category-delete-button'
				});
				deleteBtn.onclick = () => this.deleteCategory(category);
			}

			// カテゴリー詳細
			if (category.description) {
				const description = categoryItem.createDiv('category-description');
				description.setText(category.description);
			}

			// 最近使用された試薬
			if (stats && stats.recentlyUsed.length > 0) {
				const recentSection = categoryItem.createDiv('category-recent');
				recentSection.createSpan('recent-label').setText('最近の試薬: ');
				const recentList = recentSection.createSpan('recent-reagents');
				recentList.setText(stats.recentlyUsed.slice(0, 3).join(', '));
				if (stats.recentlyUsed.length > 3) {
					recentList.appendText(` など ${stats.recentlyUsed.length} 個`);
				}
			}
		});
	}

	private renderCreateCategorySection(container: HTMLElement) {
		const createSection = container.createDiv('create-category-section');
		createSection.createEl('h3', { text: '新規カテゴリー作成' });

		let categoryName = '';
		let categoryDescription = '';
		let categoryColor = '#2196F3';
		let categoryIcon = '📂';

		new Setting(createSection)
			.setName('カテゴリー名')
			.setDesc('新しいカテゴリーの名前を入力してください')
			.addText(text => {
				text.onChange(value => categoryName = value);
				text.inputEl.placeholder = '例: マイカテゴリー';
			});

		new Setting(createSection)
			.setName('説明（オプション）')
			.setDesc('カテゴリーの説明を入力してください')
			.addTextArea(text => {
				text.onChange(value => categoryDescription = value);
				text.inputEl.placeholder = 'このカテゴリーの用途や特徴を説明...';
				text.inputEl.rows = 2;
			});

		new Setting(createSection)
			.setName('アイコン')
			.setDesc('カテゴリーを表すアイコン（絵文字）')
			.addText(text => {
				text.setValue(categoryIcon);
				text.onChange(value => categoryIcon = value || '📂');
				text.inputEl.placeholder = '📂';
				text.inputEl.style.width = '60px';
			});

		new Setting(createSection)
			.setName('色')
			.setDesc('カテゴリーのテーマカラー')
			.addColorPicker(color => {
				color.setValue(categoryColor);
				color.onChange(value => categoryColor = value);
			});

		const createButton = createSection.createEl('button', {
			text: 'カテゴリーを作成',
			cls: 'mod-cta'
		});

		createButton.onclick = () => {
			if (!categoryName.trim()) {
				new Notice('カテゴリー名を入力してください');
				return;
			}

			try {
				const newCategory = CategoryManager.createCategory(
					categoryName.trim(),
					categoryDescription.trim() || undefined,
					categoryColor,
					categoryIcon.trim()
				);

				this.settings = CategoryManager.addCategory(this.settings, newCategory);
				new Notice(`カテゴリー「${categoryName}」を作成しました`);
				this.refresh();
			} catch (error) {
				new Notice(`エラー: ${error.message}`);
			}
		};
	}

	private renderActionButtons(container: HTMLElement) {
		const buttonContainer = container.createDiv('modal-button-container');

		const saveButton = buttonContainer.createEl('button', {
			text: '変更を保存',
			cls: 'mod-cta'
		});

		saveButton.onclick = () => {
			this.onSave(this.settings);
			this.close();
		};

		const cancelButton = buttonContainer.createEl('button', {
			text: 'キャンセル'
		});

		cancelButton.onclick = () => {
			this.close();
		};
	}

	private editCategory(category: ReagentCategory) {
		if (category.isBuiltIn) {
			new Notice('組み込みカテゴリーは編集できません');
			return;
		}

		const editModal = new CategoryEditModal(
			this.app,
			category,
			(updatedCategory) => {
				this.settings = CategoryManager.updateCategory(
					this.settings,
					category.id,
					{
						name: updatedCategory.name,
						description: updatedCategory.description,
						color: updatedCategory.color,
						icon: updatedCategory.icon
					}
				);
				this.refresh();
				new Notice(`カテゴリー「${updatedCategory.name}」を更新しました`);
			}
		);
		editModal.open();
	}

	private deleteCategory(category: ReagentCategory) {
		if (category.isBuiltIn) {
			new Notice('組み込みカテゴリーは削除できません');
			return;
		}

		const stats = this.categoryStats.find(s => s.categoryId === category.id);
		const reagentCount = stats?.reagentCount || 0;

		let confirmMessage = `カテゴリー「${category.name}」を削除しますか？`;
		if (reagentCount > 0) {
			confirmMessage += `\n\n注意: このカテゴリーには ${reagentCount} 個の試薬が含まれています。削除すると、これらの試薬は「その他」カテゴリーに移動されます。`;
		}

		if (confirm(confirmMessage)) {
			try {
				this.settings = CategoryManager.removeCategory(this.settings, category.id);
				new Notice(`カテゴリー「${category.name}」を削除しました`);
				this.refresh();
			} catch (error) {
				new Notice(`エラー: ${error.message}`);
			}
		}
	}

	private refresh() {
		this.categories = CategoryManager.getAllCategories(this.settings);
		this.categoryStats = CategoryManager.generateCategoryStats(this.settings);
		this.onOpen();
	}
}

class CategoryEditModal extends Modal {
	private category: ReagentCategory;
	private onSave: (category: ReagentCategory) => void;

	constructor(
		app: App,
		category: ReagentCategory,
		onSave: (category: ReagentCategory) => void
	) {
		super(app);
		this.category = { ...category };
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('category-edit-modal');

		contentEl.createEl('h2', { text: 'カテゴリー編集' });

		new Setting(contentEl)
			.setName('カテゴリー名')
			.addText(text => {
				text.setValue(this.category.name);
				text.onChange(value => this.category.name = value);
			});

		new Setting(contentEl)
			.setName('説明')
			.addTextArea(text => {
				text.setValue(this.category.description || '');
				text.onChange(value => this.category.description = value);
				text.inputEl.rows = 3;
			});

		new Setting(contentEl)
			.setName('アイコン')
			.addText(text => {
				text.setValue(this.category.icon || '📂');
				text.onChange(value => this.category.icon = value);
				text.inputEl.style.width = '60px';
			});

		new Setting(contentEl)
			.setName('色')
			.addColorPicker(color => {
				color.setValue(this.category.color || '#2196F3');
				color.onChange(value => this.category.color = value);
			});

		const buttonContainer = contentEl.createDiv('modal-button-container');

		const saveButton = buttonContainer.createEl('button', {
			text: '保存',
			cls: 'mod-cta'
		});

		saveButton.onclick = () => {
			if (!this.category.name.trim()) {
				new Notice('カテゴリー名を入力してください');
				return;
			}

			this.onSave(this.category);
			this.close();
		};

		const cancelButton = buttonContainer.createEl('button', {
			text: 'キャンセル'
		});

		cancelButton.onclick = () => {
			this.close();
		};
	}
}