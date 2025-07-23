# Buffer Calc - Obsidian プラグイン

研究室のバッファー調製計算のための包括的なObsidianプラグインです。YAMLコードブロックをリアルタイム計算、試薬オートコンプリート、プロフェッショナルな実験室機能を備えたインタラクティブな計算機に変換します。

**🎉 現在のステータス: フェーズ2完了 - すべての計算機タイプ（バッファー、ストック、希釈）が完全動作**

## 機能

### 🧪 マルチコンポーネントバッファー計算 ✅ 実装完了
- **C1V1=C2V2計算**による各成分の体積自動計算
- **溶媒体積計算**で追加する水/バッファーの正確な量を表示
- 異なる濃度単位のサポート (M, mM, µM, nM, mg/mL, %, etc.)
- **リアルタイム計算更新**でUI上で値を変更すると即座に反映
- **パーセンテージ計算**で各成分の寄与率を表示
- 包括的なバリデーションとエラーチェック

### 📊 インタラクティブコードブロック ✅ 実装完了  
シンプルなYAMLテキストを動的UIを持つインタラクティブ計算機に変換：

```buffer
name: PBS バッファー
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

### 🗃️ 内蔵試薬データベース ✅ 実装完了
- **50種類以上の実験室試薬**と分子量、カテゴリー情報
- **リアルタイムオートコンプリート**でファジー検索機能付き
- **外部リンク**でSigma-Aldrich、ThermoFisher、VWRへのアクセス
- プラグイン設定でカスタム試薬サポート
- カテゴリー別整理：バッファー、塩類、界面活性剤、還元剤など

### ⚠️ スマートバリデーション・警告機能 ✅ 実装完了
- **不可能な濃度検出** (最終濃度 > ストック濃度) で明確なエラーメッセージ
- **体積オーバーフロー警告**でコンポーネント体積が総体積を超える場合
- **小体積警告**でピペッティングが困難な量について
- **配列バリデーション**でコンポーネントの適切なフォーマットを確認
- ユーザーフレンドリーなメッセージで包括的エラーハンドリング

### 📋 レシピ管理 ✅ 実装完了
- **クリップボードへエクスポート**で調製手順付きMarkdown形式
- **ロット番号追跡**で試薬の再現性確保
- **計算ステップ表示**（オプション）で詳細な計算式を表示
- **プロフェッショナルレシピ形式**でコンポーネント詳細と溶媒指示

### 🔧 カスタマイズ可能な設定 ✅ 実装完了
- **デフォルト単位**で体積と濃度計算の設定
- **小数点桁数**の設定（0-6桁まで対応）
- **計算ステップ表示**の詳細計算式ON/OFF
- **カスタム試薬管理**で設定インターフェース経由
- **包括的設定タブ**で整理された設定オプション

## 🚀 現在の実装状況

### ✅ 完成機能
- **マルチコンポーネントバッファー計算**でC1V1=C2V2公式使用
- **ストック溶液計算機**で分子量ベースの粉末量計算
- **希釈計算機**でC1V1=C2V2による段階希釈計算
- **インタラクティブYAMLコードブロック処理**（3種類の計算タイプ）
- **リアルタイムUI更新**で動的再計算
- **専用結果表示**で各計算タイプに最適化されたUI
- **溶媒体積計算**と表示
- **完全単位変換システム**（濃度・体積・質量の自動変換）
- **50種類以上試薬データベース**でオートコンプリート
- **包括的バリデーション**とエラーハンドリング
- **エクスポート機能**でクリップボードへ
- **完全設定管理**でカスタマイズ可能オプション
- **プロフェッショナルUI/UX**でObsidianデザインパターン

### 🎯 フェーズ2追加機能 ✅ 実装完了
- **ストック溶液計算機**: 粉末量（質量）計算と調製手順
- **希釈計算機**: C1V1=C2V2による段階希釈計算
- **専用結果表示**: 各計算タイプに最適化されたUI
- **単位変換システム**: 濃度・体積・質量の完全自動変換

## インストール

### 開発版インストール（現在）
開発版のため、手動でインストールしてください：

1. プロジェクトをクローンまたはダウンロード：
```bash
git clone [repository-url]
cd buffer-calc
```

2. プラグインをビルド：
```bash
npm install
npm run build
```

3. ObsidianVaultにコピー：
```bash
# ビルドファイルをvaultのプラグインフォルダにコピー
cp -r . /path/to/your/vault/.obsidian/plugins/buffer-calc/
```

4. プラグインを有効化：
   - Obsidian設定 → コミュニティプラグインを開く
   - "Buffer Calc"を有効化

### テスト環境
完全なテスト環境が含まれています：
```bash
# 付属のテストvaultを開発で使用
./test-plugin.sh

