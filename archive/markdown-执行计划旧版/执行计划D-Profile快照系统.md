# 执行计划 D：Profile 快照系统 + 可选增强

> 阶段：Profile 快照保存 / 加载 / 删除 + 剩余可选功能
> 前置条件：无（独立于计划 A，可与计划 B 并行）
> 目标：实现 Profile 快照系统（独立于 Project 的简化保存）

---

## 一、本阶段目标

### 1.1 Profile 系统 vs Project 系统

| 维度 | Project 系统 | Profile 系统 |
|---|---|---|
| 定位 | 完整配色方案（多个部件） | 快速快照（单次保存） |
| 入口 | Toolbar「保存配色」 | 左侧栏虚线按钮 |
| 数量 | 可多个，按编号 | 可多个 |
| 名称 | 自动编号"配色方案 N" | 自动编号"Profile N" |
| localStorage | `sidan_projects_mobile` | `sidan_profiles_mobile` |
| 恢复动画 | ✅ 渐变过渡 | ✅ 渐变过渡 |
| PC 版 | ✅ 完整 | ✅ 完整 |

### 1.2 为什么手机版需要 Profile 系统？

PC 版有两个独立系统：
- **Project**（完整方案保存）
- **Profile**（快速快照，左侧栏缩略图）

手机版目前只有 Project 系统。Profile 系统是一个轻量替代方案，用户可以快速保存当前状态而不需要命名。

---

## 二、修改文件

**主文件：**
- `app_mobile_new.js` — 新增 Profile 相关方法
- `index_mobile.html` — 新增 Profile 入口 UI（可放在 Bottom Strip 顶部或 Modal 中）

---

## 三、详细修改步骤

### 步骤 D-1：新增 Profile state + localStorage

在 `constructor()` 的 `this.state` 中新增：
```javascript
this.state.profiles = [];
```

新增 `_loadProfiles()` 和 `_saveProfiles()` 方法：
```javascript
_loadProfiles() {
  try {
    const data = localStorage.getItem('sidan_profiles_mobile');
    if (data) return JSON.parse(data);
  } catch(e) {}
  return [];
}

_saveProfiles() {
  try {
    localStorage.setItem('sidan_profiles_mobile', JSON.stringify(this.state.profiles));
  } catch (e) {}
}
```

在 `init()` 中调用：
```javascript
this.state.profiles = this._loadProfiles();
```

---

### 步骤 D-2：新增 Profile 相关方法

```javascript
// 保存快照
saveProfile() {
  const colors = {};
  Object.entries(this.state.parts).forEach(([name, { currentColor, isColorable }]) => {
    if (!isColorable) return;
    colors[name] = currentColor;
  });
  // 生成缩略图（Canvas toDataURL）
  const thumbnail = this.renderer.domElement.toDataURL('image/png');
  const profileNum = (this.state.profiles.reduce((max, p) => Math.max(max, p.profileNum || 0), 0)) + 1;
  const profile = {
    id: Date.now(),
    profileNum,
    timestamp: new Date().toISOString(),
    thumbnail,
    colors,
  };
  this.state.profiles.push(profile);
  this._saveProfiles();
  this.showToast('Snapshot saved');
}

// 恢复快照（手机版使用简单 applyColor 签名）
restoreProfile(id) {
  const profile = this.state.profiles.find(p => p.id === id);
  if (!profile) return;
  Object.entries(profile.colors).forEach(([name, hex]) => {
    const part = this.state.parts[name];
    if (!part || !part.isColorable) return;
    part.currentColor = hex;
    this.applyColor(part.mesh, hex);
    this.animateColorChange(part.mesh, hex);
  });
  this.showToast('Snapshot restored');
}

// 删除快照
deleteProfile(id) {
  this.state.profiles = this.state.profiles.filter(p => p.id !== id);
  this._saveProfiles();
  this.showToast('Snapshot deleted');
}
```

**注意**：手机版 `applyColor(mesh, hex)` 使用简单签名（不是 PC 版的 4 参数），不需要 colorType。

