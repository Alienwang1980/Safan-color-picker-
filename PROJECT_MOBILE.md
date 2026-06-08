# Safan ColorPicker 手机版

## 核心文件
- `app_mobile_new.js` — 主逻辑（ES module，~1450行）
- `index_mobile.html` — 入口页面
- `colors.js` — 配色数据（PC/手机共用）
- `Logo/` — 品牌和产品 logo

## 核心结构
```
index_mobile.html
├── #toolbar          → 顶部透明浮层（Safan logo + Brand logo）
├── #canvas-container → 全屏 Three.js 场景
│   ├── info overlay  → 3D模型上的提示文字「点击模型更改配色」
│   └── #scene-hint   → 浮层提示，首次点击后淡出消失
├── #bottom-strip     → 底部配色方案卡条形（overflow-x: auto）
├── #action-bar       → 随机配色 + 🎲只随机我的颜色按钮（固定于底部上方）
└── #picker-overlay   → 色板选择弹窗（全屏 Modal）
    ├── tab 行        → 收藏 | 基本 | 哑光 | ...
    └── 色块网格      → 长按收藏，短按选色
```

## localStorage
| key | 用途 |
|-----|------|
| `sidan_projects_mobile` | 已保存的配色方案（JSON） |
| `safan_favorites` | 收藏颜色 code 数组（JSON） |

## 配色方案详情页
- 点击已聚焦的卡片 → `openDetailPage(pid)` → 以Modal显示所有部件色值
- 详情页内「应用」→ `applyProjectColors`

## 随机配色
- `randomizeColors()` — 从62色中随机
- `randomizeFavoritesOnly()` — 从收藏色中随机
- 「🎲 只随机我的颜色」在收藏数>=2时显示并可用

## 材质参数
所有可上色部件：`_setMeshColor(mesh, hex)` → `roughness: 0.65`, `metalness: 0`, `emissive: 0x000000`
风扇（首次）：`applyFanColor` → `roughness: 0.8`

## 部署
```bash
CLOUDFLARE_API_TOKEN=<token> npx wrangler@3 pages deploy . --project-name=safan-color-picker --branch=main
```
固定域名：`https://safan-color-picker.pages.dev/index_mobile.html`
