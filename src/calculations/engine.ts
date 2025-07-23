import {
	BufferCalcSettings,
	BufferData,
	StockData,
	DilutionData,
	CalculationResult,
	CalculatedComponent,
	Warning,
	ValidationError,
	CalculationStep,
	BufferComponent,
	VolumeUnit,
	ConcentrationUnit,
	MassUnit,
	WarningType,
	ErrorType,
	VOLUME_CONVERSION_FACTORS,
	MASS_CONVERSION_FACTORS,
	CONCENTRATION_CONVERSION_FACTORS
} from '../types';

import { ConversionUtils } from '../utils/conversions';

export class CalculationEngine {
	private settings: BufferCalcSettings;

	constructor(settings: BufferCalcSettings) {
		this.settings = settings;
	}

	updateSettings(settings: BufferCalcSettings): void {
		this.settings = settings;
	}

	calculateBuffer(data: BufferData): CalculationResult {
		const errors: ValidationError[] = [];
		const warnings: Warning[] = [];
		const calculationSteps: CalculationStep[] = [];
		const components: CalculatedComponent[] = [];

		// Validate input data
		this.validateBufferData(data, errors);

		if (errors.length > 0) {
			return {
				recipe: this.createBufferRecipe(data),
				components: [],
				solventVolume: 0,
				warnings,
				errors,
				calculationSteps
			};
		}

		// Convert total volume to liters for calculations
		const totalVolumeL = this.convertVolume(
			data.totalVolume, 
			data.volumeUnit || this.settings.defaultVolumeUnit, 
			VolumeUnit.LITER
		);

		let step = 1;
		let totalComponentVolume = 0;

		// Calculate each component
		const componentList = Array.isArray(data.components) ? data.components : [];
		componentList.forEach((component, index) => {
			try {
				const calculatedComponent = this.calculateComponent(
					component,
					totalVolumeL,
					index,
					warnings,
					calculationSteps,
					step
				);

				components.push(calculatedComponent);
				totalComponentVolume += calculatedComponent.volumeNeeded;
				step += 2; // Each component takes 2 steps

			} catch (error) {
				errors.push({
					type: ErrorType.CALCULATION_ERROR,
					message: `成分 ${component.name} の計算エラー: ${error.message}`,
					componentIndex: index
				});
			}
		});

		// Calculate solvent volume
		const solventVolumeL = Math.max(0, totalVolumeL - totalComponentVolume);
		const solventVolume = this.convertVolume(solventVolumeL, VolumeUnit.LITER, data.volumeUnit || this.settings.defaultVolumeUnit);
		
		// Debug logging
		console.log('Solvent calculation debug:');
		console.log('- Total volume (L):', totalVolumeL);
		console.log('- Total component volume (L):', totalComponentVolume);
		console.log('- Solvent volume (L):', solventVolumeL);
		console.log('- Solvent volume (display unit):', solventVolume);

		// Add solvent calculation step
		if (this.settings.showCalculationSteps) {
			calculationSteps.push({
				step: step,
				description: `Calculate solvent volume`,
				formula: `Solvent volume = Total volume - Sum of component volumes`,
				result: solventVolume,
				unit: data.volumeUnit || this.settings.defaultVolumeUnit
			});
		}

		// Check for volume overflow
		if (solventVolumeL < 0) {
			warnings.push({
				type: WarningType.VOLUME_OVERFLOW,
				message: '成分の体積が総体積を超えています。総体積を増やすことを検討してください。',
				severity: 'high'
			});
		}

		// Check for very small solvent volumes
		if (solventVolumeL < totalVolumeL * 0.1) {
			warnings.push({
				type: WarningType.SMALL_VOLUME,
				message: '溶媒の体積が非常に小さくなっています。成分濃度を下げることを検討してください。',
				severity: 'medium'
			});
		}

		const finalResult = {
			recipe: this.createBufferRecipe(data),
			components,
			solventVolume: Math.max(0, solventVolume),
			warnings,
			errors,
			calculationSteps: this.settings.showCalculationSteps ? calculationSteps : undefined
		};
		
		console.log('Final calculation result:', finalResult);
		return finalResult;
	}

