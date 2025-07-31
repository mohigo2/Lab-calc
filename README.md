# Lab Calc - Obsidian Plugin 🧪

**実験室計算の究極ソリューション**  
YAMLコードブロックをリアルタイム計算・試薬オートコンプリート・インテリジェント機能を備えたインタラクティブ計算機に変換するObsidianプラグイン

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/your-repo/lab-calc)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Obsidian](https://img.shields.io/badge/obsidian-v1.0+-purple.svg)](https://obsidian.md)

---

## ✨ 主要機能

### 🧮 **多機能計算エンジン**
- **バッファー計算**: マルチコンポーネント C₁V₁=C₂V₂ 計算
- **ストック溶液**: 分子量ベース粉末量計算  
- **希釈計算**: 段階希釈・作業溶液調製
- **シリアル希釈**: 複数段階希釈プロトコル生成

### 🔬 **スマート試薬データベース**
- **50種類以上**の実験室試薬を内蔵
- **リアルタイムオートコンプリート**でファジー検索
- **自動分子量入力**・**外部リンク**統合
- **カスタム試薬管理**で設定拡張可能

### 🎯 **インテリジェント機能**
- **リーディングモード対応**: 編集/読み取り専用の自動切り替え
- **フォーカス保護**: 入力中のソース更新を防止
- **状態復元**: フォーカス・カーソル位置の自動保持
- **スマートバリデーション**: 不適切な設定を事前検出

### 📱 **優れたUX/UI**
- **レスポンシブ設計**: デスクトップ・モバイル最適化
- **リアルタイム更新**: 入力と同時に計算結果反映
- **プロフェッショナル表示**: Obsidianデザイン準拠
- **エクスポート機能**: クリップボード・Markdown形式

---

## 🚀 クイックスタート

### インストール

#### 方法1: 手動インストール（推奨）
1. **ファイルをダウンロード**:
   ```
   main.js, manifest.json, styles.css
   ```

2. **プラグインフォルダに配置**:
   ```
   your-vault/.obsidian/plugins/lab-calc/
   ```

3. **プラグインを有効化**:
   設定 → コミュニティプラグイン → "Lab Calc" を有効化

#### 方法2: 開発版ビルド
```bash
git clone [repository-url]
cd "Lab Calc"
npm install
npm run build
```

### 30秒で開始
新しいノートに以下のコードブロックを貼り付け：

```buffer
name: テストバッファー  
totalVolume: 100
volumeUnit: mL
components:
  - name: NaCl
    stockConc: 5
    stockUnit: M
    finalConc: 150
    finalUnit: mM
  - name: Tris-HCl
    stockConc: 1
    stockUnit: M
    finalConc: 50
    finalUnit: mM
```

インタラクティブ計算機が即座に表示されます！

---

## 📋 使用方法

### サポートされる計算タイプ

#### 1. **バッファー計算** - `buffer`
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

**結果例**:
- **NaCl**: 27.4 mL 添加 (2.7%)
- **KCl**: 2.7 mL 添加 (0.3%)  
- **Na2HPO4**: 10.0 mL 添加 (1.0%)
- **溶媒**: 959.9 mL で総体積に調整

#### 2. **ストック溶液計算** - `stock`
```stock
name: 1M Tris-HCl ストック
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
2. 蒸留水に溶解し、総体積を 100 mL にメスアップ

#### 3. **希釈計算** - `dilution`
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
2. 溶媒を加えて総体積を 100 mL に調整

#### 4. **シリアル希釈** - `serial-dilution`
```serial-dilution
name: 抗体希釈シリーズ
stockConcentration: 1
stockUnit: mg/ml
dilutionFactor: 10
numberOfDilutions: 4
volumePerTube: 1000
volumeUnit: µL
```

**結果例**:
1. **1:10希釈**: 100 µL ストック + 900 µL 溶媒
2. **1:100希釈**: 100 µL 前段 + 900 µL 溶媒
3. **1:1000希釈**: 100 µL 前段 + 900 µL 溶媒
4. **1:10000希釈**: 100 µL 前段 + 900 µL 溶媒

---

## 🔧 高度な機能

### スマートバリデーション
- ⚠️ **小体積警告**: `< 1 µL` 時に希薄ストック提案
- ⚠️ **高希釈倍率**: 中間希釈ステップを推奨  
- ❌ **不可能な濃度**: 最終 > ストック濃度の防止
- ❌ **体積オーバーフロー**: 成分体積合計 > 総体積

### 試薬オートコンプリート
- **内蔵データベース**: 一般的な試薬50種類以上
- **ファジー検索**: 部分一致・略語対応
- **自動補完**: 分子量・カテゴリー情報
- **外部リンク**: Sigma-Aldrich, ThermoFisher, VWR

### モード対応機能
- **ライブプレビュー**: 全機能利用可能
- **リーディングモード**: 🔒アイコン表示・入力無効化
- **ソースモード**: 通常の編集機能

### カスタマイゼーション
設定 → Lab Calc で詳細設定:
- **デフォルト単位**: 体積・濃度の初期値
- **小数点桁数**: 0-6桁精度設定
- **カスタム試薬**: 独自データベース追加
- **表示オプション**: 計算詳細・パーセンテージ表示

---

## 🧮 技術仕様

### 計算エンジン
基本希釈方程式 **C₁V₁ = C₂V₂** を実装:

```
V₁ = (C₂ × V₂) / C₁

C₁: ストック濃度
V₁: ストックから必要体積（計算値）  
C₂: 最終濃度
V₂: 最終体積
```

### サポート単位系
- **体積**: L, mL, µL, nL (自動最適化表示)
- **濃度**: M, mM, µM, nM, %(w/v), %(v/v), mg/mL, µg/mL
- **質量**: kg, g, mg, µg, ng (ストック計算用)

### YAML パーサー
シンプルで堅牢なYAML処理:
```yaml
# 基本構文
name: "文字列"
totalVolume: 100        # 数値
volumeUnit: mL          # 列挙値  
components:             # 配列
  - name: NaCl          # オブジェクト
    stockConc: 1
    stockUnit: M
```

---

## 🗂️ プロジェクト構造

```
Lab Calc/
├── src/
│   ├── main.ts                    # メインプラグインクラス
│   ├── settings.ts                # 設定管理・UI
│   ├── types.ts                   # TypeScript型定義
│   ├── calculations/
│   │   ├── engine.ts              # コア計算ロジック
│   │   ├── buffer-calculations.ts # バッファー計算
│   │   ├── stock-calculations.ts  # ストック溶液計算
│   │   └── dilution-calculations.ts # 希釈計算
│   ├── ui/
│   │   ├── buffer-calc-ui.ts      # インタラクティブUI
│   │   ├── mobile-optimization.ts # モバイル最適化
│   │   └── title-editing.ts       # タイトル編集機能
│   ├── data/
│   │   ├── reagents.ts            # 試薬データベース
│   │   └── reagent-database.ts    # データベース管理
│   └── utils/
│       ├── conversions.ts         # 単位変換
│       ├── validation.ts          # バリデーション
│       └── yaml-parser.ts         # YAML処理
├── styles.css                     # プラグインスタイル
├── manifest.json                  # プラグイン設定
├── test-vault/                    # テスト環境
│   ├── バッファー計算テスト.md
│   ├── ストック溶液テスト.md
│   └── 希釈計算テスト.md
└── README.md                      # このファイル
```

---

## 🚧 トラブルシューティング

### よくある問題

**プラグインが読み込まれない**
- `.obsidian/plugins/lab-calc/` フォルダの確認
- `main.js`, `manifest.json`, `styles.css` の存在確認
- コミュニティプラグイン設定で有効化
- Obsidian再起動

**計算結果が間違っている**
- 単位の一致確認（M ≠ mM）
- 最終濃度 < ストック濃度の確認
- YAML構文の正確性（インデント・ハイフン）

**コンポーネントエラー**
```yaml
# ❌ 間違い
components:
- name: NaCl

# ✅ 正しい  
components:
  - name: NaCl
    stockConc: 1
    stockUnit: M
```

**オートコンプリートが動作しない**
- 2文字以上の入力
- データベースに存在する試薬名
- ネットワーク接続（外部リンク用）

### デバッグモード
開発者コンソール（F12）で詳細ログ確認:
- YAML解析ログ
- 単位変換計算
- バリデーション結果
- エラースタック

---

## 🛠️ 開発・コントリビューション

### 開発環境
```bash
# プロジェクトセットアップ
git clone https://github.com/your-repo/lab-calc
cd lab-calc
npm install

# 開発モード（ファイル監視）
npm run dev

# テスト実行
npm test
npm run test:coverage

# 本番ビルド
npm run build
```

### コントリビューション歓迎
1. **イシュー報告**: バグ・機能要求
2. **プルリクエスト**: 新機能・改善  
3. **ドキュメント**: 使用例・翻訳
4. **テスト**: エッジケース・環境テスト

### 開発ガイドライン
- **TypeScript**: 厳密な型チェック
- **Jest**: ユニットテスト必須
- **ESLint**: コード品質保持
- **Obsidian API**: プラグイン標準準拠

---

## 🗺️ ロードマップ

### ✅ 実装完了
- [x] マルチコンポーネントバッファー計算
- [x] ストック溶液・希釈計算
- [x] シリアル希釈プロトコル
- [x] 試薬データベース＆オートコンプリート
- [x] リーディングモード対応
- [x] フォーカス保護・状態復元
- [x] スマートバリデーション
- [x] モバイル最適化

### 🔄 検討中機能
- [ ] **レシピテンプレート**: よく使う計算の保存
- [ ] **計算履歴**: 過去の計算記録・再利用
- [ ] **バッチ計算**: 複数サンプル一括処理  
- [ ] **DataView連携**: 計算結果のデータベース化
- [ ] **外部API**: ChemSpider・PubChem連携
- [ ] **QRコード**: レシピ共有・印刷

---

## 📄 ライセンス・サポート

### ライセンス
**MIT License** - 詳細は [LICENSE](LICENSE) ファイル参照

### サポート・コミュニティ
- **GitHub Issues**: バグ報告・機能要求
- **GitHub Discussions**: 使用方法・ベストプラクティス
- **Documentation**: [test-vault/](test-vault/) の実例参照

### クレジット
**開発チーム**: Lab Calc Contributors  
**対応バージョン**: Obsidian v1.0+  
**最終更新**: 2025年7月31日

---

<div align="center">

**🧪 Obsidianで実験室計算を革新しましょう！ 📝**

[![GitHub Stars](https://img.shields.io/github/stars/your-repo/lab-calc?style=social)](https://github.com/your-repo/lab-calc)
[![GitHub Forks](https://img.shields.io/github/forks/your-repo/lab-calc?style=social)](https://github.com/your-repo/lab-calc)

</div>