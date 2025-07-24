export interface BufferCalcSettings {
	defaultVolumeUnit: VolumeUnit;
	defaultConcentrationUnit: ConcentrationUnit;
	decimalPlaces: number;
	enableSuggestions: boolean;
	showCalculationSteps: boolean;
	customReagents: Reagent[];
	defaultTemplate: string;
	recipeTemplates: RecipeTemplate[];
	enableTemplates: boolean;
	calculationHistory: CalculationHistoryEntry[];
	enableHistory: boolean;
	maxHistoryEntries: number;
	customReagentCategories: ReagentCategory[];
	enableCustomCategories: boolean;
}

export interface Reagent {
	name: string;
	molecularWeight: number;
	cas?: string;
	pubchemId?: string;
	category?: string;
	hazards?: string[];
	lotNumber?: string;
	vendor?: string;
	concentration?: number;
	concentrationUnit?: ConcentrationUnit;
	purity?: number;
}

export interface BufferComponent {
	reagent: Reagent;
	stockConcentration: number;
	stockConcentrationUnit: ConcentrationUnit;
	finalConcentration: number;
	finalConcentrationUnit: ConcentrationUnit;
	volumeNeeded?: number;
	volumeUnit?: VolumeUnit;
	lotNumber?: string;
}

export interface BufferRecipe {
	id: string;
	name: string;
	description?: string;
	totalVolume: number;
	totalVolumeUnit: VolumeUnit;
	components: BufferComponent[];
	solventVolume?: number;
	pH?: number;
	notes?: string;
	createdAt: Date;
	updatedAt: Date;
	author?: string;
	tags?: string[];
}

export interface StockSolution {
	reagent: Reagent;
	targetConcentration: number;
	concentrationUnit: ConcentrationUnit;
	volume: number;
	volumeUnit: VolumeUnit;
	massNeeded?: number;
	massUnit?: MassUnit;
	solvent: string;
}

export interface DilutionStep {
	fromConcentration: number;
	toConcentration: number;
	concentrationUnit: ConcentrationUnit;
	stockVolume: number;
	finalVolume: number;
	volumeUnit: VolumeUnit;
	dilutionFactor: number;
}

export interface SerialDilution {
	initialStock: StockSolution;
	steps: DilutionStep[];
	finalConcentration: number;
	finalVolume: number;
}

export interface CalculationResult {
	recipe: BufferRecipe;
	components: CalculatedComponent[];
	solventVolume: number;
	warnings: Warning[];
	errors: ValidationError[];
	calculationSteps?: CalculationStep[];
}

export interface CalculatedComponent extends BufferComponent {
	volumeNeeded: number;
	volumeUnit: VolumeUnit;
	optimizedVolumeDisplay: string;
	percentOfTotal: number;
	massEquivalent?: number;
	massUnit?: MassUnit;
}

export interface Warning {
	type: WarningType;
	message: string;
	componentIndex?: number;
	severity: 'low' | 'medium' | 'high';
}

export interface ValidationError {
	type: ErrorType;
	message: string;
	componentIndex?: number;
	field?: string;
}

export interface CalculationStep {
	step: number;
	description: string;
	formula?: string;
	result: number;
	unit: string;
}

export enum VolumeUnit {
	LITER = 'L',
	MILLILITER = 'mL',
	MICROLITER = 'µL',
	NANOLITER = 'nL'
}

export enum ConcentrationUnit {
	MOLAR = 'M',
	MILLIMOLAR = 'mM',
	MICROMOLAR = 'µM',
	NANOMOLAR = 'nM',
	PERCENT_W_V = '%(w/v)',
	PERCENT_W_W = '%(w/w)',
	PERCENT_V_V = '%(v/v)',
	MG_ML = 'mg/mL',
	UG_ML = 'µg/mL',
	PPM = 'ppm',
	PPB = 'ppb'
}