	private calculateComponent(
		component: any,
		totalVolumeL: number,
		index: number,
		warnings: Warning[],
		calculationSteps: CalculationStep[],
		step: number
	): CalculatedComponent {
		
		// Convert concentrations to molar for calculation
		const stockConcM = this.convertConcentration(
			component.stockConc,
			component.stockUnit,
			ConcentrationUnit.MOLAR
		);
		
		const finalConcM = this.convertConcentration(
			component.finalConc,
			component.finalUnit,
			ConcentrationUnit.MOLAR
		);

		// Check for impossible concentration
		if (finalConcM > stockConcM) {
			throw new Error(`最終濃度 (${component.finalConc} ${component.finalUnit}) はストック濃度 (${component.stockConc} ${component.stockUnit}) より高くすることはできません`);
		}

		// Calculate required volume using C1V1 = C2V2
		// V1 = (C2 * V2) / C1
		const requiredVolumeL = (finalConcM * totalVolumeL) / stockConcM;

		// Convert back to desired units
		const requiredVolume = this.convertVolume(
			requiredVolumeL,
			VolumeUnit.LITER,
			this.settings.defaultVolumeUnit
		);

		// Add calculation steps
		if (this.settings.showCalculationSteps) {
			calculationSteps.push({
				step: step,
				description: `Calculate ${component.name} volume`,
				formula: `V₁ = (C₂ × V₂) / C₁ = (${finalConcM} M × ${totalVolumeL} L) / ${stockConcM} M`,
				result: requiredVolumeL,
				unit: VolumeUnit.LITER
			});

			calculationSteps.push({
				step: step + 1,
				description: `Convert to ${this.settings.defaultVolumeUnit}`,
				formula: `${requiredVolumeL} L × ${VOLUME_CONVERSION_FACTORS[this.settings.defaultVolumeUnit]}`,
				result: requiredVolume,
				unit: this.settings.defaultVolumeUnit
			});
		}

		// Generate warnings
		this.generateComponentWarnings(component, requiredVolume, stockConcM, finalConcM, warnings, index);

		// Calculate percentage of total
		const percentOfTotal = (requiredVolumeL / totalVolumeL) * 100;

		return {
			reagent: {
				name: component.name,
				molecularWeight: 0 // Will be filled from database
			},
			stockConcentration: component.stockConc,
			stockConcentrationUnit: component.stockUnit,
			finalConcentration: component.finalConc,
			finalConcentrationUnit: component.finalUnit,
			volumeNeeded: requiredVolumeL, // Use liters for calculation consistency
			volumeUnit: this.settings.defaultVolumeUnit,
			optimizedVolumeDisplay: this.optimizeVolumeDisplay(requiredVolume, this.settings.defaultVolumeUnit),
			percentOfTotal: Math.round(percentOfTotal * 100) / 100,
			lotNumber: component.lotNumber
		};
	}

