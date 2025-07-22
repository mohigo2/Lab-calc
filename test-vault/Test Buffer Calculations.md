# Buffer Calc Plugin Test

## 基本テスト

```buffer
name: Simple Test
totalVolume: 100
volumeUnit: mL
components:
  - name: NaCl
    stockConc: 1
    stockUnit: M
    finalConc: 100
    finalUnit: mM
```

**期待結果:** NaCl: 10.0 mL (10.0%), 溶媒: 90.0 mL

## 複数成分テスト

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

## エラーテスト

```buffer
name: Error Test
totalVolume: 100
volumeUnit: mL
components:
  - name: Test Reagent
    stockConc: 1
    stockUnit: M
    finalConc: 2
    finalUnit: M
```

**期待結果:** エラーメッセージ表示

## 空のコンポーネントテスト

```buffer
name: Empty Test
totalVolume: 100
volumeUnit: mL
components: []
```

**期待結果:** エラーまたは空の状態表示