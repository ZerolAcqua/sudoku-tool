# AGENTS.md

数独学习工具站：Vue 3 + TypeScript + TailwindCSS + Pinia。含数独生成/练习、SVG 绘图导出、图片 OCR 识别（自训练 CNN 模型）。

## 命令

完整脚本见 `package.json`，这里只标出非显而易见/易错的：

- 开发 / 构建 / 预览：`npm run dev` / `build` / `preview`（`build` = type-check + vite build）
- 类型检查：`npm run type-check`（vue-tsc）
- OCR 测试：`npm run test:ocr`（唯一测试入口）
- ML 训练 / 部署：`npm run train:digit` / `deploy:model`
- 生成合成训练数据：`npx tsx --import ./ml/polyfill-util.ts ml/generate-synthetic-data.ts`（无 npm script）

需要 Node 侧 canvas 的 ML/测试脚本（训练、生成数据、OCR 测试）要带 `--import ./ml/polyfill-util.ts` 前缀。

## 架构

- `src/pages/` 路由页；`src/pages/demo/` Demo 子组件（`OCRDemo` 体积约 16MB，必须用 `defineAsyncComponent` 懒加载，勿同步引入）
- `src/components/` 通用组件。`SudokuBoard` 是**配置化 SVG 组件**（非 canvas），完全由 props 驱动；`SudokuHighlight/Markers/Chains/CandidateHighlights` 是它的各绘图层；`ChainPanel` 是绘图页右侧的链视图面板（纯 props + emit，不直接改状态）
- `src/composables/` 可复用逻辑（`useDrawingState` = 绘图页的高亮/标记/摒除线/链状态与操作，工厂函数，每个绘图页一份）；`src/stores/` Pinia 状态；`src/utils/` 纯工具（`utils/ocr/` 为 OCR 流水线）
- `src/types/sudoku.ts` 数独领域类型（高亮/标记/链的配置结构）
- `ml/` 训练/部署脚本，独立于 Vite 构建；`test/` OCR 测试
- 路由（`src/router/index.ts`）：除首页静态导入外，其余页面 `() => import(...)` 懒加载

## 样式约定（务必遵守）

- 全部用 TailwindCSS 工具类，不写内联 `style`（例外：盘面 SVG 的绘制属性、数据驱动的颜色 swatch）
- **设计 token 单一来源**：`src/style.css` 的 `:root` 定义 `--color-*`；`tailwind.config.js` 只做映射（`accent`/`given-num`/`user-num`/`cand`）。改颜色只改 `:root`，禁止在组件里再声明 hex 或 `--color-*`
- 品牌色 = `accent`（`#2563eb`）；UI 界面（背景/卡片/导航/文字）坚持 gray 灰色系 + accent
- **语义工具类**：`src/style.css` 的 `@layer components` 定义了 `.page-container`/`.page-title`/`.section-title`/`.card`/`.stat-card`/`.stat-label`/`.stat-value`/`.btn`/`.btn-primary`/`.btn-success`/`.btn-danger`/`.form-select`。优先复用，不要重新堆同样的类组合
- 盘面绘制颜色（高亮/标记/链）是**数据驱动**的（props 的 `color` 字段），允许高饱和色；`.btn-success`/`.btn-danger` 是既定语义按钮。这些不违反「UI 用灰色系」

## 代码风格

- TypeScript + Vue 3 Composition API（`<script setup>`）
- 单引号 + 语句末尾分号；路径别名 `@` → `src/`
- `npm run format:ts` 只格式化 `.ts`（**不含 `.vue`**），`.vue` 需手动保持风格一致
- 日志统一走 `src/utils/logger.ts`（生产构建会移除 debug/info）

## 边界规则

### 先询问
- 新增 npm 依赖
- 修改配色 / 设计 token 值
- 修改路由结构或新增页面
- 修改 Vite / TypeScript / Tailwind / PostCSS 配置

### 绝对禁止
- 内联 `style`（盘面 SVG 绘制属性、数据色除外）
- 在组件里重新声明颜色 hex / `--color-*`（应走 token）
- 提交 `node_modules/` 或 `dist/`
- 未经明确要求生成 README / 文档文件
