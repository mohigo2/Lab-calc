


```dataview
TABLE WITHOUT ID
  "計算タイプ" as type,
  length(rows) as count
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
GROUP BY calc.type
SORT count DESC
```

### 最も使用される試薬
```dataview
TABLE WITHOUT ID
  reagent as "試薬名",
  length(rows) as "使用回数"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
FLATTEN calc.components as comp
GROUP BY comp.name as reagent
SORT length(rows) DESC
LIMIT 10
```

### 月別計算数
```dataview
TABLE WITHOUT ID
  dateformat(date(calc.modifiedDate), "yyyy-MM") as "月",
  length(rows) as "計算数"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
GROUP BY dateformat(date(calc.modifiedDate), "yyyy-MM")
SORT key DESC
LIMIT 12
```
# Phase 3.5 DataView統合機能テスト

## 概要

Phase 3.5で実装したDataViewプラグイン統合機能のテストを行います。

## 実装された機能

### 1. DataView統合クラス
- `DataViewIntegration`: Buffer CalcデータをDataView形式で提供
- ファイル解析とデータ抽出機能
- 検索・フィルタリング機能
- 統計生成機能

### 2. クエリ生成システム
- `DataViewQueries`: 事前定義されたクエリテンプレート
- カスタムクエリビルダー
- 動的クエリ生成機能

### 3. DataView統合UI
- DataView統合管理モーダル
- クイッククエリ選択
- カスタムクエリビルダー
- データ統計表示

### 4. 設定統合
- DataView統合設定セクション
- プラグイン状態確認
- データ統計表示

## テスト手順

### Step 1: DataViewプラグインの確認
1. DataViewプラグインがインストールされ有効化されているか確認
2. Settings → Buffer Calc → DataView統合設定 を確認
3. プラグイン状態が正しく表示されることを確認

### Step 2: テストデータの準備
以下のBuffer Calc計算をマークダウンファイルに追加してテストデータを作成：

#### ファイル1: PBS計算.md
```buffer
name: PBS (Phosphate Buffered Saline)
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
notes: 標準的なPBSバッファー（pH 7.4）
```

#### ファイル2: Tris-HClストック.md
```stock
name: Tris-HCl Stock Solution
reagentName: Tris-HCl
molecularWeight: 157.6
targetConcentration: 1
concentrationUnit: M
volume: 500
volumeUnit: mL
purity: 99
notes: pH調整用Tris-HClストック溶液
```

#### ファイル3: 希釈計算.md
```dilution
name: Tris Buffer Dilution
stockConcentration: 1
stockConcentrationUnit: M
finalConcentration: 50
finalConcentrationUnit: mM
finalVolume: 100
volumeUnit: mL
notes: 実験用Trisバッファーの希釈
```

### Step 3: DataView統合管理画面テスト
1. コマンドパレット（Cmd+P）で "DataView Integration" を実行
2. DataView統合モーダルが正しく開くか確認
3. プラグイン状態セクションでDataViewプラグインの状態が表示されることを確認
4. 検出されたBuffer Calc計算数が表示されることを確認（最低3件）



```dataview
TABLE
  name as "計算名",
  type as "種類",
  totalVolume + " " + volumeUnit as "体積",
  notes as "メモ"
FROM "/"
WHERE file.path != this.file.path
FLATTEN file.bufferCalc as calc
SORT calc.modifiedDate DESC
```

### Step 4: クイッククエリテスト
DataView統合モーダルで以下のクイッククエリをテスト：

1. **全ての計算**
   - 「クエリを挿入」ボタンをクリック
   - エディターにDataViewクエリが挿入されることを確認
   - クエリを実行して3つの計算が表示されることを確認

2. **バッファー計算**
   - バッファー計算のみのクエリを挿入
   - PBS計算のみが表示されることを確認

3. **ストック溶液**
   - ストック溶液計算のみのクエリを挿入
   - Tris-HClストック計算のみが表示されることを確認

4. **希釈計算**
   - 希釈計算のみのクエリを挿入
   - Tris希釈計算のみが表示されることを確認

5. **最近7日**
   - 最近7日間の計算クエリを挿入
   - 作成したテストデータが表示されることを確認

6. **統計情報**
   - 統計情報クエリを挿入
   - 計算タイプ別の統計が表示されることを確認

### Step 5: カスタムクエリビルダーテスト
DataView統合モーダルのカスタムクエリビルダーで以下をテスト：

