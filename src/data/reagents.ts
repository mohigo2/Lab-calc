import { Reagent } from '../types';

export class ReagentDatabase {
	private builtInReagents: Reagent[] = [];
	private userReagents: Reagent[] = [];

	async initialize(): Promise<void> {
		this.builtInReagents = this.getBuiltInReagents();
	}

	/**
	 * Search for reagents by name (fuzzy matching)
	 */
	searchReagents(query: string, includeCustom: boolean = true): Reagent[] {
		const allReagents = includeCustom 
			? [...this.builtInReagents, ...this.userReagents]
			: this.builtInReagents;

		if (!query.trim()) {
			return allReagents.slice(0, 20); // Return first 20 if no query
		}

		const queryLower = query.toLowerCase();
		
		return allReagents
			.filter(reagent => 
				reagent.name.toLowerCase().includes(queryLower) ||
				reagent.cas?.includes(query) ||
				reagent.category?.toLowerCase().includes(queryLower)
			)
			.sort((a, b) => {
				// Exact matches first
				const aExact = a.name.toLowerCase() === queryLower;
				const bExact = b.name.toLowerCase() === queryLower;
				if (aExact && !bExact) return -1;
				if (!aExact && bExact) return 1;

				// Then starts with
				const aStarts = a.name.toLowerCase().startsWith(queryLower);
				const bStarts = b.name.toLowerCase().startsWith(queryLower);
				if (aStarts && !bStarts) return -1;
				if (!aStarts && bStarts) return 1;

				// Finally alphabetical
				return a.name.localeCompare(b.name);
			})
			.slice(0, 20); // Limit results
	}

	/**
	 * Get reagent by exact name match
	 */
	getReagentByName(name: string): Reagent | null {
		const allReagents = [...this.builtInReagents, ...this.userReagents];
		return allReagents.find(reagent => 
			reagent.name.toLowerCase() === name.toLowerCase()
		) || null;
	}

	/**
	 * Add user custom reagent
	 */
	addUserReagent(reagent: Reagent): void {
		this.userReagents.push(reagent);
	}

	/**
	 * Update user custom reagent
	 */
	updateUserReagent(index: number, reagent: Reagent): void {
		if (index >= 0 && index < this.userReagents.length) {
			this.userReagents[index] = reagent;
		}
	}

	/**
	 * Remove user custom reagent
	 */
	removeUserReagent(index: number): void {
		if (index >= 0 && index < this.userReagents.length) {
			this.userReagents.splice(index, 1);
		}
	}

	/**
	 * Get all user reagents
	 */
	getUserReagents(): Reagent[] {
		return [...this.userReagents];
	}

	/**
	 * Set user reagents (for loading from settings)
	 */
	setUserReagents(reagents: Reagent[]): void {
		this.userReagents = reagents;
	}

	/**
	 * Get reagents by category
	 */
	getReagentsByCategory(category: string): Reagent[] {
		const allReagents = [...this.builtInReagents, ...this.userReagents];
		return allReagents.filter(reagent => 
			reagent.category?.toLowerCase() === category.toLowerCase()
		);
	}

	/**
	 * Get all available categories
	 */
	getCategories(): string[] {
		const allReagents = [...this.builtInReagents, ...this.userReagents];
		const categories = new Set<string>();
		
		allReagents.forEach(reagent => {
			if (reagent.category) {
				categories.add(reagent.category);
			}
		});

		return Array.from(categories).sort();
	}

	/**
	 * Generate external links for a reagent
	 */
	getExternalLinks(reagent: Reagent): { name: string, url: string }[] {
		const links: { name: string, url: string }[] = [];

		// PubChem link
		if (reagent.pubchemId) {
			links.push({
				name: 'PubChem',
				url: `https://pubchem.ncbi.nlm.nih.gov/compound/${reagent.pubchemId}`
			});
		} else if (reagent.name) {
			// Search by name if no ID available
			const searchName = encodeURIComponent(reagent.name);
			links.push({
				name: 'PubChem Search',
				url: `https://pubchem.ncbi.nlm.nih.gov/#query=${searchName}`
			});
		}

		// Sigma-Aldrich search
		if (reagent.cas) {
			links.push({
				name: 'Sigma-Aldrich',
				url: `https://www.sigmaaldrich.com/US/en/search/${reagent.cas}?focus=products&page=1&perpage=30&sort=relevance&term=${reagent.cas}&type=cas_number`
			});
		}

		// Thermo Fisher search
		if (reagent.name) {
			const searchName = encodeURIComponent(reagent.name);
			links.push({
				name: 'Thermo Fisher',
				url: `https://www.thermofisher.com/search/results?query=${searchName}&searchLocation=US&focusarea=Search%20All`
			});
		}

		return links;
	}

