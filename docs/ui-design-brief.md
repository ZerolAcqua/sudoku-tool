# UI 设计稿梳理

> 目的：在动手做概念稿之前，先对齐**功能模块现状**、**已有视觉规范**与**需要设计的页面清单**。
> 本文只描述当前代码的真实状态，作为概念稿的输入，不改动任何实现。

## 一、现状总览

### 路由与导航

| 路由 | 页面文件 | 导航名 | 实际状态 |
| --- | --- | --- | --- |
| `/` | `src/pages/HomePage.vue` | 首页 | 完整（Hero + 4 功能卡） |
| `/practice` | `src/pages/PracticePage.vue` | 唯余练习 | 完整（三种模式 + 结算弹窗） |
| `/draw` | `src/pages/DrawPage.vue` | 绘图工具 | 完整（四种绘图模式 + 链面板） |
| `/solver` | `src/pages/SolverPage.vue` | 数独识别 | 完整（上传 → 裁剪 → 识别 → 修正 → 导出） |
| `/tutorial` | `src/pages/TutorialPage.vue` | 数独教程 | **空壳**（仅「功能开发中...」） |
| `/demo` | `src/pages/DemoPage.vue` | 功能测试 | 开发沙箱，四 Tab 组件预览 **非产品页面** |

无 404 路由、无路由级 loading 态、无权限页。

### 三个功能模块的真实能力边界

**1. 唯余练习（`/practice`）**

- 题型：随机 / 行 / 列 / 宫 / 一般唯余（`unitMode`）
- 模式：自由（不限时）/ 限时（5 分钟，`timedDuration = 300`）/ 冲刺（100 题，`sprintTarget = 100`）
- 交互：盘面高亮目标格 + 同行/列/宫关联格；数字键盘（3×3，7-9 在上）；键盘 1–9 作答、R 重开
- 反馈：**非阻塞**——答完立即出下一题，上一题正误用一条横条提示
- 数据：Pinia `usePracticeStore`，实时统计正确率 / 均时 / 分类正确率
- 结算：限时与冲刺结束弹窗，支持「复制数据」（输出 `正确COR[n]错误INC[n]…` 紧凑串）

**2. 绘图工具（`/draw`）**

- 盘面是**固定示例**（写死在页面里），工具只负责标注，**不能编辑数字**
- 绘图模式：高亮 / 标记 / 摒除线 / 链
- 颜色：8 色板（红粉紫蓝青绿橙棕，`DRAWING_COLORS`）
- 标记类型：圆圈 / 叉号 / 圆点 / 星号（+ 由摒除线生成的 `line`）
- 链：候选数级节点，支持实线/虚线/点线、箭头、直线/曲线、线宽 1.5–4、逐段异色（`segmentColors`）、显隐、节点级删除
- 导出：整个 SVG 盘面序列化为 900×900 SVG 下载（**无 PNG、无透明背景选项、无自定义尺寸**）
- 无撤销/重做、无保存/载入工程文件、无分享链接

**3. 数独识别（`/solver`）**

- 三态流转：上传 → 裁剪 → 识别结果
- 输入：点击选择 / 拖拽 / `Ctrl+V` 粘贴截图
- 裁剪：`vue-advanced-cropper`，锁定 1:1；近正方形图自动铺满
- 识别：OpenCV 网格检测 + 自训练 CNN 数字识别（`src/utils/ocr/`）
- 修正：点选格子 + 键盘输入，修正位显示为蓝色（`user-num`）
- 导出：81 位文本，复制 / 下载 `.txt`
- 限制：只支持笔直网格截图，不支持纸质拍照；无识别置信度可视化、无「重新识别」

**4. 教程（`/tutorial`）** — 产品定位「千题千解文档化，详细图文题解」，零实现。

### 组件层

- `SudokuBoard` 是**配置化 SVG 组件**（非 canvas），单一组件承担四种 mode：`display` / `interactive` / `practice` / `candidate`，由 props 完全驱动
- 绘图层：`SudokuHighlight` / `SudokuMarkers` / `SudokuChains` / `SudokuCandidateHighlights`
- `ChainPanel`：纯 props + emit，不自持业务状态（仅自持展开态）
- 逻辑复用：`useDrawingState`（工厂，每页独立一份）、`useOCR`、`usePracticeStore`
- **无全局布局组件**（无 footer、无面包屑、无侧边导航），`App.vue` 仅 `v-app` + `AppNav` + `RouterView`

## 二、已有视觉规范（概念稿必须遵守）

### 设计 token 单一来源

`src/style.css` 的 `:root` 是颜色唯一来源，`tailwind.config.js` 只做 `accent` / `given-num` / `user-num` / `cand` 四个别名映射，Vuetify 主题也从此计算值读取。

