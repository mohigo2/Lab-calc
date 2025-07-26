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
import { SettingsImportExportModal } from './ui/settings-import-export-modal';
import { CalculationHistoryModal } from './ui/calculation-history-modal';
import { ReagentCategoryModal } from './ui/reagent-category-modal';
import { CategoryManager } from './utils/category-manager';
import { DataViewIntegrationModal } from './ui/dataview-integration-modal';

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
		containerEl.createEl('h1', { text: 'Buffer Calc 設定' });

		this.addGeneralSettings();
		this.addUnitsSettings();
		this.addDisplaySettings();
		this.addReagentSettings();
		this.addCategorySettings();
		this.addHistorySettings();
		this.addDataViewSettings();
		this.addImportExportSettings();
		this.addDataManagement();
	}

	private addGeneralSettings(): void {
		const { containerEl } = this;

		// General Settings Section
		containerEl.createEl('h2', { text: '一般設定' });

		new Setting(containerEl)
			.setName('自動補完を有効にする')
			.setDesc('入力時に試薬名の提案を表示します')
			.addToggle((toggle: ToggleComponent) => {
				toggle
					.setValue(this.plugin.settings.enableSuggestions)
					.onChange(async (value: boolean) => {
						this.plugin.settings.enableSuggestions = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('計算ステップを表示')
			.setDesc('結果に詳細な計算ステップを表示します')
			.addToggle((toggle: ToggleComponent) => {
				toggle
					.setValue(this.plugin.settings.showCalculationSteps)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showCalculationSteps = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('小数点以下の桁数')
			.setDesc('結果に表示する小数点以下の桁数')
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
		containerEl.createEl('h2', { text: 'デフォルト単位' });

		new Setting(containerEl)
			.setName('デフォルト体積単位')
			.setDesc('計算で使用されるデフォルトの体積単位')
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
			.setName('デフォルト濃度単位')
			.setDesc('計算で使用されるデフォルトの濃度単位')
			.addDropdown((dropdown: DropdownComponent) => {
				const options: Record<string, string> = {
					[ConcentrationUnit.MOLAR]: 'Molar (M)',
					[ConcentrationUnit.MILLIMOLAR]: 'Millimolar (mM)',
					[ConcentrationUnit.MICROMOLAR]: 'Micromolar (µM)',
					[ConcentrationUnit.NANOMOLAR]: 'Nanomolar (nM)'
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
		containerEl.createEl('h2', { text: '表示設定' });

		new Setting(containerEl)
			.setName('デフォルトテンプレート')
			.setDesc('新しいバッファー計算のデフォルトテンプレート')
			.addDropdown((dropdown: DropdownComponent) => {
				dropdown.addOption('buffer', 'バッファー調製');
				dropdown.addOption('stock', 'ストック溶液');
				dropdown.addOption('dilution', '段階希釈');

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
		containerEl.createEl('h2', { text: 'カスタム試薬' });

		const reagentContainer = containerEl.createEl('div', { cls: 'buffer-calc-reagent-list' });

		const updateReagentList = () => {
			reagentContainer.empty();

			if (this.plugin.settings.customReagents.length === 0) {
				reagentContainer.createEl('p', { 
					text: 'まだカスタム試薬は追加されていません。',
					cls: 'buffer-calc-no-reagents'
				});
			} else {
				this.plugin.settings.customReagents.forEach((reagent, index) => {
					const reagentEl = reagentContainer.createEl('div', { cls: 'buffer-calc-reagent-item' });

					const infoEl = reagentEl.createEl('div', { cls: 'buffer-calc-reagent-info' });
					infoEl.createEl('strong', { text: reagent.name });
					infoEl.createEl('span', { text: ` (MW: ${reagent.molecularWeight} g/mol)` });

					const actionsEl = reagentEl.createEl('div', { cls: 'buffer-calc-reagent-actions' });
					
					const editBtn = actionsEl.createEl('button', { text: '編集', cls: 'mod-cta' });
					editBtn.addEventListener('click', () => {
						this.openReagentEditor(reagent, index, updateReagentList);
					});

					const deleteBtn = actionsEl.createEl('button', { text: '削除', cls: 'mod-destructive' });
					deleteBtn.addEventListener('click', async () => {
						this.plugin.settings.customReagents.splice(index, 1);
						await this.plugin.saveSettings();
						updateReagentList();
						new Notice('試薬を削除しました');
					});
				});
			}
		};

		updateReagentList();

		new Setting(containerEl)
			.setName('カスタム試薬を追加')
			.setDesc('個人データベースに新しい試薬を追加します')
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText('試薬を追加')
					.setClass('mod-cta')
					.onClick(() => {
						this.openReagentEditor(null, -1, updateReagentList);
					});
			});
	}

	private addCategorySettings(): void {
		const { containerEl } = this;

		// Category Settings Section
		containerEl.createEl('h2', { text: '試薬カテゴリー設定' });

		new Setting(containerEl)
			.setName('カスタムカテゴリーを有効にする')
			.setDesc('独自の試薬カテゴリーを作成・管理できます')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.enableCustomCategories);
				toggle.onChange(async (value: boolean) => {
					this.plugin.settings.enableCustomCategories = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('カテゴリー管理')
			.setDesc('試薬カテゴリーの作成、編集、削除を行います')
			.addButton(button => {
				button
					.setButtonText('カテゴリー管理を開く')
					.setClass('mod-cta')
					.onClick(() => {
						const modal = new ReagentCategoryModal(
							this.app,
							this.plugin.settings,
							async (updatedSettings: BufferCalcSettings) => {
								this.plugin.settings = updatedSettings;
								await this.plugin.saveSettings();
								new Notice('カテゴリー設定が保存されました');
							}
						);
						modal.open();
					});
			});

		// 統計表示
		const categoryCount = this.plugin.settings.customReagentCategories?.length || 0;
		const reagentCount = this.plugin.settings.customReagents?.length || 0;
		const categorizedCount = this.plugin.settings.customReagents?.filter(r => r.category)?.length || 0;

		const statsEl = containerEl.createEl('div', { cls: 'category-settings-stats' });
		statsEl.createEl('p', { 
			text: `カスタムカテゴリー: ${categoryCount} 個` 
		});
		statsEl.createEl('p', { 
			text: `分類済み試薬: ${categorizedCount} / ${reagentCount} 個` 
		});
	}

	private addHistorySettings(): void {
		const { containerEl } = this;

		// History Settings Section
		containerEl.createEl('h2', { text: '計算履歴設定' });

		new Setting(containerEl)
			.setName('計算履歴を有効にする')
			.setDesc('計算結果を自動的に履歴に保存します')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.enableHistory);
				toggle.onChange(async (value: boolean) => {
					this.plugin.settings.enableHistory = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('最大履歴保存数')
			.setDesc('保存する履歴の最大数（1-1000）')
			.addSlider(slider => {
				slider.setLimits(1, 1000, 10);
				slider.setValue(this.plugin.settings.maxHistoryEntries);
				slider.setDynamicTooltip();
				slider.onChange(async (value: number) => {
					this.plugin.settings.maxHistoryEntries = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('計算履歴を表示')
			.setDesc('保存された計算履歴を表示・管理します')
			.addButton(button => {
				button.setButtonText('履歴を開く');
				button.setClass('mod-cta');
				button.onClick(() => {
					const historyModal = new CalculationHistoryModal(
						this.app,
						this.plugin.settings,
						async (newSettings) => {
							this.plugin.settings = newSettings;
							await this.plugin.saveSettings();
							this.display();
						},
						(yaml: string) => {
							// エディターに挿入する機能は履歴モーダル内で処理
						}
					);
					historyModal.open();
				});
			});
	}

	private addDataViewSettings(): void {
		const { containerEl } = this;

		// DataView Settings Section
		containerEl.createEl('h2', { text: 'DataView統合設定' });

		// DataView統合の説明
		const descEl = containerEl.createEl('p', { 
			cls: 'setting-item-description'
		});
		descEl.innerHTML = `
			DataViewプラグインと連携して、Buffer Calcの計算データをクエリで検索・分析できます。<br>
			<strong>注意:</strong> この機能を使用するには、DataViewプラグインがインストールされ有効化されている必要があります。
		`;

		// DataView統合管理
		new Setting(containerEl)
			.setName('DataView統合管理')
			.setDesc('DataViewクエリの生成とデータ統計を表示します')
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText('DataView統合を開く')
					.setClass('mod-cta')
					.onClick(() => {
						const modal = new DataViewIntegrationModal(
							this.app,
							this.plugin.settings,
							() => {
								// モーダルが閉じられた時の処理
							}
						);
						modal.open();
					});
			});

		// DataViewプラグインの状態表示
		const isDataViewAvailable = this.plugin.dataViewIntegration?.isDataViewAvailable() || false;
		const statusEl = containerEl.createDiv('dataview-status');
		if (isDataViewAvailable) {
			statusEl.addClass('status-success');
			statusEl.innerHTML = '✅ DataViewプラグインが利用可能です';
		} else {
			statusEl.addClass('status-warning');
			statusEl.innerHTML = '⚠️ DataViewプラグインが見つかりません';
		}

		// 統計情報の表示
		if (isDataViewAvailable) {
			this.plugin.dataViewIntegration.generateStatistics().then(stats => {
				const statsEl = containerEl.createDiv('dataview-stats');
				statsEl.createEl('h4', { text: 'データ統計' });
				statsEl.createEl('p', { text: `検出されたBuffer Calc計算: ${stats.totalCalculations} 件` });
				statsEl.createEl('p', { text: `バッファー計算: ${stats.bufferCount} 件` });
				statsEl.createEl('p', { text: `ストック溶液計算: ${stats.stockCount} 件` });
				statsEl.createEl('p', { text: `希釈計算: ${stats.dilutionCount} 件` });
			}).catch(error => {
				const errorEl = containerEl.createDiv('dataview-error');
				errorEl.setText('データの読み込み中にエラーが発生しました');
			});
		}
	}

	private addImportExportSettings(): void {
		const { containerEl } = this;

		// Import/Export Settings Section
		containerEl.createEl('h2', { text: '設定のインポート/エクスポート' });
		containerEl.createEl('p', { 
			text: '設定、カスタム試薬、レシピテンプレートの包括的なインポート/エクスポート機能',
			cls: 'setting-item-description'
		});

		new Setting(containerEl)
			.setName('インポート/エクスポート管理')
			.setDesc('設定、カスタム試薬、レシピテンプレートを一括でインポート/エクスポートします')
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText('管理画面を開く')
					.setClass('mod-cta')
					.onClick(() => {
						const modal = new SettingsImportExportModal(
							this.app,
							this.plugin.settings,
							this.plugin.settings.customReagents || [],
							this.plugin.settings.recipeTemplates || [],
							async (newSettings: BufferCalcSettings) => {
								this.plugin.settings = newSettings;
								await this.plugin.saveSettings();
								this.display();
								new Notice('設定が更新されました');
							}
						);
						modal.open();
					});
			});
	}

	private addDataManagement(): void {
		const { containerEl } = this;

		// Data Management Section
		containerEl.createEl('h2', { text: 'データ管理' });

		new Setting(containerEl)
			.setName('設定をエクスポート')
			.setDesc('プラグイン設定をファイルに出力します')
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText('エクスポート')
					.onClick(() => {
						this.exportSettings();
					});
			});

		new Setting(containerEl)
			.setName('設定をインポート')
			.setDesc('ファイルからプラグイン設定を読み込みます')
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText('インポート')
					.onClick(() => {
						this.importSettings();
					});
			});

		new Setting(containerEl)
			.setName('設定をリセット')
			.setDesc('すべての設定をデフォルト値にリセットします')
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText('リセット')
					.setClass('mod-destructive')
					.onClick(async () => {
						if (confirm('すべての設定をデフォルトにリセットしますか？この操作は取り消せません。')) {
							this.plugin.settings = { ...this.plugin.settings, ...require('./types').DEFAULT_SETTINGS };
							await this.plugin.saveSettings();
							this.display();
							new Notice('設定をデフォルトにリセットしました');
						}
					});
			});
	}

	private openReagentEditor(reagent: Reagent | null, index: number, callback: () => void): void {
		const modal = new ReagentEditorModal(
			this.app,
			reagent,
			this.plugin.settings,
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
				new Notice(`試薬を${reagent ? '更新' : '追加'}しました`);
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
			
			new Notice('設定をエクスポートしました');
		} catch (error) {
			new Notice('設定のエクスポートに失敗しました');
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
					new Notice('設定をインポートしました');
				} catch (error) {
					new Notice('無効な設定ファイルです');
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
	settings: BufferCalcSettings;
	onSave: (reagent: Reagent) => void;
	private nameInput: TextComponent;
	private mwInput: TextComponent;
	private casInput: TextComponent;
	private categorySelect: DropdownComponent;

	constructor(app: App, reagent: Reagent | null, settings: BufferCalcSettings, onSave: (reagent: Reagent) => void) {
		super(app);
		this.reagent = reagent;
		this.settings = settings;
		this.onSave = onSave;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: this.reagent ? '試薬を編集' : '新しい試薬を追加' });

		// Name field
		new Setting(contentEl)
			.setName('試薬名')
			.setDesc('試薬の一般名')
			.addText((text: TextComponent) => {
				this.nameInput = text;
				text.setValue(this.reagent?.name || '')
					.setPlaceholder('e.g., Tris-HCl');
			});

		// Molecular weight field
		new Setting(contentEl)
			.setName('分子量')
			.setDesc('分子量（g/mol）')
			.addText((text: TextComponent) => {
				this.mwInput = text;
				text.setValue(this.reagent?.molecularWeight?.toString() || '')
					.setPlaceholder('e.g., 157.6');
			});

		// CAS number (optional)
		new Setting(contentEl)
			.setName('CAS番号')
			.setDesc('CAS登録番号（任意）')
			.addText((text: TextComponent) => {
				this.casInput = text;
				text.setValue(this.reagent?.cas || '')
					.setPlaceholder('e.g., 77-86-1');
			});

		// Category (optional)
		new Setting(contentEl)
			.setName('カテゴリー')
			.setDesc('試薬のカテゴリー（オプション）')
			.addDropdown((dropdown: DropdownComponent) => {
				this.categorySelect = dropdown;
				
				// カテゴリーオプションを追加
				dropdown.addOption('', 'カテゴリーなし');
				
				const allCategories = CategoryManager.getAllCategories(this.settings);
				allCategories.forEach(category => {
					dropdown.addOption(category.id, `${category.icon || '📂'} ${category.name}`);
				});
				
				// 現在の値を設定（自動推定も含む）
				const currentCategory = this.reagent?.category || '';
				const suggestedCategory = this.reagent ? '' : CategoryManager.suggestCategory(this.nameInput?.getValue() || '');
				dropdown.setValue(currentCategory || suggestedCategory);
			});

		// Buttons
		const buttonContainer = contentEl.createEl('div', { cls: 'buffer-calc-modal-buttons' });

		const saveButton = buttonContainer.createEl('button', { text: '保存', cls: 'mod-cta' });
		saveButton.addEventListener('click', () => this.save());

		const cancelButton = buttonContainer.createEl('button', { text: 'キャンセル' });
		cancelButton.addEventListener('click', () => this.close());
	}

	private save(): void {
		const name = this.nameInput.getValue().trim();
		const mw = parseFloat(this.mwInput.getValue());

		if (!name) {
			new Notice('試薬名を入力してください');
			return;
		}

		if (isNaN(mw) || mw <= 0) {
			new Notice('有効な分子量を入力してください');
			return;
		}

		const reagent: Reagent = {
			name: name,
			molecularWeight: mw,
			cas: this.casInput.getValue().trim() || undefined,
			category: this.categorySelect.getValue() || undefined
		};

		this.onSave(reagent);
		this.close();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}