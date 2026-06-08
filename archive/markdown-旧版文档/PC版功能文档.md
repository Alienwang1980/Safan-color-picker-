# Safan Color Picker — PC 版功能文档

> 版本：app_v2.js (1,367 行) + index_v2.html
> 最后更新：2026-05-29

---

## 一、3D 场景与交互

### 模型结构
| Part 名称 | 可配色 | 材质 |
|---|---|---|
| Back_Color | ✅ | MeshStandardMaterial |
| Bar_Color | ✅ | MeshStandardMaterial |
| FrontCap_Color | ✅ | MeshStandardMaterial |
| Knob_Color | ✅ | MeshStandardMaterial |
| MainFrame_Color | ✅ | MeshStandardMaterial |
| Usb_Color | ✅ | MeshStandardMaterial |
| Fan | ✅ | 特殊风扇叶轮颜色 |
| Battery | ✅ | 特殊电池颜色 |
| Screw | ❌ | 固定银色金属质感 |

### 3D 渲染参数
- **相机**：PerspectiveCamera FOV=45，位置 (15,15,26)，lookAt (0,0,0)
- **渲染器**：WebGL，antialias=true，ACESFilmicToneMapping，SRGBColorSpace，pixelRatio=2
- **控制器**：OrbitControls，dampingFactor=0.08，minDistance=0.5，maxDistance=60

### 灯光系统（标准模式）
| 灯光 | 类型 | 强度 | 位置 |
|---|---|---|---|
| 环境光 | AmbientLight | 0.55 | — |
| 主方向光 | DirectionalLight | 1.0 | (5,10,5) |
| 补光 | DirectionalLight | 0.3 | (-5,3,-5) |
| 半球光 | HemisphereLight | 0.4 | — |

### 选择交互
- 点击 3D 模型部件 → 触发 `onCanvasClick` → `selectPart(name)` → `openPanel(name)`
- 选中部件通过 emissive white 高亮（emissiveIntensity=0.45）
- 点击空白处或关闭按钮 → `closePanel()` → 取消高亮

---

## 二、配色系统

### 配色库（COLOR_GROUPS）

| 分组 | 数量 | 类型标识 |
|---|---|---|
| PLA Basic | 33 色 | type: "Basic" |
| PLA Matte（磨砂） | 25 色 | type: "matte" |
| PLA Translucent（半透明） | 10 色 | type: "translucent" |

### 特殊部件颜色

