# Safan ColorPicker 手机版 — 变更日志

> 每次重大需求变更、UI调整、架构变化后更新
> 与执行计划文档分开——计划文档记录"做什么"，changelog 记录"为什么变"

---

## 2026-05-30 晚上 — 第三轮审查，新增 12 个问题（共 32 个）

### 背景

对 `app_mobile_new.js` + `index_mobile.html` + `colors.js` 进行了第三轮独立逐行审查。审查分为三轮独立扫描——第1轮聚焦 JS 逻辑层、第2轮聚焦 HTML/CSS 外观层、第3轮聚焦 colors.js 数据层——每轮从头到尾重新审阅，找到前两轮遗漏的问题。

### 新增问题（Bug 21-32）

| # | 问题 | 严重度 |
|---|------|--------|
| 21 | HTML 中缺少 `id='loading'` / `id='loading-text'` 元素 — 加载进度不可见 | 🔵 小问题 |
| 22 | `closeModal()` 不取消部件 outline 高亮残留 | 🔵 小问题 |
| 23 | `collapseBottomStrip()` opacity=0 无 CSS transition — 视觉突兀 | 🔵 小问题 |
| 24 | `<a>` 链接缺少 `rel='noopener noreferrer'` — 安全最佳实践 | 🔵 小问题 |
| 25 | iOS safe-area 未适配 — Home Indicator 遮挡风险 | 🔵 小问题 |
| 26 | `#color-picker-modal` + `#picker-grid` 死 HTML/死代码 | 🔵 小问题 |
| 27 | `colorGroups` 无防御性检查 — colors.js 加载失败即崩溃 | 🔵 小问题 |
| 28 | `__BATTERY_COLORS` 定义但从未使用 — 死数据 | 🔵 小问题 |
| 29 | `onCanvasPointerUp()` 内部双重 `_pointerMoved` 检查 — 永远为 false 的死代码 | 🔵 小问题 |
| 30 | `saveCurrentProject()` 遍历 mesh 取颜色 — 可用 `part.currentColor` 替代 | 🔵 小问题 |
| 31 | `state.isEditMode` 未在构造器中预初始化 | 🔵 小问题 |
| 32 | `btnSave` 声明缩进 6 个空格（其余代码 4 空格） | 🔵 小问题 |

### 去重说明

审查中发现的部分问题已在前两轮覆盖率中，不重复计数：
- randomizeColors Fan 约束 → 已归入 Bug 4
- closeModal 后 Modal 关闭 → 已归入 Bug 5
- deleteCurrentProject / submitProject 死代码 → 已归入 Bug 14/16

### 更新文件

- `计划A-代码审查修复.md` — 问题清单扩展至 32 行 + 追加完整的三轮审查记录文档

---

## 2026-05-30 晚上 — 第二次代码审查，新增 7 个问题（共 20 个）

### 背景

对 `app_mobile_new.js` 进行了第二轮全面审查，针对第1轮未覆盖的细节逐一分析。新增发现 7 个问题，包括死代码、事件委托漏洞、hex 大小写不统一、数据迁移隐患等。

### 新增问题（Bug 14-20）

| # | 问题 | 严重度 |
|---|------|--------|
| 14 | `deleteCurrentProject()` 与方法死代码 | 🔵 小问题 |
| 15 | `detail-area` 删除按钮事件委托不足 | 🟡 中等 |
| 16 | `submitProject()` 空占位符 | 🔵 小问题 |
| 17 | 保存/加载的 hex 大小写不统一 | 🔵 小问题 |
| 18 | `FAN_COLORS` 格式不统一 | 🔵 小问题 |
| 19 | 全屏点击关闭 Modal 时意外关闭 DetailArea | 🔵 小问题 |
| 20 | localStorage key 名称不一致（"sidan" typo） | 🔵 小问题 |

### 执行策略更新