	calculateStock(data: StockData): CalculationResult {
		const errors: ValidationError[] = [];
		const warnings: Warning[] = [];
		const calculationSteps: CalculationStep[] = [];

		// Validate molecular weight
		if (!data.molecularWeight || data.molecularWeight <= 0) {
			errors.push({
				type: ErrorType.INVALID_MOLECULAR_WEIGHT,
				message: 'ストック溶液計算には有効な分子量が必要です',
				field: 'molecularWeight'
			});
		}

		if (errors.length > 0) {
			return {
				recipe: {
					id: '',
					name: `${data.reagentName} ストック溶液`,
					totalVolume: data.volume,
					totalVolumeUnit: data.volumeUnit,
					components: [],
					createdAt: new Date(),
					updatedAt: new Date()
				},
				components: [],
				solventVolume: 0,
				warnings,
				errors,
				calculationSteps
			};
		}

		// Convert volume to liters
		const volumeL = this.convertVolume(data.volume, data.volumeUnit, VolumeUnit.LITER);
		
		// Convert concentration to molarity
		const concentrationM = this.convertConcentration(
			data.targetConcentration,
			data.concentrationUnit,
			ConcentrationUnit.MOLAR
		);

		// Calculate required mass: mass = concentration (mol/L) × volume (L) × molecular weight (g/mol)
		let massG = concentrationM * volumeL * data.molecularWeight!;

		// Adjust for purity if provided
		if (data.purity && data.purity > 0 && data.purity < 100) {
			massG = massG / (data.purity / 100);
		}

		// Choose appropriate mass unit
		const { mass: optimizedMass, unit: massUnit } = this.optimizeMassDisplay(massG);

		// Add calculation steps
		if (this.settings.showCalculationSteps) {
			calculationSteps.push({
				step: 1,
				description: '必要質量を計算',
				formula: `質量 = 濃度 × 体積 × 分子量 = ${concentrationM} mol/L × ${volumeL} L × ${data.molecularWeight} g/mol`,
				result: massG,
				unit: MassUnit.GRAM
			});

			if (data.purity && data.purity !== 100) {
				calculationSteps.push({
					step: 2,
					description: '純度補正',
					formula: `補正質量 = ${massG} g / (${data.purity}% / 100%)`,
					result: massG / (data.purity / 100),
					unit: MassUnit.GRAM
				});
			}
		}

		// Generate warnings
		if (massG < 0.001) {
			warnings.push({
				type: WarningType.SMALL_VOLUME,
				message: '非常に小さい質量が必要です。より希薄なストック溶液の作成を検討してください。',
				severity: 'medium'
			});
		}

		if (massG > 10) {
			warnings.push({
				type: WarningType.LARGE_VOLUME,
				message: '大きい質量が必要です。より小さい体積またはより濃縮されたストックの作成を検討してください。',
				severity: 'low'
			});
		}

		const component: CalculatedComponent = {
			reagent: {
				name: data.reagentName,
				molecularWeight: data.molecularWeight!
			},
			stockConcentration: data.targetConcentration,
			stockConcentrationUnit: data.concentrationUnit,
			finalConcentration: data.targetConcentration,
			finalConcentrationUnit: data.concentrationUnit,
			volumeNeeded: optimizedMass,
			volumeUnit: massUnit as any,
			optimizedVolumeDisplay: `${this.formatNumber(optimizedMass)} ${massUnit}`,
			percentOfTotal: 100,
			massEquivalent: optimizedMass,
			massUnit: massUnit
		};

		return {
			recipe: {
				id: '',
				name: `${data.reagentName} ストック溶液`,
				totalVolume: data.volume,
				totalVolumeUnit: data.volumeUnit,
				components: [component],
				createdAt: new Date(),
				updatedAt: new Date()
			},
			components: [component],
			solventVolume: data.volume, // The entire volume is solvent + solute
			warnings,
			errors,
			calculationSteps: this.settings.showCalculationSteps ? calculationSteps : undefined
		};
	}

	private validateBufferData(data: BufferData, errors: ValidationError[]): void {
		if (!data.totalVolume || data.totalVolume <= 0) {
			errors.push({
				type: ErrorType.NEGATIVE_VALUE,
				message: 'Total volume must be greater than 0',
				field: 'totalVolume'
			});
		}

		if (!Array.isArray(data.components) || data.components.length === 0) {
			errors.push({
				type: ErrorType.MISSING_REQUIRED_FIELD,
				message: 'At least one component is required',
				field: 'components'
			});
			return;
		}

		const validationComponents = Array.isArray(data.components) ? data.components : [];
		validationComponents.forEach((component, index) => {
			if (!component.name || component.name.trim() === '') {
				errors.push({
					type: ErrorType.MISSING_REQUIRED_FIELD,
					message: 'Component name is required',
					componentIndex: index,
					field: 'name'
				});
			}

			if (!component.stockConc || component.stockConc <= 0) {
				errors.push({
					type: ErrorType.NEGATIVE_VALUE,
					message: 'Stock concentration must be greater than 0',
					componentIndex: index,
					field: 'stockConc'
				});
			}

			if (!component.finalConc || component.finalConc <= 0) {
				errors.push({
					type: ErrorType.NEGATIVE_VALUE,
					message: 'Final concentration must be greater than 0',
					componentIndex: index,
					field: 'finalConc'
				});
			}
		});
	}

