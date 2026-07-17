# 方案：Reasonix 风格四期 — 布局优化

## 背景

一~三期完成了对话 UI 细节（气泡、代码块、间距、侧边栏指示器等）。四期聚焦**整体布局**向 Reasonix 靠拢：侧边栏收窄、顶部标题栏精简、底部状态栏、对话区留白调整。

## 设计

### 1. 侧边栏收窄 + 简化

- 默认宽度从 232px 降至 200px（`useResizable(200, 160, 360)`）
- Logo 区域改为单行：仅保留 logo 图标（14px），去掉 "Workbench" 文字和 "Beta" 标签
- 导航按钮（New/Tasks/Files/Skills）字号从 13px 降至 12px，图标 16→14，padding 收紧
- 会话列表项字号从 13px 降至 12px，行高收紧
- Settings 按钮图标 15→13，文字 13px→12px

### 2. 顶部标题栏精简

- 去掉独立的 header bar（标题 + WorkspaceChip + ConnBadge + 按钮行）
- Files/Notebook/Connect 按钮改为**浮动胶囊工具栏**（`sticky top-2`，圆角全圆，半透明背景 + 模糊）
- ConnBadge 移除（连接状态由底部状态栏统一展示）
- WorkspaceChip 移除（workspace 信息在 Files 按钮 tooltip 中可见）

### 3. 底部状态栏

- 在 AppShell 底部新增全局 StatusBar（高度 28px，`bg-surface border-t border-border`）
- 左侧：连接状态点（绿/黄/红/灰）+ runtime 状态文字
- 右侧：模型名称（带状态点）
- 最右：品牌名 "Workbench"
- 新建 `StatusBar.tsx` 组件，从 runtimeStore 读取 status 和 defaultModel

### 4. Composer 区域优化 + 留白调整

- 对话区 max-width 从 940px 调整为 880px（更聚焦）
- 对话区左右 padding 从 `px-8` 调整为 `px-6`
- Composer 区域增加顶部渐变（`from-bg to-transparent`），与对话内容自然过渡
- ThreadView（示例会话）同步调整 max-width 和 padding

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/renderer/app/layout/AppShell.tsx` | 侧边栏宽度 232→200，新增 StatusBar，flex-col 布局 |
| `src/renderer/components/sidebar/Sidebar.tsx` | Logo 简化、nav 字号/间距收紧、列表项紧凑 |
| `src/renderer/components/sidebar/StatusBar.tsx` | 新建：底部全局状态栏 |
| `src/renderer/app/routes/LiveSessionPage.tsx` | 去掉 header、浮动胶囊工具栏、max-width/padding 调整 |
| `src/renderer/components/thread/ThreadView.tsx` | max-width 940→880、padding px-8→px-6 |

## 验证状态

- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [ ] 视觉检查：侧边栏更窄更紧凑
- [ ] 视觉检查：顶部无冗余标题栏，浮动胶囊工具栏正常
- [ ] 视觉检查：底部状态栏正常显示
- [ ] 视觉检查：对话区留白自然
