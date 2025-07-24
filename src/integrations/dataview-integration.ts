import { App, TFile, CachedMetadata, MetadataCache } from 'obsidian';
import { 
	BufferCalcData, 
	CalculationResult, 
	BufferData, 
	StockData, 
	DilutionData,
	ComponentInput 
} from '../types';

/**
 * DataView統合のためのデータ構造
 */
export interface DataViewBufferCalc {
	file: string;
	path: string;
	name: string;
	type: 'buffer' | 'stock' | 'dilution';
	totalVolume?: number;
	volumeUnit?: string;
	components?: DataViewComponent[];
	reagentName?: string;
	molecularWeight?: number;
	targetConcentration?: number;
	concentrationUnit?: string;
	stockConcentration?: number;
	finalConcentration?: number;
	finalVolume?: number;
	notes?: string;
	createdDate: Date;
	modifiedDate: Date;
	tags?: string[];
}

export interface DataViewComponent {
	name: string;
	stockConc: number;
	stockUnit: string;
	finalConc: number;
	finalUnit: string;
	volumeNeeded?: number;
	percentOfTotal?: number;
}

/**
 * DataView統合クラス
 */
export class DataViewIntegration {
	private app: App;
	private cache: MetadataCache;

	constructor(app: App) {
		this.app = app;
		this.cache = app.metadataCache;
	}

	/**
	 * 全てのBuffer Calcブロックを抽出してDataView用データとして返す
	 */
	async getAllBufferCalcData(): Promise<DataViewBufferCalc[]> {
		const files = this.app.vault.getMarkdownFiles();
		const allData: DataViewBufferCalc[] = [];

		for (const file of files) {
			const bufferCalcData = await this.extractBufferCalcDataFromFile(file);
			allData.push(...bufferCalcData);
		}

		return allData;
	}

