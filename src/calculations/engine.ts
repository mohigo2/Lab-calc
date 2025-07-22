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
					message: `Error calculating component ${component.name}: ${error.message}`,
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
				message: 'Component volumes exceed total volume. Consider increasing total volume.',
				severity: 'high'
			});
		}

		// Check for very small solvent volumes
		if (solventVolumeL < totalVolumeL * 0.1) {
			warnings.push({
				type: WarningType.SMALL_VOLUME,
				message: 'Solvent volume is very small. Consider reducing component concentrations.',
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
			throw new Error(`Final concentration (${component.finalConc} ${component.finalUnit}) cannot be higher than stock concentration (${component.stockConc} ${component.stockUnit})`);
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
				message: 'Valid molecular weight is required for stock solution calculation',
				field: 'molecularWeight'
			});
		}

		if (errors.length > 0) {
			return {
				recipe: {
					id: '',
					name: `${data.reagent} Stock Solution`,
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
				description: 'Calculate required mass',
				formula: `Mass = Concentration × Volume × Molecular Weight = ${concentrationM} mol/L × ${volumeL} L × ${data.molecularWeight} g/mol`,
				result: massG,
				unit: MassUnit.GRAM
			});

			if (data.purity && data.purity !== 100) {
				calculationSteps.push({
					step: 2,
					description: 'Adjust for purity',
					formula: `Adjusted mass = ${massG} g / (${data.purity}% / 100%)`,
					result: massG / (data.purity / 100),
					unit: MassUnit.GRAM
				});
			}
		}

		// Generate warnings
		if (massG < 0.001) {
			warnings.push({
				type: WarningType.SMALL_VOLUME,
				message: 'Very small mass required. Consider making a more dilute stock solution.',
				severity: 'medium'
			});
		}

		if (massG > 10) {
			warnings.push({
				type: WarningType.LARGE_VOLUME,
				message: 'Large mass required. Consider making a smaller volume or more concentrated stock.',
				severity: 'low'
			});
		}

		const component: CalculatedComponent = {
			reagent: {
				name: data.reagent,
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
				name: `${data.reagent} Stock Solution`,
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
}