1. **計算タイプフィルター**
   - 「バッファー計算」を選択
   - カスタムクエリを生成して挿入
   - バッファー計算のみが表示されることを確認

2. **試薬名検索**
   - 試薬名に「Tris」を入力
   - カスタムクエリを生成
   - Trisを含む計算（ストック、希釈）が表示されることを確認

3. **体積範囲検索**
   - 最小: 100, 最大: 500, 単位: mL
   - カスタムクエリを生成
   - 指定範囲の体積の計算が表示されることを確認

4. **濃度範囲検索**
   - 最小: 10, 最大: 100, 単位: mM
   - カスタムクエリを生成
   - 指定範囲の濃度の計算が表示されることを確認

5. **ソート機能**
   - ソート基準を「体積」「降順」に設定
   - カスタムクエリを生成
   - 体積の大きい順に表示されることを確認

6. **結果数制限**
   - 結果数制限を「2」に設定
   - カスタムクエリを生成
   - 最大2件の結果が表示されることを確認

### Step 6: データ統計テスト
DataView統合モーダルの統計セクションで以下を確認：

1. **基本統計**
   - 総計算数: 3件
   - バッファー: 1件
   - ストック: 1件
   - 希釈: 1件
   - 平均体積が正しく計算されているか

2. **よく使用される試薬**
   - NaCl, KCl, Tris-HCl などが表示されているか
   - 使用回数が正しくカウントされているか

### Step 7: 設定画面統合テスト
1. Settings → Buffer Calc → DataView統合設定 を開く
2. プラグイン状態が正しく表示されることを確認
3. データ統計が正しく表示されることを確認
4. 「DataView統合を開く」ボタンが正常に動作することを確認

### Step 8: DataViewクエリ実行テスト
挿入されたクエリがDataViewプラグインで正しく実行されることを確認：

1. 挿入されたDataViewクエリがシンタックスエラーなく実行される
2. 期待通りのデータが表示される
3. 列名とデータフォーマットが適切
4. 日本語ラベルが正しく表示される

### Step 9: エラーハンドリングテスト
1. DataViewプラグインを無効化してDataView統合画面を開く
2. 警告メッセージが適切に表示されることを確認
3. 不正なMarkdown形式のBuffer Calcブロックがあっても処理が継続されることを確認
4. ファイル読み込みエラーが適切にハンドリングされることを確認

### Step 10: パフォーマンステスト
1. 大量のMarkdownファイル（50+）がある環境でテスト
2. データ読み込みが適切な時間内に完了することを確認
3. UIが応答性を保つことを確認
4. メモリリークがないことを確認

## 期待結果

✅ **基本機能**
- DataView統合モーダルが正常に表示される
- Buffer Calcデータが正しく抽出される
- DataViewクエリが正確に生成される

✅ **クエリ機能**
- クイッククエリが正常に動作する
- カスタムクエリビルダーが期待通りに動作する
- 生成されたクエリがDataViewで実行可能

✅ **検索・フィルタリング**
- 全ての検索条件が正常に動作する
- 複合条件での検索が可能
- 結果が期待通りにフィルタリングされる

✅ **統計機能**
- データ統計が正確に計算される
- 統計情報が適切に表示される
- パフォーマンスが良好

✅ **UI/UX**
- 直感的で使いやすいインターフェース
- 適切なエラーメッセージ表示
- レスポンシブなデザイン

✅ **統合機能**
- 設定画面での適切な状態表示
- プラグイン間の連携が正常
- エラー時の適切なフォールバック

## 実装完了項目

- [x] DataViewIntegration クラス（データ抽出・統合ロジック）
- [x] DataViewQueries クラス（クエリテンプレート・生成）
- [x] DataViewIntegrationModal（統合管理UI）
- [x] クイッククエリシステム（6種類の定義済みクエリ）
- [x] カスタムクエリビルダー（動的クエリ生成）
- [x] データ統計生成・表示機能
- [x] 検索・フィルタリング機能（試薬名、体積、濃度、日付、タグ）
- [x] 設定画面統合（プラグイン状態表示、統計表示）
- [x] コマンド登録（"DataView Integration"）
- [x] エディターへのクエリ挿入機能
- [x] 非同期データ処理対応
- [x] エラーハンドリング
- [x] 完全な日本語対応
- [x] TypeScript型安全性
- [x] 包括的なCSS styling

---

**Phase 3.5 DataView統合機能は実装完了です！**

DataViewプラグインと連携してBuffer Calcの計算データを効率的に検索・分析できるようになりました。

次のフェーズ3機能のテストを開始できます。