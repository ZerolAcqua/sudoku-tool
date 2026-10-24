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
- `src/components/` 通用组件。`SudokuBoard` 是**配置化 SVG 组件**（非 canvas），完全由 props 驱动；`SudokuHighlight/Markers/Chains/CandidateHighlights` 是它的各绘图层；`ChainPanel` 是绘图页的链视图面板（纯 props + emit，不直接改状态）；`PageHeader` 是功能页统一页头；`NumberPad` 是九宫数字键盘；`SegmentedControl` 是全站单选切换（封装 ToggleGroup，保证不会被点成无选中）；`ColorSwatches` 是绘图色板；`FlickInput` 是练习页盘面上的手势输入层（点按 = 5，八方向滑动 = 九宫键盘同方位数字）
- `src/components/ui/` 是 shadcn-vue 组件（reka-ui）。用 `npx shadcn-vue@latest add <name>` 添加；CLI 会把 `cn` 误当成 npm 包安装并生成 `from "cn"`，需卸掉该包并改回 `@/lib/utils`
- `src/composables/` 可复用逻辑（`useDrawingState` = 绘图页的高亮/标记/摒除线/链状态、操作与撤销栈，工厂函数，每个绘图页一份；`useBoardSize` = 盘面尺寸跟随容器，`fitHeight` / `reserveWidth` 用于一屏布局）；`src/stores/` Pinia 状态；`src/utils/` 纯工具（`utils/ocr/` 为 OCR 流水线，`exportBoard` 为盘面导出，`puzzleText` 为 81 位文本互转）
- `src/constants/features.ts` 功能入口单一来源（首页功能卡与各页 `PageHeader` 的标题、图标）
- 轻提示统一用 `vue-sonner` 的 `toast()`（`App.vue` 已挂 `<Toaster />`），不要再手写浮层
- `src/types/sudoku.ts` 数独领域类型（高亮/标记/链的配置结构）
- `ml/` 训练/部署脚本，独立于 Vite 构建；`test/` OCR 测试
- 路由（`src/router/index.ts`）：除首页静态导入外，其余页面 `() => import(...)` 懒加载

## 样式约定（务必遵守）

- 全部用 TailwindCSS 工具类，不写内联 `style`（例外：盘面 SVG 的绘制属性、数据驱动的颜色 swatch）
- **设计 token 单一来源**：`src/style.css` 的 `:root` 定义 `--color-*`（Material 3 颜色角色）；同文件的 `@theme inline` 只做映射，生成 `bg-primary`/`text-muted-foreground` 等工具类（Tailwind v4，无 `tailwind.config.js`）。改颜色只改 `:root`，禁止在组件里再声明 hex 或 `--color-*`
- **命名注意**：主色是**墨色**（`primary` / `brand-*` 都指向它，历史上曾是品牌蓝）；唯一的彩色强调是荧光笔黄 `highlight-*`（`bg-highlight-container`、`text-highlight-strong`…）；`accent` 在 Tailwind 里是 shadcn 语义的浅色 hover 底，**不是**强调色。`background` 是页面纸底，卡片/弹层用 `card`
- 正误语义色用 `success`/`destructive` 及 `success-container`/`error-container`，不要用 `green-*`/`red-*`；盘面交互态（选中/悬停/同行列宫）用 `--color-board-focus/focus-ring/hover/related`（暖黄系），用户填数用 `--color-user-num`（赭色）
- **视觉风格：纸感极简**。暖白纸底（`background`）+ 白页（`card`/盘面）+ 细描边分界，**不用阴影**（弹层除外）；界面字体 Inter，盘面与数字键盘用衬线（`font-board`）
- **不用冷色品牌蓝**：它在暖纸面上显得突兀。主按钮 / 开关 / 焦点环用墨色；链接用墨色 + 下划线；彩色强调只用荧光笔黄（盘面选中格、新纪录、连击），且要克制。选中态一律中性——导航 / 分类用 `bg-muted text-foreground`，单选切换用 `SegmentedControl`（浅灰槽 + 白色滑块）
- **一屏布局**：`App.vue` 外壳 `h-dvh`，只有 `main` 内部可滚动。桌面端（lg）页面应恰好一屏、不出滚动条：页面根加 `lg:min-h-0`（否则会被内容撑高），盘面所在区域用 `lg:min-h-0 lg:flex-1` 吃掉剩余高度，`useBoardSize` 开 `fitHeight` 按宽高较小者定边长；网格行用 `lg:grid-rows-[minmax(0,1fr)]` 防止内容反向撑高；非盘面的方块预览可用容器查询（`[container-type:size]` + `size-[100cqmin]`）。窄屏允许滚动
- **页面结构**：功能页 = `.page-container`（版心 `max-w-5xl`，与导航同宽）内放 `<PageHeader>` + 内容；盘面直接放在纸面上，不套卡片；次级面板（统计、链列表）用无阴影的 `Card`；控制条直接落在纸面上
- 盘面网格线用 `vector-effect="non-scaling-stroke"` 按屏幕像素计宽（格线 1px 浅灰、宫线 / 外框 2px 墨色），颜色走 `--color-board-line(-thin)`
- **语义工具类**：`src/style.css` 的 `@layer components` 保留 `.page-container`/`.section-title`；`.card`/`.btn`/`.btn-primary` 仅剩 Demo 沙箱使用，正式页面用 shadcn 的 `Card`/`Button`
- 盘面绘制颜色（高亮/标记/链）是**数据驱动**的（props 的 `color` 字段），允许高饱和色，不违反「UI 用灰色系」

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
