# Buffer Calc - Example Usage

This document provides practical examples of how to use the Buffer Calc plugin in your Obsidian research notes.

## Basic Usage Examples

### Example 1: Simple Tris Buffer

```buffer
name: Tris Buffer pH 7.4
totalVolume: 100
volumeUnit: mL
components:
  - name: Tris-HCl
    stockConc: 1
    stockUnit: M
    finalConc: 50
    finalUnit: mM
  - name: NaCl
    stockConc: 5
    stockUnit: M
    finalConc: 150
    finalUnit: mM
```

**Result:**
1. **Tris-HCl**: Add 5.0 mL (5.0%)
2. **NaCl**: Add 3.0 mL (3.0%)
3. Add water to make up to total volume: 92.0 mL

### Example 2: PBS Buffer (1×)

```buffer
name: 1× PBS
totalVolume: 1000
volumeUnit: mL
components:
  - name: NaCl
    stockConc: 5
    stockUnit: M
    finalConc: 137
    finalUnit: mM
  - name: KCl
    stockConc: 1
    stockUnit: M
    finalConc: 2.7
    finalUnit: mM
  - name: Na2HPO4
    stockConc: 1
    stockUnit: M
    finalConc: 10
    finalUnit: mM
  - name: KH2PO4
    stockConc: 1
    stockUnit: M
    finalConc: 1.8
    finalUnit: mM
```

## Advanced Examples

### Example 3: Protein Lysis Buffer

```buffer
name: RIPA Buffer
totalVolume: 50
volumeUnit: mL
components:
  - name: Tris-HCl
    stockConc: 1
    stockUnit: M
    finalConc: 50
    finalUnit: mM
    lotNumber: T1503-100G
  - name: NaCl
    stockConc: 5
    stockUnit: M
    finalConc: 150
    finalUnit: mM
  - name: Triton X-100
    stockConc: 100
    stockUnit: %(v/v)
    finalConc: 1
    finalUnit: %(v/v)
  - name: SDS
    stockConc: 20
    stockUnit: %(w/v)
    finalConc: 0.1
    finalUnit: %(w/v)
  - name: EDTA
    stockConc: 0.5
    stockUnit: M
    finalConc: 5
    finalUnit: mM
```

### Example 4: Cell Culture Medium Supplement

```buffer
name: Complete DMEM
totalVolume: 500
volumeUnit: mL
components:
  - name: DMEM
    stockConc: 100
    stockUnit: %(v/v)
    finalConc: 89
    finalUnit: %(v/v)
  - name: FBS
    stockConc: 100
    stockUnit: %(v/v)
    finalConc: 10
    finalUnit: %(v/v)
    lotNumber: FBS-2024-03
  - name: Penicillin/Streptomycin
    stockConc: 100
    stockUnit: ×
    finalConc: 1
    finalUnit: ×
```

### Example 5: Gel Running Buffer

```buffer
name: 1× TAE Buffer
totalVolume: 2000
volumeUnit: mL
components:
  - name: TAE Buffer
    stockConc: 50
    stockUnit: ×
    finalConc: 1
    finalUnit: ×
notes: Dilute 50× TAE stock. Store at room temperature.
```

## Working with Different Concentration Units

### Example 6: Mixed Unit Types

```buffer
name: Western Blot Transfer Buffer
totalVolume: 1000
volumeUnit: mL
components:
  - name: Glycine
    stockConc: 2
    stockUnit: M
    finalConc: 192
    finalUnit: mM
  - name: Tris
    stockConc: 1
    stockUnit: M
    finalConc: 25
    finalUnit: mM
  - name: Methanol
    stockConc: 100
    stockUnit: %(v/v)
    finalConc: 20
    finalUnit: %(v/v)
```

### Example 7: Mass-based Concentrations

