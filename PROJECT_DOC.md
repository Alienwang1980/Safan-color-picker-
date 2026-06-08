# Safan_ColorPicker 项目文档

## 项目概述
拓竹耗材配色选择器 3D 可视化工具，用于展示和定制拓竹设备（如拓竹P2S）的配色方案。

**本地预览：** `cd ~/Documents/Projects/Safan_ColorPicker && python3 -m http.server 9876`
**访问地址：** http://localhost:9876

---

## 功能说明

### 可配色部件（COLORABLE）
| 部件名 | 说明 |
|--------|------|
| Back_Color | 背板 |
| Bar_Color | 提手 |
| FrontCap_Color | 前罩 |
| Knob_Color | 旋钮 |
| MainFrame_Color | 主框架 |
| Usb_Color | 充电口 |
| Fan | 风扇（固定色盘） |
| Battery | 电池（固定色盘） |

### 固定部件（FIXED）
| 部件名 | 说明 |
|--------|------|
| Screw | 螺丝（银色金属，不可配色） |

---

## 螺丝处理逻辑（重要）

### 为什么螺丝是固定银色
- 螺丝材质为金属（metalness=0.95, roughness=0.15）
- 不参与配色调整
- 不参与随机配色
- 不出现在侧边栏详情列表中
- 初始化时通过 `applyMetalness()` 统一应用银色

### 代码关键点
- `MODELS_FIXED = ['Screw']` — 螺丝在固定部件列表
- `MODELS_COLORABLE` 不含 Screw
- `loadModel()` 中通过 `!isColorable` 判断，调用 `applyMetalness(mesh)`
- `applyMetalness()` 设置 `color: 0xd0d0d0`（银色）、`metalness: 0.95`、`roughness: 0.15`

### 已移除的相关代码
- ❌ `SCREW_COLORS` 只有一个银色选项
- ❌ 侧边栏配色盘中的 Screw 色块
- ❌ 随机配色中对 Screw 的处理
- ❌ 详情页 lookup 中的 `SCREW_COLORS` 查找
- ❌ `applyMetalnessToScrew()` 方法（已被通用 `applyMetalness()` 替代）

---

## 界面布局

### 顶栏（Topbar）
- 左侧：Logo
- 右侧：**保存配色方案**按钮

### Canvas 区域
- 左上浮：`原色` / `参考色` 切换按钮
- 左下浮：**🎲 随机配色**按钮

### 侧边栏（Right Panel）
- 部件名称（中英对照）
- 配色盘（根据选中部件显示不同色块）
- 当前选中颜色预览

### 配色库抽屉（Saved Menu）
- 已保存的配色方案列表
- 可点击加载或删除

---

## 配色盘结构

### 普通部件（Basic / Matte / Metallic / MiniPulse）
使用通用 `COLOR_GROUPS` 数组，显示全部色块。

### 风扇（Fan）
使用专用 `FAN_COLORS` 数组（约8色）。

### 电池（Battery）
使用专用 `BATTERY_COLORS` 数组（约5色）。

### 螺丝（Screw）
**不显示配色盘**，初始化后自动银色。

---

## 主题切换

~~原界面右上角的 🌙 月亮图标按钮（深色/浅色切换）已移除。~~

如需恢复：
1. HTML 顶栏添加：`<button class="btn-icon" id="btn-theme-toggle" title="切换深色/浅色">🌙</button>`
2. JS 中恢复事件绑定：`document.getElementById('btn-theme-toggle').addEventListener('click', () => this.toggleTheme());`

---

## 文件结构
```
Safan_ColorPicker/
├── index.html          # 主页面
├── app.js              # 主逻辑（所有颜色/模型加载/交互）
├── style.css           # 样式
├── Logo/               # logo 图片
├── Models/             # GLB 模型文件
└── app_backup_*.js     # 历史备份
```

---

## 模型文件对应关系
```
Back_Color.glb     → Back_Color    → 背板
Bar_Color.glb      → Bar_Color     → 提手
FrontCap_Color.glb → FrontCap_Color → 前罩
Knob_Color.glb     → Knob_Color    → 旋钮
MainFrame_Color.glb → MainFrame_Color → 主框架
Usb_Color.glb      → Usb_Color     → 充电口
Fan.glb            → Fan           → 风扇
Battery.glb        → Battery       → 电池
Screw.glb          → Screw         → 螺丝
```

---

## 本地开发说明

### 启动 HTTP 服务
```bash
cd ~/Documents/Projects/Safan_ColorPicker && python3 -m http.server 9876
```

### 常见问题

**Q: 模型加载卡住**
A: 检查控制台是否有 `Uncaught SyntaxError`，可能是 JS 语法错误导致 `init()` 失败。

**Q: 螺丝消失**
A: 检查 `MODELS_FIXED` 是否包含 `'Screw'`，以及 `loadModel()` 中是否有 `!isColorable` 分支调用 `applyMetalness()`。

**Q: OrbitControls 不转**
A: 通常是 JS 报错导致 `init()` 提前退出。检查控制台 `TypeError`/`SyntaxError`。

---

## 翻译对照（formatName）
```javascript
{
  Back_Color: '背板',
  Battery: '电池',
  MainFrame_Color: '主框架',
  Usb_Color: '充电口',
  Bar_Color: '提手',
  Knob_Color: '旋钮',
  FrontCap_Color: '前罩',
  Fan: '风扇'
}
```