| 部件 | 数量 | 颜色来源 |
|---|---|---|
| Battery | 5 色 | BATTERY_COLORS（黑/白/粉/灰/橙） |
| Fan | 2 色 | FAN_COLORS（灰/黑） |
| Screw | 1 色 | 固定银色 (#C0C0C0)，applyMetalness() |

### 颜色数据结构
```javascript
{
  name: "玉石白",      // 显示名称
  code: "10100",       // 配色编号
  hex: "#FFFFFF",      // 渲染用 hex
  displayHex: "#F0F0F0", // 展示用 hex（Official 模式）
  type: "Basic"        // 材质类型
}
```

### 材质类型与渲染参数（applyColor）

| 类型 | roughness | metalness | 特性 |
|---|---|---|---|
| Basic | 0.55 | 0.05 | 标准 |
| matte | 0.88 | 0.05 | 哑光 |
| silk | 0.18 | 0.35 | 丝滑 |
| translucent | 0.25 | 0.1 | opacity=0.9, transparent=true |
| glow | 0.4 | 0.1 | emissive（亮度×1.4），intensity=0.6 |
| galaxy | 0.3 | 0.2 | emissive=原色，intensity=1.2 |
| gradient | 0.3 | 0.15 | 顶点颜色（沿X轴渐变） |
| cf | 0.65 | 0.25 | 碳纤维，颜色暗化×0.75 |

### 配色模式（Color Mode）
- **Official（原色）**：`getRenderHex()` 返回 `color.hex`（渲染用）
- **Reference（参考模式）**： roughness=1.0, metalness=0.0，颜色显示 `color.hex`（非 displayHex），无高光反射

---

## 三、UI 布局

### 顶部栏（Topbar）
- 左：Logo（Safan）+ 下载模型按钮（跳转 MakerWorld）
- 右：**保存配色方案** 按钮（`btn-new-project`）→ 调用 `submitProject()`

### 主区域（Main）
- **左侧边栏**（72px）：缩略图列表 + 保存当前配色按钮（`save-btn`）→ 调用 `saveProfile()`
- **中间画布**：3D 渲染区域 + 左上角配色模式切换（原色/参考模式）+ 左下角随机按钮
- **右侧抽屉**（saved-menu，始终打开）：显示已保存的配色方案列表/详情

### 右侧面板（Right Panel）
- 点击部件时从右侧滑入（400px）
- 内容：部件名称 + 部件缩略图 + 颜色网格 + 确认按钮
- 关闭按钮或点击空白处关闭

---

## 四、保存与加载系统

### 项目（Projects）
> localStorage key: `sidan_projects`

保存当前完整配色方案（所有部件），数据结构：
```javascript
{
  id: 1748553600000,        // Date.now()
  name: "Project 1",       // 自动编号命名
  projectNum: 1,           // 项目序号
  timestamp: "2026-05-29T...", // ISO 时间
  thumbnail: "data:image/png;base64,...", // Canvas 截图
  colors: {                // 所有可配色部件的当前色
    Back_Color: "#C12E1F",
    Fan: "#9E9E9E",
    ...
  }
}
```

操作：
- **保存**：顶部栏「保存配色方案」→ `submitProject()`
- **加载**：点击侧边栏项目卡片 → `openProject(id)` → 应用颜色 + 显示详情
- **删除**：详情面板内「删除方案」按钮 → `deleteCurrentProject()` + confirm 确认

### 配色方案（Profiles）
> localStorage key: `sidan_profiles`

左侧边栏缩略图，仅保存配色（无名称），数据结构：
```javascript
{
  id: 1748553600001,
  timestamp: "...",
  thumbnail: "data:image/png;base64,...",
  colors: { Back_Color: "#...", ... },
  projectNum: 1  // 继承自 Project 名
}
```

操作：
- **保存**：左侧栏虚线按钮 → `saveProfile()`
- **加载**：点击缩略图 → `restoreProfile(id)` → 动画过渡颜色
- **删除**：缩略图右上角 × 按钮 → `deleteProfile(id)`

---

## 五、配色模式与显示

### 配色模式切换
- 左上角浮动按钮：「原色」(btn-original) / 「参考模式」(btn-reference)
- `colorMode` 状态：`'official'` | `'reference'`
- 切换时调用 `_reapplyAllColors()` 重新应用所有部件颜色

### Official vs Reference 差异

| 维度 | Official | Reference |
|---|---|---|
| 显示 hex | `color.hex` | `color.hex` |
| 实际渲染 | `color.hex` | `color.hex` |
| roughness | 类型默认值 | 1.0（纯漫反射） |
| metalness | 类型默认值 | 0.0 |
| 高光 | 有 | 无 |

### Reference 灯光配置
- AmbientLight: 0.18 强度
- DirectionalLight: 0.12 强度，正面偏上
- PointLight: 0.05 强度，背光（轮廓）

---

## 六、动画系统

### 颜色渐变（animateColorChange）
- 持续时间：300ms（一般应用）/ 400ms（project restore）
- 缓动：easeOutQuad（`p<0.5 ? 2p² : -1+(4-2p)p`）
- 同时插值顶点颜色（用于 gradient 类型）
- 正在动画时取消旧动画（`cancelAnimationFrame`）

### Gradient 类型特殊处理
- 使用顶点颜色，沿 mesh 世界坐标 X 轴从 minX→maxX 线性渐变
- 在 `_reapplyAllColors()` 中跳过 `animateColorChange`（避免与顶点颜色动画死循环）

---

## 七、功能清单

### 核心功能
- [x] 3D 模型加载（GLTF/GLB，8 个可配色部件 + 1 个固定部件）
- [x] 部件选择（射线检测 + 点击高亮）
- [x] 右侧面板配色选择（3 个分组：Basic/Matte/Translucent）
- [x] 配色确认应用（点击色块实时预览 + 确认按钮确认）
- [x] 颜色渐变动画

### 保存/加载功能
- [x] 保存完整配色方案（Project）
- [x] 加载历史配色方案
- [x] 删除配色方案
- [x] 保存配色快照（Profile，缩略图形式）
- [x] 恢复配色快照
- [x] 删除配色快照

### 显示/模式功能
- [x] Official 原色模式（displayHex）
- [x] Reference 参考模式（flat shading）
- [x] 随机配色（`randomizeColors()`）
- [x] 暗色主题切换（`toggleTheme()`）
- [x] 3D 模型下载链接（MakerWorld）

### UI 反馈
- [x] 加载进度提示（0-100%）
- [x] Toast 通知（2 秒自动消失）
- [x] 加载超时 fallback（15 秒强制隐藏）

### 响应式
- [x] ResizeObserver 监听容器尺寸变化
- [x] CSS transition 期间暂停渲染（防止黑屏）
- [x] 侧边栏展开/收缩动画

---

## 八、已知问题与设计决策

1. **Screw 固定银色**：不参与配色，metalness=0.95
2. **gradient 动画跳过**：`_reapplyAllColors` 中对 gradient 类型不调用 `animateColorChange`，避免顶点颜色与 rAF 循环冲突
3. **配色库无分类过滤**：右侧面板 `renderColorGrid` 直接展示所有分组，无 Basic/Mat Tab 切换
4. **配色方案 vs 项目**：两套系统并存（Profile=快照无名称，Project=完整命名方案）
5. **Submit Project 待开发**：Summary 页的 Submit 按钮目前只显示 toast "功能待开发"