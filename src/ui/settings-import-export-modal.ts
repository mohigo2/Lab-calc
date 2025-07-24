import { Modal, App, Setting, Notice } from 'obsidian';
import {
	BufferCalcSettings,
	ImportResult,
	Reagent,
	RecipeTemplate
} from '../types';
import { SettingsManager } from '../utils/settings-manager';

export class SettingsImportExportModal extends Modal {
	private settings: BufferCalcSettings;
	private customReagents: Reagent[];
	private recipeTemplates: RecipeTemplate[];
	private onSettingsUpdate: (newSettings: BufferCalcSettings) => void;

	constructor(
		app: App,
		settings: BufferCalcSettings,
		customReagents: Reagent[],
		recipeTemplates: RecipeTemplate[],
		onSettingsUpdate: (newSettings: BufferCalcSettings) => void
	) {
		super(app);
		this.settings = settings;
		this.customReagents = customReagents;
		this.recipeTemplates = recipeTemplates;
		this.onSettingsUpdate = onSettingsUpdate;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('settings-import-export-modal');

		this.setTitle('設定のインポート/エクスポート');

		this.createExportSection();
		this.createImportSection();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private createExportSection(): void {
		const { contentEl } = this;

		const exportSection = contentEl.createEl('div', { cls: 'settings-export-section' });
		exportSection.createEl('h3', { text: '設定のエクスポート' });
		exportSection.createEl('p', { 
			text: 'プラグインの設定、カスタム試薬、レシピテンプレートをファイルまたはクリップボードにエクスポートします。',
			cls: 'setting-item-description'
		});

		// エクスポート統計
		const statsContainer = exportSection.createEl('div', { cls: 'export-stats' });
		statsContainer.createEl('div', { 
			text: `カスタム試薬: ${this.customReagents.length}個`,
			cls: 'export-stat-item'
		});
		statsContainer.createEl('div', { 
			text: `レシピテンプレート: ${this.recipeTemplates.length}個`,
			cls: 'export-stat-item'
		});

		// エクスポートボタン
		const exportActions = exportSection.createEl('div', { cls: 'export-actions' });

		const downloadButton = exportActions.createEl('button', {
			text: 'ファイルとしてダウンロード',
			cls: 'mod-cta'
		});
		downloadButton.addEventListener('click', () => {
			SettingsManager.downloadSettingsFile(
				this.settings,
				this.customReagents,
				this.recipeTemplates
			);
		});

		const clipboardButton = exportActions.createEl('button', {
			text: 'クリップボードにコピー'
		});
		clipboardButton.addEventListener('click', async () => {
			await SettingsManager.copySettingsToClipboard(
				this.settings,
				this.customReagents,
				this.recipeTemplates
			);
		});
	}

	private createImportSection(): void {
		const { contentEl } = this;

		const importSection = contentEl.createEl('div', { cls: 'settings-import-section' });
		importSection.createEl('h3', { text: '設定のインポート' });
		importSection.createEl('p', { 
			text: 'エクスポートした設定ファイルまたはJSONテキストから設定をインポートします。',
			cls: 'setting-item-description'
		});

		// インポートオプション
		const optionsContainer = importSection.createEl('div', { cls: 'import-options' });
		
		let mergeSettings = true;
		let replaceReagents = false;
		let replaceTemplates = false;

		new Setting(optionsContainer)
			.setName('設定をマージ')
			.setDesc('既存の設定と新しい設定をマージします（無効にすると既存設定を完全に置換）')
			.addToggle(toggle => toggle
				.setValue(mergeSettings)
				.onChange(value => { mergeSettings = value; })
			);

		new Setting(optionsContainer)
			.setName('カスタム試薬を置換')
			.setDesc('既存のカスタム試薬を完全に置換します（無効にすると重複しない項目のみ追加）')
			.addToggle(toggle => toggle
				.setValue(replaceReagents)
				.onChange(value => { replaceReagents = value; })
			);

		new Setting(optionsContainer)
			.setName('レシピテンプレートを置換')
			.setDesc('既存のレシピテンプレートを完全に置換します（無効にすると重複しない項目のみ追加）')
			.addToggle(toggle => toggle
				.setValue(replaceTemplates)
				.onChange(value => { replaceTemplates = value; })
			);

		// ファイルインポート
		const fileImportContainer = importSection.createEl('div', { cls: 'file-import-container' });
		fileImportContainer.createEl('h4', { text: 'ファイルからインポート' });

		const fileInput = fileImportContainer.createEl('input', {
			type: 'file',
			attr: {
				accept: '.json',
				multiple: false
			}
		});

		const fileImportButton = fileImportContainer.createEl('button', {
			text: 'ファイルをインポート',
			cls: 'mod-cta'
		});

		fileImportButton.addEventListener('click', async () => {
			const file = fileInput.files?.[0];
			if (!file) {
				new Notice('ファイルを選択してください');
				return;
			}

			try {
				const content = await SettingsManager.readFileAsText(file);
				await this.processImport(content, {
					mergeSettings,
					replaceReagents,
					replaceTemplates
				});
			} catch (error) {
				console.error('File import error:', error);
				new Notice('ファイルの読み込みに失敗しました: ' + error.message);
			}
		});

		// テキストインポート
		const textImportContainer = importSection.createEl('div', { cls: 'text-import-container' });
		textImportContainer.createEl('h4', { text: 'テキストからインポート' });

		const textArea = textImportContainer.createEl('textarea', {
			placeholder: 'エクスポートしたJSON設定をここに貼り付けてください...',
			cls: 'import-textarea'
		});

		const textImportButton = textImportContainer.createEl('button', {
			text: 'テキストをインポート',
			cls: 'mod-cta'
		});

		textImportButton.addEventListener('click', async () => {
			const content = textArea.value.trim();
			if (!content) {
				new Notice('インポートするテキストを入力してください');
				return;
			}

			await this.processImport(content, {
				mergeSettings,
				replaceReagents,
				replaceTemplates
			});
		});
	}

	private async processImport(
		content: string,
		options: {
			mergeSettings: boolean;
			replaceReagents: boolean;
			replaceTemplates: boolean;
		}
	): Promise<void> {
		try {
			const result = SettingsManager.importSettings(content, this.settings, options);
			
			if (result.success) {
				// 成功メッセージ
				let message = result.message;
				if (result.importedReagents! > 0) {
					message += `\n- カスタム試薬: ${result.importedReagents}個`;
				}
				if (result.importedTemplates! > 0) {
					message += `\n- レシピテンプレート: ${result.importedTemplates}個`;
				}

				// 警告がある場合は表示
				if (result.warnings && result.warnings.length > 0) {
					message += '\n\n警告:\n' + result.warnings.join('\n');
				}

				new Notice(message);

				// 設定を更新（実際の実装では適切にマージした設定を渡す）
				// この例では簡略化
				this.close();
			} else {
				new Notice('インポートエラー: ' + result.message);
			}
		} catch (error) {
			console.error('Import processing error:', error);
			new Notice('インポート処理中にエラーが発生しました');
		}
	}
}