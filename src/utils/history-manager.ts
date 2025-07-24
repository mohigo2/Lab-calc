import { Notice } from 'obsidian';
import {
	CalculationHistoryEntry,
	HistoryFilter,
	HistoryStats,
	BufferCalcData,
	CalculationResult,
	BufferCalcSettings
} from '../types';

export class HistoryManager {
	/**
	 * 計算履歴エントリを作成
	 */
	static createHistoryEntry(
		type: 'buffer' | 'stock' | 'dilution',
		name: string,
		inputData: BufferCalcData,
		result: CalculationResult,
		notes?: string,
		tags?: string[]
	): CalculationHistoryEntry {
		return {
			id: this.generateId(),
			timestamp: new Date(),
			type,
			name: name || `${type}計算`,
			inputData: { ...inputData },
			result: { ...result },
			notes,
			tags: tags || [],
			starred: false
		};
	}

	/**
	 * 履歴に計算結果を追加
	 */
	static addToHistory(
		settings: BufferCalcSettings,
		entry: CalculationHistoryEntry
	): BufferCalcSettings {
		if (!settings.enableHistory) {
			return settings;
		}

		const newHistory = [entry, ...settings.calculationHistory];

		// 最大エントリ数を超えた場合は古いものを削除
		if (newHistory.length > settings.maxHistoryEntries) {
			newHistory.splice(settings.maxHistoryEntries);
		}

		return {
			...settings,
			calculationHistory: newHistory
		};
	}

	/**
	 * 履歴エントリを更新
	 */
	static updateHistoryEntry(
		settings: BufferCalcSettings,
		id: string,
		updates: Partial<Pick<CalculationHistoryEntry, 'name' | 'notes' | 'tags' | 'starred'>>
	): BufferCalcSettings {
		const updatedHistory = settings.calculationHistory.map(entry => 
			entry.id === id ? { ...entry, ...updates } : entry
		);

		return {
			...settings,
			calculationHistory: updatedHistory
		};
	}

	/**
	 * 履歴エントリを削除
	 */
	static removeHistoryEntry(
		settings: BufferCalcSettings,
		id: string
	): BufferCalcSettings {
		return {
			...settings,
			calculationHistory: settings.calculationHistory.filter(entry => entry.id !== id)
		};
	}

	/**
	 * 履歴をクリア
	 */
	static clearHistory(settings: BufferCalcSettings): BufferCalcSettings {
		return {
			...settings,
			calculationHistory: []
		};
	}

	/**
	 * 履歴をフィルタリング
	 */
	static filterHistory(
		history: CalculationHistoryEntry[],
		filter: HistoryFilter
	): CalculationHistoryEntry[] {
		let filtered = [...history];

		// タイプフィルター
		if (filter.type && filter.type !== 'all') {
			filtered = filtered.filter(entry => entry.type === filter.type);
		}

		// 日付範囲フィルター
		if (filter.dateRange) {
			const dateRange = filter.dateRange;
			filtered = filtered.filter(entry => {
				const entryDate = new Date(entry.timestamp);
				return entryDate >= dateRange.start && entryDate <= dateRange.end;
			});
		}

		// 検索クエリフィルター
		if (filter.searchQuery) {
			const query = filter.searchQuery.toLowerCase();
			filtered = filtered.filter(entry => 
				entry.name.toLowerCase().includes(query) ||
				(entry.notes && entry.notes.toLowerCase().includes(query)) ||
				entry.tags?.some((tag: string) => tag.toLowerCase().includes(query)) ||
				this.searchInInputData(entry.inputData, query)
			);
		}

		// タグフィルター
		if (filter.tags && filter.tags.length > 0) {
			const tags = filter.tags;
			filtered = filtered.filter(entry =>
				tags.some((tag: string) => entry.tags?.includes(tag) || false)
			);
		}

		// スター付きフィルター
		if (filter.starred !== undefined) {
			filtered = filtered.filter(entry => entry.starred === filter.starred);
		}

		return filtered;
	}

