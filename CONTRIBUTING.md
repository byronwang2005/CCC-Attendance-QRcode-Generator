# Contributing

感谢你愿意为 `CCC-Attendance` 做贡献。

在提交代码前，请先确认你的修改符合项目当前目标：保持页面简单、直接、可用，不引入和现有交互风格冲突的复杂效果。

## Before You Start

- 请先阅读 [README.md](/Users/macbook/git/CCC-Attendance/README.md) 了解项目背景与使用方式。
- 本项目是一个前端为主的 Cloudflare Pages 应用。
- 主要页面位于 `public/`，接口函数位于 `functions/`。

## Local Setup

1. 安装依赖：

```bash
npm install
```

2. 启动本地开发环境：

```bash
npm run dev
```

3. 运行 lint：

```bash
npm run lint
```

## Project Structure

- `public/index.html`: 单页入口，通过 `?step=` 切换向导步骤
- `public/styles.css`: 全局样式
- `public/app/`: 前端应用代码
- `functions/api/`: 服务端函数入口
- `functions/lib/`: 服务端内部常量
- `shared/`: 前后端共用规则
- `scripts/dev/`: 本地开发辅助脚本

## Code Style

- 保持实现直接，不要引入无必要的视觉特效或复杂动画。
- 优先沿用现有命名和文件组织方式。
- 修改 UI 时，请同时检查 3 个步骤状态的视觉一致性。
- 不要顺手重构无关文件，除非该问题会直接影响当前改动。

## Commit Style

请沿用当前仓库的 commit 风格：

- `feat: ...`
- `fix: ...`
- `chore: ...`
- `refactor: ...`

示例：

- `feat: enhance frontend`
- `fix: revise the logo size`
- `chore: remove cursor glow effect`
- `refactor: simplify the code structure`


## Pull Requests

- PR 标题建议与最终 commit 语义一致。
- 描述中请写清楚：
  - 改了什么
  - 为什么要改
  - 是否影响 UI、二维码生成或时间选择流程
- 如果改动涉及界面，请附截图或录屏。

## Validation

提交前至少完成以下检查：

- 页面可正常打开
- 主流程可从步骤 1 走到步骤 3
- `npm run lint` 已执行