export enum MassUnit {
	GRAM = 'g',
	MILLIGRAM = 'mg',
	MICROGRAM = 'µg',
	NANOGRAM = 'ng'
}

export enum WarningType {
	HIGH_CONCENTRATION = 'high_concentration',
	LOW_CONCENTRATION = 'low_concentration',
	SMALL_VOLUME = 'small_volume',
	LARGE_VOLUME = 'large_volume',
	MISSING_MOLECULAR_WEIGHT = 'missing_molecular_weight',
	UNUSUAL_DILUTION_FACTOR = 'unusual_dilution_factor',
	OLD_REAGENT = 'old_reagent',
	VOLUME_OVERFLOW = 'volume_overflow'
}

export enum ErrorType {
	IMPOSSIBLE_CONCENTRATION = 'impossible_concentration',
	INVALID_CONCENTRATION = 'invalid_concentration',
	INVALID_VOLUME = 'invalid_volume',
	NEGATIVE_VALUE = 'negative_value',
	MISSING_REQUIRED_FIELD = 'missing_required_field',
	INVALID_MOLECULAR_WEIGHT = 'invalid_molecular_weight',
	CONCENTRATION_UNIT_MISMATCH = 'concentration_unit_mismatch',
	VOLUME_OVERFLOW = 'volume_overflow',
	CALCULATION_ERROR = 'calculation_error'
}

export interface BufferCalcBlockContent {
	type: 'buffer' | 'stock' | 'dilution';
	data: BufferCalcData;
	options?: BlockOptions;
}

export interface BlockOptions {
	showSteps?: boolean;
	showWarnings?: boolean;
	unit?: VolumeUnit;
	decimalPlaces?: number;
	hideResults?: boolean;
	template?: string;
}

export type BufferCalcData = BufferData | StockData | DilutionData;

export interface BufferData {
	name?: string;
	totalVolume: number;
	volumeUnit?: VolumeUnit;
	components: ComponentInput[];
	notes?: string;
}

export interface ComponentInput {
	name: string;
	stockConc: number;
	stockUnit: ConcentrationUnit;
	finalConc: number;
	finalUnit: ConcentrationUnit;
	lotNumber?: string;
}



export interface ReagentDatabase {
	version: string;
	lastUpdated: Date;
	reagents: Reagent[];
	categories: string[];
}

export interface ExportOptions {
	format: 'markdown' | 'json' | 'csv' | 'qr';
	includeSteps: boolean;
	includeWarnings: boolean;
	includeMetadata: boolean;
}

export interface SettingsExportData {
	version: string;
	exportDate: string;
	settings: BufferCalcSettings;
	customReagents: Reagent[];
	recipeTemplates: RecipeTemplate[];
	metadata: {
		pluginVersion: string;
		exportSource: string;
		totalTemplates: number;
		totalCustomReagents: number;
	};
}

export interface ImportResult {
	success: boolean;
	message: string;
	warnings?: string[];
	importedSettings?: boolean;
	importedReagents?: number;
	importedTemplates?: number;
}

export interface CalculationHistoryEntry {
	id: string;
	timestamp: Date;
	type: 'buffer' | 'stock' | 'dilution';
	name: string;
	inputData: BufferCalcData;
	result: CalculationResult;
	notes?: string;
	tags?: string[];
	starred: boolean;
}

export interface HistoryFilter {
	type?: 'buffer' | 'stock' | 'dilution' | 'all';
	dateRange?: {
		start: Date;
		end: Date;
	};
	searchQuery?: string;
	tags?: string[];
	starred?: boolean;
}

export interface HistoryStats {
	totalCalculations: number;
	bufferCalculations: number;
	stockCalculations: number;
	dilutionCalculations: number;
	averageCalculationsPerDay: number;
	mostUsedReagents: { name: string; count: number }[];
	recentActivity: { date: string; count: number }[];
}