	/**
	 * 履歴統計を生成
	 */
	static generateHistoryStats(history: CalculationHistoryEntry[]): HistoryStats {
		const now = new Date();
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		// 基本統計
		const totalCalculations = history.length;
		const bufferCalculations = history.filter(e => e.type === 'buffer').length;
		const stockCalculations = history.filter(e => e.type === 'stock').length;
		const dilutionCalculations = history.filter(e => e.type === 'dilution').length;

		// 過去30日の平均
		const recentHistory = history.filter(entry => new Date(entry.timestamp) >= thirtyDaysAgo);
		const averageCalculationsPerDay = recentHistory.length / 30;

		// 最も使用された試薬
		const reagentCounts = new Map<string, number>();
		history.forEach(entry => {
			// バッファー計算の場合
			if (entry.type === 'buffer') {
				const bufferData = entry.inputData as any;
				if (bufferData.components && Array.isArray(bufferData.components)) {
					bufferData.components.forEach((component: any) => {
						if (typeof component === 'object' && component.name) {
							reagentCounts.set(component.name, (reagentCounts.get(component.name) || 0) + 1);
						}
					});
				}
			}
			// ストック溶液計算の場合
			if (entry.type === 'stock') {
				const stockData = entry.inputData as any;
				if (stockData.reagentName) {
					reagentCounts.set(stockData.reagentName, (reagentCounts.get(stockData.reagentName) || 0) + 1);
				}
			}
		});

		const mostUsedReagents = Array.from(reagentCounts.entries())
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// 最近の活動
		const activityMap = new Map<string, number>();
		recentHistory.forEach(entry => {
			const dateKey = new Date(entry.timestamp).toISOString().split('T')[0];
			activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
		});

		const recentActivity = Array.from(activityMap.entries())
			.map(([date, count]) => ({ date, count }))
			.sort((a, b) => a.date.localeCompare(b.date))
			.slice(-14); // 過去14日

		return {
			totalCalculations,
			bufferCalculations,
			stockCalculations,
			dilutionCalculations,
			averageCalculationsPerDay: Math.round(averageCalculationsPerDay * 10) / 10,
			mostUsedReagents,
			recentActivity
		};
	}

	/**
	 * 履歴をエクスポート
	 */
	static exportHistory(
		history: CalculationHistoryEntry[],
		format: 'json' | 'csv' | 'markdown' = 'json'
	): string {
		switch (format) {
			case 'json':
				return JSON.stringify(history, null, 2);
			
			case 'csv':
				return this.exportToCSV(history);
			
			case 'markdown':
				return this.exportToMarkdown(history);
			
			default:
				return JSON.stringify(history, null, 2);
		}
	}