---

### 步骤 D-3：新增 Profile 入口 UI

**方案：放在 Bottom Strip 收起态上方，点击弹出 Profile 列表**

在 `index_mobile.html` 的 Bottom Strip 上方新增一个浮动按钮：
```html
<div id="profile-btn" class="profile-btn" title="Snapshots">
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
</div>
```

**CSS：**
```css
.profile-btn {
  position: fixed;
  bottom: 100px;
  right: 16px;
  width: 44px; height: 44px;
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  z-index: 99;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  color: #666;
}
.profile-btn:active { transform: scale(0.95); }
```

**Profile 列表 Modal：**
```html
<div id="profile-modal" style="display:none; position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;">
  <div style="position:absolute;bottom:0;left:0;right:0;background:#fff;border-radius:16px 16px 0 0;max-height:70vh;overflow-y:auto;padding:16px;">
    <div style="text-align:center;font-size:15px;font-weight:600;margin-bottom:16px;">Snapshots</div>
    <div id="profile-list" style="display:flex;flex-wrap:wrap;gap:10px;"></div>
    <button class="modal-close-btn" id="profile-modal-close" style="margin-top:16px;width:100%;padding:12px;border-radius:8px;border:none;background:#f0f0f0;font-size:13px;">关闭</button>
  </div>
</div>
```

**JS 渲染：**
```javascript
showProfileModal() {
  const modal = document.getElementById('profile-modal');
  const list = document.getElementById('profile-list');
  modal.style.display = 'block';
  if (this.state.profiles.length === 0) {
    list.innerHTML = '<div style="flex:1;text-align:center;color:#999;padding:20px;">No snapshots yet</div>';
    return;
  }
  list.innerHTML = this.state.profiles.map(p => `
    <div class="profile-card" data-id="${p.id}" style="width:80px;cursor:pointer;">
      <img src="${p.thumbnail}" style="width:80px;height:80px;border-radius:8px;border:1px solid #e0e0e0;object-fit:cover;">
      <div style="font-size:10px;color:#666;text-align:center;margin-top:4px;">${p.profileNum || ''}</div>
    </div>
  `).join('');
  // 绑定点击恢复事件（删除由长按计划 F 实现）
  list.querySelectorAll('.profile-card').forEach(card => {
    card.addEventListener('click', e => {
      this.restoreProfile(parseInt(card.dataset.id));
      modal.style.display = 'none';
    });
  });
}
```

---

## 四、剩余可选功能（延后）

### 4.1 Summary 页面
手机屏幕空间有限，Summary 页面可以延后或简化为 Detail 区的增强版本。

### 4.2 下载模型链接
在 Toolbar 新增一个图标链接：
```html
<a href="https://makerworld.com.cn/zh/models/2545233..." target="_blank" class="tb-btn tb-btn-link" id="btn-download">↓</a>
```

---

## 五、执行计划总览

| 计划 | 任务 | 前置 | 优先级 |
|---|---|---|---|
| **A** | 配色核心（applyColor + Reference） | — | ⛔ 已跳过 |
| **B** | 保存/加载系统 | 无（可并行） | 🔴 高 |
| **C** | 配色模式切换 UI | A | ⛔ 已跳过 |
| **D** | Profile 快照系统 | 无（独立于 A） | 🟡 中 |
| **E** | Dark 主题 + 下载链接 | 无 | ⚪ 低 |

---

## 六、验证方法

### D-1 Profile 保存
1. 修改部件颜色
2. 点击 Profile 入口按钮
3. Modal 打开，点击保存快照
4. Toast 显示 "Snapshot saved"

### D-2 Profile 恢复
1. 点击 Profile 卡片
2. Modal 关闭，模型颜色渐变恢复
3. Toast 显示 "Snapshot restored"

### D-3 Profile 删除
**已取消。** 手机端删除操作由计划 F（长按编辑态）统一实现，此处不再单独做右上角删除叉。

删除逻辑归入计划 F：长按卡片 → 进入编辑态 → 显示删除按钮。