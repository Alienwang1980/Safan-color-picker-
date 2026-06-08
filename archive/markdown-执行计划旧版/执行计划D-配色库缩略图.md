# 执行计划 D：配色库缩略图

> 阶段：在现有 Project 系统上增加 3D 模型缩略图
> 前置条件：无（独立功能）
> 目标：配色库卡片展示 3D 渲染图，而非色块条

---

## 一、背景与问题

### 当前配色库

底部 strip（配色库）展示已保存的配色方案。目前卡片只显示色块条：

```
┌─────────────────────┐
│  ■ ■ ■ ■ ■          │  ← _previews 前5个色块
│  配色方案 1          │  ← 自动编号
└─────────────────────┘
```

点击卡片后，detail-area 展开显示每个部件的具体颜色。

### 问题

- **没有 3D 模型缩略图**，用户无法直观看到当前配色在模型上的实际效果
- 配色库两个必备项：① 3D 模型缩略图 ② 部件颜色信息——目前只有②

### 解决方案

在 `saveCurrentProject()` 保存时截取 Canvas，存入 project 对象，strip 卡片改展示缩略图。

**不需要新建 Profile 系统**，直接增强现有 Project 系统（`sidan_projects_mobile`）。

---

## 二、修改文件

- `app_mobile_new.js` — 修改 `saveCurrentProject()` 和 `renderBottomStripProjects()`
- `index_mobile.html` — 可选：CSS 调整卡片尺寸以适配缩略图比例

---

## 三、详细修改步骤

### 步骤 D-1：修改 `saveCurrentProject()` — 增加 Canvas 缩略图

在 `saveCurrentProject()` 的 `project` 对象中新增 `thumbnail` 字段：

```javascript
const project = {
  id: Date.now(),
  name,
  colors,
  savedAt: new Date().toISOString(),
  thumbnail: this.renderer.domElement.toDataURL('image/png'), // 新增
};
```

**注意**：`this.renderer` 在 `_onModelsLoaded` 回调之后才可用。如果用户在模型加载完成前点击保存，`this.renderer` 可能为 `null`。需要加判断：

```javascript
thumbnail: this.renderer ? this.renderer.domElement.toDataURL('image/png') : null,
```

---

### 步骤 D-2：修改 `renderBottomStripProjects()` — 展示缩略图卡片

当前逻辑渲染的是色块条（`_previews`）：

```javascript
const colorBars = previewColors.length > 0
  ? previewColors.map(c => `<span class="strip-card-swatch" style="background:${c}"></span>`).join('')
  : '<span style="font-size:10px;color:#bbb">—</span>';
```

改为优先显示 `thumbnail`，若无缩略图则回退到色块条：

```javascript
const thumbnail = p.thumbnail;
const cardContent = thumbnail
  ? `<img src="${thumbnail}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`
  : `<div style="display:flex;gap:2px;flex-wrap:wrap;padding:4px;">
       ${previewColors.map(c => `<span style="width:12px;height:12px;border-radius:2px;background:${c};flex-shrink:0;"></span>`).join('')}
     </div>`;

return `
  <div class="strip-card${isCenter ? ' center' : ' side'}" data-project-id="${p.id}" data-index="${i}">
    <div class="strip-card-thumb" style="width:100%;height:100%;border-radius:6px;overflow:hidden;background:#f5f5f5;">
      ${cardContent}
    </div>
  </div>
`;
```

---

## 四、卡片尺寸说明

底部 strip 卡片当前尺寸由 CSS 控制：

```css
.strip-card {
  width: 60px;
  height: 70px;
  /* ... */
}
```

缩略图比例建议与当前卡片比例接近（竖长方形）。Three.js Canvas 默认按窗口比例输出，存入缩略图后 `object-fit:cover` 自适应裁切，无需额外处理。

如需微调缩略图展示比例，可调整 `.strip-card-thumb` 的 `aspect-ratio` 或高度。

---

## 五、步骤 D-3（可选）：detail-area 增加颜色名称 + 色号

> 目标：detail-area 每行显示「色块 + 部件名 + 颜色名称 + 色号」，与 PC 版信息结构对齐
> UI 展示细节（布局、间距）可延后，先保证数据结构正确

### 信息结构对比

| 字段 | PC 版（renderProjectDetail） | 手机版（expandDetailArea） |
|---|---|---|
| 色块（swatch） | ✅ | ✅ 已有 |
| 部件中文名（formatName） | ✅ | ✅ 已有 |
| 颜色名称（从 COLOR_GROUPS 反查） | ✅ | ❌ 缺失 |
| 色号（#HEX） | ✅ | ❌ 缺失（仅回退显示 hex） |

### 实现方式

在 `expandDetailArea()` 的每行 HTML 生成逻辑中：

```javascript
const hex = typeof color === 'string' ? color : (color?.hex || '#888');
// 颜色名称 + 色号（UI 展示方式可后续调整）
let colorLabel = hex;
const colorInfo = this.findColor(hex); // 从 COLOR_GROUPS 查
if (colorInfo) {
  colorLabel = colorInfo.name + ' ' + (colorInfo.code || '');
} else {
  // 电池/风扇颜色独立数组
  const bat = BATTERY_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase());
  const fan = FAN_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase());
  const extra = bat || fan;
  if (extra) colorLabel = extra.name;
}
// TODO: UI 布局（可后续调整）
// 目前拼接在 label 后面，UI 展示效果待确认
```

### 优先级

- **数据结构**：本次完成（确保 colorLabel 变量正确）
- **UI 展示**：可后续调整（在 chip 里怎么排列、字体大小、是否截断等）

---

## 六、现有 Project 系统完整性确认

| 方法 | 用途 | 状态 |
|---|---|---|
| `saveCurrentProject()` | 保存当前配色 | ✅ 已有（本次增强） |
| `applyProjectColors(id)` | 恢复配色到模型 | ✅ 已有 |
| `deleteCurrentProject(id)` | 删除配色（confirm 弹窗） | ✅ 已有（UI 删除归 Plan F） |
| `_loadProjects()` / `_saveProjects()` | localStorage 管理 | ✅ 已有 |
| `renderBottomStripProjects()` | 渲染底部卡片 | ✅ 已有（本次增强） |
| `expandDetailArea(id)` | 展开详情显示部件颜色 | ✅ 已有 |
| `renderBottomStripProjects()` — 色块条展示 | 回退逻辑 | ✅ 已有 |

---

## 七、不在本次计划的内容

| 内容 | 原因 | 归属 |
|---|---|---|
| 删除卡片右上角 × 按钮 | 移动端交互不同，需长按触发 | 计划 F |
| 配色库缩略图 Modal 大图查看 | 可选增强，非必备 | 延后 |
| 下载模型链接 | 属于工具类功能 | 计划 E |
| Summary 页面 | 空间有限，可延后 | 延后 |

---

## 八、验证方法

1. 随机修改部件颜色
2. 点击 Toolbar「保存配色」
3. 底部 strip 新增卡片显示 3D 模型缩略图（而非色块条）
4. Toast 显示「已保存: 配色方案 N」
5. 点击卡片 → 模型颜色渐变恢复，detail-area 显示部件颜色
6. 刷新页面 → 缩略图仍正常显示（localStorage 持久化）
7. 无缩略图的老数据（`thumbnail: undefined`）→ 仍显示色块条（回退正常）
8. D-3：点击卡片后 detail-area 显示部件颜色 → 颜色名称 + 色号正确显示（从 COLOR_GROUPS 或 BATTERY_COLORS / FAN_COLORS 反查正确）