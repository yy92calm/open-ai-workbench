# 方案：Reasonix 风格三期 — 对话 UI 细节打磨

## 背景

一期完成：用户气泡右对齐、ToolCallRow 可折叠、Composer 运行状态条、对话区加宽至 940px。
二期完成：ReasoningCard 渐变竖线、AgentMessage accent 线条、WorkingIndicator 打字动画、ToolGroup 进度摘要、TurnDivider 精致化、ShellCard 终端风格。

三期聚焦 6 个体验细节：代码块交互、区块间距节奏、侧边栏导航、长对话滚动、空状态引导、Composer 工具栏。

## 设计

### 1. 代码块增强

- 头部增加复制按钮（Clipboard icon），点击后变为 Check 图标 1.2s
- 语言标签改用圆角 badge 样式（`bg-surface-2 ring-1 ring-border/60`）
- 代码块增加左侧 2px accent 色竖线（`border-l-2 border-accent/30`）
- 代码块背景改用 `bg-elev-2`，与正文区域区分

### 2. 对话区块间距节奏

- 用户消息前：`mt-5`（明确对话分隔）
- Agent 消息前：`mt-4`（回复段落间距）
- 工具调用/步骤摘要前：`mt-1.5`（紧凑，连续操作）
- 推理卡片前：`mt-3`（中等间距）
- 分隔线前：`mt-2`
- 外层容器去掉统一 `gap-5`，改由 `spacingBefore()` 按类型控制

### 3. 侧边栏优化

- 选中项左侧增加 3px accent 色竖线（`w-[3px] rounded-r-full bg-accent`）
- 会话列表项增加 `transition-colors duration-150` 微动效
- "History" 分组标题增加细分隔线（`border-b border-border-soft/60`）
- 底部 Settings 区域分隔线改用 `border-border-soft/60`

### 4. 滚动到底部按钮

- 对话区域右下角浮动圆形按钮（ArrowDown icon）
- 当用户向上滚动超过 200px 时显示
- 点击平滑滚动到底部（`behavior: "smooth"`）
- 使用 `sticky bottom-4` 定位在可视区域内

### 5. 空状态引导增强

- 顶部增加品牌 logo 图标（`logo.webp`，36px 高）
- 增加淡色渐变背景（`from-accent/[0.04] via-transparent`）
- Starter 卡片 hover 时左侧出现 2px accent 色竖线
- 底部增加快捷键提示（`⌘ Press / to search commands`）

### 6. Composer 底部工具栏优化

- 发送按钮增加 `hover:scale-105` 微妙放大效果
- 禁用态发送按钮增加 tooltip 提示
- 有内容时底部工具栏增加上边框细分隔线
- Shell 模式标签增加 `ring-1 ring-warn/20` 边框 + `font-medium` 加粗

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/renderer/components/markdown-viewer/MarkdownViewer.tsx` | 复制按钮、语言 badge、accent 竖线 |
| `src/renderer/components/thread/BlockList.tsx` | `spacingBefore()` 间距函数、prevKind 传递 |
| `src/renderer/app/routes/LiveSessionPage.tsx` | 容器 gap 移除、滚动按钮 |
| `src/renderer/components/sidebar/Sidebar.tsx` | accent 指示器、分组分隔线 |
| `src/renderer/components/thread/WorkflowStarters.tsx` | logo、渐变背景、hover 竖线、快捷键提示 |
| `src/renderer/components/thread/Composer.tsx` | scale 动效、tooltip、分隔线、shell 标签 |

## 验证状态

- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [ ] 视觉检查：代码块复制按钮 + accent 竖线
- [ ] 视觉检查：区块间距节奏自然
- [ ] 视觉检查：侧边栏 accent 指示器
- [ ] 视觉检查：滚动到底部按钮
- [ ] 视觉检查：空状态 logo + 渐变
- [ ] 视觉检查：Composer 工具栏细节
