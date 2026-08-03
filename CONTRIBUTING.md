# Contributing

感谢你愿意为 `CCC-Attendance` 做贡献。

在提交代码前，请先确认你的修改符合项目当前目标：保持页面简单、直接、可用，不引入和现有交互风格冲突的复杂效果。

## Before You Start

- 请先阅读 [README.md](/Users/macbook/git/CCC-Attendance/README.md) 了解项目背景与使用方式。
- 本项目是一个前端为主的 Cloudflare Pages 应用。
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

3. 运行 lint：

```bash
npm run lint
```

## Project Structure

当前项目按运行环境和职责分层：

```text
.
├── src/                    # React + TypeScript 前端应用
│   ├── App.tsx             # 三步向导、状态和页面组件
│   ├── config.ts           # 路径、文案和限制值
│   ├── features/           # 独立功能模块
│   ├── lib/                # 状态、校验和格式化逻辑
│   └── styles.css          # 应用视觉系统
├── public/                 # 构建时原样复制的静态资源
│   ├── _headers            # Pages 响应头配置
│   ├── agent.md            # 给 AI 代理使用的公开说明
│   └── assets/             # 图片、图标、字体等静态资源
├── functions/              # Cloudflare Pages Functions
│   ├── api/                # HTTP API 和 SVG 统计接口入口
│   └── lib/                # 服务端内部常量和统计工具
├── shared/                 # 前后端共用规则
├── migrations/             # Cloudflare D1 数据库迁移
├── index.html              # Vite 入口与 SEO 内容
├── package.json            # npm 脚本和依赖
├── vite.config.ts          # 构建和测试配置
├── eslint.config.js        # ESLint 配置
└── wrangler.toml           # Cloudflare Pages/Workers 配置
```

新增文件请优先放在现有职责边界内：

- 新的页面步骤与组件逻辑放到 `src/` 对应功能目录。
- 新的前端共用工具放到 `src/lib/`，不要放进具体步骤模块。
- 新的路径、文案、限制值和配置常量放到 `src/config.ts`。
- 新的静态资源放到 `public/assets/` 下对应类型目录。
- 新的 API 入口放到 `functions/api/`，只被服务端复用的逻辑放到 `functions/lib/`。
- 前后端都要复用的纯规则放到 `shared/`。
- 数据库结构调整必须新增 `migrations/` 文件，不要直接改旧迁移。
- 本地开发专用脚本放到 `scripts/dev/`。

## Code Style

- 保持实现直接，不要引入无必要的视觉特效或复杂动画。
- 优先沿用现有命名和文件组织方式。
- 修改 UI 时，请同时检查 3 个步骤状态的视觉一致性。
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
- 主流程可从步骤 1 走到步骤 3
- `npm run lint` 已执行
