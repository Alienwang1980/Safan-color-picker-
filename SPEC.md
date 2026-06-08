# Safan_ColorPicker - 项目规格文档

> 版本：1.1  
> 日期：2026-05-28  
> 状态：规划中（已整合三轮验证修正）

---

## 1. 项目概述

**项目名称：** Safan_ColorPicker  
**项目类型：** 3D 交互式产品展示网页  
**核心功能：** 风扇 3D 模型查看 + 部件独立换色（拓竹耗材颜色库）  
**目标用户：** 风扇购买者/配置工具用户  
**上线方式：** Vercel 静态部署（公网开放访问）

---

## 2. 文件结构

```
Safan_ColorPicker/
├── index.html              ← 单文件（含内联 CSS/JS，所有逻辑）
├── README.md                ← 项目说明（含本地启动命令）
└── models/                  ← GLB 模型文件夹（9 个文件）
    ├── Back_Color.glb           ← 后盖（可换色）
    ├── Bar_Color.glb             ← 把手（可换色）
    ├── FrontCap_Color.glb        ← 前壳（可换色）
    ├── Knob_Color.glb            ← 旋钮（可换色）
    ├── MainFrame_Color.glb       ← 主体框架（可换色）
    ├── Usb_Color.glb            ← 充电口（可换色）
    ├── Screw.glb               ← 螺丝（默认金属色）
    ├── Fan.glb                 ← 风扇主体（默认色）
    └── Battery.glb             ← 电池（默认色）
```

**命名规则：**
- `Color` 后缀 = 可换色部件
- 无后缀 = 仅展示部件

---

## 3. Blender 导出规范（含修正）

### 导出前准备（关键步骤）

**每个部件单独导出，导出前执行：**
1. 选中部件 → `Ctrl+A` → **All Transform**（将变换写入 mesh data，rotation=0, scale=1）
2. 确认 Scale = 1.0（场景属性中检查）
3. 确认无父物体（所有部件独立，不嵌套）

**导出设置：**
| 设置项 | 值 |
|--------|-----|
| 格式 | GLTF Binary (.glb) |
| 应用变换 | ✓ 勾选（Object → Apply → All Transform后再导出） |
| 应用修饰器 | ✓ 勾选 |
| 写出法线 | ✓ 勾选 |
| Auto-Smooth | ✓ 勾选（曲面部件避免棱角） |
| 材质 | ✓ 保留（但颜色信息不重要，Web端用 MeshStandardMaterial.color 覆盖） |
| 原点 | World Origin（部件在 Blender 中的位置 = 最终组装位置） |

### 颜色替换机制（重要）

**方案：MeshStandardMaterial.color 直接换色**

- Blender 导出时材质使用默认灰白即可
- Web 端使用 `THREE.MeshStandardMaterial`，通过 `material.color.set(hex)` 换色
- 不依赖贴图或 UV，换色逻辑简单高效

### 组装验证（上线前必须验证）

- 8 个 GLB 加载后在 Three.js 场景中手动检查边界衔接
- 允许微小缝隙，但部件之间不应有明显重叠
- 如有偏移，创建 `models/assembly_offsets.json` 记录每个部件的 offset（可选）

---

## 4. 功能模块

### 4.1 3D 查看器

| 功能 | 实现 |
|------|------|
| 视角旋转 | OrbitControls（鼠标拖拽 / 单指滑动） |
| 视角平移 | OrbitControls（鼠标右键 / 双指滑动） |
| 视角缩放 | OrbitControls（滚轮 / 双指捏合） |
| 初始视角 | (0, 2, 5)，俯视角度，能看到完整风扇 |
| 自动旋转 | 开关按钮，可开可关；默认关闭；速度：0.5 rad/s |

### 4.2 部件交互

| 功能 | 实现 |
|------|------|
| 点击识别部件 | Raycaster（点击 mesh） |
| 选中高亮 | 材质 emissive 变化（白色 glow），暗色部件也能看清 |
| 取消选中 | 点击空白区域 或 ESC |
| 仅展示部件 | Fan.glb / Battery.glb 不参与 Raycaster 检测，不显示颜色选择器 |
| 颜色切换动画 | 300ms 渐变过渡（使用 TWEEN 或手动 lerp） |

