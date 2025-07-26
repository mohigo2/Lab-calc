import {
	RecipeTemplate,
	TemplateCategory,
	BufferData,
	StockData,
	DilutionData,
	SerialDilutionData,
	VolumeUnit,
	ConcentrationUnit
} from '../types';

export class TemplateDatabase {
	private static instance: TemplateDatabase;
	private builtInTemplates: RecipeTemplate[] = [];

	private constructor() {
		this.initializeBuiltInTemplates();
	}

	static getInstance(): TemplateDatabase {
		if (!TemplateDatabase.instance) {
			TemplateDatabase.instance = new TemplateDatabase();
		}
		return TemplateDatabase.instance;
	}

	private initializeBuiltInTemplates(): void {
		this.builtInTemplates = [
			// PBS Templates
			{
				id: 'pbs-1x-standard',
				name: '1× PBS（標準）',
				description: '細胞培養やバイオアッセイで最も一般的に使用されるリン酸緩衝生理食塩水',
				category: TemplateCategory.COMMON_BUFFERS,
				type: 'buffer',
				template: {
					name: '1× PBS',
					totalVolume: 1000,
					volumeUnit: VolumeUnit.MILLILITER,
					components: [
						{
							name: 'NaCl',
							stockConc: 5,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 137,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						},
						{
							name: 'KCl',
							stockConc: 1,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 2.7,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						},
						{
							name: 'Na2HPO4',
							stockConc: 1,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 10,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						},
						{
							name: 'KH2PO4',
							stockConc: 1,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 1.8,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						}
					],
					notes: 'pH 7.4, 浸透圧 ~300 mOsm'
				} as BufferData,
				tags: ['PBS', '生理食塩水', '細胞培養', 'pH7.4'],
				difficulty: 'beginner',
				estimatedTime: '10分',
				author: 'Buffer Calc Team',
				references: ['Cold Spring Harbor Protocols'],
				createdAt: new Date(),
				isBuiltIn: true
			},

			{
				id: 'pbs-10x-stock',
				name: '10× PBS ストック',
				description: '希釈して1× PBSを作成するための10倍濃縮ストック溶液',
				category: TemplateCategory.COMMON_BUFFERS,
				type: 'buffer',
				template: {
					name: '10× PBS ストック',
					totalVolume: 1000,
					volumeUnit: VolumeUnit.MILLILITER,
					components: [
						{
							name: 'NaCl',
							stockConc: 5,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 1.37,
							finalUnit: ConcentrationUnit.MOLAR
						},
						{
							name: 'KCl',
							stockConc: 1,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 27,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						},
						{
							name: 'Na2HPO4',
							stockConc: 1,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 100,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						},
						{
							name: 'KH2PO4',
							stockConc: 1,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 18,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						}
					],
					notes: '使用時に10倍希釈してください'
				} as BufferData,
				tags: ['PBS', 'ストック', '10倍濃縮'],
				difficulty: 'beginner',
				estimatedTime: '15分',
				author: 'Buffer Calc Team',
				references: ['Cold Spring Harbor Protocols'],
				createdAt: new Date(),
				isBuiltIn: true
			},

			// Tris Buffers
			{
				id: 'tris-hcl-50mm',
				name: '50mM Tris-HCl バッファー',
				description: 'タンパク質精製や生化学実験で汎用的に使用されるTris緩衝液',
				category: TemplateCategory.PROTEIN_BUFFERS,
				type: 'buffer',
				template: {
					name: '50mM Tris-HCl pH 7.5',
					totalVolume: 500,
					volumeUnit: VolumeUnit.MILLILITER,
					components: [
						{
							name: 'Tris-HCl',
							stockConc: 1,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 50,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						},
						{
							name: 'NaCl',
							stockConc: 5,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 150,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						}
					],
					notes: 'pH 7.5に調整、タンパク質安定化用'
				} as BufferData,
				tags: ['Tris', 'タンパク質', 'pH7.5', '精製'],
				difficulty: 'beginner',
				estimatedTime: '8分',
				author: 'Buffer Calc Team',
				references: ['Molecular Cloning Manual'],
				createdAt: new Date(),
				isBuiltIn: true
			},

			// HEPES Buffer
			{
				id: 'hepes-buffer-mammalian',
				name: 'HEPES 細胞培養バッファー',
				description: '哺乳類細胞培養用の生理的HEPES緩衝液',
				category: TemplateCategory.CELL_CULTURE,
				type: 'buffer',
				template: {
					name: 'HEPES 細胞培養液',
					totalVolume: 1000,
					volumeUnit: VolumeUnit.MILLILITER,
					components: [
						{
							name: 'HEPES',
							stockConc: 1,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 25,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						},
						{
							name: 'NaCl',
							stockConc: 5,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 140,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						},
						{
							name: 'KCl',
							stockConc: 1,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 5,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						},
						{
							name: 'Glucose',
							stockConc: 1,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 10,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						}
					],
					notes: 'pH 7.3-7.4、CO2インキュベーター不要'
				} as BufferData,
				tags: ['HEPES', '細胞培養', '哺乳類細胞', 'pH7.4'],
				difficulty: 'intermediate',
				estimatedTime: '12分',
				author: 'Buffer Calc Team',
				references: ['Cell Culture Protocols'],
				createdAt: new Date(),
				isBuiltIn: true
			},

			// Stock Solution Templates
			{
				id: 'tris-stock-1m',
				name: '1M Tris-HCl ストック',
				description: '実験室で最も使用頻度の高いTris-HClストック溶液',
				category: TemplateCategory.COMMON_BUFFERS,
				type: 'stock',
				template: {
					name: '1M Tris-HCl ストック',
					reagentName: 'Tris-HCl',
					molecularWeight: 157.6,
					targetConcentration: 1,
					concentrationUnit: ConcentrationUnit.MOLAR,
					volume: 100,
					volumeUnit: VolumeUnit.MILLILITER,
					purity: 99,
					solvent: '蒸留水',
					notes: 'pH 7.5-8.0に調整'
				} as StockData,
				tags: ['Tris', 'ストック', '1M', '汎用'],
				difficulty: 'beginner',
				estimatedTime: '5分',
				author: 'Buffer Calc Team',
				references: ['Basic Laboratory Manual'],
				createdAt: new Date(),
				isBuiltIn: true
			},

			{
				id: 'nacl-stock-5m',
				name: '5M NaCl ストック',
				description: '塩濃度調整用の高濃度NaClストック溶液',
				category: TemplateCategory.COMMON_BUFFERS,
				type: 'stock',
				template: {
					name: '5M NaCl ストック',
					reagentName: 'NaCl',
					molecularWeight: 58.44,
					targetConcentration: 5,
					concentrationUnit: ConcentrationUnit.MOLAR,
					volume: 100,
					volumeUnit: VolumeUnit.MILLILITER,
					purity: 99.5,
					solvent: '蒸留水',
					notes: 'オートクレーブ滅菌可能'
				} as StockData,
				tags: ['NaCl', 'ストック', '5M', '塩濃度'],
				difficulty: 'beginner',
				estimatedTime: '5分',
				author: 'Buffer Calc Team',
				references: ['Laboratory Handbook'],
				createdAt: new Date(),
				isBuiltIn: true
			},

			// Dilution Templates
			{
				id: 'protein-serial-dilution',
				name: 'タンパク質標準希釈系列',
				description: 'Bradford法やBCA法用のタンパク質標準溶液希釈系列',
				category: TemplateCategory.ANALYTICAL,
				type: 'dilution',
				template: {
					name: 'BSA標準希釈',
					stockConcentration: 2,
					stockConcentrationUnit: ConcentrationUnit.MILLIMOLAR,
					finalConcentration: 100,
					finalConcentrationUnit: ConcentrationUnit.MICROMOLAR,
					finalVolume: 1,
					volumeUnit: VolumeUnit.MILLILITER,
					notes: 'タンパク質定量用標準溶液'
				} as DilutionData,
				tags: ['タンパク質', '希釈', '定量', 'BSA'],
				difficulty: 'intermediate',
				estimatedTime: '3分',
				author: 'Buffer Calc Team',
				references: ['Bio-Rad Protein Assay Manual'],
				createdAt: new Date(),
				isBuiltIn: true
			},

			// Molecular Biology Templates
			{
				id: 'tae-buffer-50x',
				name: '50× TAE バッファー',
				description: 'DNA電気泳動用TAE緩衝液の濃縮ストック',
				category: TemplateCategory.MOLECULAR_BIOLOGY,
				type: 'buffer',
				template: {
					name: '50× TAE バッファー',
					totalVolume: 1000,
					volumeUnit: VolumeUnit.MILLILITER,
					components: [
						{
							name: 'Tris base',
							stockConc: 1,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 2,
							finalUnit: ConcentrationUnit.MOLAR
						},
						{
							name: 'Acetic acid',
							stockConc: 17.4,
							stockUnit: ConcentrationUnit.MOLAR,
							finalConc: 1,
							finalUnit: ConcentrationUnit.MOLAR
						},
						{
							name: 'EDTA',
							stockConc: 500,
							stockUnit: ConcentrationUnit.MILLIMOLAR,
							finalConc: 50,
							finalUnit: ConcentrationUnit.MILLIMOLAR
						}
					],
					notes: 'pH 8.3、使用時に50倍希釈'
				} as BufferData,
				tags: ['TAE', 'DNA', '電気泳動', '50倍'],
				difficulty: 'intermediate',
				estimatedTime: '15分',
				author: 'Buffer Calc Team',
				references: ['Molecular Cloning Manual'],
				createdAt: new Date(),
				isBuiltIn: true
			},

			// Serial Dilution Templates
			{
				id: 'serial-dilution-ligand-standard',
				name: 'リガンド段階希釈（標準）',
				description: '細胞培養実験で一般的なリガンド濃度範囲の段階希釈プロトコル',
				category: TemplateCategory.CELL_CULTURE,
				type: 'serial-dilution',
				template: {
					name: 'リガンド段階希釈',
					stockConcentration: 10,
					stockUnit: ConcentrationUnit.MILLIMOLAR,
					cellVolume: 200,
					cellVolumeUnit: VolumeUnit.MICROLITER,
					additionVolume: 2,
					additionVolumeUnit: VolumeUnit.MICROLITER,
					dilutionVolume: 200,
					dilutionVolumeUnit: VolumeUnit.MICROLITER,
					targetConcentrations: [100, 10, 1, 0.1],
					targetUnit: ConcentrationUnit.MICROMOLAR
				} as SerialDilutionData,
				tags: ['リガンド', '細胞培養', '段階希釈', 'µM'],
				difficulty: 'beginner',
				estimatedTime: '15分',
				author: 'Buffer Calc Team',
				references: ['Cell Culture Protocols'],
				createdAt: new Date(),
				isBuiltIn: true
			},

			{
				id: 'serial-dilution-drug-screening',
				name: '薬物スクリーニング段階希釈',
				description: '薬物スクリーニング実験向けの広範囲濃度段階希釈プロトコル',
				category: TemplateCategory.CELL_CULTURE,
				type: 'serial-dilution',
				template: {
					name: '薬物スクリーニング希釈',
					stockConcentration: 100,
					stockUnit: ConcentrationUnit.MILLIMOLAR,
					cellVolume: 100,
					cellVolumeUnit: VolumeUnit.MICROLITER,
					additionVolume: 1,
					additionVolumeUnit: VolumeUnit.MICROLITER,
					dilutionVolume: 100,
					dilutionVolumeUnit: VolumeUnit.MICROLITER,
					targetConcentrations: [1000, 100, 10, 1, 0.1, 0.01],
					targetUnit: ConcentrationUnit.MICROMOLAR
				} as SerialDilutionData,
				tags: ['薬物', 'スクリーニング', '段階希釈', '広範囲'],
				difficulty: 'intermediate',
				estimatedTime: '20分',
				author: 'Buffer Calc Team',
				references: ['Drug Discovery Protocols'],
				createdAt: new Date(),
				isBuiltIn: true
			},

			{
				id: 'serial-dilution-protein-titration',
				name: 'タンパク質濃度滴定',
				description: 'タンパク質アッセイ用の濃度滴定段階希釈プロトコル',
				category: TemplateCategory.PROTEIN_BUFFERS,
				type: 'serial-dilution',
				template: {
					name: 'タンパク質濃度滴定',
					stockConcentration: 10,
					stockUnit: ConcentrationUnit.MILLIMOLAR,
					cellVolume: 96,
					cellVolumeUnit: VolumeUnit.MICROLITER,
					additionVolume: 4,
					additionVolumeUnit: VolumeUnit.MICROLITER,
					dilutionVolume: 200,
					dilutionVolumeUnit: VolumeUnit.MICROLITER,
					targetConcentrations: [1, 0.5, 0.25, 0.125, 0.0625],
					targetUnit: ConcentrationUnit.MILLIMOLAR
				} as SerialDilutionData,
				tags: ['タンパク質', 'アッセイ', '滴定', 'µg/mL'],
				difficulty: 'intermediate',
				estimatedTime: '12分',
				author: 'Buffer Calc Team',
				references: ['Protein Assay Protocols'],
				createdAt: new Date(),
				isBuiltIn: true
			}
		];
	}