# または開発ウォッチモードで実行
./dev-watch.sh
```

## 使用方法

### 基本的なバッファー計算

1. `buffer`タイプでコードブロックを作成：
   ```
   ```buffer
   name: 私のバッファー
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

2. プラグインがインタラクティブ計算機を表示：
   - **NaCl**: 27.4 mL添加 (2.7%)
   - **KCl**: 2.7 mL添加 (0.3%)
   - **Na2HPO4**: 10.0 mL添加 (1.0%)
   - **水またはバッファーを加えて総体積に: 959.9 mL**

3. リアルタイムで値を変更して計算結果の更新を確認
4. 結果に満足したらレシピをエクスポート

### サポートされるブロックタイプ

- `buffer` ✅ **実装済み**: 完全機能付きマルチコンポーネントバッファー計算
- `stock` ✅ **実装済み**: ストック溶液の粉末量計算（分子量ベース）
- `dilution` ✅ **実装済み**: 段階希釈計算（C1V1=C2V2公式）

### 高度な機能

#### 試薬オートコンプリート
試薬名を入力すると内蔵データベースから選択できます：
- 自動分子量入力
- 外部データベースへのリンク
- カスタム試薬管理

#### バリデーション・警告
プラグインは賢いフィードバックを提供：
- ⚠️ **小体積**: より希薄なストックの使用を提案
- ⚠️ **高希釈倍率**: 中間希釈を推奨
- ❌ **不可能な濃度**: 計算エラーを防止
- ❌ **データ不足**: 必須フィールドをハイライト

#### 設定カスタマイゼーション
Obsidian設定 → Buffer Calcでプラグイン設定にアクセス：
- 新規計算でのデフォルト単位設定
- 小数精度の調整
- カスタム試薬管理
- 設定のエクスポート/インポート

## 計算例

### 1. 標準PBSバッファー計算
```buffer
name: 10× PBSストック
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

### 2. ストック溶液計算

```stock
name: 1M Tris-HCl ストック溶液
reagentName: Tris-HCl
molecularWeight: 157.6
targetConcentration: 1
concentrationUnit: M
volume: 100
volumeUnit: mL
purity: 99.5
solvent: 蒸留水
```

**結果例**:
1. **Tris-HCl**: 15.84 g を計量
2. 蒸留水に溶解し、総体積を 100 mL にメスアップする

### 3. 希釈計算

```dilution
name: Tris-HCl 作業溶液
stockConcentration: 1
stockConcentrationUnit: M
finalConcentration: 50
finalConcentrationUnit: mM
finalVolume: 100
volumeUnit: mL
```

**結果例**:
1. ストック溶液: 5.00 mL を取る
2. 溶媒を加えて総体積を 100 mL にする（溶媒: 95.00 mL）

### 4. 添加剤入りタンパク質バッファー
```buffer
name: タンパク質精製バッファー
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

## 🧮 技術詳細

### 計算エンジン
プラグインは基本希釈方程式 **C1V1 = C2V2** を実装：

```
V₁ = (C₂ × V₂) / C₁
```

**ここで：**
- C₁ = ストック濃度
- V₁ = ストックから必要な体積（計算値）
- C₂ = 最終濃度
- V₂ = 最終体積

**計算例（基本テスト）：**
```
ストック: 1M NaCl、最終: 100mM NaCl in 100mL
V₁ = (0.1M × 0.1L) / 1M = 0.01L = 10mL
溶媒: 100mL - 10mL = 90mL水
```

### YAML処理
シンプルなYAMLパーサーがコードブロック内容を処理：
```yaml
# サポートされる構文
name: バッファー名           # 文字列
totalVolume: 100           # 数値
volumeUnit: mL             # 列挙値
components:                # 配列
  - name: NaCl             # コンポーネントオブジェクト
    stockConc: 1           # 数値
    stockUnit: M           # 列挙値