### 4.3 颜色选择

| 功能 | 实现 |
|------|------|
| 颜色来源 | 拓竹耗材颜色库（42 色） |
| 换色操作 | 点击部件 → 点击颜色色块 → 300ms 渐变变色 |
| 当前颜色显示 | 部件列表中显示：色块 + "颜色名称 耗材编号" |
| 重置功能 | 一键恢复所有部件默认色（默认色：各自第一次加载时的颜色） |
| 导出功能 | 导出 JSON，包含每个可换色部件的 color name + hex + 耗材编号 |

---

## 5. 拓竹耗材颜色库

### 5.1 颜色数据（42 色）

**Basic 系列（16 色）**

| 颜色名称 | 耗材编号 | HEX |
|---------|---------|-----|
| 玉石白 | 10100 | #FFF3E7 |
| 黑色 | 10101 | #161616 |
| 白色 | 10102 | #F7F7F7 |
| 灰色 | 10103 | #B1B1B1 |
| 红色 | 10200 | #E1322A |
| 橙色 | 10300 | #F37E2A |
| 黄色 | 10400 | #F4E936 |
| 绿色 | 10501 | #3BA23C |
| 蓝色 | 10601 | #3581C4 |
| 青色 | 10603 | #29C5D2 |
| 靛青色 | 10605 | #1F5A8B |
| 紫色 | 10700 | #913D89 |
| 棕色 | 10800 | #94543E |
| 米黄色 | 10901 | #EDE3D6 |
| 粉色 | 11001 | #F0A2BF |
| 军绿色 | 10502 | #6F6A3F |
| 浅蓝色 | 10602 | #73A9DA |

**Matte 系列（26 色）**

| 颜色名称 | 耗材编号 | HEX |
|---------|---------|-----|
| 碳黑色 | 11101 | #000000 |
| 象牙白 | 11100 | #FFFFFF |
| 灰白色 | 11103 | #CBC6B8 |
| 雾灰色 | 11102 | #9B9EA0 |
| 水管灰 | 11104 | #757575 |
| 深红色 | 11202 | #BB3D43 |
| 猩红色 | 11200 | #DE4343 |
| 樱花粉 | 11201 | #E8AFCF |
| 梅紫色 | 11204 | #950051 |
| 赤陶色 | 11203 | #B15533 |
| 橘橙色 | 11300 | #F99963 |
| 柠檬黄 | 11400 | #F7D959 |
| 沙漠色 | 11401 | #E8DBB7 |
| 苹果绿 | 11502 | #C2E189 |
| 草绿色 | 11500 | #61C680 |
| 深绿色 | 11501 | #68724D |
| 海蓝色 | 11600 | #0078BF |
| 天蓝色 | 11603 | #56B7E6 |
| 冰蓝色 | 11601 | #A3D8E1 |
| 深蓝色 | 11602 | #042F56 |
| 丁香紫 | 11700 | #AE96D4 |
| 拿铁棕 | 11800 | #D3B7A7 |
| 焦糖色 | 11803 | #AE835B |
| 深棕色 | 11801 | #7D6556 |
| 黑巧克力 | 11802 | #4D3324 |

### 5.2 颜色库 UI 布局（已定义）

**桌面端（>768px）：**
- 右侧侧边栏，分上下两个区（Basic / Matte）
- 每个系列默认折叠，点击标题展开/收起
- 色块以网格展示（小方块 + 颜色名称）
- 选中色块：白色 2px 边框

**移动端（≤768px）：**
- 底部抽屉式，默认收起（只露出 Handle 条）
- 向上拉展开，显示全部 42 色（横向滚动）
- 色块触控区域 ≥ 44px

---

## 6. UI 布局

### 6.1 整体布局

```
+------------------------------------------+
|  Safan_ColorPicker    [旋转] [重置] [导出] |
+------------------------------------------+
|                    |                      |
|                    |   部件列表            |
|    3D Canvas       |  - 前壳 [色块] [名]   |
|    (Three.js)      |  - 后盖 [色块] [名]   |
|                    |  ...                  |
|                    |   ──────────         |
|                    |   颜色库面板          |
|                    |  [Basic] / [Matte]   |
|                    |  ■ ■ ■ ■ ■ ■        |
+------------------------------------------+
```

