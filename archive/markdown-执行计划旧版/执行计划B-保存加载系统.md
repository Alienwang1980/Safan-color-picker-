# 执行计划 B：保存/加载系统

> 阶段：配色方案保存与加载
> 前置条件：无（可与执行计划 A 并行）
> 目标：完整实现配色方案的保存、加载、卡片展示、Detail 区

---

## 一、本阶段目标

### 1.1 项目数据结构
```javascript
{
  id: Date.now(),
  name: "配色方案 1",        // 自动命名
  colors: {
    Back_Color: "#C12E1F",
    MainFrame_Color: "#FFFFFF",
    Fan: "#9E9E9E",
    Battery: "#212121",
    _previews: ["#C12E1F", "#FFFFFF", ...]  // 最多 5 个非灰色预览
  },
  savedAt: "2026-05-29T..."
}
```

### 1.2 功能清单
| 功能 | 方法 | 状态 |
|---|---|---|
| 保存当前配色 | `saveCurrentProject()` | ✅ 已完成 |
| 加载配色方案 | `applyProjectColors(id)` | ✅ 已完成 |
| 删除配色方案 | `deleteCurrentProject(id)` | ✅ 有函数，需要 UI 入口 |
| 配色卡片渲染 | `renderBottomStripProjects()` | ✅ 已完成 |
| Detail 区渲染 | `expandDetailArea(id)` | 🟡 需要完善：返回按钮 + 删除按钮 + chip 点击 |
| 配色卡片点击 | strip-card click → applyProjectColors | ✅ 已完成 |

### 1.3 与其他计划的关系
- **可并行**：不依赖 `applyColor` 的材质参数（手机版无 Reference mode）
- **applyColor 现状**：手机版 `applyColor(partName, hex)` 保持简单签名，已可用

---

## 二、修改文件

**主文件：** `app_mobile_new.js`

**本次修改范围：**
- `applyProjectColors()` — 适配新的 `applyColor` 调用
- `deleteCurrentProject()` — 新增 UI 入口（Bottom Strip Detail 区删除按钮）
- `renderBottomStripProjects()` — 优化选中态判断
- `expandDetailArea()` — 完善 Detail 区交互

---

## 三、详细修改步骤

### 步骤 B-1：确认 applyProjectColors 可用

**当前代码（L620-L630）手机版已可正常运作**：
```javascript
applyProjectColors(projectId) {
  const project = this.state.projects.find(p => p.id === projectId);
  if (!project) return;
  Object.entries(project.colors).forEach(([partName, color]) => {
    if (partName === '_previews') return;
    const hex = typeof color === 'string' ? color : (color?.hex || '#888');
    this.applyColor(partName, hex);  // 简单签名 ✅
    const part = this.state.parts[partName];
    if (part) this.animateColorChange(part.mesh, hex);
  });
}
```

**无需修改**：手机版 `applyColor(partName, hex)` 签名保持简单，无 colorType 参数，加载配色直接可用。

---

### 步骤 B-2：新增 deleteCurrentProject UI 入口

在 `expandDetailArea()` 中新增删除按钮：

**当前 Detail 区渲染代码（参考 L400-L429）：**
```javascript
expandDetailArea(projectId) {
  ...
  detail.innerHTML = partNames.map(name => { ... }).join('');
  ...
}
```

**修改为：**
```javascript
expandDetailArea(projectId) {
  const project = this.state.projects.find(p => p.id === projectId);
  if (!project) return;

  const detail = document.getElementById('detail-area');
  if (!detail) return;

  // 部件 chip 列表
  const partNames = Object.keys(project.colors || {}).filter(k => k !== '_previews');
  const chipHtml = partNames.map(name => {
    const color = project.colors[name];
    const hex = typeof color === 'string' ? color : (color?.hex || '#888');
    return `
      <div class="detail-chip" data-part="${name}">
        <span class="detail-chip-swatch" style="background:${hex}"></span>
        <span class="detail-chip-label">${this.formatName(name)}</span>
      </div>
    `;
  }).join('');

  // 删除按钮
  const deleteBtn = `
    <div class="detail-delete-area" style="padding:12px; border-top:1px solid rgba(0,0,0,0.08);">
      <button class="detail-delete-btn" id="btn-delete-current-project"
        style="width:100%; padding:12px; border-radius:8px; border:none;
               background:#fff0f0; color:#c00; font-size:13px; font-weight:500;
               cursor:pointer;">删除此方案</button>
    </div>
  `;

  detail.innerHTML = chipHtml + deleteBtn;

  // 绑定删除按钮事件
  const deleteBtnEl = document.getElementById('btn-delete-current-project');
  if (deleteBtnEl) {
    deleteBtnEl.addEventListener('click', () => {
      this.deleteCurrentProject(projectId);
    });
  }

  // 绑定 chip 点击事件
  detail.querySelectorAll('.detail-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const partName = chip.dataset.part;
      this.selectPart(partName);
    });
  });

  detail.classList.add('visible');
  this.state.bottomStripExpanded = true;
  document.getElementById('bottom-strip').classList.remove('collapsed');
}
```

