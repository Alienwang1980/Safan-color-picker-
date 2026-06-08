# Safan ColorPicker

Safan 3D 打印机配件颜色定制工具。Three.js 驱动的实时 3D 配色查看器，移动端优先。

## 技术栈

- Three.js r128
- GLTF 模型
- 纯前端静态（无需构建）

## 版本

- `2.0` — 基础配色功能
- `2.1` — 背景纹理系统、截图透明化、环境光自适应

## v2.1 主要改动

| 改动 | 说明 |
|------|------|
| 背景球体 | SphereGeometry → IcosahedronGeometry，消除极点纹理汇聚 |
| 背景纹理 | CanvasPattern 无缝平铺，从 11 个 SVG 图案中随机切换 |
| 图案尺寸 | tileSize 倍率 2.5→5.0，图案更大更稀疏 |
| 截图透明 | `scene.background = null` + `alpha: true`，配色卡缩略图透明底 |
| 环境光自适应 | 深色模式 0.55 / 浅色模式 0.75，白色更白 |
| 主相机拉远 | position.z 65→80 |
| 随机配色 | 同时切换背景纹理 |

## 目录结构

```
Safan_ColorPicker/
├── app_mobile_new.js    # 主程序（核心逻辑）
├── index_mobile.html    # 入口页面
├── colors.js            # 颜色定义
├── assets/
│   ├── patterns/        # SVG 背景纹理（11 个）
│   ├── Models/          # GLTF 模型文件
│   └── ...              # 其他素材
└── README.md
```

## 本地开发

```bash
python3 -m http.server 8080
# 访问 http://localhost:8080
```

iOS 真机测试：在同一局域网用 HTTP 访问 `http://<本机IP>:8080`。