### 6.2 组件清单

| 组件 | 描述 |
|------|------|
| 标题栏 | 项目名称 + 旋转开关 + 重置 + 导出 |
| 3D Canvas | Three.js 渲染区域，响应式宽度 |
| 部件列表 | 7 个可换色部件，每行显示：色块 + 部件名 + 当前颜色名 |
| 颜色库面板 | 42 色 Basic/Matte 分组，网格布局 |
| Loading 提示 | 全屏居中白色字体 + 加载动画 |
| 错误提示 | 全屏红色提示，含具体错误信息 |
| 移动端抽屉 | 底部抽屉，向上拉展开 |

### 6.3 选中部件高亮方案

- 方案：emissive 白色 glow（`material.emissive.set(0xffffff)`，`emissiveIntensity: 0.3`）
- 取消选中时：`emissiveIntensity: 0`
- 暗色部件（深色 HEX）也能清晰可见

---

## 7. 技术架构

### 7.1 技术栈

| 项目 | 选择 |
|------|------|
| 3D 引擎 | Three.js r128+（ES modules CDN） |
| 模型加载 | GLTFLoader（Three.js 内置） |
| 视角控制 | OrbitControls（Three.js 内置） |
| 点击检测 | Raycaster |
| 颜色过渡 | 手动 lerp 或 CSS transition（视实现方式定） |
| 样式 | 内联 CSS（无外部依赖） |
| 构建工具 | 无（单文件直接运行） |