	private generateComponentWarnings(
		component: any,
		requiredVolume: number,
		stockConcM: number,
		finalConcM: number,
		warnings: Warning[],
		index: number
	): void {
		
		// Check for very small volumes
		if (requiredVolume < 0.1) {
			warnings.push({
				type: WarningType.SMALL_VOLUME,
				message: `Very small volume required for ${component.name} (${this.formatNumber(requiredVolume)} ${this.settings.defaultVolumeUnit}). Consider using a more dilute stock.`,
				componentIndex: index,
				severity: 'medium'
			});
		}

		// Check for high dilution factor
		const dilutionFactor = stockConcM / finalConcM;
		if (dilutionFactor > 1000) {
			warnings.push({
				type: WarningType.UNUSUAL_DILUTION_FACTOR,
				message: `Very high dilution factor for ${component.name} (${Math.round(dilutionFactor)}×). Consider using a more dilute stock.`,
				componentIndex: index,
				severity: 'low'
			});
		}
	}

	private convertVolume(value: number, fromUnit: VolumeUnit, toUnit: VolumeUnit): number {
		if (fromUnit === toUnit) return value;
		
		// Convert to liters first, then to target unit
		const inLiters = value / VOLUME_CONVERSION_FACTORS[fromUnit];
		return inLiters * VOLUME_CONVERSION_FACTORS[toUnit];
	}

	private convertConcentration(value: number, fromUnit: ConcentrationUnit, toUnit: ConcentrationUnit): number {
		if (fromUnit === toUnit) return value;

		// For molar concentrations, use direct conversion
		if ([ConcentrationUnit.MOLAR, ConcentrationUnit.MILLIMOLAR, ConcentrationUnit.MICROMOLAR, ConcentrationUnit.NANOMOLAR].includes(fromUnit) &&
			[ConcentrationUnit.MOLAR, ConcentrationUnit.MILLIMOLAR, ConcentrationUnit.MICROMOLAR, ConcentrationUnit.NANOMOLAR].includes(toUnit)) {
			
			const inMolar = value / CONCENTRATION_CONVERSION_FACTORS[fromUnit];
			return inMolar * CONCENTRATION_CONVERSION_FACTORS[toUnit];
		}

		// For other units, more complex conversion would be needed
		// For now, return as-is (this would need molecular weight for proper conversion)
		return value;
	}

	private optimizeVolumeDisplay(volume: number, unit: VolumeUnit): string {
		const conversions = [
			{ unit: VolumeUnit.LITER, threshold: 1 },
			{ unit: VolumeUnit.MILLILITER, threshold: 1 },
			{ unit: VolumeUnit.MICROLITER, threshold: 1 },
			{ unit: VolumeUnit.NANOLITER, threshold: 1 }
		];

		for (const conversion of conversions) {
			const convertedValue = this.convertVolume(volume, unit, conversion.unit);
			if (convertedValue >= conversion.threshold) {
				return `${this.formatNumber(convertedValue)} ${conversion.unit}`;
			}
		}

		return `${this.formatNumber(volume)} ${unit}`;
	}

	private optimizeMassDisplay(massG: number): { mass: number, unit: MassUnit } {
		if (massG >= 1) {
			return { mass: massG, unit: MassUnit.GRAM };
		} else if (massG >= 0.001) {
			return { mass: massG * 1000, unit: MassUnit.MILLIGRAM };
		} else if (massG >= 0.000001) {
			return { mass: massG * 1000000, unit: MassUnit.MICROGRAM };
		} else {
			return { mass: massG * 1000000000, unit: MassUnit.NANOGRAM };
		}
	}

