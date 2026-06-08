# Safan ColorPicker 编码规范

## 技术栈
- **前端语言**: JavaScript (ES2020+), HTML5, CSS3
- **3D 引擎**: Three.js r128 (CDN 引入，通过 ES modules import)
- **模型格式**: GLTF/GLB (压缩二进制)
- **构建工具**: 纯前端静态项目，无需构建步骤
- **包管理**: npm (仅用于 ESLint/Prettier 等开发工具)
- **部署**: Cloudflare Pages (静态站点)

---

## 命名规则

| 种类 | 规则 | 示例 |
|------|------|------|
| 类 | PascalCase | `ColorApp`, `ProjectManager` |
| 函数/方法 | camelCase | `loadModel()`, `getColor()`, `_saveProjects()` |
| 私有方法 | 下划线前缀 | `_loadProjects()`, `_renderPalette()` |
| 变量/常量 | camelCase | `colorPanel`, `selectedId` |
| 常量（模块级） | SCREAMING_SNAKE_CASE | `DEFAULT_COLOR`, `FAN_COLORS` |
| CSS 类名 | kebab-case | `bottom-strip`, `color-swatch`, `strip-card` |
| HTML ID | kebab-case | `canvas-container`, `detail-area` |
| 文件名 | kebab-case | `app_mobile_new.js`, `index_mobile.html` |

### 模型部件命名（3D）
模型中的部件名使用 PascalCase，与 SPEC.md 中的命名表一致：
```javascript
// ✓ 正确
const MODELS_COLORABLE = ['Back_Color','Bar_Color','FrontCap_Color'];

// ✗ 避免
const colorableModels = ['back_color','bar_color'];
```

---

## 代码风格

### 缩进
- **JS**: 4 空格（使用空格，不用 Tab）
- **HTML**: 2 空格
- **JSON/YAML/Markdown**: 2 空格

### 引号
- **JS**: 单引号 `'string'`（需要转义时用反引号）
- **HTML 属性**: 双引号 `class="container"`

### 分号
- **JS**: 始终加分号（ESLint 会强制检查）

### 尾逗号
- 多行对象/数组末尾加逗号（ESLint auto-fix）
- 单行不加逗号

### 命名参考
```javascript
// ✓ 推荐的 JS 风格
const fanColors = [
  { hex: '#9E9E9E', name: '灰色' },
];

function updateColor(partName, hex) {
  if (!partName) return;
  this.state.parts[partName] = hex;
}
```

---

## 注释规范

### 类/方法注释（JSDoc 风格）
```javascript
/**
 * 加载 3D 模型并初始化场景
 * @param {string} modelPath - GLTF 模型路径
 * @returns {Promise<THREE.Group>} 加载完成的模型组
 */
async loadModel(modelPath) { ... }
```

### 分区注释（用长横线分隔文件内区域）
```javascript
// ──────────────── Project Management ────────────────
```

### 代码内注释
- 说明"为什么"而不是"做什么"（好的代码本身说明做什么）
- 复杂逻辑必须加注释
- TODO 注释格式：`// TODO: 后续优化XXX`
- `catch(e) {}` 必须加注释说明为什么忽略

---

## 文件结构
```
/
├── index_mobile.html          # 入口页面
├── app_mobile_new.js          # 主应用逻辑
├── colors.js                  # 配色数据
├── Models/                    # GLTF 模型文件
│   └── *.glb
├── Logo/                      # 品牌资源
├── package.json               # ESLint/Prettier 依赖
├── .editorconfig              # 编辑器配置
├── .eslintrc*                 # ESLint 配置（内嵌于 package.json）
├── .prettierrc.yaml           # Prettier 格式配置
├── .gitignore                 # Git 忽略文件
├── SPEC.md                    # 功能规格
├── README.md                  # 项目简介
└── 执行计划/                   # 项目管理文档
    └── ...
```

---

## 工作流程规范

### Git 分支策略
```
main  ← 稳定发布版本（仅从 dev 合并）
  ↑
dev   ← 日常开发主分支
```
1. 所有开发在 `dev` 分支进行
2. 每次修复完 Bug 或完成特性后，提交到 `dev`
3. 测试稳定后合并到 `main`

### 提交信息格式
```
<类型>: <简短描述>

类型: fix / feat / refactor / docs / chore / style
示例:
  fix: 修复 GLTF 模型加载时颜色不同步的问题
  feat: 新增配色方案导出功能
  docs: 更新编码规范文档
```

### 代码质量检查
```bash
# 在提交前运行
npm run lint          # 检查 JS 代码问题
npm run lint:fix      # 自动修复可修复的问题
npm run format:check  # 检查格式（Prettier）
npm run format        # 自动格式化
```

---

## 注意事项
1. 兼容性目标：iOS Safari / Chrome / Android / 微信内置浏览器
2. 使用 `100dvh` 替代 `100vh` 解决移动端地址栏问题
3. 所有触摸交互使用 `touch-action: none` 防止页面滚动
4. ES modules 使用裸 `import`（通过 importmap 或 CDN 映射）
