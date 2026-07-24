# AGENTS.md

## 命令

- 安装依赖: `npm install`
- 开发服务器: `npm run dev`
- 生产构建: `npm run build`
- 预览构建: `npm run preview`
- 类型检查: `npm run type-check`
- 代码格式化: `npm run format:ts`
- ML — 生成合成数据: `npm run generate:synthetic`
- ML — 训练数字识别模型: `npm run train:digit`

## 代码风格

- TypeScript + Vue 3 Composition API
- 单引号 (`'`)，语句末尾加分号
- 使用 Prettier 格式化: `npm run format:ts`
- 路径别名 `@` → `src/`
- 样式使用 TailwindCSS（gray 灰色系）；避免高饱和度色彩
- 页面组件使用懒加载 (`() => import(...)`)
- 业务逻辑放 `composables/`，状态放 `stores/` (Pinia)
- SudokuBoard 采用配置化 props + 插槽混合架构

## 测试

- 测试框架: 暂无
- 运行命令: 暂无

## 边界规则

### 始终遵循

- 使用 TailwindCSS 工具类编写样式；坚持 gray 灰色系
- 使用 `@` 路径别名导入 `src/` 下的文件
- 页面组件保持懒加载 (`() => import(...)`)
- 将可复用业务逻辑放在 `composables/`，状态放在 `stores/`
- ML 脚本独立于 Vite 前端构建（通过 `tsx` 运行）

### 先询问
- 添加新的 npm 依赖
- 修改配色方案或设计 token 值
- 修改路由结构或新增页面
- 修改 Vite / TypeScript / Tailwind 配置

### 绝对禁止
- 使用高饱和度色彩（红、黄、绿、紫等）
- 使用内联样式；始终使用 Tailwind 工具类
- 提交 `node_modules/` 或构建产物
- 未经明确要求生成 README.md 或文档文件

