# Contributing

感谢你愿意为 `CCC-Attendance` 做贡献。

## Before You Start

- 使用 Node.js 22 或更高版本。

## Local Setup

按锁文件安装依赖：

```bash
npm ci
```

仅调试前端 UI 时使用 Vite：

```bash
npm run dev
```

需要调试 Cloudflare Functions 或完整主流程时，使用本地 D1 和 Pages 预览：

```bash
npm run build
npx wrangler d1 migrations apply QR_STATS_DB --local
npm run preview
```

不要对贡献测试使用 `--remote` 或直接运行 `npm run deploy`。

## Project Structure

- `src/`：React 前端、状态和交互。
- `functions/`：Cloudflare Pages Functions 和服务端工具。
- `public/`：静态资源和公开知识文件。
- `assets-src/`：仅供资源生成脚本使用、不随站点发布的源素材。
- `migrations/`：D1 迁移；数据库变更必须新增迁移，不得修改已有迁移。
- `scripts/`：测试和资源生成脚本。

## Contribution Rules

- 新功能优先复用可靠的 GitHub/npm 项目，同时检查许可证、维护状态和安全性。
- 沿用现有命名和目录边界，不要顺手重构无关文件。
- UI 改动需要检查 3 个步骤、移动端、性能、无障碍和 `prefers-reduced-motion`。
- 带有 `Generated` 标记或由 `scripts/` 输出的文件不得手动编辑；应修改源文件并重新运行对应脚本。

## Commit Style (Use English)

- `feat: ...`：新功能。
- `fix: ...`：缺陷修复。
- `refactor: ...`：不改变行为的重构。
- `chore: ...`：文档、测试、依赖、资源和工具链调整。

## Pull Requests

- PR 标题与最终 Commit message 保持同一语义。
- 说明改了什么、为什么修改，以及对 UI、API、二维码、时间或数据库的影响。
- UI改动需要附上截图或录屏。

## Validation

提交前运行：

```bash
npm test
npm run lint
npm run build
```
