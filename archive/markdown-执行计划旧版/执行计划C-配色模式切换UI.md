# 执行计划 C：配色模式切换 UI

> ⚠️ **状态：已跳过（2026-05-30）**
> 原因：依赖计划 A（Reference Mode），计划 A 已确认跳过，手机版仅原色模式
> Dark 主题移至第 3 阶段（执行计划 E）

> 阶段：配色模式切换 UI + 收尾 UI
> 前置条件：执行计划 A（applyColor + Reference 模式）必须完成
> 目标：新增 Official/Reference 切换按钮，完善 UI 收尾

---

## 一、本阶段目标

### 1.1 新增配色模式切换 UI

**PC 版形态：**
```
┌─────────────────────────────┐
│  [ 原色 ]  [ 参考模式 ]    │  ← 浮动在 3D Canvas 左上角
└─────────────────────────────┘
```

**手机版目标形态：**
```
┌────────────────────────────────┐
│  [Safan]  [ 原色 | 参考 ] [随机]│  ← Toolbar 右侧区域
└────────────────────────────────┘
```

### 1.2 其他 UI 收尾
| 功能 | 状态 |
|---|---|
| 删除方案入口 | 🟡 执行计划 B 已添加，需样式 |
| Detail 区返回按钮 | 🟡 执行计划 B 已添加，需样式 |
| Dark 主题切换 | ❌ 未实现 |
| 配色库 Tab 当前选中指示 | ✅ 已实现 |

---

## 二、修改文件

**主文件：**
- `index_mobile.html` — 新增配色模式切换按钮 UI
- `app_mobile_new.js` — 新增 `_refreshColorModeUI()` + 绑定事件

---

## 三、详细修改步骤

### 步骤 C-1：新增配色模式切换按钮 HTML

在 `index_mobile.html` 的 Toolbar 中：

**当前 Toolbar 结构（参考 L352-L359）：**
```html
<div id="toolbar">
  <span class="toolbar-title">Safan</span>
  <div class="toolbar-actions">
    <button class="tb-btn tb-btn-save" id="btn-save">保存配色</button>
    <button class="tb-btn tb-btn-random" id="btn-random">随机</button>
  </div>
</div>
```

**修改为：**
```html
<div id="toolbar">
  <span class="toolbar-title">Safan</span>
  <div class="toolbar-actions">
    <button class="tb-btn tb-btn-save" id="btn-save">保存配色</button>
    <div class="color-mode-toggle" id="color-mode-toggle">
      <button class="mode-btn active" id="btn-original">原色</button>
      <button class="mode-btn" id="btn-reference">参考模式</button>
    </div>
    <button class="tb-btn tb-btn-random" id="btn-random">随机</button>
  </div>
</div>
```

---

### 步骤 C-2：CSS 样式

在 `index_mobile.html` 的 `<style>` 中新增：

```css
/* ===== COLOR MODE TOGGLE ===== */
.color-mode-toggle {
  display: flex;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.mode-btn {
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  transition: all 0.15s;
}
.mode-btn:first-child {
  border-right: 1px solid #e0e0e0;
}
.mode-btn.active {
  background: #1a1a1a;
  color: #fff;
}
.mode-btn:not(.active):hover {
  background: #f0f0f0;
  color: #1a1a1a;
}
```

---

### 步骤 C-3：初始化 state 中的 colorMode

在 `app_mobile_new.js` 的 `constructor()` state 中已新增（执行计划 A）：
```javascript
this.state.colorMode = 'official';  // 'official' | 'reference'
```

---

### 步骤 C-4：新增 _refreshColorModeUI 方法

```javascript
_refreshColorModeUI() {
  const btnOriginal = document.getElementById('btn-original');
  const btnReference = document.getElementById('btn-reference');
  if (btnOriginal) btnOriginal.classList.toggle('active', this.state.colorMode === 'official');
  if (btnReference) btnReference.classList.toggle('active', this.state.colorMode === 'reference');
}
```

---

### 步骤 C-5：绑定按钮事件

在 `init()` 中新增：

```javascript
const btnOriginal = document.getElementById('btn-original');
if (btnOriginal) btnOriginal.addEventListener('click', () => {
  this.state.colorMode = 'official';
  this._refreshColorModeUI();
  this._reapplyAllColors();
});

const btnReference = document.getElementById('btn-reference');
if (btnReference) btnReference.addEventListener('click', () => {
  this.state.colorMode = 'reference';
  this._refreshColorModeUI();
  this._reapplyAllColors();
});
```

---

### 步骤 C-6：初始化 UI 状态

在 `init()` 末尾，`this.animate()` 之前调用：

```javascript
this._refreshColorModeUI();
```

---

## 四、验证方法

### 4.1 切换原色模式
1. 页面加载后，默认选中「原色」按钮
2. 模型显示标准材质（有光泽，有高光）
3. 点击「原色」按钮无变化（已是当前模式）

### 4.2 切换参考模式
1. 点击「参考模式」按钮
2. 按钮高亮切换，背景变深色文字变白
3. 模型变为 flat shading，无高光，roughness=1.0
4. Toast 不弹出（无文案提示）

### 4.3 切换回原色模式
1. 点击「原色」按钮
2. 按钮高亮恢复
3. 模型恢复标准材质

### 4.4 调试命令
```javascript
// 查看当前模式
app.state.colorMode  // 'official' | 'reference'

// 强制切换
app.state.colorMode = 'reference'
app._refreshColorModeUI()
app._reapplyAllColors()
```

---

## 五、与执行计划 A 的依赖关系

```
执行计划 A 完成
       ↓
app_mobile_new.js 有完整的：
  - applyColor(mesh, hex, colorType, extra)
  - _applyReferenceLighting()
  - _applyStandardLighting()
  - _reapplyAllColors()
  - state.colorMode
       ↓
执行计划 C 才能正常工作
  - 按钮切换 → _reapplyAllColors() → 正确应用材质参数
```

**如果先做 C 而不做 A**：`applyColor` 仍然是简化版，切换模式后看不到任何效果。

---

## 六、其他 UI 收尾

### 6.1 Detail 区样式（执行计划 B 已添加）

确认以下 CSS 已添加到 `index_mobile.html`：
```css
.detail-chip { ... }
.detail-chip-swatch { ... }
.detail-chip-label { ... }
.detail-back-btn { ... }
.detail-delete-btn { ... }
.detail-delete-area { ... }
```

### 6.2 Dark 主题（可选延后）

如需实现，步骤如下：

**1. CSS 变量：**
```css
:root {
  --bg: #e8e8e8;
  --toolbar-bg: rgba(255,255,255,0.92);
  --text: #1a1a1a;
}
[data-theme="dark"] {
  --bg: #1a1a1a;
  --toolbar-bg: rgba(30,30,30,0.95);
  --text: #f0f0f0;
}
```

**2. Toolbar 新增主题按钮：**
```html
<button class="tb-btn tb-btn-theme" id="btn-theme">🌙</button>
```

**3. JS 绑定：**
```javascript
toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}
```

**本次不强制要求实现，可延后至计划 D。**

---

## 七、阶段产出

完成后，手机版将具备：
- ✅ 配色模式切换 UI（原色/参考模式按钮）
- ✅ 点击切换实时生效（`_reapplyAllColors`）
- ✅ 删除方案入口 UI（执行计划 B）
- ✅ Detail 区返回按钮（执行计划 B）