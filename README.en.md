# Buffer Calc - Obsidian Plugin

A comprehensive Obsidian plugin for laboratory buffer preparation calculations. Transform YAML code blocks into interactive calculators for multi-component buffers with real-time calculations, reagent autocomplete, and professional laboratory features.

**🎉 Current Status: Fully functional multi-component buffer calculator with solvent calculations**

## Features

### 🧪 Multi-Component Buffer Calculations ✅ IMPLEMENTED
- **C1V1=C2V2 calculations** with automatic volume calculations for each component
- **Solvent volume calculation** showing exact amount of water/buffer to add
- Support for different concentration units (M, mM, µM, nM, mg/mL, %, etc.)
- **Real-time calculation updates** as you modify values in the UI
- **Percentage calculations** showing contribution of each component
- Comprehensive validation and error checking

### 📊 Interactive Code Blocks ✅ IMPLEMENTED  
Transform simple YAML text into interactive calculators with dynamic UI:

```buffer
name: PBS Buffer
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
```

### 🗃️ Built-in Reagent Database ✅ IMPLEMENTED
- **50+ laboratory reagents** with molecular weights and categories
- **Real-time autocomplete** with fuzzy search functionality  
- **External links** to Sigma-Aldrich, ThermoFisher, and VWR
- Custom reagent support through plugin settings
- Organized by categories: buffers, salts, detergents, reducing agents, etc.

### ⚠️ Smart Validation & Warnings ✅ IMPLEMENTED
- **Impossible concentration detection** (final > stock) with clear error messages
- **Volume overflow warnings** when component volumes exceed total volume
- **Small volume warnings** for difficult-to-pipette amounts  
- **Array validation** ensuring components are properly formatted
- Comprehensive error handling with user-friendly messages

### 📋 Recipe Management ✅ IMPLEMENTED
- **Export to clipboard** as formatted Markdown with preparation instructions
- **Lot number tracking** for reagent reproducibility  
- **Calculation steps display** (optional) showing detailed formulas
- **Professional recipe format** with component details and solvent instructions

### 🔧 Customizable Settings ✅ IMPLEMENTED
- **Default units** for volume and concentration calculations
- **Decimal places** configuration (0-6 decimal places)
- **Toggle calculation steps** display for detailed formulas
- **Custom reagent management** through settings interface
- **Comprehensive settings tab** with organized configuration options

## 🚀 Current Implementation Status

### ✅ Completed Features
- **Multi-component buffer calculations** with C1V1=C2V2 formula
- **Interactive YAML code block processing** 
- **Real-time UI updates** with dynamic recalculation
- **Solvent volume calculation** and display
- **50+ reagent database** with autocomplete
- **Comprehensive validation** and error handling  
- **Export functionality** to clipboard
- **Full settings management** with customizable options
- **Professional UI/UX** with Obsidian design patterns

### 🔄 In Development
- Stock solution calculator UI
- Serial dilution calculator UI  
- Advanced recipe templates

## Installation

### Development Installation (Current)
Since this is a development version, install manually:

1. Clone or download the project:
```bash
git clone [repository-url]
cd buffer-calc
```

2. Build the plugin:
```bash
npm install
npm run build
```

3. Copy to your Obsidian vault:
```bash
# Copy built files to your vault's plugin folder
cp -r . /path/to/your/vault/.obsidian/plugins/buffer-calc/
```

4. Enable the plugin:
   - Open Obsidian Settings → Community Plugins
   - Enable "Buffer Calc"

### Testing Environment
A complete test environment is included:
```bash
# Use the included test vault for development
./test-plugin.sh

# Or run development watch mode
./dev-watch.sh
```

## Usage

### Basic Buffer Calculation

1. Create a code block with type `buffer`:
   ```
   ```buffer
   name: My Buffer
   totalVolume: 100
   volumeUnit: mL
   components:
     - name: Tris-HCl
       stockConc: 1
       stockUnit: M
       finalConc: 50
       finalUnit: mM
   ```
   ```

2. The plugin renders an interactive calculator showing:
   - **NaCl**: Add 27.4 mL (2.7%)
   - **KCl**: Add 2.7 mL (0.3%)
   - **Na2HPO4**: Add 10.0 mL (1.0%)
   - **Add water or buffer to make up to total volume: 959.9 mL**

3. Modify values in real-time to see updated calculations
4. Export the recipe when satisfied with results

### Supported Block Types

- `buffer` ✅ **IMPLEMENTED**: Multi-component buffer calculations with full functionality
- `stock-solution` 🔄 **PLANNED**: Calculate powder amounts for stock solutions
- `dilution` 🔄 **PLANNED**: Serial dilution calculations

### Advanced Features

#### Reagent Autocomplete
Start typing a reagent name and select from the built-in database:
- Automatic molecular weight filling
- Links to external databases
- Custom reagent management

#### Validation & Warnings
The plugin provides intelligent feedback:
- ⚠️ **Small volumes**: Suggests using more dilute stocks
- ⚠️ **High dilution factors**: Recommends intermediate dilutions  
- ❌ **Impossible concentrations**: Prevents calculation errors
- ❌ **Missing data**: Highlights required fields

