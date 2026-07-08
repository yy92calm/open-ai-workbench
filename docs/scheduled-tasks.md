# 定时任务功能方案

## 概述

在 Workbench 桌面应用中增加定时任务功能，支持用户配置定时 Agent 提示词，到时自动执行并记录结果。

## 核心流程

```
用户创建任务 → 定时器触发 → 自动发送 prompt 给 Agent → Agent 执行 → 结果保存到会话历史
```

## 数据模型

```typescript
interface ScheduledTask {
  id: string;            // uuid
  name: string;          // 任务名称
  prompt: string;        // Agent 提示词
  cron: string;          // cron 表达式，如 "0 9 * * 1-5"（工作日早9点）
  enabled: boolean;      // 启用/停用
  createdAt: number;     // 创建时间戳
  lastRunAt?: number;    // 上次执行时间
  lastSessionId?: string;// 上次执行的会话 ID
}
```

存储位置：`~/Library/Application Support/com.workbench.app/tasks.json`

## 架构

```
┌─────────────────────────────────────────────────┐
│  Renderer（UI）                                   │
│  TasksPage.tsx                                   │
│  - 任务列表（名称、cron、状态、上次执行）           │
│  - 新建/编辑弹窗                                  │
│  - 手动触发按钮                                   │
│  - 查看历史会话入口                               │
└──────────────────┬──────────────────────────────┘
                   │ IPC
┌──────────────────▼──────────────────────────────┐
│  Main Process（调度引擎）                         │
│  scheduler.ts                                    │
│  - 加载/持久化 tasks.json                         │
│  - node-cron 解析 cron 表达式                     │
│  - 到时间 → 通过 OpenCode HTTP API 发送 prompt     │
│  - 记录执行结果到会话                             │
└─────────────────────────────────────────────────┘
```

## 执行方式

通过 OpenCode HTTP API 创建新会话并发送 prompt：

```
POST /api/session          → 创建新会话，获取 sessionId
POST /api/session/{id}/prompt  → 发送 prompt
```

会话自动以 `[Task] 任务名称 - 日期` 命名，出现在侧边栏历史中。

## UI 设计

TasksPage 页面结构：

```
┌─ Scheduled Tasks ──────────────────────────────────┐
│  "定时 Agent 任务，自动执行并记录"                    │
│                                          [+ New Task] │
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ ● 早盘简报   0 9 * * 1-5  Enabled  Last: 07-08 08:02││
│  │   汇总隔夜美股、A股开盘前重要资讯                    ││
│  ├─────────────────────────────────────────────────┤│
│  │ ○ 收盘总结   0 15 * * 1-5  Disabled  --         ││
│  │   当日市场复盘、持仓分析                           ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

编辑弹窗：名称、cron 表达式、prompt 文本框、启停开关。

## 依赖

- `node-cron`：cron 解析和调度
- 现有 `OpenCodeClient`：发送 prompt

## 安全约束

- 任务在 Agent 执行前需要用户确认（可配置是否跳过）
- 任务执行失败时有 toast 通知
- 任务并发限制：同一时间最多 1 个任务在执行

## 实现步骤

| 步骤 | 内容 | 文件 |
|------|------|------|
| 1 | 安装 node-cron | package.json |
| 2 | 创建 scheduler.ts（main process） | src/main/scheduler.ts |
| 3 | 注册 IPC handlers | src/main/ipc.ts |
| 4 | 注册 preload API | src/preload/index.ts |
| 5 | 更新类型声明 | electron.d.ts |
| 6 | 实现 TasksPage UI | src/renderer/app/routes/TasksPage.tsx |
| 7 | 调度器启动/停止 | src/main/index.ts |
| 8 | i18n 翻译 | lib/i18n.tsx |

## 预估工时

约 2-3 小时。