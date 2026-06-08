# 详情页 UI 重构计划

> **目标：** 只改详情页的布局和视觉，不碰任何功能逻辑（截图生成、颜色查找、购买链接生成、打开/关闭逻辑）
>
> **范围：** `app_mobile_new.js` 中的 `openDetailPage()` HTML 模板 + `index_mobile.html` 中的详情页 CSS
>
> **不变的内容：** `_captureThumbnail()`、`_capturePartThumbnail()`、颜色分组合并逻辑、购买链接生成、`closeDetailPage()`、`restoreAll()` 等所有功能方法

---

## 新布局结构

```
┌─── ① 总览截图（维持现状）────────────────────────┐
│    ┌───正45°───┐      ┌───背45°───┐               │
│    └───────────┘      └───────────┘                │
├────────────────────────────────────────────────────┤

─── ② 6个3D主部件 —— 铺开卡片，同色相邻 ───────────

│   每个部件独立展示，不去重；同色部件摆在一起         │
│                                                     │
│   前罩 [预览图] 象牙白  背板 [预览图] 象牙白        │ ← 同色组
│   充电口 [预览图] 象牙白                            │
│   主框架 [预览图] 日落橙  旋钮 [预览图] 日落橙      │ ← 同色组
│                                                     │

─── ③ 使用颜色 —— 列表式，去重 ─────────────────────

│   6个主部件的颜色去重后列出，每行带购买链接           │
│   购买按钮样式与下方④统一                            │
│                                                     │
│  ■ 象牙白 · PLA Basic                [购买]          │
│  ■ 日落橙 · PLA Matte                [购买]          │
│  ■ 黑色   · PLA Basic                [购买]          │

─── ④ 其他部件 —— 列表式 ──────────────────────────

│   风扇/电池/螺丝/线缆/脚垫，每行一个                 │
│   带缩略图+规格+购买链接                             │
│   购买按钮样式与③统一                                │
│                                                     │
│  [●缩略图] 风扇     黑色               [购买]          │
│  [●缩略图] 电池     白色               [购买]          │
│  [●缩略图] 螺丝     M3x10 8颗          [购买]          │
│  [●缩略图] PWM线    标准 DIY-B         [购买]          │
│  [●缩略图] 充电线   A上C直 0.1M       [购买]          │
│  [●缩略图] CtoA线   上对母 0.1M       [购买]          │
│  [●缩略图] 脚垫     9号黑色硅胶垫     [购买]          │
└────────────────────────────────────────────────────┘
```

---

## Phase 0：清理数据源

**当前问题：** `openDetailPage()` 内硬编码了 `COLORED_PARTS`（遗漏 Fan/Battery），同时又用 `ACC_ITEMS`（混入 Fan/Battery）。两种数据源不统一。

**改动：** 只重构 `openDetailPage()` 内的数据组织，不碰 `MODELS_COLORABLE` / `MODELS_FIXED` / `ACC_ITEMS` 定义。

**数据分区逻辑：**
- **Section ② 数据源** — 从 `MODELS_COLORABLE` 中过滤出 **6 个全色盘部件**（排除 Fan、Battery）：`FrontCap_Color, Back_Color, MainFrame_Color, Bar_Color, Knob_Color, Usb_Color`
- **Section ③ 数据源** — 从 Section ② 的颜色中做去重
- **Section ④ 数据源** — 从 `ACC_ITEMS` 取全部（Fan、Battery、线缆、螺丝、脚垫），保持中性

**文件：** `app_mobile_new.js` — `openDetailPage()` 内约第 728-736 行，替换 `COLORED_PARTS` 变量

---

## Phase 1：Section ② — 主部件铺开卡片

**HTML 结构：**
```html
<div class="detail-section-parts">
  <!-- 按颜色分组，同色相邻 -->
  <!-- 每组有一个组标签 -->
  <div class="color-group">
    <div class="color-group-label">— 象牙白 ×3 —</div>
    <div class="color-group-cards">
      <div class="part-card">
        <div class="part-card-img">
          <img src="data:..." alt="前罩">
        </div>
        <div class="part-card-info">
          <span class="part-card-name">前罩</span>
          <span class="part-card-color">象牙白</span>
        </div>
      </div>
      <!-- ... 同色组其他部件 -->
    </div>
  </div>
  <!-- 下一颜色组 -->
</div>
```

