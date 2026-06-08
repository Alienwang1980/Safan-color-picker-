# 第 8 步：UI 整体化

> 新增步骤（2026-05-30）：Header 透明浮层、Strip 透明浮层、随机按钮重定位、添加方案改为圆形+号图标
> 前置：第 3 步（配色库交互逻辑）完成后执行
> 此步骤与配色库逻辑重构并行，UI 改动不影响交互逻辑
> ⚠️ 代码尚未更新，以下"代码现状"为执行前的起点参考

---

## 代码现状（执行前）

代码中仍为旧版 UI，与计划要求的主要差异：

| 功能 | 计划要求 | 代码现状 |
|---|---|---|
| Header 背景 | `background: transparent; border: none;` | ❌ 仍是 `rgba(255,255,255,0.92)` 白色半透明 |
| Strip 背景 | `background: transparent; border: none;` | ❌ 仍是白色半透明 |
| `#action-bar` | 随机按钮新容器（3D 和 Strip 之间） | ❌ 没有这个元素 |
| 随机按钮 | 在 `#action-bar` 居中 | ❌ 仍在 toolbar 内 |
| Save 按钮 | 取消（由 + 按钮替代） | ❌ 仍在 toolbar 内 |
| `#detail-container` | 全屏详情页 DOM | ❌ HTML 里没有这个元素 |
| `btn-add-project` | 圆形+号，Strip 最左固定 | ❌ 没有这个按钮 |
| logo 投影 | `filter: drop-shadow()` | ❌ 没有投影样式 |
| `renderBottomStripProjects()` | 插入 + 按钮 | ❌ 没有插入按钮 |

---

## 步骤目标

**完成标志**：
1. Header 完全透明，logo 浮在 3D 上，无背景无边框
2. Strip 完全透明，卡片和按钮浮在 3D 上，无背景无边框
3. 3D 画面从屏幕顶部完整延伸到 strip 底部
4. 随机配色按钮在 3D 下方、Strip 上方
5. 添加配色方案为圆形+号图标，固定在 Strip 最左侧，不随滑动滚动

---

## UI 布局

```
┌─────────────────────────────────────┐
│  [logo]                    [brand]  │  ← Header：透明浮层
│                                     │
│                                     │
│          3D Canvas（全屏）           │  ← z-index: 1
│                                     │
│                                     │
│            [随机配色]                │  ← 在3D和配色库之间
│                                     │
│  [+] [ 配色卡 ] [ 配色卡 ] [ 配色卡 ]│  ← Strip：透明浮层，+ 固定左
└─────────────────────────────────────┘
```

### 各区域层级

| 层级 | 元素 | 样式 |
|---|---|---|
| z-index: 1 | 3D Canvas | `position: fixed; inset: 0;` 全屏 |
| z-index: 100 | Header | 透明，无背景无边框，logo 浮层 |
| z-index: 100 | 随机按钮 | 透明背景，浮在3D与Strip之间 |
| z-index: 100 | Bottom Strip | 透明，无背景无边框，+按钮和卡片浮层 |

---

## 交互规格

### Header

- **左侧**：图形 logo（文字或 SVG），浮在 3D 上
- **右侧**：brand logo（图形）
- **样式**：无背景、无边框、无阴影，完全透明

### 随机配色按钮

- **位置**：3D 画面正下方（strip 正上方），居中
- **样式**：圆形或胶囊形按钮，背景透明或半透明
- **功能**：点击后随机打乱所有部件颜色（`randomizeColors()`）

### Bottom Strip

- **背景**：完全透明（`background: transparent; border: none;`）
- **布局**：flex 横向排列
- **左侧固定按钮**：圆形+号图标，始终在最左边，不随卡片滑动而移动
- **卡片区域**：可横向滚动（`overflow-x: auto`），Snap 滚动

### 添加配色方案按钮（圆形+号）

- **外观**：圆形，背景 `rgba(58,123,213,0.85)`，白色+号图标
- **尺寸**：直径 44px（触摸友好）
- **位置**：Strip 最左侧，`position: sticky; left: 0;`，固定不滚动
- **功能**：点击调用 `createNewProject()`（当前模型状态快照存为新方案）

### 无方案时的状态

- 只有一个圆形+号按钮在左侧
- Strip 区域仍有横向滑动能力（容纳新卡片）

---

## 修改内容

### 修改 1 — Header 样式修改

**文件**：`index_mobile.html`

1. 去掉 `#toolbar` 的白色背景和底部边框：
```css
#toolbar {
  background: transparent;
  border: none;
}
```

2. 左侧 logo 图片加投影，确保在任意 3D 背景下可读：
```css
.logo img {
  filter: drop-shadow(0 1px 4px rgba(0,0,0,0.4)) drop-shadow(0 0 6px rgba(0,0,0,0.2));
}
```

3. 右侧 brand logo 图片也加投影（保持视觉一致性）：
```css
.toolbar-actions img {
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
}

### 修改 2 — Bottom Strip 样式修改

**文件**：`index_mobile.html`

```css
#bottom-strip {
  background: transparent;
  border: none;
}
```

### 修改 3 — 添加配色方案圆形+号按钮

**文件**：`index_mobile.html`

新增样式：
```css
.btn-add-project {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: rgba(58,123,213,0.85);
  border: none;
  color: #fff;
  font-size: 24px;
  font-weight: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(58,123,213,0.3);
  transition: transform 0.15s, box-shadow 0.15s;
  position: sticky;
  left: 0;
  z-index: 10;
  margin-right: 10px;
}
.btn-add-project:active {
  transform: scale(0.95);
}
```

同步修改 `#strip-cards` 容器，加左侧 padding 确保 `+` 按钮不被遮挡：
```css
#strip-cards {
  padding-left: 16px;  /* 保持与右侧对称 */
}
```

