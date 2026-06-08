# 执行计划 A：配色核心

> 阶段：配色应用系统基础
> 前置条件：无（直接从手机版当前状态开始）
> 目标：让手机版的 `applyColor` 完整支持 colorType，实现 Reference 参考模式

---

## 一、本阶段目标

### 1.1 修复 applyColor（配色应用核心）

**现状问题：**
```javascript
// app_mobile_new.js 当前代码
applyColor(partName, hex) {
  const part = this.state.parts[partName];
  if (!part) return;
  part.currentColor = hex;
  this._setMeshColor(part.mesh, hex);  // ← 只设了 color，什么材质参数都没有
}
```

**目标效果：**
```javascript
applyColor(mesh, hex, colorType, extra) {
  // 1. 清除顶点颜色
  // 2. 根据 colorType 设置 roughness/metalness/emissive/opacity
  // 3. 支持 Basic/matte/translucent/glow/galaxy/gradient/cf
}
```

### 1.2 实现 Reference 参考模式

**PC 版 Reference 模式逻辑：**
```
- roughness = 1.0（纯漫反射，无高光）
- metalness = 0.0
- envMapIntensity = 0
- emissive = 0x000000
- translucent 类型保持 opacity/transparent
- 灯光切换为低强度环境光
```

---

## 二、修改文件

**主文件：** `app_mobile_new.js`

**需新增：**
- 完整的 `applyColor(mesh, hex, colorType, extra)` 方法
- `_applyReferenceLighting()` 方法
- `_applyStandardLighting()` 方法
- `_reapplyAllColors()` 方法
- `colorMode` state：`'official'` | `'reference'`

---

## 三、详细修改步骤

### 步骤 A-1：新增 state 字段

在 `constructor()` 的 `this.state` 中新增：
```javascript
this.state.colorMode = 'official';  // 'official' | 'reference'
```

---

### 步骤 A-2：重写 applyColor 方法

**删除** 现有的简单 `applyColor(partName, hex)` 和 `_setMeshColor(mesh, hex)`

**替换为** 完整的 PC 版逻辑（参考 app_v2.js L132-L259）：

```javascript
applyColor(mesh, hex, colorType, extra) {
  extra = extra || {};
  const color = new THREE.Color(hex);
  mesh.traverse((child) => {
    if (child.isMesh && child.material) {
      if (!child.material.isMeshStandardMaterial) {
        child.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
      }

      // 清除顶点颜色
      child.material.vertexColors = false;
      if (child.geometry && child.geometry.attributes.color) {
        child.geometry.deleteAttribute('color');
      }
      child.material.color.copy(color);

      // 重置材质参数
      child.material.roughness = 0.5;
      child.material.metalness = 0.1;
      child.material.emissive.set(0x000000);
      child.material.emissiveIntensity = 0;
      child.material.opacity = 1.0;
      child.material.transparent = false;

      // Reference 模式：flat shading
      if (this.state.colorMode === 'reference') {
        child.material.roughness = 1.0;
        child.material.metalness = 0.0;
        child.material.envMapIntensity = 0;
        child.material.emissive.set(0x000000);
        child.material.emissiveIntensity = 0;
        if (colorType !== 'translucent') {
          child.material.transparent = false;
          child.material.opacity = 1.0;
        }
      } else {
        // 根据 colorType 设置材质参数
        switch (colorType) {
          case 'Basic':
            child.material.roughness = 0.55;
            child.material.metalness = 0.05;
            break;
          case 'matte':
            child.material.roughness = 0.88;
            child.material.metalness = 0.05;
            break;
          case 'silk':
            child.material.roughness = 0.18;
            child.material.metalness = 0.35;
            break;
          case 'translucent':
            child.material.roughness = 0.25;
            child.material.metalness = 0.1;
            child.material.opacity = 0.9;
            child.material.transparent = true;
            break;
          case 'glow':
            child.material.roughness = 0.4;
            child.material.metalness = 0.1;
            const glowColor = new THREE.Color(hex);
            glowColor.multiplyScalar(1.4);
            child.material.emissive.copy(glowColor);
            child.material.emissiveIntensity = 0.6;
            break;
          case 'galaxy':
            child.material.roughness = 0.3;
            child.material.metalness = 0.2;
            child.material.emissive.set(new THREE.Color(hex));
            child.material.emissiveIntensity = 1.2;
            break;
          case 'gradient':
            child.material.roughness = 0.3;
            child.material.metalness = 0.15;
            const startHex = hex;
            const endHex = extra.hexEnd || '#ffffff';
            const geo = child.geometry;
            if (geo && geo.attributes.position) {
              const posAttr = geo.attributes.position;
              const count = posAttr.count;
              const startColor = new THREE.Color(startHex);
              const endColor = new THREE.Color(endHex);
              const colors = [];
              let minX = Infinity, maxX = -Infinity;
              for (let i = 0; i < count; i++) {
                const x = posAttr.getX(i);
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
              }
              const range = maxX - minX || 1;
              for (let i = 0; i < count; i++) {
                const x = posAttr.getX(i);
                const t = (x - minX) / range;
                const c = startColor.clone().lerp(endColor, t);
                colors.push(c.r, c.g, c.b);
              }
              geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
              geo.attributes.color.needsUpdate = true;
              child.material.vertexColors = true;
              child.material.map = null;
              child.material.needsUpdate = true;
            }
            break;
          case 'cf':
            child.material.roughness = 0.65;
            child.material.metalness = 0.25;
            child.material.color.multiplyScalar(0.75);
            break;
          default: // Matte group, etc.
            child.material.roughness = 0.85;
            child.material.metalness = 0.05;
        }
      }
    }
  });
}
```

