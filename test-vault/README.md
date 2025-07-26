# Lab Calc 段階希釈機能テスト環境

## 概要

このテスト環境は、Lab Calc プラグインの段階希釈機能をテストするために構築されています。新しい濃度入力システム（SI接頭辞方式 + 指数形式）に対応しています。

## テストファイル構成

### 基本機能テスト
- `段階希釈基本テスト.md` - 基本的な段階希釈機能のテスト
- `濃度入力形式テスト.md` - 2つの濃度入力モードのテスト
- `既存機能確認.md` - 既存のBuffer/Stock/Dilution機能との互換性確認

### 実用例テスト
- `リガンド段階希釈.md` - リガンド-レセプター相互作用実験
- `薬物スクリーニング.md` - 薬物濃度依存性実験
- `タンパク質濃度滴定.md` - タンパク質定量実験

### エラーハンドリング
- `エラーハンドリングテスト.md` - 入力エラーや計算エラーのテスト

## 濃度入力モードについて

### SI接頭辞方式 (si-prefix)
- 一般的な単位表記：M, mM, µM, nM, mg/mL, µg/mL など
- 直感的で分かりやすい
- 推奨される標準的な入力方式

### 指数形式 (exponential) 
- 基本単位のみ：M, %, g/L, ppm など
- 非常に小さな値や大きな値を小数点で表現
- 例：0.000001 M（1 µM相当）

## テスト実行方法

1. Obsidianで各テストファイルを開く
2. serial-dilutionブロックが正常にレンダリングされることを確認
3. インタラクティブUIで各機能をテスト
4. 計算結果とエクスポート機能を確認

## 確認項目

- [ ] 各ブロックの正常なレンダリング
- [ ] 濃度入力モードの切り替え
- [ ] リアルタイム計算更新
- [ ] エクスポート機能（CSV/Markdown）
- [ ] エラーハンドリング
- [ ] モバイル対応UI

## serial-dilution ブロック例

```serial-dilution
name: テスト段階希釈
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