- **第一批**（高优）：+ Bug 17(hex大小写) + Bug 20(localStorage key)，共 6 个
- **第二批**（并行）：+ Bug 15(删除按钮事件) + Bug 19(Modal/Detail交互)，共 6 个
- **第三批**（后续）：+ Bug 14+16(死代码删除) + Bug 18(并入Bug7)，共 7 个

### 更新文件

- `计划A-代码审查修复.md` — 增加 Bug 14-20 详细分析、diff 和验证方式，更新执行顺序和依赖表
- `计划0-任务总览.md` — 更新问题数量、批次描述

---

## 2026-05-30 晚上 — 代码审查完成，发现 13 个问题

### 背景

项目负责人对 `app_mobile_new.js` + `index_mobile.html` + `colors.js` 进行了全面代码审查（约 65KB 代码），发现 13 个问题，范围从严重 Bug 到代码异味。

### 发现的问题

详见 `计划A-代码审查修复.md` 的详细分析和修改方案。

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 玉石白与白色 hex 完全重复导致颜色查找歧义 | 🔴 严重 |
| 2 | `collapseBottomStrip()` 方法重复定义 | 🟡 中等 |
| 3 | `applyProjectColors()` 并发动画可能卡顿 | 🟡 中等 |
| 4 | `randomizeColors()` Fan 颜色不合法 | 🟡 中等 |
| 5 | 选色后自动关闭 Modal，无法连续选色 | 🟡 中等 |
| 6 | 初始加载方案预览色全灰误导 | 🟡 中等 |
| 7 | Fan 颜色约束仅在加载时存在，选色时无限制 | 🔵 小问题 |
| 8 | `.strip-card-colors` 预览色块 CSS 高度未定义 | 🔵 小问题 |
| 9 | `saveCurrentProject()` 与计划中 `createNewProject()` 功能重叠待废弃 | 🔵 小问题 |
| 10 | `deleteProject()` 后模型颜色残留 | 🟡 中等 |
| 11 | `this.colorGroups` 缺乏防御性检查 | 🔵 小问题 |
| 12 | Three.js 版本过旧（r128，2021年发布） | 🔵 小问题 |
| 13 | `preserveDrawingBuffer: true` 不必要消耗性能 | 🔵 小问题 |

### 执行策略

问题分成三批处理：
- **第一批**（严格优先于第 5/7 步）：4 个 Bug（5, 4, 10, 11）
- **第二批**（与第 5/7 步并行）：4 个 Bug（1, 6, 8, 13）
- **第三批**（其他步骤完成后再处理）：5 个 Bug（2, 3, 7, 9, 12）

### 创建文件

- `计划A-代码审查修复.md` — 13 个 Bug 的详细分析、修改方案、代码 diff 和验证方式

### 更新文件

- `计划0-任务总览.md` — 新增计划 A，更新依赖关系和文档清单

> 每次重大需求变更、UI调整、架构变化后更新
> 与执行计划文档分开——计划文档记录"做什么"，changelog 记录"为什么变"

---

## 2026-05-30 下午 — 计划就绪，代码待执行

### 状态

- `计划3-配色库.md` — ✅ 计划就绪，代码未执行
- `计划8-UI整体化.md` — ✅ 计划就绪，代码未执行
- 代码现状：旧版逻辑，计划要求的新功能尚未实现

### 下一步

执行 `计划3` + `计划8` 的代码改动（两个计划可并行），完成后本地验证再部署。

---

## 2026-05-30 — UI 整体化（第三次大改）

### 背景

配色库交互逻辑重构（焦点方案 + 全屏详情页）完成后，发现 Header 和 Bottom Strip 各自有白色半透明背景，把 3D 画面分割成三段——顶部 Header 白色块、中间 3D 画面、底部 Strip 白色块。视觉上三者完全割裂。

### 需求变更

**原始状态**：
- Header：有白色半透明背景 + 底部边框 → 遮挡 3D 顶部
- Strip：有白色半透明背景 + 顶部边框 → 遮挡 3D 底部
- 三个区域视觉上完全分离

