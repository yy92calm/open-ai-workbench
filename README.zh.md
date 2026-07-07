# Workbench

**配置驱动的 OpenCode 桌面外壳。** 把一份完整的 `.opencode/` 配置放进
`app-config/`,运行 `tauri build`,就能得到针对该配置的专用桌面应用——
provider、模型、skills、agents、命令、MCP、权限全部由打包时的配置决定,
运行时不可配置。

基于 [Tauri 2](https://tauri.app) + React + TypeScript 构建,以
[OpenCode](https://opencode.ai) 作为内置的 agent 运行时(单二进制 sidecar,
由 app 固定版本并管理)。

## 它是什么

一个围绕 OpenCode agent 运行时的可复用桌面外壳。app 本身不提供
模型/provider/skill 配置界面——一切来自打包者的 `.opencode/` 配置。终端
用户得到一个聚焦、锁定的应用;打包者决定它能做什么。

- **配置驱动** — `app-config/.opencode/` 作为 Tauri resource 打包,每次
  sidecar 启动时部署到 app 私有的 OpenCode 配置目录。
- **本地优先** — 工作区文件、代码执行、会话历史、provenance 都留在本地;
  只有对话轮次发往模型 provider。
- **可复现工件** — 每次 agent 写入追加一条版本记录到
  `.workbench/provenance.jsonl`,含代码、环境、来源会话。
- **默认手动审批** — 危险 shell 命令(删除、安装、远程、提权)运行前需
  审批。审批模式由打包配置固定,UI 不可切到 "full"。
- **本地 Python/R kernel + Jupyter** — 每个 notebook 独立的持久 kernel;
  agent 在工作区执行代码。

## 打包一个专用应用

1. 把你的 OpenCode 配置放进 `app-config/.opencode/`——`opencode.json`
   (provider、model、permission)、`skills/`、`agents/`、`commands/`。详见
   [`app-config/.opencode/README.md`](./app-config/.opencode/README.md)。
2. 拉取固定的 sidecar(不进 git):

   ```bash
   pnpm install
   bash scripts/dev/fetch-opencode.sh   # OpenCode agent 运行时
   bash scripts/dev/fetch-uv.sh         # uv,用于隔离的 Python/Jupyter 环境
   ```

3. 构建安装包:

   ```bash
   pnpm --filter @workbench/desktop tauri build
   ```

产出的 `.dmg` / `.exe` / `.msi` / `.deb` / `.rpm` 就是针对你 `.opencode`
配置的专用桌面应用。

## 改品牌

默认名是占位符 **Workbench**(`com.workbench.app`)。要换成你的产品品牌,
改 `apps/desktop/src-tauri/tauri.conf.json` 的 `productName` / `identifier` /
窗口 `title`、`apps/desktop/src-tauri/icons/` 的图标、
`apps/desktop/src/components/sidebar/Sidebar.tsx` 的侧栏标签、以及
`apps/desktop/index.html` 的 `<title>`。

## 仓库结构

| 路径 | 用途 |
| --- | --- |
| `app-config/.opencode/` | app 打包并部署的 OpenCode 配置 |
| `apps/desktop/` | Tauri 2 + React 外壳(`src/` 前端,`src-tauri/` Rust) |
| `packages/sdk/` | `OpenCodeClient` SDK 封装(把 UI 与运行时隔离) |
| `packages/shared/` | 共享领域类型 + 图表设计系统 |
| `runtime/kernel/` | Python 与 R kernel 桥 |
| `scripts/dev/` | sidecar 拉取脚本(opencode、uv) |
| `.github/workflows/build.yml` | CI:`v*` tag 时构建 mac/Windows/Linux 安装包 |

## 安全默认

- agent 只能访问当前工作区。
- 命令执行、文件删除、依赖安装、远程连接需审批(默认手动审批模式——永不
  ship `full`)。
- provider key 存在 app 私有配置目录(owner-only);永不进 provenance、日志、
  崩溃报告、git 或导出项目。

## 许可证

[MIT](./LICENSE)。内置的第三方 skill 和连接器各有自己的许可。

> 这是 beta 工具。依赖其输出前请自行验证。
