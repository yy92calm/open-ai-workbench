#!/bin/bash
# Workbench macOS 打包脚本
# 用法: bash scripts/package-mac.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$DESKTOP_DIR/../.." && pwd)"

echo "=== Workbench macOS 打包 ==="
echo "项目根目录: $PROJECT_ROOT"
echo ""

cd "$PROJECT_ROOT"

# 1. 类型检查
echo "[1/3] 类型检查..."
pnpm --filter desktop typecheck
echo "✓ 类型检查通过"
echo ""

# 2. 构建
echo "[2/3] 构建应用..."
pnpm --filter desktop build
echo "✓ 构建完成"
echo ""

# 3. 打包 (electron-builder)
echo "[3/4] 打包 macOS 安装包..."
cd "$DESKTOP_DIR"
npx electron-builder --mac --config electron-builder.config.ts --publish never
echo ""

# 4. 移除 macOS 隔离属性（否则 sidecar 二进制文件无法执行）
echo "[4/4] 清除隔离属性..."
APP_PATH="$DESKTOP_DIR/release/mac-arm64/Workbench.app"
if [ ! -d "$APP_PATH" ]; then
  APP_PATH="$DESKTOP_DIR/release/mac/Workbench.app"
fi
if [ -d "$APP_PATH" ]; then
  xattr -cr "$APP_PATH" 2>/dev/null || true
  echo "✓ 已清除: $APP_PATH"
else
  echo "⚠ 未找到 .app 目录，请手动执行: xattr -cr <path-to-Workbench.app>"
fi
echo ""

echo "=== 打包完成 ==="
echo "输出目录: apps/desktop/release/"
ls -lh "$PROJECT_ROOT/apps/desktop/release/" 2>/dev/null || echo "(release 目录不存在或为空)"
