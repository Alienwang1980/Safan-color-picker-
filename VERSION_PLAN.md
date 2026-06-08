# Safan ColorPicker v2.0 版本计划

> 基于 `dev` 分支，在 `2.0` 分支上开发（已提前完成阶段 0~5）

---

## 版本目标

从功能可用升级到**设计一致 + 体验流畅**。不新增功能，聚焦 UI 系统化、深色模式、Bug 修复。

---

## 当前状态

`2.0` 分支已领先 `dev` 13 个 commit，含阶段 0~5 的全部代码 + 后续修复。

**已完工程度汇总：**

| 阶段 | 内容 | 状态 |
|:----|:-----|:----:|
| 0 — 准备工作 | 背景白、FOUC、CSS 变量骨架、Bug 1 截图修复 | ✅ 完成 |
| 1 — 响应式重构 | touch-action 修正、Safe Area、Bug 2&3、字号/间距/圆角变量化 | ✅ 完成 |
| 2 — UI 浮层优化 | Header 透明化、Logo SVG 内联化、Strip 透明化、触控反馈 | ✅ 完成 |
| 3 — 深色模式 | [data-theme="dark"] 色板、硬编码 → var(--*)、3D 场景跟随 | ✅ 完成 |
| 4 — 组件精细化 | Strip 卡片弹性尺寸、拾色器动效、编辑态遮罩 | ✅ 完成 |
| 5 — 动效对齐 | animateColorChange 时长/曲线统一 | ✅ 完成 |
| 5.2 — 辅助动效 | prefers-reduced-motion 检测 | ❌ 未实现 |
| 6 — 验收 | 跨设备测试、功能回归、代码清理 | ❌ 未开始 |

---

## 待完成清单

### A. 未提交修正（working tree 脏状态）

| # | 位置 | 内容 | 类型 |
|:-:|:----|:----|:----:|
| A1 | app_mobile_new.js:173-174 | 3D 场景背景回退色 #e8e8e8 → #ffffff | 🐛 残留硬编码 |
| A2 | index_mobile.html:77 | 浅色主题 logo-primary: #f5f5f7 → #1d1d1f（白底上看不清） | 🐛 Logo 可见性 |
| A3 | index_mobile.html | 添加 --logo-inverse 变量 + cls-3 引用 | 🔧 深色兼容 |
| A4 | index_mobile.html:763 | strip-empty 颜色 #e8e8e8 → var(--text-secondary) | 🔧 变量一致性 |

### B. 未实现功能

| # | 来源（阶段） | 内容 | 优先级 |
|:-:|:-----------|:----|:------|
| B1 | 阶段 5.2 | prefers-reduced-motion 检测（CSS + JS fallback） | 🟡 低 |
| B2 | 阶段 6.1 | iOS Safari + Chrome iOS 跨设备测试 | 🟢 验收 |
| B3 | 阶段 6.2 | 现有功能回归（配色保存/恢复、收藏、配件详情页） | 🟢 验收 |
| B4 | 阶段 6.3 | 代码清理（saveCurrentProject 判定删除、未使用 CSS 清理） | 🟢 验收 |

### C. 潜在问题（由之前的修复引入）

| # | 描述 | 严重程度 |
|:-:|:----|:--------:|
| C1 | 详情页进入前需要清除 dim 半透明状态（已在 e9f8dba 修复） | ✅ 已修复 |
| C2 | 单部件选色后 currentColors 未同步（已在 c4f25af 修复） | ✅ 已修复 |
| C3 | Battery 随机配色限制为 5 色（已在 27069cb 修复） | ✅ 已修复 |

---

## 执行计划

### 第一步：提交未完成修正（A1-A4）

合并当前 uncommitted 修改到 `2.0` 分支（Logo 浅色主题修正 + 回退色 + 变量一致性）。

### 第二步：补短板（B1）

添加 `prefers-reduced-motion` 检测。

### 第三步：验收阶段（B2-B4）

- 手机端实际测试
- 功能回归检查
- 代码清理（saveCurrentProject 是否真的没用）

---

## 不改的范围

- `colors.js` 中的产品色彩数据（PLA Basic/Matte/Translucent 色值）
- 配件数据（规格、图片、购买链接）
- 3D 模型文件（Models/*.glb）
- 收藏功能逻辑（保持不变）

---

## Git 分支策略

```
main ─── 线上稳定版
  └── dev ─── v1.x 开发分支
        └── 2.0 ─── v2.0 当前分支（已完成阶段 0~5 实现）
```

- 剩余工作（A1-B4）作为独立 commit 提交
- 全部完成后合并回 `dev` 测试，再合并到 `main` 部署

---

## 版本号

当前：`v2.0-dev`（2.0 分支开发中）
发布：合并到 main 后打 tag `v2.0`