	getBuiltInTemplates(): RecipeTemplate[] {
		return [...this.builtInTemplates];
	}

	getTemplatesByCategory(category: TemplateCategory): RecipeTemplate[] {
		return this.builtInTemplates.filter(template => template.category === category);
	}

	getTemplatesByType(type: 'buffer' | 'stock' | 'dilution' | 'serial-dilution'): RecipeTemplate[] {
		return this.builtInTemplates.filter(template => template.type === type);
	}

	getTemplatesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): RecipeTemplate[] {
		return this.builtInTemplates.filter(template => template.difficulty === difficulty);
	}

	searchTemplates(query: string): RecipeTemplate[] {
		const lowerQuery = query.toLowerCase();
		return this.builtInTemplates.filter(template => 
			template.name.toLowerCase().includes(lowerQuery) ||
			template.description.toLowerCase().includes(lowerQuery) ||
			template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
		);
	}

	getTemplateById(id: string): RecipeTemplate | undefined {
		return this.builtInTemplates.find(template => template.id === id);
	}

	getAllCategories(): TemplateCategory[] {
		return Object.values(TemplateCategory);
	}

	getCategoryDisplayName(category: TemplateCategory): string {
		const displayNames: Record<TemplateCategory, string> = {
			[TemplateCategory.COMMON_BUFFERS]: '一般的なバッファー',
			[TemplateCategory.PROTEIN_BUFFERS]: 'タンパク質バッファー',
			[TemplateCategory.MOLECULAR_BIOLOGY]: '分子生物学',
			[TemplateCategory.CELL_CULTURE]: '細胞培養',
			[TemplateCategory.ANALYTICAL]: '分析・定量',
			[TemplateCategory.CUSTOM]: 'カスタム'
		};
		return displayNames[category];
	}
}