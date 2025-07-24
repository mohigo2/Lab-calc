import { Notice } from 'obsidian';
import {
	ReagentCategory,
	CategoryStats,
	Reagent,
	BufferCalcSettings
} from '../types';

export class CategoryManager {
	/**
	 * デフォルトの組み込みカテゴリを取得
	 */
	static getBuiltInCategories(): ReagentCategory[] {
		return [
			{
				id: 'buffers',
				name: 'バッファー類',
				description: 'pH調整用のバッファー試薬',
				color: '#4CAF50',
				icon: '⚖️',
				isBuiltIn: true,
				createdAt: new Date()
			},
			{
				id: 'salts',
				name: '塩類',
				description: '各種無機塩・有機塩',
				color: '#2196F3',
				icon: '🧂',
				isBuiltIn: true,
				createdAt: new Date()
			},
			{
				id: 'acids_bases',
				name: '酸・塩基',
				description: '強酸・強塩基・弱酸・弱塩基',
				color: '#FF9800',
				icon: '⚗️',
				isBuiltIn: true,
				createdAt: new Date()
			},
			{
				id: 'organic_solvents',
				name: '有機溶媒',
				description: 'メタノール、エタノール、アセトンなど',
				color: '#E91E63',
				icon: '🧪',
				isBuiltIn: true,
				createdAt: new Date()
			},
			{
				id: 'detergents',
				name: '界面活性剤',
				description: 'SDS、Triton X-100など',
				color: '#9C27B0',
				icon: '🫧',
				isBuiltIn: true,
				createdAt: new Date()
			},
			{
				id: 'enzymes',
				name: '酵素類',
				description: 'タンパク質分解酵素、制限酵素など',
				color: '#607D8B',
				icon: '🧬',
				isBuiltIn: true,
				createdAt: new Date()
			},
			{
				id: 'proteins',
				name: 'タンパク質',
				description: 'BSA、抗体、標準タンパク質など',
				color: '#795548',
				icon: '🔬',
				isBuiltIn: true,
				createdAt: new Date()
			},
			{
				id: 'indicators',
				name: '指示薬・染料',
				description: 'pH指示薬、蛍光色素など',
				color: '#FF5722',
				icon: '🌈',
				isBuiltIn: true,
				createdAt: new Date()
			},
			{
				id: 'general',
				name: 'その他',
				description: '分類されていない試薬',
				color: '#9E9E9E',
				icon: '📦',
				isBuiltIn: true,
				createdAt: new Date()
			}
		];
	}

	/**
	 * カテゴリーを作成
	 */
	static createCategory(
		name: string,
		description?: string,
		color?: string,
		icon?: string
	): ReagentCategory {
		return {
			id: this.generateCategoryId(name),
			name,
			description,
			color: color || '#2196F3',
			icon: icon || '📂',
			isBuiltIn: false,
			createdAt: new Date()
		};
	}

	/**
	 * 設定にカテゴリーを追加
	 */
	static addCategory(
		settings: BufferCalcSettings,
		category: ReagentCategory
	): BufferCalcSettings {
		// 重複チェック
		const existingCategory = settings.customReagentCategories.find(
			cat => cat.name === category.name || cat.id === category.id
		);
		
		if (existingCategory) {
			throw new Error(`カテゴリー「${category.name}」は既に存在します`);
		}

		return {
			...settings,
			customReagentCategories: [...settings.customReagentCategories, category]
		};
	}

	/**
	 * カテゴリーを更新
	 */
	static updateCategory(
		settings: BufferCalcSettings,
		categoryId: string,
		updates: Partial<Pick<ReagentCategory, 'name' | 'description' | 'color' | 'icon'>>
	): BufferCalcSettings {
		const updatedCategories = settings.customReagentCategories.map(category =>
			category.id === categoryId ? { ...category, ...updates } : category
		);

		return {
			...settings,
			customReagentCategories: updatedCategories
		};
	}

	/**
	 * カテゴリーを削除
	 */
	static removeCategory(
		settings: BufferCalcSettings,
		categoryId: string
	): BufferCalcSettings {
		const categoryToRemove = settings.customReagentCategories.find(cat => cat.id === categoryId);
		
		if (categoryToRemove?.isBuiltIn) {
			throw new Error('組み込みカテゴリーは削除できません');
		}

		// カテゴリーに属する試薬を「その他」カテゴリーに移動
		const updatedReagents = settings.customReagents.map(reagent =>
			reagent.category === categoryId 
				? { ...reagent, category: 'general' }
				: reagent
		);

		return {
			...settings,
			customReagentCategories: settings.customReagentCategories.filter(
				category => category.id !== categoryId
			),
			customReagents: updatedReagents
		};
	}

	/**
	 * 全てのカテゴリーを取得（組み込み + カスタム）
	 */
	static getAllCategories(settings: BufferCalcSettings): ReagentCategory[] {
		const builtInCategories = this.getBuiltInCategories();
		const customCategories = settings.customReagentCategories || [];
		
		return [...builtInCategories, ...customCategories];
	}