---

### 步骤 B-3：修改 deleteCurrentProject（确认 + 重新渲染）

**当前代码（L688-L697）：**
```javascript
deleteCurrentProject(id) {
  if (!id) return;
  const project = this.state.projects.find(p => p.id === id);
  if (!project) return;
  if (!confirm('确定要删除 "' + project.name + '" 吗？')) return;
  this.state.projects = this.state.projects.filter(p => p.id !== id);
  this._saveProjects();
  this.renderBottomStripProjects();
  this.showToast('已删除: ' + project.name);
}
```

**当前已完整，只是 UI 入口缺失。确保 `_saveProjects()` 已实现。**

---

### 步骤 B-4：优化配色卡片选中态判断

**当前逻辑（L371-L373）：**
```javascript
const activeProjectIndex = this.state.projects.findIndex(p =>
  p.colors && Object.keys(p.colors).some(k => k !== '_previews' && this.state.parts[k]?.currentColor === p.colors[k])
);
```

**问题**：这个判断是检查方案中任意一个 key 的颜色是否与当前部件匹配，不够准确。

**优化为**：检查方案中所有颜色与当前模型状态完全匹配的比例。

```javascript
const activeProjectIndex = this.state.projects.findIndex(p => {
  if (!p.colors) return false;
  const colorKeys = Object.keys(p.colors).filter(k => k !== '_previews');
  if (colorKeys.length === 0) return false;
  // 检查所有颜色是否与当前模型状态一致
  return colorKeys.every(k => {
    const hex = typeof p.colors[k] === 'string' ? p.colors[k] : (p.colors[k]?.hex || '#888');
    return this.state.parts[k]?.currentColor === hex;
  });
});
```

---

### 步骤 B-5：在 Bottom Strip 中新增"返回列表"按钮

当 Detail 区打开时，用户需要能返回卡片列表视图。

**当前状态**：Detail 区打开后，没有返回入口。

**在 `expandDetailArea()` 的 chip 列表上方新增返回按钮：**
```javascript
const backBtn = `
  <div class="detail-back-btn" style="
    display:flex; align-items:center; gap:6px;
    padding:10px 12px; border-bottom:1px solid rgba(0,0,0,0.08);
    cursor:pointer; font-size:13px; color:#666;
  " id="btn-back-to-cards">
    ‹ 返回配色列表
  </div>
`;
detail.innerHTML = backBtn + chipHtml + deleteBtn;
```

**绑定事件：**
```javascript
const backBtnEl = document.getElementById('btn-back-to-cards');
if (backBtnEl) {
  backBtnEl.addEventListener('click', () => {
    this.renderBottomStripProjects();
  });
}
```

---

## 四、CSS 样式补充

在 `index_mobile.html` 的 `<style>` 中新增：

```css
/* Detail 区 */
.detail-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  cursor: pointer;
}
.detail-chip:active { background: rgba(0,0,0,0.04); }
.detail-chip-swatch {
  width: 22px; height: 22px; border-radius: 5px;
  flex-shrink: 0; border: 1px solid rgba(0,0,0,0.1);
}
.detail-chip-label { font-size: 13px; color: #1a1a1a; }

.detail-back-btn:active { background: rgba(0,0,0,0.04); }
.detail-delete-btn:active { background: #ffe0e0; }
```

---

## 五、验证方法

### 5.1 保存配色方案
1. 修改几个部件的颜色
2. 点击 Toolbar「保存配色」
3. Toast 显示"已保存: 配色方案 N"
4. Bottom Strip 底部出现新卡片

### 5.2 加载配色方案
1. 向上滑 Bottom Strip 展开
2. 点击配色卡片
3. 模型颜色渐变过渡（350ms）
4. Detail 区展开显示部件列表

### 5.3 删除配色方案
1. 在 Detail 区点击「删除此方案」
2. confirm 弹窗确认
3. Toast 显示"已删除"
4. 卡片列表重新渲染

### 5.4 Detail 区 chip 跳转
1. 方案加载后 Detail 区展开
2. 点击任意 chip（如"前罩"）
3. 弹窗打开该部件配色
4. 可修改颜色并确认

---

## 六、与其他计划的关系

| 计划 | 关系 |
|---|---|
| 计划 A（已跳过） | 手机版无 Reference mode，此关系不适用 |
| 计划 D（Profile 快照） | 可并行，Profile 系统独立于 Project 系统 |