在 `renderBottomStripProjects()` 的卡片列表最前面插入：
```javascript
const addBtn = `<button class="btn-add-project" id="btn-add-project">+</button>`;
```

### 修改 4 — 随机配色按钮重定位

**文件**：`index_mobile.html`

在 `#canvas-container` 和 `#bottom-strip` 之间新增容器：
```html
<div id="action-bar">
  <button id="btn-random-action" class="action-btn">随机配色</button>
</div>
```

样式：
```css
#action-bar {
  position: fixed;
  bottom: 110px;  /* 在strip上方，strip约90px高*/
  left: 0; right: 0;
  display: flex;
  justify-content: center;
  z-index: 100;
}
.action-btn {
  padding: 8px 20px;
  border-radius: 20px;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
```

**说明**：`bottom-strip` 展开时约 160px，折叠时约 90px。`action-bar` 的 `bottom` 值取 110px 确保在 strip 上方约 20px 间距。后续如有调整需要同步修改。

### 修改 5 — Header 右侧按钮调整

**文件**：`index_mobile.html`

- 删除 `#btn-save`（已由 Strip 左侧 + 按钮替代）
- 删除 `#btn-random`（已移到 action-bar）
- 保留右侧的 brand logo 图片（不改变）

**同步**：删除 CSS 死代码（`index_mobile.html` 中），移除以下不再有对应 DOM 元素的样式：
- `.tb-btn-save`, `.tb-btn-save:hover`（第66-70行）
- `.tb-btn-random`, `.tb-btn-random:hover`（第71-76行）

### 修改 6 — app_mobile_new.js 事件绑定调整

**文件**：`app_mobile_new.js` — `init()`

```javascript
// 删除原来的 btn-save 和 btn-random 绑定（已在 toolbar 内移除）

// 新增：action-bar 中的随机按钮
const btnRandomAction = document.getElementById('btn-random-action');
if (btnRandomAction) btnRandomAction.addEventListener('click', () => this.randomizeColors());

// 新增：Strip 中的添加按钮
const btnAdd = document.getElementById('btn-add-project');
if (btnAdd) btnAdd.addEventListener('click', () => this.createNewProject());
```

### 修改 7 — renderBottomStripProjects() 结构更新

**文件**：`app_mobile_new.js` — `renderBottomStripProjects()`

在卡片列表最前面插入 `+` 按钮（固定在最左，不随卡片滚动移动）：
```javascript
const addBtn = `<button class="btn-add-project" id="btn-add-project">+</button>`;
// 卡片 HTML 拼接逻辑见计划3-配色库.md 修改11
const cards = this.state.projects.map((p, i) => {
  const previewColors = (p.colors || {})._previews || [];
  const colorBars = previewColors.length > 0
    ? previewColors.map(hex => `<span style="background:${hex};flex:1;"></span>`).join('')
    : '<span style="flex:1;background:#e0e0e0;"></span>';
  const isFocused = this.state.focusedProjectId !== null && p.id === this.state.focusedProjectId;
  const detailLabel = isFocused ? '<div class="strip-card-detail-label">显示详情</div>' : '';
  return `
    <div class="strip-card${isFocused ? ' center' : ' side'}" data-project-id="${p.id}" data-index="${i}">
      <span class="delete-btn" data-delete-id="${p.id}">×</span>
      <div class="strip-card-colors">${colorBars}</div>
      ${detailLabel}
    </div>
  `;
}).join('');
document.getElementById('strip-cards').innerHTML = addBtn + cards;

> 注意：
> - `+` 按钮使用 `position: sticky; left: 0;`（修改3已定义）才能在卡片横向滑动时保持固定在左侧。
> - ⚠️ 卡片 HTML 中 `.strip-card-detail-label` 和 `.flash` 样式定义在 计划3-配色库.md 的 CSS 高亮样式节中，执行前请确认计划3的 CSS 已合并到 HTML。建议先执行计划8的 HTML/CSS 部分并合并计划3的 CSS 节，再执行计划3的 JS 部分。

---

## 废弃说明

- ❌ `#btn-save` — Save 按钮已取消，功能由 Strip 左侧圆形+号替代
- ❌ `#btn-random`（toolbar 内的）— 已移除，移到 action-bar
- ❌ `#toolbar` 背景和边框样式
- ❌ `#bottom-strip` 背景和边框样式
- ❌ `saveCurrentProject()` — 功能由 `createNewProject()` 替代

---

## 依赖

- `this.createNewProject()` — 新方案快照（第 3 步已实现）
- `this.randomizeColors()` — 随机配色（已有）
- `#action-bar` — 新 DOM 容器

---

## 验证方式

1. 刷新页面，确认 Header 背景完全透明，logo 浮在 3D 上
2. 向下滑动 strip 确认卡片滑动时 + 号按钮始终在左侧固定
3. 点击随机配色按钮确认颜色随机变化
4. 无方案时 strip 左侧只有 + 号按钮
5. 有方案后 + 号按钮在最左，卡片在右侧，可滑动
6. 全屏滑动确认 3D 画面从顶部延伸到 strip 底部，无白色遮挡带

---

## 风险点

1. logo 文字投影在深色和浅色 3D 背景下可读性不同，当前投影参数可能需要调整
2. action-bar 的 `bottom: 110px` 是估算值，strip 展开高度变化时可能需要调整
3. `#toolbar` 右侧的 brand logo 内容待确认（当前为空或占位）