	private formatNumber(value: number): string {
		return Number(value.toFixed(this.settings.decimalPlaces)).toString();
	}

	private createBufferRecipe(data: BufferData): any {
		return {
			id: '',
			name: data.name || 'Untitled Buffer',
			totalVolume: data.totalVolume,
			totalVolumeUnit: data.volumeUnit || this.settings.defaultVolumeUnit,
			components: [],
			createdAt: new Date(),
			updatedAt: new Date()
		};
	}

	calculateDilution(data: DilutionData): CalculationResult {
		console.log('calculateDilution called with data:', data);
		const errors: ValidationError[] = [];
		const warnings: Warning[] = [];
		const calculationSteps: CalculationStep[] = [];

		// Convert string values to numbers if needed
		const stockConcentration = Number(data.stockConcentration);
		const finalConcentration = Number(data.finalConcentration);
		const finalVolume = Number(data.finalVolume);
		
		console.log('Converted values:', {
			stockConcentration,
			finalConcentration, 
			finalVolume,
			originalTypes: {
				stockConcentration: typeof data.stockConcentration,
				finalConcentration: typeof data.finalConcentration,
				finalVolume: typeof data.finalVolume
			}
		});

		// Validate input
		console.log('Validating stockConcentration:', stockConcentration, typeof stockConcentration);
		if (stockConcentration <= 0 || isNaN(stockConcentration)) {
			console.log('Stock concentration validation failed');
			errors.push({
				type: ErrorType.INVALID_CONCENTRATION,
				message: 'ストック濃度は0より大きい必要があります',
				field: 'stockConcentration'
			});
		}

		console.log('Validating finalConcentration:', finalConcentration, typeof finalConcentration);
		if (finalConcentration <= 0 || isNaN(finalConcentration)) {
			console.log('Final concentration validation failed');
			errors.push({
				type: ErrorType.INVALID_CONCENTRATION,
				message: '最終濃度は0より大きい必要があります',
				field: 'finalConcentration'
			});
		}

		// Convert concentrations to same unit for comparison
		const stockConcForComparison = this.convertConcentration(
			stockConcentration,
			data.stockConcentrationUnit,
			ConcentrationUnit.MOLAR
		);
		const finalConcForComparison = this.convertConcentration(
			finalConcentration,
			data.finalConcentrationUnit,
			ConcentrationUnit.MOLAR
		);
		
		console.log('Checking concentration comparison after unit conversion:', {
			finalConc: finalConcForComparison,
			stockConc: stockConcForComparison,
			originalFinal: finalConcentration,
			originalStock: stockConcentration,
			finalUnit: data.finalConcentrationUnit,
			stockUnit: data.stockConcentrationUnit
		});
		
		if (finalConcForComparison >= stockConcForComparison) {
			console.log('Concentration comparison validation failed');
			errors.push({
				type: ErrorType.INVALID_CONCENTRATION,
				message: '最終濃度はストック濃度より小さい必要があります',
				field: 'finalConcentration'
			});
		}

		console.log('Validating finalVolume:', finalVolume, typeof finalVolume);
		if (finalVolume <= 0 || isNaN(finalVolume)) {
			console.log('Final volume validation failed');
			errors.push({
				type: ErrorType.INVALID_VOLUME,
				message: '最終体積は0より大きい必要があります',
				field: 'finalVolume'
			});
		}

		if (errors.length > 0) {
			console.log('Validation errors found:', errors);
			return {
				recipe: {
					id: '',
					name: data.name || '希釈計算',
					totalVolume: data.finalVolume,
					totalVolumeUnit: data.volumeUnit,
					components: [],
					createdAt: new Date(),
					updatedAt: new Date()
				},
				components: [],
				solventVolume: 0,
				warnings,
				errors,
				calculationSteps
			};
		}

		// Convert concentrations to the same unit
		const stockConcM = this.convertConcentration(
			stockConcentration,
			data.stockConcentrationUnit,
			ConcentrationUnit.MOLAR
		);

		const finalConcM = this.convertConcentration(
			finalConcentration,
			data.finalConcentrationUnit,
			ConcentrationUnit.MOLAR
		);

		// Convert volume to liters
		const finalVolumeL = this.convertVolume(finalVolume, data.volumeUnit, VolumeUnit.LITER);

		// Calculate dilution factor
		const dilutionFactor = stockConcM / finalConcM;

		// Calculate stock volume needed using C1V1 = C2V2
		const stockVolumeNeededL = (finalConcM * finalVolumeL) / stockConcM;

		// Calculate solvent volume
		const solventVolumeL = finalVolumeL - stockVolumeNeededL;

		// Convert back to display units
		const stockVolumeNeeded = this.convertVolume(stockVolumeNeededL, VolumeUnit.LITER, data.volumeUnit);
		const solventVolume = this.convertVolume(solventVolumeL, VolumeUnit.LITER, data.volumeUnit);

		// Add calculation steps
		if (this.settings.showCalculationSteps) {
			calculationSteps.push({
				step: 1,
				description: '希釈倍率を計算',
				formula: `希釈倍率 = ストック濃度 / 最終濃度 = ${stockConcM} M / ${finalConcM} M`,
				result: dilutionFactor,
				unit: ''
			});

			calculationSteps.push({
				step: 2,
				description: '必要なストック体積を計算 (C1V1 = C2V2)',
				formula: `V1 = (C2 × V2) / C1 = (${finalConcM} M × ${finalVolumeL} L) / ${stockConcM} M`,
				result: stockVolumeNeededL,
				unit: VolumeUnit.LITER
			});

			calculationSteps.push({
				step: 3,
				description: '溶媒体積を計算',
				formula: `溶媒体積 = 最終体積 - ストック体積 = ${finalVolumeL} L - ${stockVolumeNeededL} L`,
				result: solventVolumeL,
				unit: VolumeUnit.LITER
			});
		}

		// Generate warnings
		if (dilutionFactor < 2) {
			warnings.push({
				type: WarningType.SMALL_VOLUME,
				message: '希釈倍率が小さすぎます。より大きな希釈倍率を検討してください。',
				severity: 'medium'
			});
		}

		if (stockVolumeNeededL < 0.001) {
			warnings.push({
				type: WarningType.SMALL_VOLUME,
				message: '必要なストック体積が非常に小さいです。ピペッティングが困難な可能性があります。',
				severity: 'medium'
			});
		}

		const component: CalculatedComponent = {
			reagent: {
				name: data.name || '試薬',
				molecularWeight: 0
			},
			stockConcentration: stockConcentration,
			stockConcentrationUnit: data.stockConcentrationUnit,
			finalConcentration: finalConcentration,
			finalConcentrationUnit: data.finalConcentrationUnit,
			volumeNeeded: stockVolumeNeededL,
			volumeUnit: data.volumeUnit,
			optimizedVolumeDisplay: (() => {
				const optimized = ConversionUtils.optimizeVolumeDisplay(stockVolumeNeeded, data.volumeUnit);
				return `${optimized.value.toFixed(this.settings.decimalPlaces)} ${optimized.unit}`;
			})(),
			percentOfTotal: (stockVolumeNeededL / finalVolumeL) * 100
		};

		return {
			recipe: {
				id: '',
				name: data.name || '希釈計算',
				totalVolume: finalVolume,
				totalVolumeUnit: data.volumeUnit,
				components: [component],
				createdAt: new Date(),
				updatedAt: new Date()
			},
			components: [component],
			solventVolume: solventVolume,
			warnings,
			errors,
			calculationSteps
		};
	}
}