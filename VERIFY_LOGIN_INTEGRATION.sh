#!/usr/bin/env bash
# 登录集成验证脚本

set -e

cd /Volumes/WD_BLACK/github/gitpulse

echo "🔍 验证登录集成..."
echo ""

# 检查新文件
echo "📋 检查新创建的文件..."
echo ""

files_to_check=(
  "packages/app/src/stores/authStore.ts"
  "packages/app/src/services/GitHubApiClient.ts"
  "packages/app/src/components/LoginModal.tsx"
  "packages/app/src/components/UserProfile.tsx"
  "packages/app/src/styles/components/LoginModal.css"
  "packages/app/src/styles/components/UserProfile.css"
  "packages/app/LOGIN_INTEGRATION_GUIDE.md"
)

for file in "${files_to_check[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file (未找到)"
  fi
done

echo ""
echo "📊 文件大小统计..."
echo ""

for file in "${files_to_check[@]}"; do
  if [ -f "$file" ]; then
    size=$(wc -c < "$file" | numfmt --to=iec-i --suffix=B 2>/dev/null || wc -c < "$file")
    lines=$(wc -l < "$file")
    echo "  $file: $lines 行, $size"
  fi
done

echo ""
echo "🔧 检查依赖..."
echo ""

cd packages/app

if grep -q '"zustand":' package.json; then
  echo "✅ zustand 已安装"
else
  echo "⚠️  zustand 未在 package.json 中找到"
fi

if grep -q '"lucide-react":' package.json; then
  echo "✅ lucide-react 已安装"
else
  echo "⚠️  lucide-react 未在 package.json 中找到"
fi

echo ""
echo "✨ 验证完成！"
echo ""
echo "📚 下一步:"
echo "1. 阅读 LOGIN_INTEGRATION_GUIDE.md"
echo "2. 更新 src/components/layout/AppLayout.tsx"
echo "3. 运行 pnpm dev 测试登录功能"
echo "4. 检查浏览器控制台是否有错误"