---

### 步骤 A-3：修改调用点

**修改 `selectModalSwatch()` 中的调用：**

当前：
```javascript
this.applyColor(this.state.selectedPart, color.hex);
```

修改为：
```javascript
const colorType = color.type || 'Basic';
this.applyColor(part.mesh, color.hex, colorType, color);
```

**修改 `applyProjectColors()` 中的调用：**
```javascript
const colorObj = this.findColor(hex);
const colorType = colorObj ? (colorObj.type || 'Basic') : 'Basic';
this.applyColor(part.mesh, hex, colorType, colorObj || {});
```

**修改 `animateColorChange()` 调用后重新应用材质：**
在渐变完成后调用 `applyColor` 重设材质参数。

---

### 步骤 A-4：新增灯光切换方法

在文件中新增：

```javascript
_applyStandardLighting() {
  // 移除参考灯光，恢复标准灯光
  if (this._d50Lights) {
    this._d50Lights.forEach(l => this.scene.remove(l));
    this._d50Lights = [];
  }
  // 标准灯光已在 setupLights() 中添加
}

_applyReferenceLighting() {
  // 移除旧灯光
  if (this._d50Lights) {
    this._d50Lights.forEach(l => this.scene.remove(l));
    this._d50Lights = [];
  }
  this._d50Lights = [];

  // 低强度环境光
  const ambient = new THREE.AmbientLight(0xffffff, 0.18);
  this.scene.add(ambient);
  this._d50Lights.push(ambient);

  // 主光源
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.12);
  mainLight.position.set(1, 1.5, 1);
  this.scene.add(mainLight);
  this._d50Lights.push(mainLight);

  // 背光
  const backLight = new THREE.PointLight(0xffffff, 0.05);
  backLight.position.set(0, 0.5, -1.5);
  this.scene.add(backLight);
  this._d50Lights.push(backLight);
}
```

**在 `setupLights()` 中保存标准灯光引用：**
```javascript
setupLights() {
  this._standardLights = [];
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  this._standardLights.push(ambient);
  this.scene.add(ambient);
  const dl1 = new THREE.DirectionalLight(0xffffff, 1.0);
  dl1.position.set(5, 10, 5);
  this._standardLights.push(dl1);
  this.scene.add(dl1);
  const dl2 = new THREE.DirectionalLight(0xffffff, 0.3);
  dl2.position.set(-5, 3, -5);
  this._standardLights.push(dl2);
  this.scene.add(dl2);
}
```

