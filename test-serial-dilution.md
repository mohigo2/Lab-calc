# Serial Dilution Test

This is a test document for the new serial dilution feature.

## Basic Serial Dilution

```serial-dilution
name: リガンド段階希釈テスト
stockConcentration: 10
stockUnit: mM
cellVolume: 200
cellVolumeUnit: µL
additionVolume: 2
additionVolumeUnit: µL
dilutionVolume: 200
dilutionVolumeUnit: µL
targetConcentrations: [100, 10, 1, 0.1]
targetUnit: µM
concentrationInputMode: si-prefix
```

## Drug Screening Serial Dilution

```serial-dilution
name: 薬物スクリーニング希釈
stockConcentration: 100
stockUnit: mM
cellVolume: 100
cellVolumeUnit: µL
additionVolume: 1
additionVolumeUnit: µL
dilutionVolume: 100
dilutionVolumeUnit: µL
targetConcentrations: [1000, 100, 10, 1, 0.1, 0.01]
targetUnit: µM
concentrationInputMode: si-prefix
```

## Protein Concentration Titration

```serial-dilution
name: タンパク質濃度滴定
stockConcentration: 1
stockUnit: mg/mL
cellVolume: 96
cellVolumeUnit: µL
additionVolume: 4
additionVolumeUnit: µL
dilutionVolume: 200
dilutionVolumeUnit: µL
targetConcentrations: [100, 50, 25, 12.5, 6.25]
targetUnit: µg/mL
concentrationInputMode: si-prefix
```

## Exponential Mode Test

```serial-dilution
name: Exponential Mode Test
stockConcentration: 0.01
stockUnit: M
cellVolume: 200
cellVolumeUnit: µL
additionVolume: 2
additionVolumeUnit: µL
dilutionVolume: 200
dilutionVolumeUnit: µL
targetConcentrations: [0.0001, 0.00001, 0.000001]
targetUnit: M
concentrationInputMode: exponential
```