### 7.2 CDN 引入（关键修正）

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.128.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.128.0/examples/jsm/"
  }
}
</script>
<script type="module">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
</script>
```

**必须使用 importmap**，否则 ES modules 无法正确解析 three 路径。

### 7.3 相机与光照

| 项目 | 设置 |
|------|------|
| 相机类型 | PerspectiveCamera（FOV 45°） |
| 相机初始位置 | (0, 2, 5) |
| 相机目标点 | (0, 0, 0) |
| 主光源 | DirectionalLight (0xffffff, 1.0) from (5, 10, 5) |
| 补光 | DirectionalLight (0xffffff, 0.3) from (-5, 5, -5) |
| 环境光 | AmbientLight (0x404040, 0.5) |
| 背景 | CSS 深色渐变（#1a1a2e → #16213e）而非 Three.js background |
| 地面 | 半透明网格平面（GridHelper），帮助感知空间位置 |

### 7.4 响应式断点

| 断点 | 布局 |
|------|------|
| >768px（桌面） | 左侧 Canvas + 右侧侧边栏（固定宽度 280px） |
| ≤768px（移动端） | 全屏 Canvas（顶部） + 底部抽屉（颜色库） |
| ≤480px（窄屏） | 同移动端，但侧边栏宽度 100% |

### 7.5 内存管理

**颜色切换时 dispose 旧材质（防止内存泄漏）：**
```js
function disposeMaterial(mesh) {
  if (mesh.material) {
    mesh.material.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    }
  }
}
```

**页面 unload 时清理：**
```js
window.addEventListener('beforeunload', () => {
  renderer.dispose();
  geometry.dispose();
  material.dispose();
});
```

---

## 8. 坑点与应对（已整合）

| 坑点 | 应对 |
|------|------|
| CORS（file:// 无法加载 GLB） | README 标注本地启动命令 `npx serve .` |
| importmap 配置 | 正确配置 importmap（见 7.2） |
| 模型原点对齐未验证 | 上线前本地验证组装效果 |
| GLB MIME 类型 | Vercel 静态部署默认正确，部署后浏览器 Network 面板确认 |
| 模型加载失败无提示 | Loading 提示 + try/catch + 全局 error handler + 明确错误信息 |
| 屏幕尺寸适配 | CSS 响应式 + `window.addEventListener('resize', ...)` |
| 移动端触控 | OrbitControls 原生支持，UI 热区 ≥ 44px |
| 浏览器兼容性 | 检测 WebGL 支持，不支持时提示升级 Chrome/Safari |
| 颜色显示一致性 | 原色 HEX，sRGB 色彩空间，无滤镜 |
| 内存泄漏 | dispose Material + beforeunmount 清理 |
| HTTPS | Vercel 自动配置 |
| 导出 JSON | 定义 schema（见下方） |
| 颜色切换无动画 | 300ms lerp 渐变 |
| Blender 导出参数 | 见第 3 节导出规范 |

### 浏览器兼容性

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 79+ |
| Firefox | 72+ |
| Safari | 15+ |
| Edge | 79+ |

---

## 9. 导出 JSON Schema

```json
{
  "version": "1.0",
  "exported_at": "2026-05-28T00:00:00Z",
  "model": "Safan_Fan",
  "parts": {
    "front_shellColor": {
      "material_name": "front_shell",
      "color_name": "碳黑色",
      "filament_code": "11101",
      "hex": "#000000"
    },
    ...
  }
}
```

---

## 10. 开发流程

### 阶段 1：本地开发

```bash
cd ~/Documents/Projects/Safan_ColorPicker
npx serve .
# 浏览器打开 http://localhost:3000
```

### 阶段 2：模型接入

- 用户导出 8 个 GLB 文件到 models/
- 验证 8 个部件组装位置正确
- 验证点击检测准确

### 阶段 3：功能开发

1. ✅ 基础场景（相机、光照、Controls）
2. ✅ 单个几何体模拟风扇（验证逻辑）
3. ✅ 接入真实 GLB
4. ✅ Raycaster 点击部件 + emissive 高亮
5. ✅ 颜色库接入（42 色数组）
6. ✅ 颜色切换 + 300ms 渐变动画
7. ✅ UI 细节（选中状态、颜色名称显示）
8. ✅ 重置 + 导出 JSON
9. ✅ 响应式布局（桌面/平板/手机）
10. ✅ 错误处理 + Loading 提示

### 阶段 4：测试

- [ ] 本地 `npx serve .` 测试通过
- [ ] 8 个 GLB 全部正确加载
- [ ] 42 种拓竹颜色全部显示，按 Basic/Matte 分组
- [ ] 点击部件 → 点击颜色 → 300ms 渐变变色
- [ ] 每个部件显示当前颜色名称和编号
- [ ] 选中部件 emissive 高亮可见（包括暗色部件）
- [ ] 重置按钮功能正常
- [ ] 导出 JSON 功能正常，格式正确
- [ ] 自动旋转开关功能正常
- [ ] 响应式布局（桌面/平板/手机）
- [ ] Safari 15+ 测试通过
- [ ] 移动端触控正常（iOS/Android）
- [ ] 模型加载失败有明确错误提示
- [ ] 页面加载中有 Loading 提示

### 阶段 5：上线

1. 打包 `Safan_ColorPicker` 文件夹
2. 拖拽到 https://vercel.com/dashboard
3. 获得公网 URL，立即可访问

---

## 11. 上线检查清单

- [ ] 风扇模型能正常加载和旋转
- [ ] 42 种拓竹颜色全部显示，按 Basic/Matte 分组折叠
- [ ] 点击部件 → 点击颜色 → 300ms 渐变变色
- [ ] 每个部件显示当前颜色名称和耗材编号
- [ ] 颜色色块与真实耗材颜色视觉一致
- [ ] 选中部件 emissive 高亮（包括暗色部件）
- [ ] 重置按钮功能正常
- [ ] 导出 JSON 功能正常（schema 正确）
- [ ] 自动旋转开关功能正常
- [ ] 响应式布局（桌面/平板/手机）
- [ ] Safari 15+ 测试通过
- [ ] 移动端触控正常（iOS/Android）
- [ ] 模型加载失败有明确错误提示
- [ ] 页面加载中有 Loading 提示
- [ ] 无内存泄漏（切换颜色后 GPU 内存稳定）
- [ ] GLB 文件 Content-Type 正确（application/octet-stream）

---

## 12. 待定事项

| 事项 | 状态 |
|------|------|
| 8 个 GLB 模型文件 | 待用户提供 |
| 默认颜色配置 | 每个部件加载后第一次颜色作为默认色 |

---

## 13. 参考

- Three.js 文档：https://threejs.org/docs/
- Vercel 部署：https://vercel.com
- OrbitControls：支持鼠标/触控操作
- Raycaster：Three.js 内置点击检测
- importmap：https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