---

### 步骤 A-5：新增 _reapplyAllColors 方法

```javascript
_reapplyAllColors() {
  if (this.state.colorMode === 'reference') {
    this._applyReferenceLighting();
  } else {
    this._applyStandardLighting();
  }
  Object.values(this.state.parts).forEach(part => {
    if (!part.isColorable) return;
    const colorObj = this.findColor(part.currentColor);
    const colorType = colorObj ? (colorObj.type || 'Basic') : 'Basic';
    if (part.colorType === 'gradient') {
      this.applyColor(part.mesh, part.currentColor, colorType, colorObj || {});
    } else {
      this.applyColor(part.mesh, part.currentColor, colorType, colorObj || {});
      this.animateColorChange(part.mesh, part.currentColor);
    }
  });
}
```

---

### 步骤 A-6：新增 findColor 辅助方法

需要从 `COLOR_GROUPS` 中按 hex 查找完整颜色对象：

```javascript
findColor(hex) {
  const lc = hex.toLowerCase();
  for (const grp of Object.values(this.colorGroups)) {
    for (const c of grp) {
      if (c.hex.toLowerCase() === lc || (c.displayHex && c.displayHex.toLowerCase() === lc)) return c;
    }
  }
  return null;
}
```

---

### 步骤 A-7：修改 randomizeColors

确保随机配色也正确设置 colorType：

```javascript
randomizeColors() {
  const parts = Object.keys(this.state.parts);
  const allColors = Object.values(this.colorGroups).flat();
  parts.forEach(partName => {
    const part = this.state.parts[partName];
    if (!part.isColorable) return;
    const randomColor = allColors[Math.floor(Math.random() * allColors.length)];
    const colorType = randomColor.type || 'Basic';
    this.applyColor(part.mesh, randomColor.hex, colorType, randomColor);
    part.currentColor = randomColor.hex;
    part.colorType = colorType;
  });
  this.showToast('已随机配色');
}
```

---

## 四、验证方法

### 4.1 Basic 材质
- 随机选一个 Basic 色
- 3D 视图中部件应有轻微光泽（roughness=0.55）

### 4.2 Matte 材质
- 将一个部件改为 Matte 类型颜色（如碳黑色 #11101）
- 部件应明显哑光（roughness=0.88）

### 4.3 Translucent 材质
- 将一个部件改为 Translucent 类型颜色（如冰蓝色 #B8CDE9）
- 部件应呈现半透明效果（opacity=0.9）

### 4.4 Reference 模式
- 切换到 Reference 模式后
- 所有部件应变为纯 flat 效果，无高光
- 切换回原色模式恢复标准材质

### 4.5 调试命令（浏览器控制台）
```javascript
// 查看当前配色模式
app.state.colorMode

// 强制切换到 Reference 模式
app.state.colorMode = 'reference';
app._reapplyAllColors();

// 强制切换回 Official 模式
app.state.colorMode = 'official';
app._reapplyAllColors();
```

---

## 五、风险与注意事项

1. **animateColorChange 与 gradient 冲突**：gradient 类型使用顶点颜色，animateColorChange 插值 color.r/g/b 会与顶点颜色冲突。`gradient` 类型的部件跳过我行渐变动画
2. **手机版 Battery/Fan 未区分处理**：目前 `applyColor` 对所有部件一视同仁，需后续补充 Battery/Fan 的专用颜色数组逻辑
3. **mesh.position.y = 10 偏移**：模型整体下移了 10 个单位，camera 参数需要同步适应

---

## 六、阶段产出

完成后，手机版将具备：
- ✅ 完整的 `applyColor(mesh, hex, colorType, extra)` 方法
- ✅ 8 种材质类型支持（Basic/matte/silk/translucent/glow/galaxy/gradient/cf）
- ✅ Reference 参考模式（flat shading）
- ✅ 配色模式切换核心逻辑

进入下一阶段前必须完成此阶段。