**CSS 关键点：**
- 卡片水平铺开（flex-wrap），非瀑布流
- 每张卡片含：部件 3D 截图 + 中文名 + 颜色名
- 同色组之间用组标签/间距分隔
- 卡片式视觉（圆角、轻描边），与上方截视图"一组"

---

## Phase 2：Section ③ — 去重颜色列表

**HTML 结构：**
```html
<div class="detail-section-colors">
  <div class="section-title">使用颜色</div>
  <div class="color-list">
    <div class="color-list-item">
      <span class="cls-swatch" style="background:#fff5e0"></span>
      <span class="cls-name">象牙白</span>
      <span class="cls-group">PLA Basic</span>
      <a class="cls-buy" href="..." target="_blank">购买</a>
    </div>
    <!-- ... 更多颜色 -->
  </div>
</div>
```

**CSS 关键点：**
- 列表式布局，非卡片铺开
- 每行：色块圆点 + 颜色名 + 材质标签 + 购买按钮
- 购买按钮样式与 Section ④ 统一

---

## Phase 3：Section ④ — 其他部件列表

**HTML 结构：**
```html
<div class="detail-section-others">
  <div class="section-title">配件及其他</div>
  <div class="other-list">
    <div class="other-list-item">
      <img class="oli-thumb" src="..." alt="风扇">
      <span class="oli-name">风扇</span>
      <span class="oli-spec">黑色 反叶</span>
      <a class="oli-buy" href="..." target="_blank">购买</a>
    </div>
    <!-- ... 更多 -->
  </div>
</div>
```

**CSS 关键点：**
- 列表式，每行左图右文+购买按钮
- 缩略图圆角，统一尺寸
- 购买按钮样式与 Section ③ 完全一致（可共用 `.buy-btn` 类）

---

## Phase 4：CSS 替换

**删除的旧 CSS（约 line 773-985）：**
- `#detail-container` — 保留（position/transform/transition）
- `.detail-header-top` — 保留
- `.detail-model-shot` — 保留，但需微调 margin/bottom
- `.color-card-grid` / `.cc-col` / `.color-card` / `.cc-preview` / `.cc-part-img` / `.cc-bottom` / `.cc-info` / `.cc-swatch` / `.cc-name` / `.cc-code` / `.cc-type-tag` / `.cc-buy` / 相关所有 — **全部删除**
- `.detail-list-delete` — 删除（不再使用）

**新增 CSS：**
- `.detail-section-parts` — 主部件区
- `.part-card` — 部件卡片
- `.part-card-img` — 部件截图
- `.color-group` / `.color-group-label` — 颜色分组
- `.detail-section-colors` — 颜色列表区
- `.color-list` / `.color-list-item` — 颜色列表行
- `.detail-section-others` — 其他部件区
- `.other-list` / `.other-list-item` — 其他列表行
- `.buy-btn` — **共用购买按钮样式**（③④共用）

---

## 不改的范围（功能完整保留）

| 功能 | 文件 | 不变 |
|------|------|------|
| `openDetailPage()` 入口 | JS L711-722 | ✅ |
| `_captureThumbnail()` | JS L1688-1713 | ✅ |
| `_capturePartThumbnail()` | JS L1715-1759 | ✅ |
| 颜色分组合并/排序逻辑 | JS L738-831 | ✅ |
| 颜色查找 `findColorByHex()` | 其他位置 | ✅ |
| 购买链接 SPU_MAP 生成 | JS L886-895 | ✅ |
| `closeDetailPage()` | JS L968-976 | ✅ |
| `ACC_ITEMS` 定义 | JS L699-709 | ✅ |
| `MODELS_COLORABLE` / `MODELS_FIXED` | JS L5-6 | ✅ |
| 所有其他功能（收藏、随机、保存等） | — | ✅ |

---

## 执行顺序

1. **Phase 0** — 清理 `openDetailPage()` 中的数据分区
2. **Phase 1** — 构建 Section ② HTML 模板
3. **Phase 2** — 构建 Section ③ HTML 模板
4. **Phase 3** — 构建 Section ④ HTML 模板
5. **Phase 4** — 替换 CSS（删旧增新）
6. **测试** — 本地预览验证布局
7. **提交** — `git commit -m "refactor: 详情页UI重构 — 分区铺开+颜色去重+列表式"`
