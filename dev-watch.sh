#!/bin/bash

# Buffer Calc Plugin Development Watch Script
# ファイル変更を監視して自動的にプラグインを再ビルド・更新します

echo "🚀 Starting Buffer Calc development watch mode..."
echo "📁 Test vault: $(pwd)/test-vault"
echo "👁️ Watching for file changes..."
echo ""
echo "Press Ctrl+C to stop"
echo ""

# 初回ビルド
./test-plugin.sh

# ファイル監視してリアルタイムビルド
# macOSの場合は fswatch を使用（brew install fswatch が必要）
if command -v fswatch &> /dev/null; then
    echo "Using fswatch for file monitoring..."
    fswatch -o src/ | while read f; do
        echo ""
        echo "🔄 Files changed, rebuilding..."
        ./test-plugin.sh
    done
else
    echo ""
    echo "⚠️ fswatch not found. Install with: brew install fswatch"
    echo "For now, manually run ./test-plugin.sh after changes"
fi