	/**
	 * 履歴をファイルとしてダウンロード
	 */
	static downloadHistory(
		history: CalculationHistoryEntry[],
		format: 'json' | 'csv' | 'markdown' = 'json'
	): void {
		try {
			const content = this.exportHistory(history, format);
			const mimeType = {
				json: 'application/json',
				csv: 'text/csv',
				markdown: 'text/markdown'
			}[format];

			const blob = new Blob([content], { type: mimeType });
			const url = URL.createObjectURL(blob);
			
			const a = document.createElement('a');
			a.href = url;
			a.download = `buffer-calc-history-${new Date().toISOString().split('T')[0]}.${format}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			new Notice(`履歴を${format.toUpperCase()}形式でダウンロードしました`);
		} catch (error) {
			console.error('History export error:', error);
			new Notice('履歴のエクスポートに失敗しました');
		}
	}

	/**
	 * 履歴から計算を再実行
	 */
	static recreateCalculationFromHistory(entry: CalculationHistoryEntry): string {
		const data = entry.inputData as any; // Type assertion to avoid TS errors
		let yaml = '';

		if (entry.type === 'buffer') {
			yaml = `\`\`\`buffer
name: ${data.name || entry.name}
totalVolume: ${data.totalVolume || 1000}
volumeUnit: ${data.volumeUnit || 'mL'}
components:`;
			if (data.components && Array.isArray(data.components)) {
				data.components.forEach((comp: any) => {
					yaml += `
  - name: ${comp.name}
    stockConc: ${comp.stockConc}
    stockUnit: ${comp.stockUnit}
    finalConc: ${comp.finalConc}
    finalUnit: ${comp.finalUnit}`;
				});
			}
			if (entry.notes) {
				yaml += `
notes: ${entry.notes}`;
			}
			yaml += '\n```';
		} else if (entry.type === 'stock') {
			yaml = `\`\`\`stock
name: ${data.name || entry.name}
reagentName: ${data.reagentName || ''}
molecularWeight: ${data.molecularWeight || 0}
targetConcentration: ${data.targetConcentration || 0}
concentrationUnit: ${data.concentrationUnit || 'M'}
volume: ${data.volume || 100}
volumeUnit: ${data.volumeUnit || 'mL'}`;
			if (data.purity) {
				yaml += `
purity: ${data.purity}`;
			}
			if (data.solvent) {
				yaml += `
solvent: ${data.solvent}`;
			}
			if (entry.notes) {
				yaml += `
notes: ${entry.notes}`;
			}
			yaml += '\n```';
		} else if (entry.type === 'dilution') {
			yaml = `\`\`\`dilution
name: ${data.name || entry.name}
stockConcentration: ${data.stockConcentration || 0}
stockConcentrationUnit: ${data.stockConcentrationUnit || 'M'}
finalConcentration: ${data.finalConcentration || 0}
finalConcentrationUnit: ${data.finalConcentrationUnit || 'mM'}
finalVolume: ${data.finalVolume || 100}
volumeUnit: ${data.volumeUnit || 'mL'}`;
			if (entry.notes) {
				yaml += `
notes: ${entry.notes}`;
			}
			yaml += '\n```';
		}

		return yaml;
	}

	// プライベートメソッド
	private static generateId(): string {
		return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private static searchInInputData(data: BufferCalcData, query: string): boolean {
		// オブジェクトの全ての文字列値を検索
		const searchObject = (obj: any): boolean => {
			if (typeof obj === 'string') {
				return obj.toLowerCase().includes(query);
			}
			if (Array.isArray(obj)) {
				return obj.some(item => searchObject(item));
			}
			if (typeof obj === 'object' && obj !== null) {
				return Object.values(obj).some(value => searchObject(value));
			}
			return false;
		};

		return searchObject(data);
	}

	private static exportToCSV(history: CalculationHistoryEntry[]): string {
		const headers = [
			'Timestamp',
			'Type',
			'Name',
			'Notes',
			'Tags',
			'Starred',
			'Input Data',
			'Result Summary'
		];

		const rows = history.map(entry => [
			entry.timestamp.toISOString(),
			entry.type,
			entry.name,
			entry.notes || '',
			entry.tags?.join('; ') || '',
			entry.starred ? 'Yes' : 'No',
			JSON.stringify(entry.inputData),
			this.summarizeResult(entry.result)
		]);

		return [headers, ...rows]
			.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
			.join('\n');
	}

	private static exportToMarkdown(history: CalculationHistoryEntry[]): string {
		let markdown = '# Buffer Calc 計算履歴\n\n';
		
		history.forEach(entry => {
			markdown += `## ${entry.name}\n\n`;
			markdown += `- **タイプ**: ${entry.type}\n`;
			markdown += `- **日時**: ${entry.timestamp.toLocaleString('ja-JP')}\n`;
			if (entry.tags && entry.tags.length > 0) {
				markdown += `- **タグ**: ${entry.tags.join(', ')}\n`;
			}
			if (entry.starred) {
				markdown += `- **スター付き**: ⭐\n`;
			}
			if (entry.notes) {
				markdown += `- **メモ**: ${entry.notes}\n`;
			}
			markdown += '\n';

			// 計算の再現
			const yamlContent = this.recreateCalculationFromHistory(entry);
			markdown += yamlContent + '\n\n';
			
			markdown += '---\n\n';
		});

		return markdown;
	}

	private static summarizeResult(result: CalculationResult): string {
		if (result.errors.length > 0) {
			return `Error: ${result.errors[0]}`;
		}
		
		const componentCount = result.components.length;
		const solventVol = result.solventVolume || 0;
		
		return `${componentCount} components, ${solventVol} solvent`;
	}
}