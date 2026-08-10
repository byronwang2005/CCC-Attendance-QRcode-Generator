# Contributing

感谢你愿意为 `CCC-Attendance` 做贡献。

在提交代码前，请先确认你的修改符合项目当前目标：保持页面简单、直接、可用，不引入和现有交互风格冲突的复杂效果。

## Before You Start

- 本项目是一个前端为主的Cloudflare Pages应用。
- React 应用位于 `src/`，静态资源位于 `public/`，接口函数位于 `functions/`。

## Local Setup

1. 安装依赖：

```bash
npm install
```

2. 启动本地开发环境：

```bash
npm run dev
```

3. 运行lint：

```bash
npm run lint
```

## Code Style

- 保持实现直接，不要引入无必要的视觉特效或复杂动画。
- 优先沿用现有命名和文件组织方式。
- 修改UI时，请同时检查3个步骤状态的视觉一致性。
- 不要顺手重构无关文件，除非该问题会直接影响当前改动。

## Commit Style (Use English)

- `feat: ...`
- `fix: ...`
- `chore: ...`
- `refactor: ...`

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
- 主流程可从步骤1走到步骤3
- `npm run lint` 已执行
