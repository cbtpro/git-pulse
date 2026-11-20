#!/usr/bin/env bash
# 安装 Zustand 状态管理库（如果尚未安装）

cd /Volumes/WD_BLACK/github/gitpulse/packages/app

echo "🔄 检查并安装 zustand..."
npm list zustand || pnpm add zustand

echo "✅ 完成！"
