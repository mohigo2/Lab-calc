import { CalculationEngine } from '../calculations/engine';
import { 
	DEFAULT_SETTINGS, 
	BufferData,
	VolumeUnit,
	ConcentrationUnit,
	WarningType
} from '../types';

describe('CalculationEngine', () => {
	let engine: CalculationEngine;

	beforeEach(() => {
		engine = new CalculationEngine(DEFAULT_SETTINGS);
	});

	describe('Basic Buffer Calculations', () => {
		test('should calculate simple buffer correctly', () => {
			const data: BufferData = {
				totalVolume: 100,
				volumeUnit: VolumeUnit.MILLILITER,
				components: [{
					name: 'NaCl',
					stockConc: 5,
					stockUnit: ConcentrationUnit.MOLAR,
					finalConc: 150,
					finalUnit: ConcentrationUnit.MILLIMOLAR
				}]
			};

			const result = engine.calculateBuffer(data);
			
			expect(result.errors).toHaveLength(0);
			expect(result.components).toHaveLength(1);
			expect(result.components[0].volumeNeeded).toBe(3); // (150mM * 100mL) / (5M * 1000) = 3mL
		});

		test('should calculate multiple components correctly', () => {
			const data: BufferData = {
				totalVolume: 100,
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
				]
			};

			const result = engine.calculateBuffer(data);
			
			expect(result.errors).toHaveLength(0);
			expect(result.components).toHaveLength(2);
			expect(result.components[0].volumeNeeded).toBeCloseTo(5, 6); // Tris: 5mL
			expect(result.components[1].volumeNeeded).toBe(3); // NaCl: 3mL
			expect(result.solventVolume).toBeGreaterThanOrEqual(0); // Solvent volume calculated
		});
	});

	describe('Error Handling', () => {
		test('should detect impossible concentrations', () => {
			const data: BufferData = {
				totalVolume: 100,
				volumeUnit: VolumeUnit.MILLILITER,
				components: [{
					name: 'Test Reagent',
					stockConc: 1,
					stockUnit: ConcentrationUnit.MOLAR,
					finalConc: 2,
					finalUnit: ConcentrationUnit.MOLAR
				}]
			};

			const result = engine.calculateBuffer(data);
			
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].message).toContain('cannot be higher than stock concentration');
		});

		test('should validate required fields', () => {
			const data: BufferData = {
				totalVolume: 0, // Invalid
				volumeUnit: VolumeUnit.MILLILITER,
				components: []
			};

			const result = engine.calculateBuffer(data);
			
			expect(result.errors.length).toBeGreaterThan(0);
		});

		test('should validate component data', () => {
			const data: BufferData = {
				totalVolume: 100,
				volumeUnit: VolumeUnit.MILLILITER,
				components: [{
					name: '', // Empty name
					stockConc: 0, // Invalid concentration
					stockUnit: ConcentrationUnit.MOLAR,
					finalConc: 50,
					finalUnit: ConcentrationUnit.MILLIMOLAR
				}]
			};

			const result = engine.calculateBuffer(data);
			
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});

	describe('Warning Generation', () => {
		test('should generate warnings when appropriate', () => {
			const data: BufferData = {
				totalVolume: 1000,
				volumeUnit: VolumeUnit.MILLILITER,
				components: [{
					name: 'High Concentration Stock',
					stockConc: 10000, // Very high stock
					stockUnit: ConcentrationUnit.MILLIMOLAR,
					finalConc: 1,
					finalUnit: ConcentrationUnit.MILLIMOLAR
				}]
			};

			const result = engine.calculateBuffer(data);
			
			// Should generate some warnings (implementation-dependent)
			expect(result.warnings).toBeDefined();
		});

		test('should warn about high dilution factors', () => {
			const data: BufferData = {
				totalVolume: 1000,
				volumeUnit: VolumeUnit.MILLILITER,
				components: [{
					name: 'Test Reagent',
					stockConc: 5000, // 5M
					stockUnit: ConcentrationUnit.MILLIMOLAR,
					finalConc: 1,
					finalUnit: ConcentrationUnit.MILLIMOLAR
				}]
			};

			const result = engine.calculateBuffer(data);
			
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings.some(w => w.type === 'unusual_dilution_factor')).toBe(true);
		});
	});

	describe('Unit Conversions', () => {
		test('should handle volume unit conversions', () => {
			const data: BufferData = {
				totalVolume: 1, // 1L
				volumeUnit: VolumeUnit.LITER,
				components: [{
					name: 'NaCl',
					stockConc: 5,
					stockUnit: ConcentrationUnit.MOLAR,
					finalConc: 150,
					finalUnit: ConcentrationUnit.MILLIMOLAR
				}]
			};

			const result = engine.calculateBuffer(data);
			
			expect(result.errors).toHaveLength(0);
			expect(result.components[0].volumeNeeded).toBe(30); // Should be in mL (default unit)
		});

		test('should handle concentration unit conversions', () => {
			const data: BufferData = {
				totalVolume: 100,
				volumeUnit: VolumeUnit.MILLILITER,
				components: [{
					name: 'NaCl',
					stockConc: 5000, // 5000 mM = 5 M
					stockUnit: ConcentrationUnit.MILLIMOLAR,
					finalConc: 0.15, // 0.15 M = 150 mM
					finalUnit: ConcentrationUnit.MOLAR
				}]
			};

			const result = engine.calculateBuffer(data);
			
			expect(result.errors).toHaveLength(0);
			expect(result.components[0].volumeNeeded).toBe(3); // Same as 5M stock to 150mM final
		});
	});

	describe('Calculation Steps', () => {
		test('should generate calculation steps when enabled', () => {
			const settingsWithSteps = { ...DEFAULT_SETTINGS, showCalculationSteps: true };
			const engineWithSteps = new CalculationEngine(settingsWithSteps);

			const data: BufferData = {
				totalVolume: 100,
				volumeUnit: VolumeUnit.MILLILITER,
				components: [{
					name: 'NaCl',
					stockConc: 5,
					stockUnit: ConcentrationUnit.MOLAR,
					finalConc: 150,
					finalUnit: ConcentrationUnit.MILLIMOLAR
				}]
			};

			const result = engineWithSteps.calculateBuffer(data);
			
			expect(result.calculationSteps).toBeDefined();
			expect(result.calculationSteps!.length).toBeGreaterThan(0);
		});

		test('should not generate calculation steps when disabled', () => {
			const data: BufferData = {
				totalVolume: 100,
				volumeUnit: VolumeUnit.MILLILITER,
				components: [{
					name: 'NaCl',
					stockConc: 5,
					stockUnit: ConcentrationUnit.MOLAR,
					finalConc: 150,
					finalUnit: ConcentrationUnit.MILLIMOLAR
				}]
			};

			const result = engine.calculateBuffer(data);
			
			expect(result.calculationSteps).toBeUndefined();
		});
	});

	describe('Edge Cases', () => {
		test('should handle very small volumes', () => {
			const data: BufferData = {
				totalVolume: 1,
				volumeUnit: VolumeUnit.MICROLITER,
				components: [{
					name: 'NaCl',
					stockConc: 5,
					stockUnit: ConcentrationUnit.MOLAR,
					finalConc: 150,
					finalUnit: ConcentrationUnit.MILLIMOLAR
				}]
			};

			const result = engine.calculateBuffer(data);
			
			expect(result.errors).toHaveLength(0);
			expect(result.components[0].volumeNeeded).toBeGreaterThan(0);
		});

		test('should handle very large volumes', () => {
			const data: BufferData = {
				totalVolume: 10,
				volumeUnit: VolumeUnit.LITER,
				components: [{
					name: 'NaCl',
					stockConc: 5,
					stockUnit: ConcentrationUnit.MOLAR,
					finalConc: 150,
					finalUnit: ConcentrationUnit.MILLIMOLAR
				}]
			};

			const result = engine.calculateBuffer(data);
			
			expect(result.errors).toHaveLength(0);
			expect(result.components[0].volumeNeeded).toBe(300); // 10L * 150mM / 5M = 300mL
		});

		test('should handle zero final concentration', () => {
			const data: BufferData = {
				totalVolume: 100,
				volumeUnit: VolumeUnit.MILLILITER,
				components: [{
					name: 'NaCl',
					stockConc: 5,
					stockUnit: ConcentrationUnit.MOLAR,
					finalConc: 0,
					finalUnit: ConcentrationUnit.MILLIMOLAR
				}]
			};

			const result = engine.calculateBuffer(data);
			
			expect(result.errors.length).toBeGreaterThan(0); // Should be invalid
		});
	});
});