# Changelog - Safan ColorPicker

## [dev] 2026-05-31

### 新增
- **收藏功能（favories）**：色板中长按色块可收藏，收藏的颜色在「收藏」标签页集中展示
- **"🎲 只随机我的颜色"按钮**：底部 action bar 新增按钮，仅从已收藏颜色中随机配色
- **3D场景提示文字**：模型上方显示"点击模型更改配色"，首次点击后自动淡出

### 修复
- **配色方案详情页无法打开**：补全缺失的 `findColorByHex()` 方法
- **括号不匹配导致的页面加载失败**：`renderFavorites()` 中 `html.push(...map(...).join(''))` 少写入一个闭合括号 `)` 
- **右上角 brand logo 阴影去除**：`drop-shadow` 过滤器从 brand logo 中移除
- **提示文字颜色修正**：改为深色 `#444`，适应浅色 3D 背景

### 部署
- 首次部署到 Cloudflare Pages：`https://safan-color-picker.pages.dev`
- 生产分支：`main`
