#!/bin/bash

# Buffer Calc Plugin Test Script
# このスクリプトは自動的にプラグインをビルドしてテストバルトに配置します

echo "🔧 Building Buffer Calc plugin..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
    
    echo "📁 Copying files to test vault..."
    cp main.js manifest.json styles.css test-vault/.obsidian/plugins/buffer-calc/
    
    # ファイルのタイムスタンプを更新してObsidianに強制リロードさせる
    touch test-vault/.obsidian/plugins/buffer-calc/main.js
    
    echo "🎉 Plugin updated in test vault!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Obsidianで以下のディレクトリを開く:"
    echo "   $(pwd)/test-vault"
    echo ""
    echo "2. プラグインが自動的に有効化されているはずです"
    echo "   (もし無効の場合: 設定 → コミュニティプラグイン → Buffer Calc を有効化)"
    echo ""
    echo "3. 'Test Buffer Calculations.md' を開いてテスト実行"
    echo ""
    echo "4. F12 でコンソールを開いて詳細ログを確認"
    
else
    echo "❌ Build failed"
    exit 1
fi