```buffer
name: Bradford Reagent
totalVolume: 100
volumeUnit: mL
components:
  - name: Coomassie Brilliant Blue G-250
    stockConc: 5
    stockUnit: mg/mL
    finalConc: 0.1
    finalUnit: mg/mL
  - name: Phosphoric Acid
    stockConc: 85
    stockUnit: %(w/v)
    finalConc: 8.5
    finalUnit: %(w/v)
  - name: Ethanol
    stockConc: 100
    stockUnit: %(v/v)
    finalConc: 4.7
    finalUnit: %(v/v)
```

## Research Note Integration Examples

### Example 8: Experiment Documentation

## Experiment: Protein Purification - Day 1

### Objective
Purify GST-tagged protein using affinity chromatography

### Buffers Required

#### Lysis Buffer
```buffer
name: GST Lysis Buffer
totalVolume: 100
volumeUnit: mL
components:
  - name: PBS
    stockConc: 10
    stockUnit: ×
    finalConc: 1
    finalUnit: ×
  - name: Triton X-100
    stockConc: 10
    stockUnit: %(v/v)
    finalConc: 1
    finalUnit: %(v/v)
  - name: DTT
    stockConc: 1
    stockUnit: M
    finalConc: 1
    finalUnit: mM
  - name: PMSF
    stockConc: 100
    stockUnit: mM
    finalConc: 1
    finalUnit: mM
```

#### Wash Buffer
```buffer
name: GST Wash Buffer
totalVolume: 500
volumeUnit: mL
components:
  - name: PBS
    stockConc: 10
    stockUnit: ×
    finalConc: 1
    finalUnit: ×
```

#### Elution Buffer
```buffer
name: GST Elution Buffer
totalVolume: 50
volumeUnit: mL
components:
  - name: Tris-HCl
    stockConc: 1
    stockUnit: M
    finalConc: 50
    finalUnit: mM
  - name: NaCl
    stockConc: 5
    stockUnit: M
    finalConc: 150
    finalUnit: mM
  - name: Glutathione
    stockConc: 100
    stockUnit: mM
    finalConc: 10
    finalUnit: mM
```

### Results
- Total protein yield: 2.5 mg
- Purity: ~90% by SDS-PAGE
- Buffer calculations accurate - no dilution errors

## Tips and Best Practices

### 1. Organizing Your Buffers
Use consistent naming conventions:
- Include pH if relevant: "Tris Buffer pH 8.0"
- Include concentration if making stocks: "10× PBS Stock"
- Include purpose: "Protein Lysis Buffer"

### 2. Lot Number Tracking
Always include lot numbers for critical reagents:
```buffer
components:
  - name: DTT
    stockConc: 1
    stockUnit: M
    finalConc: 1
    finalUnit: mM
    lotNumber: DTT-2024-001
```

### 3. Adding Notes
Use the notes field for important information:
```buffer
name: My Buffer
totalVolume: 100
volumeUnit: mL
components:
  - name: Component
    # ... other fields
notes: |
  - Store at 4°C
  - Use within 2 weeks
  - Add DTT fresh each time
```

### 4. Exporting Recipes
Use the "Export Recipe" button to:
- Copy formatted recipes to clipboard
- Share protocols with colleagues
- Include in publications or reports

### 5. Version Control
Keep different versions of your buffers:
```
## Buffer Optimization

### Version 1.0
```buffer
name: Initial Buffer v1.0
# ... components
```

### Version 1.1 - Increased salt concentration
```buffer
name: Optimized Buffer v1.1
# ... modified components
```
```

## Troubleshooting Common Issues

### Small Volume Warnings
When you see warnings about small volumes:
- Consider using more dilute stocks
- Make larger total volumes
- Use intermediate dilutions

### High Dilution Factor Warnings  
For very high dilution factors (>1000×):
- Make intermediate stocks
- Use serial dilutions
- Double-check concentration units

### Impossible Concentration Errors
If final concentration > stock concentration:
- Check unit compatibility
- Verify stock concentrations
- Consider if you need a more concentrated stock

This completes the practical usage examples for the Buffer Calc plugin. These examples should help users understand how to integrate the plugin effectively into their research workflows.