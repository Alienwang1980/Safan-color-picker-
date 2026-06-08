# 第 1 步：Title（顶部 Header）

---

## 步骤目标

**完成标志**：手机版顶部 Toolbar 与 PC V2 对齐，有两个 logo（产品 logo + 品牌 logo），无文字 "Safan"

---

## PC V2 Header 结构（参考）

```html
<header class="topbar">
  <div class="topbar-left">
    <a href="#" class="logo">
      <img src="Logo/logo_H.svg" alt="Safan" style="height:32px;width:auto;">
    </a>
    <a href="..." target="_blank" class="btn-primary" id="btn-download-model">下载模型</a>
  </div>
  <div class="topbar-right">
    <button class="btn-primary" id="btn-new-project">保存配色方案</button>
    <img src="Logo/Brand_logo.svg" alt="Brand" style="height:16px;width:auto;">
  </div>
</header>
```

左侧：产品 logo（`Logo/logo_H.svg`）+ 下载模型按钮
右侧：保存配色按钮 + 品牌 logo（`Logo/Brand_logo.svg`）

---

## 手机版当前 Toolbar

```html
<div id="toolbar">
  <span class="toolbar-title">Safan</span>          ← 文字，应替换为 logo
  <div class="toolbar-actions">
    <button class="tb-btn tb-btn-save" id="btn-save">保存配色</button>
  </div>
</div>
```

---

## 修改内容

**文件**：`index_mobile.html` — `#toolbar` 区域

### 1. 替换文字为产品 logo

将 `<span class="toolbar-title">Safan</span>` 替换为产品 logo 图片：
```html
<a href="#" class="logo">
  <img src="Logo/logo_H.svg" alt="Safan" style="height:28px;width:auto;">
</a>
```

### 2. 右侧增加品牌 logo

在保存按钮右侧增加品牌 logo：
```html
<img src="Logo/Brand_logo.svg" alt="Brand" style="height:16px;width:auto;">
```

### 3. 样式适配

- `.toolbar` 的 flex 布局已存在，保持
- `.toolbar-title` 文字可删除或替换为 logo 容器
- 两个 logo 需要合适的间距

---

## 依赖

- `window.__COLOR_GROUPS` — 配色数据（第 0 步已完成，初始版本自带）
- `Logo/logo_H.svg`、`Logo/Brand_logo.svg` — logo 文件存在（与 PC 版共用 `Logo/` 目录）

---

## 验证方式

第 1 步完成后，打开 `index_mobile.html`，顶部 Toolbar 应当显示：
- 左侧：产品 logo（`logo_H.svg`）
- 右侧：保存配色按钮 + 品牌 logo（`Brand_logo.svg`）
- 无 "Safan" 文字

---

## 风险点

- Logo 文件夹 `Logo/` 是否存在于手机版项目中（与 PC V2 共用同一目录）
