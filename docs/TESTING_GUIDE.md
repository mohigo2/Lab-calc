# Buffer Calc Plugin Testing Guide

このガイドでは、Buffer Calcプラグインを徹底的にテストする方法を説明します。

## 🚀 手動テスト（推奨開始方法）

### ステップ 1: プラグインのインストール

1. **開発用Obsidianバルトの準備**
```bash
# テスト用のバルトを作成
mkdir ~/ObsidianTestVault
cd ~/ObsidianTestVault
```

2. **プラグインファイルのコピー**
```bash
# プラグインディレクトリを作成
mkdir -p .obsidian/plugins/buffer-calc

# ビルド済みファイルをコピー
cp "/Users/mohigo/1_projects/Buffer Calc/main.js" .obsidian/plugins/buffer-calc/
cp "/Users/mohigo/1_projects/Buffer Calc/styles.css" .obsidian/plugins/buffer-calc/
cp "/Users/mohigo/1_projects/Buffer Calc/manifest.json" .obsidian/plugins/buffer-calc/
```

3. **Obsidianでの有効化**
   - Obsidianでテストバルトを開く
   - 設定 → コミュニティプラグイン → Buffer Calc を有効化

### ステップ 2: 基本機能テスト

#### テスト 1: 基本バッファー計算
テストノートを作成し、以下のコードブロックを追加：

```buffer
name: Test Buffer 1
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

**期待結果:**
- インタラクティブな計算機が表示される
- Tris-HCl: 5.0 mL
- NaCl: 3.0 mL
- 溶媒: 92.0 mL

#### テスト 2: 試薬オートコンプリート
1. 新しいコンポーネントを追加
2. 試薬名フィールドに「Tr」と入力
3. サジェストリストが表示されることを確認
4. 「Tris」を選択すると自動補完されることを確認

#### テスト 3: リアルタイム更新
1. 数値を変更（例：総容量を200 mLに変更）
2. 計算結果が即座に更新されることを確認

#### テスト 4: 単位変換
1. 容量単位をmLからµLに変更
2. 結果が適切に変換されることを確認

### ステップ 3: エラーハンドリングテスト

#### テスト 5: 不可能な濃度エラー
```buffer
name: Error Test
totalVolume: 100
volumeUnit: mL
components:
  - name: NaCl
    stockConc: 1
    stockUnit: M
    finalConc: 2
    finalUnit: M
```

**期待結果:** エラーメッセージが表示される

#### テスト 6: 小容量警告
```buffer
name: Warning Test
totalVolume: 1000
volumeUnit: mL
components:
  - name: Test Reagent
    stockConc: 10000
    stockUnit: mM
    finalConc: 1
    finalUnit: mM
```

**期待結果:** 小容量に関する警告が表示される

### ステップ 4: 設定テスト

1. 設定タブにアクセス
2. デフォルト単位を変更
3. 小数点以下桁数を変更
4. カスタム試薬を追加
5. 設定をエクスポート/インポート

### ステップ 5: コマンドテスト

1. コマンドパレット（Cmd/Ctrl + P）を開く
2. 以下のコマンドをテスト：
   - "Insert Buffer Calculation"
   - "Open Recipe Manager"
   - "Manage Custom Reagents"

## 🔧 開発モードテスト

開発中のリアルタイムテストのため：

```bash
# プロジェクトディレクトリで開発モード開始
cd "/Users/mohigo/1_projects/Buffer Calc"
npm run dev
```

ファイルを変更すると自動的にリビルドされます。

## 🧪 単体テストの実装

自動化されたテストを追加するには：

### Jest設定の追加

```bash
npm install --save-dev jest @types/jest ts-jest
```

### テストファイルの例

```typescript
// src/tests/calculation-engine.test.ts
import { CalculationEngine } from '../calculations/engine';
import { DEFAULT_SETTINGS, BufferData } from '../types';

describe('CalculationEngine', () => {
  let engine: CalculationEngine;

  beforeEach(() => {
    engine = new CalculationEngine(DEFAULT_SETTINGS);
  });

  test('should calculate basic buffer correctly', () => {
    const data: BufferData = {
      totalVolume: 100,
      volumeUnit: 'mL',
      components: [{
        name: 'NaCl',
        stockConc: 5,
        stockUnit: 'M',
        finalConc: 150,
        finalUnit: 'mM'
      }]
    };

    const result = engine.calculateBuffer(data);
    
    expect(result.errors).toHaveLength(0);
    expect(result.components).toHaveLength(1);
    expect(result.components[0].volumeNeeded).toBe(3);
  });
});
```

## 📋 テストチェックリスト

### 基本機能
- [ ] バッファー計算ブロックの表示
- [ ] 正確な計算結果
- [ ] 試薬の追加/削除
- [ ] 単位変換
- [ ] リアルタイム更新

### UI/UX
- [ ] レスポンシブデザイン
- [ ] オートコンプリート機能
- [ ] エラーメッセージの表示
- [ ] 警告の表示
- [ ] エクスポート機能

### 設定
- [ ] 設定値の保存/読み込み
- [ ] カスタム試薬の管理
- [ ] デフォルト値の適用

### エラーハンドリング
- [ ] 不正入力の検証
- [ ] ネットワークエラー（外部リンク）
- [ ] メモリ不足時の動作

### パフォーマンス
- [ ] 大量データでの動作
- [ ] メモリリーク検査
- [ ] CPU使用率の監視

## 🐛 デバッグのヒント

### 開発者ツールの活用
1. F12で開発者ツールを開く
2. Console タブでエラーを確認
3. Network タブで外部リクエストを監視

### ログの追加
```typescript
// デバッグ用ログの例
console.log('Buffer calculation result:', result);
console.debug('Component values:', component);
```

### よくある問題
1. **プラグインが読み込まれない**
   - manifest.jsonの構文確認
   - main.jsのビルド確認

2. **計算結果が正しくない**
   - 単位変換ロジックの確認
   - 型変換の確認

3. **UIが表示されない**
   - CSSのパス確認
   - DOM操作のエラー確認

## 📊 テスト結果の記録

テスト結果を記録するテンプレート：

```markdown
## テスト実行結果 - [日付]

### 環境
- OS: 
- Obsidian Version: 
- Plugin Version: 

### テスト結果
- [ ] 基本計算: ✅/❌
- [ ] UI表示: ✅/❌
- [ ] エラーハンドリング: ✅/❌
- [ ] 設定機能: ✅/❌

### 発見された問題
1. 問題の説明
2. 再現手順
3. 期待される動作
4. 実際の動作

### 修正すべき点
- [ ] 項目1
- [ ] 項目2
```

## 🎯 テストの自動化

CI/CDパイプラインでの自動テスト：

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
      - run: npm run build
```

このガイドに従って段階的にテストを実行することで、プラグインの品質と安定性を確保できます。