	/**
	 * 特定のファイルからBuffer Calcデータを抽出
	 */
	async extractBufferCalcDataFromFile(file: TFile): Promise<DataViewBufferCalc[]> {
		const cache = this.cache.getFileCache(file);
		if (!cache) {
			return [];
		}

		try {
			const text = await this.app.vault.cachedRead(file);
			const results: DataViewBufferCalc[] = [];

			// コードブロックを検索
			const bufferRegex = /```(?:buffer|stock|dilution)\n([\s\S]*?)\n```/g;
			let match;

			while ((match = bufferRegex.exec(text)) !== null) {
				const blockType = match[0].match(/```(\w+)/)?.[1] as 'buffer' | 'stock' | 'dilution';
				const blockContent = match[1];

				try {
					const parsedData = this.parseBlockContent(blockType, blockContent);
					const dataViewData = this.convertToDataViewFormat(
						file,
						blockType,
						parsedData,
						cache
					);
					
					if (dataViewData) {
						results.push(dataViewData);
					}
				} catch (error) {
					console.warn(`Failed to parse Buffer Calc block in ${file.path}:`, error);
				}
			}

			return results;
		} catch (error) {
			console.warn(`Failed to read file ${file.path}:`, error);
			return [];
		}
	}

	/**
	 * ブロックコンテンツをパース
	 */
	private parseBlockContent(blockType: string, content: string): BufferCalcData {
		const lines = content.split('\n').filter(line => line.trim());
		const data: any = {};

		let currentSection: string | null = null;
		let components: ComponentInput[] = [];

		lines.forEach(line => {
			line = line.trim();

			if (line === 'components:') {
				currentSection = 'components';
				return;
			}

			if (line.startsWith('- name:')) {
				if (currentSection === 'components') {
					const componentData: any = {};
					// 現在行と次の数行をパースしてコンポーネントデータを構築
					components.push(componentData);
				}
				return;
			}

			// キー:値のペアをパース
			const colonIndex = line.indexOf(':');
			if (colonIndex > 0) {
				const key = line.substring(0, colonIndex).trim();
				const value = line.substring(colonIndex + 1).trim();

				if (currentSection === 'components' && components.length > 0) {
					const lastComponent = components[components.length - 1];
					if (key.startsWith('  ')) {
						// インデントされたプロパティはコンポーネントの一部
						const propKey = key.replace(/^\s+/, '');
						(lastComponent as any)[propKey] = this.parseValue(value);
					}
				} else {
					(data as any)[key] = this.parseValue(value);
				}
			}
		});

		if (components.length > 0) {
			data.components = components;
		}

		return data as BufferCalcData;
	}

	/**
	 * 値を適切な型に変換
	 */
	private parseValue(value: string): any {
		// 数値の場合
		const num = parseFloat(value);
		if (!isNaN(num) && value.trim() === num.toString()) {
			return num;
		}

		// ブール値の場合
		const lower = value.toLowerCase();
		if (lower === 'true') return true;
		if (lower === 'false') return false;

		// 文字列の場合
		return value;
	}

	/**
	 * Buffer CalcデータをDataView形式に変換
	 */
	private convertToDataViewFormat(
		file: TFile,
		type: 'buffer' | 'stock' | 'dilution',
		data: BufferCalcData,
		cache: CachedMetadata | null
	): DataViewBufferCalc | null {
		const baseData: DataViewBufferCalc = {
			file: file.name,
			path: file.path,
			name: data.name || `${type}計算`,
			type,
			createdDate: new Date(file.stat.ctime),
			modifiedDate: new Date(file.stat.mtime),
			notes: data.notes,
			tags: cache?.tags?.map(tag => tag.tag) || []
		};

		if (type === 'buffer') {
			const bufferData = data as BufferData;
			return {
				...baseData,
				totalVolume: bufferData.totalVolume,
				volumeUnit: bufferData.volumeUnit,
				components: bufferData.components?.map(comp => ({
					name: comp.name,
					stockConc: comp.stockConc,
					stockUnit: comp.stockUnit,
					finalConc: comp.finalConc,
					finalUnit: comp.finalUnit
				}))
			};
		}

		if (type === 'stock') {
			const stockData = data as StockData;
			return {
				...baseData,
				reagentName: stockData.reagentName,
				molecularWeight: stockData.molecularWeight,
				targetConcentration: stockData.targetConcentration,
				concentrationUnit: stockData.concentrationUnit,
				totalVolume: stockData.volume,
				volumeUnit: stockData.volumeUnit
			};
		}

		if (type === 'dilution') {
			const dilutionData = data as DilutionData;
			return {
				...baseData,
				stockConcentration: dilutionData.stockConcentration,
				finalConcentration: dilutionData.finalConcentration,
				concentrationUnit: dilutionData.finalConcentrationUnit,
				finalVolume: dilutionData.finalVolume,
				volumeUnit: dilutionData.volumeUnit
			};
		}

		return null;
	}

	/**
	 * 特定の試薬を使用している計算を検索
	 */
	async findCalculationsByReagent(reagentName: string): Promise<DataViewBufferCalc[]> {
		const allData = await this.getAllBufferCalcData();
		const results: DataViewBufferCalc[] = [];

		allData.forEach(calc => {
			let found = false;

			// バッファー計算の場合、コンポーネントを検索
			if (calc.type === 'buffer' && calc.components) {
				found = calc.components.some(comp => 
					comp.name.toLowerCase().includes(reagentName.toLowerCase())
				);
			}

			// ストック溶液の場合、試薬名を検索
			if (calc.type === 'stock' && calc.reagentName) {
				found = calc.reagentName.toLowerCase().includes(reagentName.toLowerCase());
			}

			if (found) {
				results.push(calc);
			}
		});

		return results;
	}

	/**
	 * 特定の濃度範囲の計算を検索
	 */
	async findCalculationsByConcentrationRange(
		minConc: number,
		maxConc: number,
		unit: string
	): Promise<DataViewBufferCalc[]> {
		const allData = await this.getAllBufferCalcData();
		
		return allData.filter(calc => {
			if (calc.type === 'stock' && calc.targetConcentration && calc.concentrationUnit === unit) {
				return calc.targetConcentration >= minConc && calc.targetConcentration <= maxConc;
			}
			
			if (calc.type === 'dilution' && calc.finalConcentration && calc.concentrationUnit === unit) {
				return calc.finalConcentration >= minConc && calc.finalConcentration <= maxConc;
			}

			return false;
		});
	}

	/**
	 * 特定の体積範囲の計算を検索
	 */
	async findCalculationsByVolumeRange(
		minVol: number,
		maxVol: number,
		unit: string
	): Promise<DataViewBufferCalc[]> {
		const allData = await this.getAllBufferCalcData();
		
		return allData.filter(calc => {
			if (calc.totalVolume && calc.volumeUnit === unit) {
				return calc.totalVolume >= minVol && calc.totalVolume <= maxVol;
			}
			return false;
		});
	}

	/**
	 * 日付範囲で計算を検索
	 */
	async findCalculationsByDateRange(startDate: Date, endDate: Date): Promise<DataViewBufferCalc[]> {
		const allData = await this.getAllBufferCalcData();
		
		return allData.filter(calc => {
			const calcDate = calc.modifiedDate || calc.createdDate;
			return calcDate >= startDate && calcDate <= endDate;
		});
	}

	/**
	 * タグで計算を検索
	 */
	async findCalculationsByTag(tag: string): Promise<DataViewBufferCalc[]> {
		const allData = await this.getAllBufferCalcData();
		
		return allData.filter(calc => {
			return calc.tags?.some(t => 
				t.toLowerCase().includes(tag.toLowerCase())
			);
		});
	}

	/**
	 * 統計情報を生成
	 */
	async generateStatistics(): Promise<{
		totalCalculations: number;
		bufferCount: number;
		stockCount: number;
		dilutionCount: number;
		mostUsedReagents: { name: string; count: number }[];
		averageVolume: number;
		calculationsByMonth: { month: string; count: number }[];
	}> {
		const allData = await this.getAllBufferCalcData();
		
		const stats = {
			totalCalculations: allData.length,
			bufferCount: allData.filter(d => d.type === 'buffer').length,
			stockCount: allData.filter(d => d.type === 'stock').length,
			dilutionCount: allData.filter(d => d.type === 'dilution').length,
			mostUsedReagents: [] as { name: string; count: number }[],
			averageVolume: 0,
			calculationsByMonth: [] as { month: string; count: number }[]
		};

		// 最も使用された試薬を計算
		const reagentCounts = new Map<string, number>();
		allData.forEach(calc => {
			if (calc.type === 'buffer' && calc.components) {
				calc.components.forEach(comp => {
					reagentCounts.set(comp.name, (reagentCounts.get(comp.name) || 0) + 1);
				});
			}
			if (calc.type === 'stock' && calc.reagentName) {
				reagentCounts.set(calc.reagentName, (reagentCounts.get(calc.reagentName) || 0) + 1);
			}
		});

		stats.mostUsedReagents = Array.from(reagentCounts.entries())
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// 平均体積を計算
		const volumeData = allData.filter(d => d.totalVolume).map(d => d.totalVolume!);
		if (volumeData.length > 0) {
			stats.averageVolume = volumeData.reduce((sum, vol) => sum + vol, 0) / volumeData.length;
		}

		// 月別計算数を集計
		const monthCounts = new Map<string, number>();
		allData.forEach(calc => {
			const date = calc.modifiedDate || calc.createdDate;
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
		});

		stats.calculationsByMonth = Array.from(monthCounts.entries())
			.map(([month, count]) => ({ month, count }))
			.sort((a, b) => a.month.localeCompare(b.month));

		return stats;
	}

	/**
	 * DataViewプラグインが利用可能かチェック
	 */
	isDataViewAvailable(): boolean {
		// @ts-ignore
		return this.app.plugins.enabledPlugins.has('dataview');
	}

	/**
	 * DataViewプラグインのAPIを取得
	 */
	getDataViewAPI(): any {
		if (!this.isDataViewAvailable()) {
			return null;
		}
		
		// @ts-ignore
		return this.app.plugins.plugins.dataview?.api;
	}

	/**
	 * DataViewにBuffer Calcデータを登録
	 */
	registerWithDataView(): void {
		if (!this.isDataViewAvailable()) {
			console.warn('DataView plugin is not available');
			return;
		}

		const api = this.getDataViewAPI();
		if (!api) {
			console.warn('DataView API is not available');
			return;
		}

		try {
			// DataViewにカスタムデータソースとして登録
			api.index.on('file-changed', (file: TFile) => {
				if (file.extension === 'md') {
					// ファイルが変更された時にBuffer Calcデータを再インデックス
					this.reindexFile(file);
				}
			});

			console.log('Buffer Calc data registered with DataView');
		} catch (error) {
			console.error('Failed to register with DataView:', error);
		}
	}

	/**
	 * ファイルを再インデックス
	 */
	private reindexFile(file: TFile): void {
		// ファイルのBuffer Calcデータを再解析
		this.extractBufferCalcDataFromFile(file);
	}
}