	private getBuiltInReagents(): Reagent[] {
		return [
			// Buffers
			{
				name: 'Tris',
				molecularWeight: 121.14,
				cas: '77-86-1',
				pubchemId: '6503',
				category: 'Buffer',
				hazards: ['Irritant']
			},
			{
				name: 'Tris-HCl',
				molecularWeight: 157.6,
				cas: '1185-53-1',
				category: 'Buffer',
				hazards: ['Irritant']
			},
			{
				name: 'HEPES',
				molecularWeight: 238.31,
				cas: '7365-45-9',
				pubchemId: '23831',
				category: 'Buffer',
				hazards: ['Irritant']
			},
			{
				name: 'PIPES',
				molecularWeight: 302.37,
				cas: '5625-37-6',
				pubchemId: '79723',
				category: 'Buffer',
				hazards: ['Irritant']
			},
			{
				name: 'MOPS',
				molecularWeight: 209.26,
				cas: '1132-61-2',
				pubchemId: '70678',
				category: 'Buffer',
				hazards: ['Irritant']
			},
			{
				name: 'Bis-Tris',
				molecularWeight: 209.24,
				cas: '6976-37-0',
				pubchemId: '160556',
				category: 'Buffer'
			},
			{
				name: 'Tricine',
				molecularWeight: 179.17,
				cas: '5704-04-1',
				pubchemId: '92958',
				category: 'Buffer'
			},
			{
				name: 'CAPS',
				molecularWeight: 221.31,
				cas: '1135-40-6',
				pubchemId: '71578',
				category: 'Buffer'
			},

			// Salts
			{
				name: 'NaCl',
				molecularWeight: 58.44,
				cas: '7647-14-5',
				pubchemId: '5234',
				category: 'Salt'
			},
			{
				name: 'KCl',
				molecularWeight: 74.55,
				cas: '7447-40-7',
				pubchemId: '4873',
				category: 'Salt'
			},
			{
				name: 'MgCl2',
				molecularWeight: 95.21,
				cas: '7786-30-3',
				pubchemId: '5360315',
				category: 'Salt'
			},
			{
				name: 'MgCl2·6H2O',
				molecularWeight: 203.30,
				cas: '7791-18-6',
				pubchemId: '24584',
				category: 'Salt'
			},
			{
				name: 'CaCl2',
				molecularWeight: 110.98,
				cas: '10043-52-4',
				pubchemId: '5284359',
				category: 'Salt'
			},
			{
				name: 'CaCl2·2H2O',
				molecularWeight: 147.01,
				cas: '10035-04-8',
				pubchemId: '24844',
				category: 'Salt'
			},
			{
				name: 'Na2HPO4',
				molecularWeight: 141.96,
				cas: '7558-79-4',
				pubchemId: '24203',
				category: 'Salt'
			},
			{
				name: 'NaH2PO4',
				molecularWeight: 119.98,
				cas: '7558-80-7',
				pubchemId: '23672064',
				category: 'Salt'
			},
			{
				name: 'K2HPO4',
				molecularWeight: 174.18,
				cas: '7758-11-4',
				pubchemId: '24450',
				category: 'Salt'
			},
			{
				name: 'KH2PO4',
				molecularWeight: 136.09,
				cas: '7778-77-0',
				pubchemId: '516951',
				category: 'Salt'
			},

			// Detergents
			{
				name: 'Triton X-100',
				molecularWeight: 647,
				cas: '9002-93-1',
				category: 'Detergent',
				hazards: ['Toxic', 'Environmental hazard']
			},
			{
				name: 'Tween 20',
				molecularWeight: 1227.54,
				cas: '9005-64-5',
				pubchemId: '16129878',
				category: 'Detergent'
			},
			{
				name: 'SDS',
				molecularWeight: 288.38,
				cas: '151-21-3',
				pubchemId: '3423265',
				category: 'Detergent',
				hazards: ['Irritant', 'Harmful']
			},
			{
				name: 'NP-40',
				molecularWeight: 603,
				cas: '9016-45-9',
				category: 'Detergent',
				hazards: ['Harmful']
			},

			// Reducing agents
			{
				name: 'DTT',
				molecularWeight: 154.25,
				cas: '3483-12-3',
				pubchemId: '446094',
				category: 'Reducing Agent'
			},
			{
				name: 'TCEP',
				molecularWeight: 286.65,
				cas: '51805-45-9',
				pubchemId: '115109',
				category: 'Reducing Agent'
			},
			{
				name: 'β-Mercaptoethanol',
				molecularWeight: 78.13,
				cas: '60-24-2',
				pubchemId: '1567',
				category: 'Reducing Agent',
				hazards: ['Toxic', 'Flammable']
			},

			// Protease inhibitors
			{
				name: 'PMSF',
				molecularWeight: 174.19,
				cas: '329-98-6',
				pubchemId: '4784',
				category: 'Protease Inhibitor',
				hazards: ['Toxic', 'Flammable']
			},
			{
				name: 'Benzamidine HCl',
				molecularWeight: 156.61,
				cas: '1670-14-0',
				pubchemId: '12699',
				category: 'Protease Inhibitor'
			},
			{
				name: 'EDTA',
				molecularWeight: 292.24,
				cas: '60-00-4',
				pubchemId: '6049',
				category: 'Chelator'
			},
			{
				name: 'EGTA',
				molecularWeight: 380.35,
				cas: '67-42-5',
				pubchemId: '6207',
				category: 'Chelator'
			},

			// Common organics
			{
				name: 'Glycerol',
				molecularWeight: 92.09,
				cas: '56-81-5',
				pubchemId: '753',
				category: 'Organic'
			},
			{
				name: 'Sucrose',
				molecularWeight: 342.30,
				cas: '57-50-1',
				pubchemId: '5988',
				category: 'Organic'
			},
			{
				name: 'Glucose',
				molecularWeight: 180.16,
				cas: '50-99-7',
				pubchemId: '5793',
				category: 'Organic'
			},
			{
				name: 'Imidazole',
				molecularWeight: 68.08,
				cas: '288-32-4',
				pubchemId: '795',
				category: 'Organic'
			},
			{
				name: 'Glycine',
				molecularWeight: 75.07,
				cas: '56-40-6',
				pubchemId: '750',
				category: 'Amino Acid'
			},
			{
				name: 'Urea',
				molecularWeight: 60.06,
				cas: '57-13-6',
				pubchemId: '1176',
				category: 'Chaotrope',
				hazards: ['Irritant']
			},
			{
				name: 'Guanidine HCl',
				molecularWeight: 95.53,
				cas: '50-01-1',
				pubchemId: '3547',
				category: 'Chaotrope',
				hazards: ['Harmful']
			}
		];
	}
}