当前是一套 **Material 3 light scheme**（种子色 = 品牌蓝 `#2563eb`）：

| 角色 | 值 | 用途 |
| --- | --- | --- |
| `primary` / `accent` | `#2563eb` | 品牌色、主按钮、选中态 |
| `primary-darken-1` / `accent-dark` | `#1d4ed8` | 主按钮 hover |
| `primary-container` | `#dbe1ff` | 浅蓝容器底 |
| `background` | `#f2f3f8` | 页面底 |
| `surface` | `#ffffff` | 卡片 |
| `surface-light` | `#f7f8fc` | 次级面 |
| `surface-variant` | `#e2e2ec` | 代码块 / chip |
| `on-surface` | `#1a1b20` | 主文字 |
| `on-surface-variant` | `#45464f` | 次文字 |
| `outline` / `outline-variant` | `#767680` / `#c6c6d0` | 描边 |
| `error` / `success` / `info` / `warning` | `#ba1a1a` / `#146c2e` / `#00639b` / `#8a5100` | 语义色（含 `-container` 变体） |

盘面专用：`given-num` `#000000`、`user-num` `#0066cc`、`cand` `#1b1b1b`。

### 硬性约束

- **UI 界面坚持 gray 灰色系 + accent**；高饱和色只允许出现在盘面绘制（数据驱动 `color` 字段）与既定语义按钮
- **禁止内联 `style`**，唯一例外是盘面 SVG 绘制属性与数据驱动的颜色 swatch
- 禁止在组件里重新声明 hex 或 `--color-*`，一律走 token
- 全部 TailwindCSS 工具类，优先复用语义类：`.page-container` `.page-title` `.section-title` `.card` `.stat-card` `.stat-label` `.stat-value` `.btn` `.btn-primary` `.btn-success` `.btn-danger` `.form-select`
- 字体：UI = **Roboto**（latin 子集，中文回退系统字体）；**盘面 = Noto Serif**，钉在 SVG 根节点上不受 UI 字体影响

### ⚠️ 正在进行的迁移（概念稿必须先决策）

`git status` 显示 Vuetify 迁移**半途**：`main.ts` / `App.vue` / `style.css` / `SudokuBoard.vue` / `SolverPage.vue` 已改，`src/plugins/` 未入库。

结果是**两套视觉语言并存**：

- `SolverPage` 用 Vuetify（`v-card` `v-btn` `v-chip` `v-alert` `v-snackbar`），M3 圆角与 tonal 变体，文字排版类用 `text-h6` / `text-body-2` / `text-medium-emphasis`
- `HomePage` / `PracticePage` / `DrawPage` / `AppNav` 用 Tailwind 语义类，`shadow rounded-lg`、`text-gray-*`

概念稿需要先定一个方向，否则会产出与代码对不上的稿子：

1. **迁移到 Vuetify 设计系统**（M3 组件 + 语义 token，Tailwind 只留布局）——与 `SolverPage` 一致
2. **停留在 Tailwind 语义类**，Vuetify 只作为局部富组件借用
3. **混合**：Vuetify 管「表单/弹层/反馈」原子组件，Tailwind 管「页面骨架与卡片」

同时存在的不一致，值得在概念稿里一并定标准：

- `SudokuBoard` 内仍有 **6 处硬编码颜色 hex**（`#E8F4F8` / `#D6ECFF` / `#BBDEFB` / `#ffffff` / `black`），未走 token——虽然属于「盘面绘制」豁免范围，但语义色建议收敛
- 品牌名在 `AppNav` 与 `HomePage` 都是「丘卡的数独小站」，`package.json` 名为 `acqua-sudoku`，站点是否有域名/简称未定
- 练习页进度条用 `PCT_STEPS` 写死 21 档 Tailwind 宽度类，是规避动态类名的权宜方案

### 页面骨架约定

- 内容容器：`max-w-7xl mx-auto`，左右 `px-4 sm:px-6 lg:px-8`，上下 `py-8`
- 顶栏：`h-16` 白底 + 下边框，当前项用 `border-accent` 下划线
- 响应式断点：`sm` 640 决定顶栏折叠，`lg` 1024 决定主区两栏切分（练习页 `lg:grid-cols-[minmax(0,1fr)_360px]`，绘图页 `…_20rem]`），`xl` 1280 用于识别结果双栏

## 三、需要设计的页面清单

按优先级排序。优先级 = 未实现程度 × 用户可见度。

### P0 — 阻塞性问题 + 全局骨架