#### Settings Customization
Access plugin settings via Obsidian Settings → Buffer Calc:
- Set default units for new calculations
- Adjust decimal precision
- Manage custom reagents
- Export/import settings

## Examples

### Standard PBS Buffer
```buffer
name: 10× PBS Stock
totalVolume: 1000
volumeUnit: mL
components:
  - name: NaCl
    stockConc: 5
    stockUnit: M
    finalConc: 1.37
    finalUnit: M
  - name: KCl
    stockConc: 1
    stockUnit: M
    finalConc: 27
    finalUnit: mM
  - name: Na2HPO4
    stockConc: 1
    stockUnit: M
    finalConc: 100
    finalUnit: mM
  - name: KH2PO4
    stockConc: 1
    stockUnit: M
    finalConc: 18
    finalUnit: mM
```

### Protein Buffer with Additives
```buffer
name: Protein Purification Buffer
totalVolume: 500
volumeUnit: mL
components:
  - name: HEPES
    stockConc: 1
    stockUnit: M
    finalConc: 50
    finalUnit: mM
  - name: NaCl
    stockConc: 5
    stockUnit: M
    finalConc: 300
    finalUnit: mM
  - name: Imidazole
    stockConc: 2
    stockUnit: M
    finalConc: 10
    finalUnit: mM
  - name: Glycerol
    stockConc: 100
    stockUnit: %(v/v)
    finalConc: 10
    finalUnit: %(v/v)
  - name: DTT
    stockConc: 1
    stockUnit: M
    finalConc: 1
    finalUnit: mM
    lotNumber: DTT-2024-001
```

## 🧮 Technical Details

### Calculation Engine
The plugin implements the fundamental dilution equation **C1V1 = C2V2**:

```
V₁ = (C₂ × V₂) / C₁
```

**Where:**
- C₁ = Stock concentration  
- V₁ = Volume needed from stock (calculated)
- C₂ = Final concentration
- V₂ = Final volume

**Example Calculation (Basic Test):**
```
Stock: 1M NaCl, Final: 100mM NaCl in 100mL
V₁ = (0.1M × 0.1L) / 1M = 0.01L = 10mL
Solvent: 100mL - 10mL = 90mL water
```

### YAML Processing
Simple YAML parser handles code block content:
```yaml
# Supported syntax
name: Buffer Name           # String
totalVolume: 100           # Number  
volumeUnit: mL             # Enum value
components:                # Array
  - name: NaCl             # Component object
    stockConc: 1           # Number
    stockUnit: M           # Enum value
```

### Unit Conversion System
Comprehensive unit support with automatic optimization:
- **Volume**: L, mL, µL, nL with intelligent display optimization
- **Concentration**: M, mM, µM, nM, %(w/v), mg/mL, µg/mL
- **Automatic unit selection** for optimal pipetting volumes

## Development

### Building from Source
```bash
# Clone the repository
git clone https://github.com/your-username/buffer-calc-obsidian
cd buffer-calc-obsidian

# Install dependencies
npm install

# Build for development (with file watching)
npm run dev

# Build for production
npm run build
```

### Project Structure
```
src/
├── main.ts                 # Main plugin class
├── settings.ts             # Settings management
├── types.ts               # Type definitions
├── calculations/
│   └── engine.ts          # Core calculation logic
├── ui/
│   └── buffer-calc-ui.ts  # Interactive UI components
├── data/
│   └── reagents.ts        # Reagent database
└── utils/
    └── conversions.ts     # Unit conversion utilities
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🗺️ Development Roadmap

### 🎯 Phase 1: Core Buffer Calculations ✅ COMPLETE
- [x] Multi-component buffer calculator
- [x] YAML code block processing  
- [x] Interactive UI with real-time updates
- [x] Solvent volume calculations
- [x] Reagent database with autocomplete
- [x] Validation and error handling
- [x] Export functionality
- [x] Settings management

### 🔄 Phase 2: Additional Calculators (In Progress)
- [ ] Stock solution calculator UI (framework exists)
- [ ] Serial dilution calculator UI (framework exists)
- [ ] Molarity/mass calculations
- [ ] pH buffer calculations

### 📈 Phase 3: Advanced Features (Planned)
- [ ] Recipe templates and presets  
- [ ] Import/export settings
- [ ] Calculation history
- [ ] Custom reagent categories
- [ ] Integration with DataView plugin
- [ ] Mobile/tablet optimization

### 🚀 Phase 4: Laboratory Integration (Future)
- [ ] Recipe version control
- [ ] Collaborative recipe sharing
- [ ] Laboratory inventory integration
- [ ] QR code generation for recipes
- [ ] Integration with laboratory information systems (LIMS)

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/buffer-calc-obsidian/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/buffer-calc-obsidian/discussions)
- **Documentation**: [Wiki](https://github.com/your-username/buffer-calc-obsidian/wiki)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Obsidian team for the excellent plugin API
- The research community for feedback and feature requests
- Contributors to the reagent database

---

**Made with ❤️ for the research community**

*Streamline your buffer calculations and focus on what matters most - your research.*