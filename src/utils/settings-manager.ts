import { Notice } from 'obsidian';
import {
	BufferCalcSettings,
	SettingsExportData,
	ImportResult,
	Reagent,
	RecipeTemplate
} from '../types';

export class SettingsManager {
	private static readonly EXPORT_VERSION = '1.0';
	private static readonly PLUGIN_VERSION = '3.0.0';

	/**
	 * 設定をJSONファイルとしてエクスポート
	 */
	static exportSettings(
		settings: BufferCalcSettings,
		customReagents: Reagent[] = [],
		recipeTemplates: RecipeTemplate[] = []
	): string {
		const exportData: SettingsExportData = {
			version: this.EXPORT_VERSION,
			exportDate: new Date().toISOString(),
			settings: {
				...settings,
				// 機密データを除外
				customReagents: [],
				recipeTemplates: []
			},
			customReagents,
			recipeTemplates,
			metadata: {
				pluginVersion: this.PLUGIN_VERSION,
				exportSource: 'Buffer Calc Plugin',
				totalTemplates: recipeTemplates.length,
				totalCustomReagents: customReagents.length
			}
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * エクスポートデータをファイルとしてダウンロード
	 */
	static downloadSettingsFile(
		settings: BufferCalcSettings,
		customReagents: Reagent[] = [],
		recipeTemplates: RecipeTemplate[] = []
	): void {
		try {
			const exportJson = this.exportSettings(settings, customReagents, recipeTemplates);
			const blob = new Blob([exportJson], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			
			const a = document.createElement('a');
			a.href = url;
			a.download = `buffer-calc-settings-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			new Notice('設定ファイルをダウンロードしました');
		} catch (error) {
			console.error('Settings export error:', error);
			new Notice('設定のエクスポートに失敗しました: ' + error.message);
		}
	}

	/**
	 * インポートしたJSONデータを検証
	 */
	static validateImportData(jsonString: string): { valid: boolean; data?: SettingsExportData; error?: string } {
		try {
			const data = JSON.parse(jsonString) as SettingsExportData;

			// 基本構造の検証
			if (!data.version || !data.settings) {
				return { valid: false, error: '無効なファイル形式です' };
			}

			// バージョン互換性チェック
			if (data.version !== this.EXPORT_VERSION) {
				return { 
					valid: false, 
					error: `サポートされていないバージョンです (${data.version})` 
				};
			}

			// 必須フィールドの検証
			const requiredFields = ['defaultVolumeUnit', 'defaultConcentrationUnit', 'decimalPlaces'];
			for (const field of requiredFields) {
				if (!(field in data.settings)) {
					return { 
						valid: false, 
						error: `必須設定項目が不足しています: ${field}` 
					};
				}
			}

			return { valid: true, data };
		} catch (error) {
			return { 
				valid: false, 
				error: 'JSONファイルの解析に失敗しました: ' + error.message 
			};
		}
	}

	/**
	 * 設定をインポート
	 */
	static importSettings(
		jsonString: string,
		currentSettings: BufferCalcSettings,
		options: {
			mergeSettings: boolean;
			replaceReagents: boolean;
			replaceTemplates: boolean;
		} = {
			mergeSettings: true,
			replaceReagents: false,
			replaceTemplates: false
		}
	): ImportResult {
		const validation = this.validateImportData(jsonString);
		if (!validation.valid) {
			return {
				success: false,
				message: validation.error || '不明なエラー'
			};
		}

		const importData = validation.data!;
		const warnings: string[] = [];
		let importedReagents = 0;
		let importedTemplates = 0;

		try {
			// 設定のマージまたは置換
			let newSettings: BufferCalcSettings;
			if (options.mergeSettings) {
				newSettings = {
					...currentSettings,
					...importData.settings,
					// 配列項目は別途処理
					customReagents: currentSettings.customReagents,
					recipeTemplates: currentSettings.recipeTemplates
				};
			} else {
				newSettings = { ...importData.settings };
			}

			// カスタム試薬の処理
			if (importData.customReagents && importData.customReagents.length > 0) {
				if (options.replaceReagents) {
					newSettings.customReagents = [...importData.customReagents];
					importedReagents = importData.customReagents.length;
				} else {
					// 既存の試薬とマージ（重複チェック）
					const existingNames = new Set(currentSettings.customReagents.map(r => r.name));
					const newReagents = importData.customReagents.filter(r => !existingNames.has(r.name));
					newSettings.customReagents = [...currentSettings.customReagents, ...newReagents];
					importedReagents = newReagents.length;
					
					if (newReagents.length < importData.customReagents.length) {
						warnings.push(`${importData.customReagents.length - newReagents.length}個の試薬が重複のためスキップされました`);
					}
				}
			}

			// レシピテンプレートの処理
			if (importData.recipeTemplates && importData.recipeTemplates.length > 0) {
				if (options.replaceTemplates) {
					newSettings.recipeTemplates = [...importData.recipeTemplates];
					importedTemplates = importData.recipeTemplates.length;
				} else {
					// 既存のテンプレートとマージ（重複チェック）
					const existingIds = new Set(currentSettings.recipeTemplates.map(t => t.id));
					const newTemplates = importData.recipeTemplates.filter(t => !existingIds.has(t.id));
					newSettings.recipeTemplates = [...currentSettings.recipeTemplates, ...newTemplates];
					importedTemplates = newTemplates.length;
					
					if (newTemplates.length < importData.recipeTemplates.length) {
						warnings.push(`${importData.recipeTemplates.length - newTemplates.length}個のテンプレートが重複のためスキップされました`);
					}
				}
			}

			return {
				success: true,
				message: '設定を正常にインポートしました',
				warnings: warnings.length > 0 ? warnings : undefined,
				importedSettings: true,
				importedReagents,
				importedTemplates
			};

		} catch (error) {
			console.error('Settings import error:', error);
			return {
				success: false,
				message: 'インポート処理中にエラーが発生しました: ' + error.message
			};
		}
	}

	/**
	 * 設定をクリップボードにコピー
	 */
	static async copySettingsToClipboard(
		settings: BufferCalcSettings,
		customReagents: Reagent[] = [],
		recipeTemplates: RecipeTemplate[] = []
	): Promise<void> {
		try {
			const exportJson = this.exportSettings(settings, customReagents, recipeTemplates);
			await navigator.clipboard.writeText(exportJson);
			new Notice('設定をクリップボードにコピーしました');
		} catch (error) {
			console.error('Clipboard copy error:', error);
			new Notice('クリップボードへのコピーに失敗しました');
		}
	}

	/**
	 * ファイルからのインポート処理
	 */
	static readFileAsText(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				if (event.target?.result) {
					resolve(event.target.result as string);
				} else {
					reject(new Error('ファイルの読み込みに失敗しました'));
				}
			};
			reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
			reader.readAsText(file);
		});
	}

	/**
	 * 設定の差分を表示用に生成
	 */
	static generateSettingsDiff(
		current: BufferCalcSettings,
		imported: BufferCalcSettings
	): { changes: string[]; additions: string[]; removals: string[] } {
		const changes: string[] = [];
		const additions: string[] = [];
		const removals: string[] = [];

		// 基本設定の比較
		const basicSettings = [
			'defaultVolumeUnit',
			'defaultConcentrationUnit',
			'decimalPlaces',
			'enableSuggestions',
			'showCalculationSteps',
			'enableTemplates'
		];

		for (const key of basicSettings) {
			if (current[key as keyof BufferCalcSettings] !== imported[key as keyof BufferCalcSettings]) {
				changes.push(`${key}: ${current[key as keyof BufferCalcSettings]} → ${imported[key as keyof BufferCalcSettings]}`);
			}
		}

		return { changes, additions, removals };
	}
}