| # | 设计对象 | 为什么需要 |
| --- | --- | --- |
| 1 | **全局导航（含移动端）** | 存在**实打实的 bug**：`AppNav` 有 `mobileMenuOpen` 状态与 `sm:hidden` 菜单块，但**没有任何汉堡按钮去切换它**。视口 < 640px 时导航链接完全消失且无法打开——移动端等于没有导航。同时顶栏需要容纳 6 个入口（含「功能测试」），在窄屏已偏挤 |
| 2 | 页面骨架 / Footer / 404 | 无全局 footer、无 404 路由。首页以下所有页面直接「悬浮」在背景上 |
| 3 | 教程页（`/tutorial`） | 零实现，却是首页承诺的四大功能之一（「千题千解文档化，详细图文题解」）。这是**唯一需要从信息架构开始设计的页面**，工作量最大 |

### P1 — 已有实现的视觉统一

| # | 设计对象 | 关键设计问题 |
| --- | --- | --- |
| 4 | 首页 | Hero 与功能卡是纯文字卡、无图标无配图；`lg:grid-cols-4` 在 `sm` 到 `lg` 之间是 2 列、卡片高矮不齐；4 张功能卡与导航 6 项口径不一致（缺教程外的「功能测试」）；hover 只有 `shadow-lg` |
| 5 | 练习页 | 控制条元素密度全站最高（题型 5 项 + 模式 3 项 + 会话状态 + 重开挤在一行），窄屏换行策略需要明确；侧栏「统计」与「数字键盘」用 `order-1/2` 反转，需确认小屏顺序；结算弹窗是独立视觉单元 |
| 6 | 绘图工具页 | 全站最复杂的操作面板：工具条 4 个模式 + 条件出现的标记类型/链样式/颜色/候选数开关（**模式切换会改变工具条高度，盘面会跳动**）；右栏 `20rem` 链视图面板条目有 2 级展开态；`lg` 以下链面板掉到盘面下方，绘图时无法同时看链列表 |
| 7 | 数独识别页 | 三态各是一套布局；结果页「原图 vs 识别盘面」对比需要视觉对齐（现已按网格边界裁切对齐）；修正区左键盘右导出；需设计**识别失败 / 低置信度**的空态与错误态 |

### P2 — 待补齐的状态与页面

| # | 设计对象 | 说明 |
| --- | --- | --- |
| 8 | 加载 / 骨架屏 | 识别是重计算（OpenCV + TF.js），当前只有按钮 `loading` 与一行文字；首次加载 `OCRDemo` 等懒加载 chunk（约 16MB）无任何过渡 |
| 9 | 空态 / 错误态体系 | 练习页「本次练习已结束」、绘图页「暂无链」、识别页错误 `v-alert` 目前三套写法，建议统一成一套空态规范 |
| 10 | 移动端专项 | 练习页键盘（`h-14` 3×3）在手机上会占掉半屏；绘图页在触屏上的候选数点选精度（候选数热区半径 20 SVG 单位）需要复核 |
| 11 | Demo 页（`/demo`） | 开发沙箱，建议从导航隐藏或降级，不必投入设计资源 |

### 建议复用的「设计组件」清单

概念稿建议直接以组件为单位出图，便于与代码一一对应：

- `AppNav` — 桌面 / 移动两种形态
- `SudokuBoard` — 4 种 mode × 尺寸（300 / 450 / 600）
- `ChainPanel` — 空态 / 草稿态 / 折叠条目 / 展开条目
- 练习页：控制条、会话状态（计时 / 进度 / 计数三态）、统计卡、数字键盘、结算弹窗
- 绘图页：工具条（4 模式各一版）、色板
- 识别页：上传拖拽区、裁剪器外壳、三态指示
- 通用：按钮 4 变体（`.btn` / `.btn-primary` / `.btn-success` / `.btn-danger`）、卡片、统计块、表单控件、chip / badge、alert、空态、弹窗

## 四、概念稿建议的交付范围

如果第一批只做很少的图，建议按这个顺序：

1. **全局导航（桌面 + 移动）** — 顺带修掉移动端无导航的 bug，投入产出比最高
2. **练习页** — 功能最完整、日常使用频率最高，是站点的「主界面」
3. **绘图工具页** — 交互最复杂，最需要先想清楚再动手
4. **首页** — 已有实现可用，属于打磨而非重构
5. **识别页三态** — 视觉基本达标，补齐错误/加载态即可
6. **教程页** — 单独立项，先做信息架构（题解列表 → 题目详情 → 图文步骤）而非视觉

概念稿落地时的检查项：颜色只引用上文 token 表；不出现内联样式；界面色不越出 gray + accent；盘面数字沿用 Noto Serif；断点按 640 / 1024 / 1280 三档出图。