```

### 単位変換システム
自動最適化による包括的単位サポート：
- **体積**: L、mL、µL、nL with 賢い表示最適化
- **濃度**: M、mM、µM、nM、%(w/v)、mg/mL、µg/mL
- **最適ピペッティング体積**での自動単位選択

## 開発

### ソースからのビルド
```bash
# リポジトリをクローン
git clone https://github.com/your-username/buffer-calc-obsidian
cd buffer-calc-obsidian

# 依存関係をインストール
npm install

# 開発用ビルド（ファイル監視付き）
npm run dev

# 本番用ビルド
npm run build
```

### プロジェクト構造
```
src/
├── main.ts                 # メインプラグインクラス
├── settings.ts             # 設定管理
├── types.ts               # 型定義
├── calculations/
│   └── engine.ts          # コア計算ロジック
├── ui/
│   └── buffer-calc-ui.ts  # インタラクティブUIコンポーネント
├── data/
│   └── reagents.ts        # 試薬データベース
└── utils/
    └── conversions.ts     # 単位変換ユーティリティ
```

### コントリビュート
1. リポジトリをフォーク
2. フィーチャーブランチを作成
3. 変更を加える
4. 該当する場合はテストを追加
5. プルリクエストを提出

## 🗺️ 開発ロードマップ

### 🎯 フェーズ1: コアバッファー計算 ✅ 完了
- [x] マルチコンポーネントバッファー計算機
- [x] YAMLコードブロック処理
- [x] リアルタイム更新インタラクティブUI
- [x] 溶媒体積計算
- [x] オートコンプリート付き試薬データベース
- [x] バリデーションとエラーハンドリング
- [x] エクスポート機能
- [x] 設定管理

### ✅ フェーズ2: 追加計算機（完了）
- [x] ストック溶液計算機UI（完全実装）
- [x] 段階希釈計算機UI（完全実装）
- [x] モル濃度/質量計算（完全実装）
- [x] 専用結果表示システム（各計算タイプ用）
- [x] 単位変換の完全自動化（濃度・体積・質量）

### 📈 フェーズ3: 高度な機能（計画中）
- [ ] レシピテンプレートとプリセット
- [ ] 設定インポート/エクスポート
- [ ] 計算履歴
- [ ] カスタム試薬カテゴリー
- [ ] DataViewプラグイン連携
- [ ] モバイル/タブレット最適化

### 🚀 フェーズ4: 実験室連携（将来）
- [ ] レシピバージョン管理
- [ ] 共同レシピ共有
- [ ] 実験室在庫連携
- [ ] レシピQRコード生成
- [ ] 実験室情報システム（LIMS）連携

## トラブルシューティング

### よくある問題

**"Components.forEach is not a function"**
- コンポーネントが`- name:`構文でYAML配列としてフォーマットされていることを確認
- インデント確認（タブでなくスペース使用）

**体積計算が間違っているようです**
- ストックと最終濃度単位が期待値と一致することを確認
- 最終濃度がストック濃度より低いことを確認

**プラグインが読み込まれません**
- プラグインフォルダが`.obsidian/plugins/buffer-calc/`にあることを確認
- コミュニティプラグイン設定でプラグインを有効化
- 必要に応じてObsidianを再起動

### デバッグモード
開発者コンソール（F12）を有効にして詳細計算ログを確認：
- YAML解析結果
- 濃度変換
- 体積計算
- 溶媒体積計算

## ライセンス

MIT License - 詳細はLICENSEファイルを参照してください。

## サポート

- **問題報告**: GitHubでバグと機能要求を報告
- **ドキュメント**: テストvaultの例を参照
- **コミュニティ**: GitHub Issuesでディスカッション参加

---

**バージョン**: 2.0.0 (フェーズ2完了版)  
**リリース日**: 2025年7月23日  
**作者**: Buffer Calc開発チーム  
**対応**: Obsidian v1.0+

*Obsidianノートの力で実験室計算を変革しましょう！ 🧪📝*