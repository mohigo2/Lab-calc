import {
	VolumeUnit,
	ConcentrationUnit,
	MassUnit,
	VOLUME_CONVERSION_FACTORS,
	MASS_CONVERSION_FACTORS,
	CONCENTRATION_CONVERSION_FACTORS
} from '../types';

export class ConversionUtils {
	
	/**
	 * Convert volume between different units
	 */
	static convertVolume(value: number, fromUnit: VolumeUnit, toUnit: VolumeUnit): number {
		if (fromUnit === toUnit) return value;
		
		// Convert to liters first, then to target unit
		const inLiters = value / VOLUME_CONVERSION_FACTORS[fromUnit];
		return inLiters * VOLUME_CONVERSION_FACTORS[toUnit];
	}

	/**
	 * Convert mass between different units
	 */
	static convertMass(value: number, fromUnit: MassUnit, toUnit: MassUnit): number {
		if (fromUnit === toUnit) return value;
		
		// Convert to grams first, then to target unit
		const inGrams = value / MASS_CONVERSION_FACTORS[fromUnit];
		return inGrams * MASS_CONVERSION_FACTORS[toUnit];
	}

	/**
	 * Convert concentration between molar units (M, mM, µM, nM)
	 */
	static convertMolarConcentration(
		value: number, 
		fromUnit: ConcentrationUnit, 
		toUnit: ConcentrationUnit
	): number {
		if (fromUnit === toUnit) return value;

		const molarUnits = [
			ConcentrationUnit.MOLAR,
			ConcentrationUnit.MILLIMOLAR,
			ConcentrationUnit.MICROMOLAR,
			ConcentrationUnit.NANOMOLAR
		];

		if (!molarUnits.includes(fromUnit) || !molarUnits.includes(toUnit)) {
			throw new Error('Can only convert between molar concentration units (M, mM, µM, nM)');
		}

		// Convert to molar first, then to target unit
		const inMolar = value / CONCENTRATION_CONVERSION_FACTORS[fromUnit];
		return inMolar * CONCENTRATION_CONVERSION_FACTORS[toUnit];
	}

	/**
	 * Convert concentration to molarity (requires molecular weight for non-molar units)
	 */
	static convertToMolarity(
		value: number,
		unit: ConcentrationUnit,
		molecularWeight?: number
	): number {
		const molarUnits = [
			ConcentrationUnit.MOLAR,
			ConcentrationUnit.MILLIMOLAR,
			ConcentrationUnit.MICROMOLAR,
			ConcentrationUnit.NANOMOLAR
		];

		if (molarUnits.includes(unit)) {
			return this.convertMolarConcentration(value, unit, ConcentrationUnit.MOLAR);
		}

		if (!molecularWeight || molecularWeight <= 0) {
			throw new Error('Molecular weight is required to convert from mass-based concentrations to molarity');
		}

		// Since we simplified to M-series only, this shouldn't be reached
		throw new Error(`Only M-series concentration units are supported`);	
	}

	/**
	 * Format number with appropriate decimal places
	 */
	static formatNumber(value: number, decimalPlaces: number = 2): string {
		return Number(value.toFixed(decimalPlaces)).toString();
	}

	/**
	 * Get the most appropriate volume unit for display
	 */
	static optimizeVolumeDisplay(volume: number, unit: VolumeUnit): { value: number, unit: VolumeUnit } {
		const conversions = [
			{ unit: VolumeUnit.LITER, min: 1, max: Infinity },
			{ unit: VolumeUnit.MILLILITER, min: 1, max: 1000 },
			{ unit: VolumeUnit.MICROLITER, min: 1, max: 1000 },
			{ unit: VolumeUnit.NANOLITER, min: 0, max: 1000 }
		];

		// Convert current volume to each unit and find the most appropriate
		for (const conversion of conversions) {
			const convertedValue = this.convertVolume(volume, unit, conversion.unit);
			if (convertedValue >= conversion.min && convertedValue < conversion.max) {
				return { value: convertedValue, unit: conversion.unit };
			}
		}

		// If no suitable unit found, return original
		return { value: volume, unit };
	}

	/**
	 * Get the most appropriate mass unit for display
	 */
	static optimizeMassDisplay(mass: number, unit: MassUnit): { value: number, unit: MassUnit } {
		const conversions = [
			{ unit: MassUnit.GRAM, min: 1, max: Infinity },
			{ unit: MassUnit.MILLIGRAM, min: 1, max: 1000 },
			{ unit: MassUnit.MICROGRAM, min: 1, max: 1000 },
			{ unit: MassUnit.NANOGRAM, min: 0, max: 1000 }
		];

		// Convert current mass to each unit and find the most appropriate
		for (const conversion of conversions) {
			const convertedValue = this.convertMass(mass, unit, conversion.unit);
			if (convertedValue >= conversion.min && convertedValue < conversion.max) {
				return { value: convertedValue, unit: conversion.unit };
			}
		}

		// If no suitable unit found, return original
		return { value: mass, unit };
	}

	/**
	 * Calculate dilution factor
	 */
	static calculateDilutionFactor(stockConc: number, finalConc: number): number {
		if (finalConc <= 0) {
			throw new Error('Final concentration must be greater than 0');
		}
		return stockConc / finalConc;
	}

	/**
	 * Validate that a concentration conversion is possible
	 */
	static canConvertConcentration(fromUnit: ConcentrationUnit, toUnit: ConcentrationUnit): boolean {
		const molarUnits = [
			ConcentrationUnit.MOLAR,
			ConcentrationUnit.MILLIMOLAR,
			ConcentrationUnit.MICROMOLAR,
			ConcentrationUnit.NANOMOLAR
		];

		// Only allow conversion within M-series units
		return molarUnits.includes(fromUnit) && molarUnits.includes(toUnit);
	}

	/**
	 * Get human-readable unit names
	 */
	static getUnitDisplayName(unit: VolumeUnit | ConcentrationUnit | MassUnit): string {
		const displayNames: Record<string, string> = {
			// Volume units
			[VolumeUnit.LITER]: 'Liter',
			[VolumeUnit.MILLILITER]: 'Milliliter',
			[VolumeUnit.MICROLITER]: 'Microliter',
			[VolumeUnit.NANOLITER]: 'Nanoliter',
			
			// Concentration units (M-series only)
			[ConcentrationUnit.MOLAR]: 'Molar',
			[ConcentrationUnit.MILLIMOLAR]: 'Millimolar',
			[ConcentrationUnit.MICROMOLAR]: 'Micromolar',
			[ConcentrationUnit.NANOMOLAR]: 'Nanomolar',
			
			// Mass units
			[MassUnit.GRAM]: 'Gram',
			[MassUnit.MILLIGRAM]: 'Milligram',
			[MassUnit.MICROGRAM]: 'Microgram',
			[MassUnit.NANOGRAM]: 'Nanogram'
		};

		return displayNames[unit] || unit;
	}

	/**
	 * Validate numeric input
	 */
	static validatePositiveNumber(value: any, fieldName: string): number {
		const num = Number(value);
		if (isNaN(num) || num <= 0) {
			throw new Error(`${fieldName} must be a positive number`);
		}
		return num;
	}

	/**
	 * Validate non-negative numeric input
	 */
	static validateNonNegativeNumber(value: any, fieldName: string): number {
		const num = Number(value);
		if (isNaN(num) || num < 0) {
			throw new Error(`${fieldName} must be a non-negative number`);
		}
		return num;
	}
}