export interface ReagentCategory {
	id: string;
	name: string;
	description?: string;
	color?: string;
	icon?: string;
	isBuiltIn: boolean;
	createdAt: Date;
	reagentCount?: number;
}

export interface CategoryStats {
	categoryId: string;
	categoryName: string;
	reagentCount: number;
	recentlyUsed: string[];
}

export const DEFAULT_SETTINGS: BufferCalcSettings = {
	defaultVolumeUnit: VolumeUnit.MILLILITER,
	defaultConcentrationUnit: ConcentrationUnit.MILLIMOLAR,
	decimalPlaces: 2,
	enableSuggestions: true,
	showCalculationSteps: false,
	customReagents: [],
	defaultTemplate: 'buffer',
	recipeTemplates: [],
	enableTemplates: true,
	calculationHistory: [],
	enableHistory: true,
	maxHistoryEntries: 100,
	customReagentCategories: [],
	enableCustomCategories: true
};

export const VOLUME_CONVERSION_FACTORS: Record<VolumeUnit, number> = {
	[VolumeUnit.LITER]: 1,
	[VolumeUnit.MILLILITER]: 1000,
	[VolumeUnit.MICROLITER]: 1000000,
	[VolumeUnit.NANOLITER]: 1000000000
};

export const MASS_CONVERSION_FACTORS: Record<MassUnit, number> = {
	[MassUnit.GRAM]: 1,
	[MassUnit.MILLIGRAM]: 1000,
	[MassUnit.MICROGRAM]: 1000000,
	[MassUnit.NANOGRAM]: 1000000000
};

export const CONCENTRATION_CONVERSION_FACTORS: Record<ConcentrationUnit, number> = {
	[ConcentrationUnit.MOLAR]: 1,
	[ConcentrationUnit.MILLIMOLAR]: 1000,
	[ConcentrationUnit.MICROMOLAR]: 1000000,
	[ConcentrationUnit.NANOMOLAR]: 1000000000,
	[ConcentrationUnit.PERCENT_W_V]: 1,
	[ConcentrationUnit.PERCENT_W_W]: 1,
	[ConcentrationUnit.PERCENT_V_V]: 1,
	[ConcentrationUnit.MG_ML]: 1,
	[ConcentrationUnit.UG_ML]: 1000,
	[ConcentrationUnit.PPM]: 1000000,
	[ConcentrationUnit.PPB]: 1000000000
};

// Stock solution data interface
export interface StockData {
	name?: string;
	reagentName: string;
	molecularWeight?: number;
	targetConcentration: number;
	concentrationUnit: ConcentrationUnit;
	volume: number;
	volumeUnit: VolumeUnit;
	purity?: number; // Percentage (0-100)
	solvent?: string;
	notes?: string;
}

// Dilution data interface
export interface DilutionData {
	name?: string;
	stockConcentration: number;
	stockConcentrationUnit: ConcentrationUnit;
	finalConcentration: number;
	finalConcentrationUnit: ConcentrationUnit;
	finalVolume: number;
	volumeUnit: VolumeUnit;
	steps?: number; // Number of dilution steps
	dilutionFactor?: number;
	notes?: string;
}

// Recipe template interfaces
export interface RecipeTemplate {
	id: string;
	name: string;
	description: string;
	category: TemplateCategory;
	type: 'buffer' | 'stock' | 'dilution';
	template: BufferCalcData;
	tags: string[];
	difficulty: 'beginner' | 'intermediate' | 'advanced';
	estimatedTime?: string;
	author?: string;
	references?: string[];
	createdAt: Date;
	isBuiltIn: boolean;
}

export enum TemplateCategory {
	COMMON_BUFFERS = 'common_buffers',
	PROTEIN_BUFFERS = 'protein_buffers',
	MOLECULAR_BIOLOGY = 'molecular_biology',
	CELL_CULTURE = 'cell_culture',
	ANALYTICAL = 'analytical',
	CUSTOM = 'custom'
}