**目标状态**：
- Header：完全透明浮层，logo 文字浮在 3D 上
- Strip：完全透明浮层，卡片和按钮浮在 3D 上
- 3D 画面从屏幕顶部一直延伸到 strip 底部，完整穿透

### UI 布局最终确认

```
[Header: [左侧: logo]        [右侧: brand logo]]  ← 无背景，浮在3D上
[3D Canvas - 全屏占满]                                  ← z-index: 1
[随机配色 按钮]                                         ← 在3D和配色库之间
[Bottom Strip: [+] [卡1] [卡2] ...]                   ← + 固定不滚，卡片横向滑
```

### 功能变化

| 变更 | 旧 | 新 |
|---|---|---|
| Save 按钮 | Header 右侧，文字按钮 | 取消 → 替换为圆形+号图标 |
| 添加方案按钮 | 无 | Strip 最左侧，固定不滚动，圆形+号图标 |
| 随机配色按钮 | Header 右侧 | 3D 画面下方、Strip 上方 |
| Header 背景 | 白色半透明 + 底部边框 | 完全透明，无背景无边框 |
| Strip 背景 | 白色半透明 + 顶部边框 | 完全透明，无背景无边框 |
| Header 左侧 | 文字标题 | 图形 logo |
| Header 右侧 | Save + Random 按钮 | brand logo |

### 创建文件

- `计划8-UI整体化.md` — 新的 UI 改动汇总计划

### 涉及更新

- `计划0-任务总览.md` — 更新任务列表
- `计划3-配色库.md` — 更新按钮布局描述
- `计划4-保存随机按钮.md` — 标注废弃（Save 按钮取消，随机按钮移位）
- `index_mobile.html` — 样式修改（去掉 header/strip 背景边框）
- `app_mobile_new.js` — 按钮移除和重新绑定

---

## 2026-05-30 — 配色库交互逻辑重构（第二次大改）

### 背景

旧逻辑：`saveCurrentProject()` 保存当前配色 → 覆盖已选方案
新逻辑：`focusedProjectId` 焦点方案 → 所有改色实时同步 → 添加新方案做快照

### 核心变更

- `selectedProjectId` → `focusedProjectId`（全面替换）
- 点击非焦点卡片 → 加载颜色 + 成为焦点
- 点击焦点卡片 → 打开全屏详情页
- 详情区从 `#detail-area`（内嵌展开）→ `#detail-container`（全屏覆盖）
- 保存按钮 → 添加配色方案按钮（`createNewProject()`）
- 新方案默认颜色：当前模型状态（首次为全灰 `#888888`）

### 创建文件

- `计划6-配色库详情.md`（详情页设计）

### 修改文件

- `计划3-配色库.md` — 完全重写交互逻辑部分
- `app_mobile_new.js` — 11 处修改
- `index_mobile.html` — 新增 detail-container DOM

---

## 2026-05-29 — 手机版独立设计决策（第一次大改）

### 背景

PC 版使用 `app_v2.js`，手机版独立使用 `app_mobile_new.js`，两套代码分开维护。

### 决策

- 手机版独立文件：`index_mobile.html` + `app_mobile_new.js`
- 手机版交互全用弹窗（配色库弹窗 + 选色弹窗）
- 3D Canvas 全屏自适应
- 底部浮动操作栏
- 配色数据内联在 `index_mobile.html` 的 `<script>` 中
- 不复用 PC 版的响应式 CSS 重构

### 创建文件

- `app_mobile_new.js`（~754行）
- `index_mobile.html`（~496行）
- `长按编辑态规格.md`

### 涉及文件

- PC 版 `app.js` (~46KB) 不再引用
- PC 版 `index_v2.html` 独立运作

---

## 术语说明

| 缩写 | 说明 |
|---|---|
| Strip / Bottom Strip | 底部横向滚动的配色方案卡片区 |
| 焦点方案 | `focusedProjectId` 标识的当前编辑中的配色方案 |
| 详情全屏页 | 点击焦点卡片后打开的全屏覆盖层（`#detail-container`） |