	/**
	 * カテゴリー別の統計を生成
	 */
	static generateCategoryStats(
		settings: BufferCalcSettings
	): CategoryStats[] {
		const allCategories = this.getAllCategories(settings);
		const reagents = settings.customReagents || [];

		return allCategories.map(category => {
			const categoryReagents = reagents.filter(
				reagent => reagent.category === category.id
			);

			return {
				categoryId: category.id,
				categoryName: category.name,
				reagentCount: categoryReagents.length,
				recentlyUsed: categoryReagents
					.slice(0, 5)
					.map(reagent => reagent.name)
			};
		});
	}

	/**
	 * 試薬をカテゴリーに分類
	 */
	static categorizeReagent(
		settings: BufferCalcSettings,
		reagentName: string,
		categoryId: string
	): BufferCalcSettings {
		const allCategories = this.getAllCategories(settings);
		const categoryExists = allCategories.some(cat => cat.id === categoryId);
		
		if (!categoryExists) {
			throw new Error(`カテゴリー ID「${categoryId}」が見つかりません`);
		}

		const updatedReagents = settings.customReagents.map(reagent =>
			reagent.name === reagentName 
				? { ...reagent, category: categoryId }
				: reagent
		);

		return {
			...settings,
			customReagents: updatedReagents
		};
	}

	/**
	 * カテゴリー別に試薬を取得
	 */
	static getReagentsByCategory(
		settings: BufferCalcSettings,
		categoryId?: string
	): { [categoryId: string]: Reagent[] } {
		const reagents = settings.customReagents || [];
		const allCategories = this.getAllCategories(settings);
		
		if (categoryId) {
			return {
				[categoryId]: reagents.filter(reagent => reagent.category === categoryId)
			};
		}

		const result: { [categoryId: string]: Reagent[] } = {};
		
		allCategories.forEach(category => {
			result[category.id] = reagents.filter(
				reagent => reagent.category === category.id
			);
		});

		// カテゴリー未分類の試薬を「その他」に追加
		const uncategorized = reagents.filter(
			reagent => !reagent.category || 
			!allCategories.some(cat => cat.id === reagent.category)
		);
		
		if (uncategorized.length > 0) {
			result['general'] = [...(result['general'] || []), ...uncategorized];
		}

		return result;
	}

	/**
	 * カテゴリーの自動推定
	 */
	static suggestCategory(reagentName: string): string {
		const name = reagentName.toLowerCase();
		
		// バッファー類
		if (name.includes('tris') || name.includes('hepes') || name.includes('bis-tris') ||
			name.includes('mops') || name.includes('pipes') || name.includes('tricine')) {
			return 'buffers';
		}
		
		// 塩類
		if (name.includes('nacl') || name.includes('kcl') || name.includes('mgcl2') ||
			name.includes('cacl2') || name.includes('salt') || name.includes('chloride') ||
			name.includes('sulfate') || name.includes('phosphate')) {
			return 'salts';
		}
		
		// 酸・塩基
		if (name.includes('hcl') || name.includes('naoh') || name.includes('koh') ||
			name.includes('acid') || name.includes('base') || name.includes('hydroxide')) {
			return 'acids_bases';
		}
		
		// 有機溶媒
		if (name.includes('methanol') || name.includes('ethanol') || name.includes('acetone') ||
			name.includes('dmso') || name.includes('glycerol') || name.includes('alcohol')) {
			return 'organic_solvents';
		}
		
		// 界面活性剤
		if (name.includes('sds') || name.includes('triton') || name.includes('tween') ||
			name.includes('detergent') || name.includes('surfactant')) {
			return 'detergents';
		}
		
		// 酵素類
		if (name.includes('ase') || name.includes('enzyme') || name.includes('kinase') ||
			name.includes('phosphatase') || name.includes('protease')) {
			return 'enzymes';
		}
		
		// タンパク質
		if (name.includes('bsa') || name.includes('albumin') || name.includes('antibody') ||
			name.includes('protein') || name.includes('immunoglobulin')) {
			return 'proteins';
		}
		
		// 指示薬・染料
		if (name.includes('indicator') || name.includes('dye') || name.includes('fluorescein') ||
			name.includes('rhodamine') || name.includes('methylene')) {
			return 'indicators';
		}
		
		return 'general';
	}

	/**
	 * カテゴリー検索
	 */
	static searchCategories(
		settings: BufferCalcSettings,
		query: string
	): ReagentCategory[] {
		const allCategories = this.getAllCategories(settings);
		const searchQuery = query.toLowerCase();
		
		return allCategories.filter(category =>
			category.name.toLowerCase().includes(searchQuery) ||
			(category.description && category.description.toLowerCase().includes(searchQuery))
		);
	}

	// プライベートメソッド
	private static generateCategoryId(name: string): string {
		const cleanName = name
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '_')
			.replace(/_+/g, '_')
			.replace(/^_|_$/g, '');
		
		return `custom_${cleanName}_${Date.now()}`;
	}
}