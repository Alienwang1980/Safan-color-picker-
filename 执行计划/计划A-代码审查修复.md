     1|     1|# 计划 A：代码审查修复（Bug Fixes）
     2|     2|
     3|     3|> ⚠️ 代码执行优先级：与第 5 步（配色库）/ 第 7 步（UI 整体化）并行，这些 Bug 在 3D 渲染、选色交互、数据一致性层面上独立于布局/UI 重构
     4|     4|> 建议执行顺序：A → 第 5 步 + 第 7 步（并行） → 第 8 步（细节完善）→ 第 9 步（数据整合）→ 第 10 步（云端部署）
     5|     5|> 审查时间：2026-05-30，涉及文件：`app_mobile_new.js`、`colors.js`、`index_mobile.html`
     6|     6|
     7|     7|---
     8|     8|
     9|     9|## 问题清单
    10|    10|
    11|    11|| # | 标题 | 严重度 | 涉及文件 | 行号 |
    12|    12||---|------|--------|----------|------|
    13|    13|| 1 | 玉石白与白色 hex 完全重复导致颜色查找歧义 | 🔴 严重 | `colors.js` | 4,6 |
    14|    14|| 2 | `collapseBottomStrip()` 方法重复定义 | 🟡 中等 | `app_mobile_new.js` | 420, 479 |
    15|    15|| 3 | `applyProjectColors()` 并发动画可能卡顿（**补充：颜色格式不统一，saveCurrentProject 输出小写 hex，colors.js 使用大写 hex**） | 🟡 中等 | `app_mobile_new.js` | 755-766, 803 |
    16|    16|| 4 | `randomizeColors()` Fan 颜色不合法 | 🟡 中等 | `app_mobile_new.js` | 874-881 |
    17|    17|| 5 | 选色后自动关闭 Modal，无法连续选色 | 🟡 中等 | `app_mobile_new.js` | 688-689 |
    18|    18|| 6 | 初始加载方案预览色全灰误导 | 🟡 中等 | `app_mobile_new.js` | 428-476 |
    19|    19|| 7 | Fan 颜色约束仅在加载时存在，选色时无限制 | 🔵 小问题 | `app_mobile_new.js` | 225-226, 697-699 |
    20|    20|| 8 | `.strip-card-colors` 预览色块 CSS 高度未定义（**色块完全不可见**） | 🔵 小问题 | `index_mobile.html` | 143-148 |
    21|    21|| 9 | `saveCurrentProject()` 与计划中 `createNewProject()` 功能重叠待废弃 | 🔵 小问题 | `app_mobile_new.js` | 786-823 |
    22|    22|| 10 | `deleteProject()` 后模型颜色残留 | 🟡 中等 | `app_mobile_new.js` | 566-573 |
    23|    23|| 11 | `this.colorGroups` 缺乏防御性检查 | 🔵 小问题 | `app_mobile_new.js` | 557-560, 697-699, 874-881 |
    24|    24|| 12 | Three.js 版本过旧（r128，2021年发布） | 🔵 小问题 | `index_mobile.html` | 535-536 |
    25|    25|| 13 | `preserveDrawingBuffer: true` 不必要消耗性能 | 🔵 小问题 | `app_mobile_new.js` | 102 |
    26|    26|| **14** | **`deleteCurrentProject()` 与方法死代码 — 两个方法功能重叠且不被调用** | 🔵 小问题 | `app_mobile_new.js` | 566-573, 825-834 |
    27|    27|| **15** | **`detail-area` 删除按钮事件委托不足 — 点击文字可能不触发删除** | 🟡 中等 | `app_mobile_new.js` | 544 |
    28|    28|| **16** | **`submitProject()` 空占位符** | 🔵 小问题 | `app_mobile_new.js` | 836-838 |
    29|    29|| **17** | **保存/加载的 hex 大小写不统一 — `getHexString()` 输出小写，`colors.js` 使用大写** | 🔵 小问题 | `app_mobile_new.js` | 803, `colors.js` |
    30|    30|| **18** | **`FAN_COLORS` 格式不统一 — 含 `name` 字段的对象，而 `colorGroups` 中的颜色缺 `name`** | 🔵 小问题 | `app_mobile_new.js` | 9-12 |
    31|    31|| **19** | **全屏点击关闭 Modal 时也收了 DetailArea — 点击空白区域先 `collapseDetailArea()` 再检查 Modal** | 🔵 小问题 | `app_mobile_new.js` | 166 |
    32|    32|| **20** | **`_loadProjects()` 的 localStorage key 名称不一致 — 用 `sidan_projects_mobile`（带 typo "sidan"）** | 🔵 小问题 | `app_mobile_new.js` | 772 |
    33||| **21** | **HTML 中缺少 `id='loading'` / `id='loading-text'` 元素 — 加载进度不可见** | 🔵 小问题 | `index_mobile.html` | — |
    34||| **22** | **`closeModal()` 不取消选中部件 outline — 选色对话框关闭后 emissive 高亮残留** | 🔵 小问题 | `app_mobile_new.js` | 612-617 |
    35||| **23** | **`collapseBottomStrip()` 两次定义中 opacity=0 无 CSS transition — 视觉突兀** | 🔵 小问题 | `app_mobile_new.js`, `index_mobile.html` | 479-488 |
    36||| **24** | **`<a>` 链接缺少 `rel='noopener noreferrer'` — 安全最佳实践** | 🔵 小问题 | `index_mobile.html` | 479-481 |
    37||| **25** | **iOS safe-area 未适配 — `#bottom-strip` `bottom:0` 无 `env(safe-area-inset-bottom)`** | 🔵 小问题 | `index_mobile.html` | 80-88 |
    38||| **26** | **`#color-picker-modal` + `#picker-grid` 死 HTML/死代码 — 从未显示，含事件绑定** | 🔵 小问题 | `index_mobile.html`, `app_mobile_new.js` | 515-521, 641-642 |
    39||| **27** | **`colorGroups` 无防御性检查 — `colors.js` 加载失败即崩溃** | 🔵 小问题 | `app_mobile_new.js` | 57, 698, 875 |
    40||| **28** | **`window.__BATTERY_COLORS` 定义但从未在 `app_mobile_new.js` 中引用** | 🔵 小问题 | `colors.js` | 78-84 |
    41||| **29** | **`onCanvasPointerUp` 内部双重 `pointerMoved` 检查 — 外层已拦截，内层永远为 false** | 🔵 小问题 | `app_mobile_new.js` | 164 |
    42||| **30** | **`saveCurrentProject()` 每次都遍历 mesh 层级取颜色 — 可直接用 `part.currentColor`** | 🔵 小问题 | `app_mobile_new.js` | 789-806 |
    43||| **31** | **`state.isEditMode` 未在构造器中预初始化 — 依赖 JS 的 undefined 转 false** | 🔵 小问题 | `app_mobile_new.js` | 25-31, 379 |
    44||| **32** | **`btnSave` 声明缩进 6 个空格 vs 其余代码 4 个空格 — 代码风格不一致** | 🔵 小问题 | `app_mobile_new.js` | 80 |
    45|    33|
    46|    34|---
    47|    35|
    48|    36|## Bug 1 — 玉石白与白色 hex 完全重复
    49|    37|
    50|    38|**现状**：`colors.js` 中「玉石白」(第4行) 和「白色」(第6行) 的 `hex` 都是 `#FFFFFF`，但 `displayHex` 也都是 `#F0F0F0`。`findColorByHex()` 遍历分组时返回**第一个**匹配项，永远匹配到「玉石白」，「白色」永远无法被正确识别。
    51|    39|
    52|    40|**影响范围**：
    53|    41|- `expandDetailArea()` 中调用 `findColorByHex(hex)` 显示颜色名称时，「白色」方案永远显示为「玉石白」
    54|    42|- 所有通过 `findColorByHex()` 查找颜色的场景
    55|    43|
    56|    44|**修改方案**：
    57|    45|
    58|    46|方案 A（推荐 — 区分真白色）：将「白色」的 `hex` 改为使用 `displayHex` 值 `#F0F0F0` 作为真正的存储 hex，保持「玉石白」为 `#FFFFFF`。这样：
    59|    47|- 玉石白 → `#FFFFFF`（纯白）
    60|    48|- 白色 → `#F0F0F0`（近白，有轻微暖调）
    61|    49|
    62|    50|方案 B（去重）：删除「白色」条目，保留「玉石白」，两个名称合并为「玉石白/白色」。
    63|    51|
    64|    52|**推荐方案 A**，因为两种颜色确实在实物上存在差异（玉石白偏暖、白色偏冷），区分对待更准确。
    65|    53|
    66|    54|### 修改详情
    67|    55|
    68|    56|**文件**：`colors.js`
    69|    57|
    70|    58|```diff
    71|    59|- {"name":"白色","code":"10102","hex":"#FFFFFF","displayHex":"#F0F0F0","type":"Basic"},
    72|    60|+ {"name":"白色","code":"10102","hex":"#F0F0F0","displayHex":"#F0F0F0","type":"Basic"},
    73|    61|```
    74|    62|
    75|    63|**验证**：
    76|    64|1. 应用中存在白色和玉石白两种颜色可选
    77|    65|2. 选中白色方案后，详情页显示的颜色名称为「白色」而非「玉石白」
    78|    66|3. `findColorByHex('#F0F0F0')` 返回 name="白色"
    79|    67|4. `findColorByHex('#FFFFFF')` 返回 name="玉石白"
    80|    68|
    81|    69|---
    82|    70|
    83|    71|## Bug 2 — `collapseBottomStrip()` 重复定义
    84|    72|
    85|    73|**现状**：`app_mobile_new.js` 中 `collapseBottomStrip()` 定义了两处：
    86|    74|
    87|    75|- **第 420-426 行**（原始版本）：
    88|    76|  ```javascript
    89|    77|  collapseBottomStrip() {
    90|    78|    this.state.bottomStripExpanded = false;
    91|    79|    const strip = document.getElementById('bottom-strip');
    92|    80|    const detail = document.getElementById('detail-area');
    93|    81|    if (strip) strip.classList.add('collapsed');
    94|    82|    if (detail) detail.classList.remove('visible');
    95|    83|  }
    96|    84|  ```
    97|    85|- **第 479-488 行**（覆盖版本，多了 `detail.style.opacity = '0'`）：
    98|    86|  ```javascript
    99|    87|  collapseBottomStrip() {  // 重复定义
   100|    88|    this.state.bottomStripExpanded = false;
   101|    89|    const strip = document.getElementById('bottom-strip');
   102|    90|    const detail = document.getElementById('detail-area');
   103|    91|    if (strip) strip.classList.add('collapsed');
   104|    92|    if (detail) {
   105|    93|      detail.classList.remove('visible');
   106|    94|      detail.style.opacity = '0';  // 多出的行
   107|    95|    }
   108|    96|  }
   109|    97|  ```
   110|    98|
   111|    99|虽然 JS 中后定义的版本会覆盖前者，所有调用实际上走的是第 479 行的版本，**但这是严重的代码异味**：重复定义导致后续维护者可能只改了第一个版本而第二个没改，造成难以排查的 Bug。
   112|   100|
   113|   101|**修改方案**：删除第 420-426 行的旧版本定义，保留第 479-488 行的版本。因为后者功能更完整（额外设置了 opacity）。
   114|   102|
   115|   103|### 修改详情
   116|   104|
   117|   105|**文件**：`app_mobile_new.js`
   118|   106|
   119|   107|删除第 420-427 行（从 `collapseBottomStrip() {` 到包裹它的空行），只保留后面的版本。
   120|   108|
   121|   109|```diff
   122|   110|-  collapseBottomStrip() {
   123|   111|-    this.state.bottomStripExpanded = false;
   124|   112|-    const strip = document.getElementById('bottom-strip');
   125|   113|-    const detail = document.getElementById('detail-area');
   126|   114|-    if (strip) strip.classList.add('collapsed');
   127|   115|-    if (detail) detail.classList.remove('visible');
   128|   116|-  }
   129|   117|-
   130|   118|```
   131|   119|
   132|   120|**验证**：
   133|   121|1. 代码中不存在 `collapseBottomStrip` 重复定义
   134|   122|2. `toggleBottomStrip()` 和 `deleteProject()` 中调用的 `collapseBottomStrip()` 行为不变
   135|   123|3. Strip 收起时 detail 的 opacity 被设为 0
   136|   124|
   137|   125|---
   138|   126|
   139|   127|## Bug 3 — `applyProjectColors()` 并发动画可能卡顿
   140|   128|
   141|   129|**现状**：第 754-766 行，`applyProjectColors()` 对项目中的每个部件**同时**启动一个独立的 `animateColorChange()` 动画循环。如果有 8 个部件，就有 8 个 `requestAnimationFrame` 循环在每一帧同时执行，每个都要 `traverse` 子网格并更新材质颜色。
   142|   130|
   143|   131|**影响**：
   144|   132|- 在低端设备上会造成明显的帧率下降
   145|   133|- 每次切换配色方案时触发，体验卡顿
   146|   134|
   147|   135|**修改方案**：
   148|   136|
   149|   137|在 `animateColorChange()` 内部支持**批量更新**：接收部件列表，用**单个** `requestAnimationFrame` 循环统一更新所有部件。或者更简单的方案：只做一次颜色跳变（不带动画），因为用户切换配色方案时更关心「瞬间看到结果」而非「看到颜色流动」。
   150|   138|
   151|   139|**选择方案 B（推荐）**：在 `applyProjectColors()` 中，仅对焦点部件做动画，其他部件直接跳变。这样既保留了交互反馈的愉悦感，又避免了并发性能问题。
   152|   140|
   153|   141|### 修改详情
   154|   142|
   155|   143|**文件**：`app_mobile_new.js` — `applyProjectColors()` 方法
   156|   144|
   157|   145|```javascript
   158|   146|applyProjectColors(projectId) {
   159|   147|  const project = this.state.projects.find(p => p.id === projectId);
   160|   148|  if (!project) return;
   161|   149|  this.state.focusedProjectId = projectId;
   162|   150|  Object.entries(project.colors).forEach(([partName, color]) => {
   163|   151|    if (partName === '_previews') return;
   164|   152|    const hex = typeof color === 'string' ? color : (color?.hex || '#888');
   165|   153|    const part = this.state.parts[partName];
   166|   154|    if (!part) return;
   167|   155|    this.applyColor(partName, hex);
   168|   156|    // 只对焦点部件做动画，其余直接跳变
   169|   157|    if (partName === this.state.selectedPart) {
   170|   158|      this.animateColorChange(part.mesh, hex);
   171|   159|    }
   172|   160|  });
   173|   161|  this.renderBottomStripProjects();
   174|   162|}
   175|   163|```
   176|   164|
   177|   165|**验证**：
   178|   166|1. 切换配色方案时，模型颜色瞬间更新（无并发动画卡顿）
   179|   167|2. 当前选中的部件（selectedPart）颜色有平滑过渡动画
   180|   168|3. 在低端设备上切换方案不再掉帧
   181|   169|
   182|   170|---
   183|   171|
   184|   172|## Bug 4 — `randomizeColors()` 为 Fan 部件分配不合法颜色
   185|   173|
   186|   174|**现状**：第 873-881 行，`randomizeColors()` 从所有 `colorGroups` 的展平数组中随机取色：
   187|   175|```javascript
   188|   176|const allColors = Object.values(this.colorGroups).flat();
   189|   177|parts.forEach(partName => {
   190|   178|  const randomColor = allColors[Math.floor(Math.random() * allColors.length)];
   191|   179|  this.applyColor(partName, randomColor.hex);
   192|   180|});
   193|   181|```
   194|   182|风扇（Fan）部件的合法颜色只有灰色 `#9E9E9E` 和黑色 `#212121`（见 `FAN_COLORS`），但如果随机到红色/蓝色等，风扇材质会被应用上不正确的颜色。
   195|   183|
   196|   184|**修改方案**：对 Fan 部件单独从 `FAN_COLORS` 取色。
   197|   185|
   198|   186|### 修改详情
   199|   187|
   200|   188|**文件**：`app_mobile_new.js` — `randomizeColors()`
   201|   189|
   202|   190|```javascript
   203|   191|randomizeColors() {
   204|   192|  const parts = Object.keys(this.state.parts);
   205|   193|  const allColors = Object.values(this.colorGroups).flat();
   206|   194|  parts.forEach(partName => {
   207|   195|    let randomColor;
   208|   196|    if (partName === 'Fan') {
   209|   197|      randomColor = FAN_COLORS[Math.floor(Math.random() * FAN_COLORS.length)];
   210|   198|    } else {
   211|   199|      randomColor = allColors[Math.floor(Math.random() * allColors.length)];
   212|   200|    }
   213|   201|    this.applyColor(partName, randomColor.hex);
   214|   202|  });
   215|   203|  this.showToast('已随机配色');
   216|   204|}
   217|   205|```
   218|   206|
   219|   207|同时需要将 `FAN_COLORS` 从类外部的 `const` 改为可通过 `this.FAN_COLORS` 访问（或者直接引用类外部的常量，因 `randomizeColors()` 是在类内部定义，可以访问到闭包中的 `FAN_COLORS`）。
   220|   208|
   221|   209|**验证**：
   222|   210|1. 点击随机配色按钮，Fan 部件颜色只在灰色/黑色之间变化
   223|   211|2. 其他部件颜色不受影响
   224|   212|3. 多次随机后 Fan 从未出现红色/蓝色等颜色
   225|   213|
   226|   214|---
   227|   215|
   228|   216|## Bug 5 — 选色后自动关闭 Modal，无法连续选色
   229|   217|
   230|   218|**现状**：第 672-691 行，`selectModalSwatch()` 在应用颜色后立即调用 `this.closeModal()`（第 689 行），用户每次选完一个部件的颜色就必须重新点击 3D 模型再打开 Modal 选下一个。
   231|   219|
   232|   220|**影响**：用户想要给多个部件换色时流程繁琐，体验割裂。
   233|   221|
   234|   222|**修改方案**：选择颜色后**不关闭 Modal**，让用户可以逐个点击色块来试色，最后点击「关闭」按钮手动关闭。同时，如果用户点击了不同部件的色块（即另一个 3D 模型部件被选中），先关闭旧 Modal 再立即打开新部件的 Modal。
   235|   223|
   236|   224|### 修改详情
   237|   225|
   238|   226|**文件**：`app_mobile_new.js` — `selectModalSwatch()`
   239|   227|
   240|   228|```diff
   241|   229|selectModalSwatch(index, colors) {
   242|   230|  const color = colors[index];
   243|   231|  if (!color) return;
   244|   232|  this.state.modalPendingColor = color.hex;
   245|   233|  this.state.pendingColor = color.hex;
   246|   234|
   247|   235|  document.querySelectorAll('#color-grid .swatch').forEach((s, i) => {
   248|   236|    s.classList.toggle('selected', i === index);
   249|   237|  });
   250|   238|
   251|   239|  if (this.state.selectedPart) {
   252|   240|    const part = this.state.parts[this.state.selectedPart];
   253|   241|    if (part) {
   254|   242|      this.applyColor(this.state.selectedPart, color.hex);
   255|   243|      this.animateColorChange(part.mesh, color.hex);
   256|   244|    }
   257|   245|    this.showToast(`已应用: ${color.name}`);
   258|   246|-   this.closeModal();
   259|   247|  }
   260|   248|}
   261|   249|```
   262|   250|
   263|   251|**验证**：
   264|   252|1. 点击 3D 模型打开选色 Modal
   265|   253|2. 点击色块 → 颜色立即应用到部件 + Toast 提示颜色名
   266|   254|3. Modal **保持打开**，可继续点击其他色块试色
   267|   255|4. 点击「关闭」按钮关闭 Modal
   268|   256|
   269|   257|---
   270|   258|
   271|   259|## Bug 6 — 初始加载时无预览色或预览色全灰
   272|   260|
   273|   261|**现状**：`renderBottomStripProjects()`（第 428 行）通过 `(p.colors || {})._previews` 获取预览色。初次加载时，如果 localStorage 中存储的项目是旧版格式（没有 `_previews` 字段），则 `previewColors` 为空数组，回退到 `#e0e0e0` 灰色占位符。
   274|   262|
   275|   263|**影响**：用户看到所有卡片都是灰色块，无法预览实际配色。
   276|   264|
   277|   265|**修改方案**：在 `renderBottomStripProjects()` 中，如果 `_previews` 不存在或为空数组，则从项目的 `colors` 对象中动态生成预览色。
   278|   266|
   279|   267|### 修改详情
   280|   268|
   281|   269|**文件**：`app_mobile_new.js` — `renderBottomStripProjects()` 第 441 行
   282|   270|
   283|   271|```diff
   284|   272|- const previewColors = (p.colors || {})._previews || [];
   285|   273|+ let previewColors = (p.colors || {})._previews || [];
   286|   274|+ // 回退：动态从配色中提取预览色（兼容旧版数据）
   287|   275|+ if (previewColors.length === 0 && p.colors) {
   288|   276|+   previewColors = Object.entries(p.colors)
   289|   277|+     .filter(([k, v]) => k !== '_previews' && typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v))
   290|   278|+     .map(([, v]) => v)
   291|   279|+     .slice(0, 5);
   292|   280|+ }
   293|   281|```
   294|   282|
   295|   283|同时，在 `_saveProjects()` 保存时，确保每个项目都有 `_previews` 字段（可在 `saveCurrentProject()` 和未来的 `createNewProject()` 中做）。
   296|   284|
   297|   285|**验证**：
   298|   286|1. 清除 localStorage 后打开页面，配色库为空（正常）
   299|   287|2. 添加配色方案 → 卡片预览色正确显示（与模型颜色一致）
   300|   288|3. 从旧版 localStorage 恢复的项目 → 卡片预览色正确显示（不再全部灰色）
   301|   289|4. 保存在新版后的项目，预览色字段完整性保持
   302|   290|
   303|   291|---
   304|   292|
   305|   293|## Bug 7 — Fan 颜色选择未限制
   306|   294|
   307|   295|**现状**：Fan 部件的合法颜色应只从 `FAN_COLORS`（灰色 `#9E9E9E`、黑色 `#212121`）中选取，但选色 Modal 打开时与普通部件一样从 `getColorsByType()` 加载所有颜色类型，用户可以为 Fan 选择红色/蓝色等非法颜色。
   308|   296|
   309|   297|**影响**：不同颜色的风扇模型材质表现可能异常（比如半透明风扇配纯色会显得不真实）。
   310|   298|
   311|   299|**修改方案**：在选色 Modal 中，如果当前选的部件是 Fan，则只显示合法的颜色（灰/黑）。最简单的做法是让 `getColorsByType()` 或 `renderModalGrid()` 感知 Fan 部件并替换颜色数组。
   312|   300|
   313|   301|### 修改详情
   314|   302|
   315|   303|**文件**：`app_mobile_new.js` — `renderModalGrid()`
   316|   304|
   317|   305|```javascript
   318|   306|renderModalGrid() {
   319|   307|  const grid = document.getElementById('color-grid');
   320|   308|  if (!grid) return;
   321|   309|  const type = this.state.modalColorType;
   322|   310|  let colors = this.getColorsByType(type);
   323|   311|  // Fan 部件只显示合法颜色（灰色/黑色）
   324|   312|  if (this.state.selectedPart === 'Fan') {
   325|   313|    // 从当前类型中过滤出 Fan 允许的颜色
   326|   314|    colors = colors.filter(c => FAN_COLORS.some(f => f.hex === c.hex));
   327|   315|    // 如果当前类型没有 Fan 颜色，显示专用列表
   328|   316|    if (colors.length === 0) {
   329|   317|      colors = FAN_COLORS.map(c => ({
   330|   318|        name: c.name,
   331|   319|        hex: c.hex,
   332|   320|        code: '',
   333|   321|        type: 'fan',
   334|   322|      }));
   335|   323|    }
   336|   324|  }
   337|   325|  grid.innerHTML = colors.map(/* ...原有模板... */).join('');
   338|   326|  grid.querySelectorAll('.swatch').forEach(swatch => {
   339|   327|    swatch.addEventListener('click', () => {
   340|   328|      const idx = parseInt(swatch.dataset.index);
   341|   329|      this.selectModalSwatch(idx, colors);
   342|   330|    });
   343|   331|  });
   344|   332|}
   345|   333|```
   346|   334|
   347|   335|**验证**：
   348|   336|1. 中点击 Fan 部件 → Modal 中只显示灰色和黑色色块
   349|   337|2. 选中其他部件 → Modal 正常显示所有颜色
   350|   338|3. Fan 只能设置为灰色或黑色
   351|   339|
   352|   340|---
   353|   341|
   354|   342|## Bug 8 — `.strip-card-colors` 预览色块 CSS 高度未定义
   355|   343|
   356|   344|**现状**：CSS（第 143-148 行）中 `.strip-card-colors` 的子元素是 `<span>` 标签，只设了 `flex:1`，但父容器 `.strip-card-colors` 的 `display: flex; flex-wrap: wrap` 且高度未指定。导致预览色块在 `72px` 的卡片中可能无法正确填充高度。
   357|   345|
   358|   346|**影响**：在某些浏览器/缩放比例下，预览色块显示为很细的线条而不是方块。
   359|   347|
   360|   348|**修改方案**：为 `.strip-card-colors` 的子元素设置固定高度，或者让子元素填满父容器。
   361|   349|
   362|   350|### 修改详情
   363|   351|
   364|   352|**文件**：`index_mobile.html`
   365|   353|
   366|   354|```diff
   367|   355|.strip-card-colors {
   368|   356|  display: flex;
   369|   357|  gap: 2px;
   370|   358|  flex-wrap: wrap;
   371|   359|  width: 60px;
   372|   360|  justify-content: center;
   373|   361|+ height: 100%;       /* 填满父卡片 */
   374|   362|+ align-content: center;  /* 多行居中 */
   375|   363|}
   376|   364|+
   377|   365|+.strip-card-colors span {
   378|   366|+  height: 12px;
   379|   367|+  min-width: 12px;
   380|   368|+  border-radius: 2px;
   381|   369|+  flex: 0 0 calc(50% - 2px);  /* 每行2个 */
   382|   370|+}
   383|   371|```
   384|   372|
   385|   373|**验证**：
   386|   374|1. Strip 卡片内的预览色块以 2×3 或 3×2 的网格排列
   387|   375|2. 颜色块高度正常，不是细线
   388|   376|3. 在不同缩放比例下表现一致
   389|   377|
   390|   378|---
   391|   379|
   392|   380|## Bug 9 — `saveCurrentProject()` 废弃标记与代码残留
   393|   381|
   394|   382|**现状**：代码中存在 `saveCurrentProject()`（第 786 行），功能是"快照当前模型状态为新方案"。根据计划文档，此方法将被 `createNewProject()` 取代（第 5 步配色库计划中已定义），Save 按钮也将被圆形 + 号按钮替代。
   395|   383|
   396|   384|**注意**：**当前不直接删除或修改 `saveCurrentProject()`**，它仍然是第 5 步执行前的有效代码。此问题仅在**第 5 步执行时**需要关注。
   397|   385|
   398|   386|**处理建议**：
   399|   387|- 第 5 步执行时：新增 `createNewProject()` 方法（计划3已有详细伪代码）
   400|   388|- 第 5 步完成后：删除 `saveCurrentProject()` 方法，同时删除 `init()` 中 `btn-save` 的绑定
   401|   389|- 保存按钮的 HTML 也在第 7 步（UI 整体化）中被移除
   402|   390|
   403|   391|---
   404|   392|
   405|   393|## Bug 10 — `deleteProject()` 后模型颜色残留
   406|   394|
   407|   395|**现状**：第 566-573 行，删除项目后：
   408|   396|```javascript
   409|   397|deleteProject(projectId) {
   410|   398|  this.state.projects = this.state.projects.filter(p => p.id !== projectId);
   411|   399|  this.state.selectedProjectId = null;     // 清除选中
   412|   400|  this.state.isEditMode = false;
   413|   401|  this._saveProjects();
   414|   402|  this.renderBottomStripProjects();
   415|   403|  this.collapseBottomStrip();
   416|   404|}
   417|   405|```
   418|   406|
   419|   407|删除后 `selectedProjectId = null`，但**模型上的颜色未被重置**。用户看到模型还是被删除方案的颜色，但没有方案与之关联，视觉上会产生困惑：这个颜色是哪个方案的？
   420|   408|
   421|   409|**修改方案**：删除后如果还有项目，自动加载最后一个项目；如果没有项目了，重置为默认灰色。
   422|   410|
   423|   411|### 修改详情
   424|   412|
   425|   413|**文件**：`app_mobile_new.js` — `deleteProject()`
   426|   414|
   427|   415|```javascript
   428|   416|deleteProject(projectId) {
   429|   417|  this.state.projects = this.state.projects.filter(p => p.id !== projectId);
   430|   418|  this.state.isEditMode = false;
   431|   419|
   432|   420|  if (this.state.projects.length > 0) {
   433|   421|    // 自动加载最近的方案
   434|   422|    const latest = this.state.projects[this.state.projects.length - 1];
   435|   423|    this.applyProjectColors(latest.id);
   436|   424|  } else {
   437|   425|    // 所有方案都删除了，重置为默认灰色
   438|   426|    this.state.selectedProjectId = null;
   439|   427|    Object.entries(this.state.parts).forEach(([partName, part]) => {
   440|   428|      this.applyColor(partName, DEFAULT_COLOR);
   441|   429|    });
   442|   430|  }
   443|   431|
   444|   432|  this._saveProjects();
   445|   433|  this.renderBottomStripProjects();
   446|   434|  this.collapseBottomStrip();
   447|   435|}
   448|   436|```
   449|   437|
   450|   438|**验证**：
   451|   439|1. 有多个方案时删除一个 → 自动切换到最后一个方案，颜色正确加载
   452|   440|2. 只剩一个方案时删除 → 模型颜色重置为所有部件默认灰色 `#888888`
   453|   441|3. Strip 显示为空的占位文字「暂无配色方案」
   454|   442|
   455|   443|---
   456|   444|
   457|   445|## Bug 11 — `this.colorGroups` 缺乏防御性检查
   458|   446|
   459|   447|**现状**：多处代码直接依赖 `this.colorGroups`：
   460|   448|- `findColorByHex()`（第 557-564 行）：`if (!this.colorGroups) return null;` **已有检查** ✅
   461|   449|- `getColorsByType()`（第 697-699 行）：`return this.colorGroups[type] || [];` **有容错** ✅
   462|   450|- `randomizeColors()`（第 873-881 行）：`const allColors = Object.values(this.colorGroups).flat();` **无检查** ❌
   463|   451|
   464|   452|如果 `colors.js` 加载失败或延迟，`this.colorGroups` 为 `undefined`，`Object.values()` 直接报错。
   465|   453|
   466|   454|**修改方案**：在 `randomizeColors()` 和 `init()` 中加防御。
   467|   455|
   468|   456|### 修改详情
   469|   457|
   470|   458|**文件**：`app_mobile_new.js`
   471|   459|
   472|   460|**`randomizeColors()` 增加防御**：
   473|   461|```javascript
   474|   462|randomizeColors() {
   475|   463|  const parts = Object.keys(this.state.parts);
   476|   464|  const allColors = this.colorGroups ? Object.values(this.colorGroups).flat() : [];
   477|   465|  if (allColors.length === 0) {
   478|   466|    this.showToast('配色数据未加载');
   479|   467|    return;
   480|   468|  }
   481|   469|  // 原有逻辑...
   482|   470|}
   483|   471|```
   484|   472|
   485|   473|**`init()` 增加颜色数据检查**：
   486|   474|```javascript
   487|   475|init() {
   488|   476|  this.colorGroups = window.__COLOR_GROUPS;
   489|   477|  if (!this.colorGroups || Object.keys(this.colorGroups).length === 0) {
   490|   478|    console.error('颜色数据未加载（colors.js可能缺失）');
   491|   479|    this.showToast('颜色数据加载失败');
   492|   480|    return;
   493|   481|  }
   494|   482|  // 原有初始化逻辑...
   495|   483|}
   496|   484|```
   497|   485|
   498|   486|**验证**：
   499|   487|1. 正常加载时功能不受影响
   500|   488|2. 如果 `colors.js` 加载失败（模拟删除 script 标签），应用不崩溃，显示 Toast 提示
   501|   489|3. 随机配色在数据无法读取时有回退处理
   502|   490|
   503|   491|---
   504|   492|
   505|   493|## Bug 12 — Three.js 版本过旧（r128，2021年发布）
   506|   494|
   507|   495|**现状**：`index_mobile.html` 第 535 行：
   508|   496|```json
   509|   497|"three": "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js"
   510|   498|```
   511|   499|Three.js r128（2021年5月发布），当前最新为 r170+（2024年）。旧版本：
   512|   500|- 无自动色彩管理（需手动处理 `THREE.ColorManagement`）
   513|   501|- 性能优化和 Bug 修复落后
   514|   502|- 部分新 API 不可用
   515|   503|
   516|   504|**注意**：升级 Three.js 版本属于**跨版本升级**，API 可能不兼容（例如 r152+ 中 `THREE.GLTFLoader` 的路径、`outputColorSpace` 的行为都有变化）。**建议在第 9 步（数据整合）或第 10 步（云端部署）之前单独测试升级**。
   517|   505|
   518|   506|### 修改方案（谨慎评估后执行）
   519|   507|
   520|   508|**文件**：`index_mobile.html` — importmap
   521|   509|
   522|   510|推荐升级到 `three@0.160.0`（2023年底发布，API 稳定且兼容性较好）：
   523|   511|
   524|   512|```json
   525|   513|{
   526|   514|  "imports": {
   527|   515|    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
   528|   516|    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
   529|   517|  }
   530|   518|}
   531|   519|```
   532|   520|
   533|   521|**注意**：升级后可能需要调整：
   534|   522|- `THREE.SRGBColorSpace` → 在 r152+ 中此常量名称可能变化，需要验证
   535|   523|- `outputColorSpace` 的设置方式可能不同
   536|   524|- `OrbitControls` 的 `dampingFactor` 等参数可能需要微调
   537|   525|
   538|   526|**验证**：
   539|   527|1. 页面正常加载，3D 模型显示
   540|   528|2. 模型颜色应用功能正常
   541|   529|3. OrbitControls 旋转/缩放正常
   542|   530|4. 颜色动画正常
   543|   531|5. 触摸交互正常
   544|   532|
   545|   533|---
   546|   534|
   547|   535|## Bug 13 — `preserveDrawingBuffer: true` 不必要消耗性能
   548|   536|
   549|   537|**现状**：第 102 行：
   550|   538|```javascript
   551|   539|this.mainRenderer = new THREE.WebGLRenderer({
   552|   540|  antialias: true,
   553|   541|  preserveDrawingBuffer: true  // 为截图功能保留缓冲区
   554|   542|});
   555|   543|```
   556|   544|
   557|   545|`preserveDrawingBuffer: true` 告诉浏览器在每帧渲染后保留帧缓冲区的内容，而不是丢弃它。这会降低渲染性能（尤其是在移动设备上），因为浏览器无法优化帧缓冲区的管理。只有在需要调用 `canvas.toDataURL()` 或 `canvas.toBlob()` 截图的场景下才需要。
   558|   546|
   559|   547|**处理建议**：
   560|   548|- 如果未来有计划实现「保存为图片」功能 → 保留，或在截图前临时设置为 true
   561|   549|- 如果无此需求 → 移除此选项
   562|   550|
   563|   551|### 修改详情
   564|   552|
   565|   553|**文件**：`app_mobile_new.js`
   566|   554|
   567|   555|```diff
   568|   556|this.mainRenderer = new THREE.WebGLRenderer({
   569|   557|  antialias: true,
   570|   558|- preserveDrawingBuffer: true,
   571|   559|});
   572|   560|```
   573|   561|
   574|   562|**验证**：
   575|   563|1. 3D 模型正常渲染
   576|   564|2. 颜色应用/动画无异常
   577|   565|3. 触摸交互正常
   578|   566|4. 渲染性能有微幅提升（肉眼可能不易察觉，在低端设备上更明显）
   579|   567|
   580|   568|---
   581|   569|
   582|   570|## Bug 14 — `deleteCurrentProject()` 与方法死代码
   583|   571|
   584|   572|**现状**：`app_mobile_new.js` 中存在两个删除方案的方法：
   585|   573|
   586|   574|- **`deleteProject(projectId)`**（第 566-573 行）：从 `this.projects` 中过滤掉指定 ID，清空 `selectedProjectId`，**不会重置模型颜色**。这是被调用的版本，由 `detail-area` 的删除按钮触发。
   587|   575|- **`deleteCurrentProject()`**（第 825-834 行）：操作 `this.focusedProjectId`（不存在的属性！实际应该是 `selectedProjectId`），不重置模型颜色。**从未被任何事件调用**。
   588|   576|
   589|   577|```javascript
   590|   578|// 第 825-834 行 — 死代码！
   591|   579|deleteCurrentProject() {
   592|   580|  const id = this.focusedProjectId;  // undefined！this.state 中无此字段
   593|   581|  if (!id || !this.projects) return;
   594|   582|  this.projects = this.projects.filter(p => p.id !== id);
   595|   583|  if (id === this.focusedProjectId) this.focusedProjectId = null;  // 条件永真
   596|   584|}
   597|   585|```
   598|   586|
   599|   587|**影响范围**：
   600|   588|- 死代码占据空间，增加维护负担
   601|   589|- 如果未来第 5 步实现 `createNewProject()` 时使用了 `focusedProjectId`，需要确认与 `deleteCurrentProject()` 的交互
   602|   590|- 当前版本中 `deleteCurrentProject()` 访问 `this.focusedProjectId` 返回 `undefined`，调用它会**无条件删除整个数组**（`!id` 为 true 所以 return，但 if 判断写反了逻辑上的意图）
   603|   591|
   604|   592|**修改方案**：
   605|   593|1. 删除 `deleteCurrentProject()` 整个方法（第 825-834 行）
   606|   594|2. 增强 `deleteProject()`：在删除后调用 `resetColorsToDefault()` 重置模型颜色
   607|   595|
   608|   596|### 修改详情
   609|   597|
   610|   598|**文件**：`app_mobile_new.js`
   611|   599|
   612|   600|**1. 删除死代码**（第 825-834 行）：
   613|   601|
   614|   602|删除以下整个方法：
   615|   603|```javascript
   616|   604|deleteCurrentProject() {
   617|   605|  const id = this.focusedProjectId;
   618|   606|  if (!id || !this.projects) return;
   619|   607|  this.projects = this.projects.filter(p => p.id !== id);
   620|   608|  if (id === this.focusedProjectId) this.focusedProjectId = null;
   621|   609|}
   622|   610|```
   623|   611|
   624|   612|**2. 增强 `deleteProject`**（第 566 行附近）：
   625|   613|```diff
   626|   614|deleteProject(projectId) {
   627|   615|  this.projects = this.projects.filter(p => p.id !== projectId);
   628|   616|  this.state.selectedProjectId = null;
   629|   617|+ this.resetColorsToDefault();
   630|   618|  this._saveProjects();
   631|   619|  ...
   632|   620|}
   633|   621|```
   634|   622|
   635|   623|**验证**：
   636|   624|1. 控制台输入 `app.deleteCurrentProject()` → 报错（已删除）或不存在
   637|   625|2. 删除最后一个方案后，模型颜色恢复为默认
   638|   626|3. 正常删除方案功能不变
   639|   627|
   640|   628|---
   641|   629|
   642|   630|## Bug 15 — `detail-area` 删除按钮事件委托不足
   643|   631|
   644|   632|**现状**：第 544 行：
   645|   633|```javascript
   646|   634|pid = parseInt(e.target.dataset.deleteId);
   647|   635|```
   648|   636|
   649|   637|如果用户点击的是删除按钮内的文本节点（如 `<button>删除</button>` 中的文字），`e.target` 可能是文本节点（`Text` 节点），其 `dataset` 为 `undefined`，导致 `parseInt(undefined)` → `NaN`，点击无效。
   650|   638|
   651|   639|**影响范围**：在移动设备上，用户可能精确点击按钮的文字区域而非按钮边缘，导致删除操作无响应，造成困惑。
   652|   640|
   653|   641|**修改方案**：改用 `e.target.closest('[data-delete-id]')` 向上查找，确保无论点击按钮的哪个部分都能获取 `deleteId`。
   654|   642|
   655|   643|### 修改详情
   656|   644|
   657|   645|**文件**：`app_mobile_new.js`
   658|   646|
   659|   647|```diff
   660|   648|// 第 544 行附近
   661|   649|-detailArea.addEventListener('click', (e) => {
   662|   650|+detailArea.addEventListener('click', (e) => {
   663|   651|-  const pid = parseInt(e.target.dataset.deleteId);
   664|   652|+  const deleteBtn = e.target.closest('[data-delete-id]');
   665|   653|+  const pid = deleteBtn ? parseInt(deleteBtn.dataset.deleteId) : null;
   666|   654|  if (pid) { ... }
   667|   655|```
   668|   656|
   669|   657|**验证**：
   670|   658|1. 点击删除按钮的文字部分 → 触发删除
   671|   659|2. 点击删除按钮的边缘部分 → 触发删除
   672|   660|3. 点击详情区域的其他部分 → 不触发删除
   673|   661|4. 移动端触摸精确度较低时仍能正常删除
   674|   662|
   675|   663|---
   676|   664|
   677|   665|## Bug 16 — `submitProject()` 空占位符
   678|   666|
   679|   667|**现状**：第 836-838 行：
   680|   668|```javascript
   681|   669|submitProject() {
   682|   670|  // TODO: 实现提交到服务器
   683|   671|}
   684|   672|```
   685|   673|
   686|   674|一个空的占位符方法，未被 UI 绑定，也未在任何地方调用。预计是为未来的「提交配色到服务器」功能预留。
   687|   675|
   688|   676|**影响范围**：当前无影响，但占位符可能在未来重构时被误用或遗忘。
   689|   677|
   690|   678|**修改方案**：
   691|   679|1. 如果不计划在近期实现云提交功能 → 删除此方法
   692|   680|2. 如果计划实现 → 加上明确的标签/注释说明被哪个 UI 元素触发
   693|   681|
   694|   682|推荐方案：**删除**，因为：
   695|   683|- 如果 UI 整体化（第 7 步）增加了「提交」按钮，届时重新实现更清晰
   696|   684|- 当前占位符容易在代码审查中产生困惑
   697|   685|
   698|   686|### 修改详情
   699|   687|
   700|   688|**文件**：`app_mobile_new.js`
   701|   689|
   702|   690|删除第 836-838 行的整个方法：
   703|   691|```javascript
   704|   692|submitProject() {
   705|   693|  // TODO: 实现提交到服务器
   706|   694|}
   707|   695|```
   708|   696|
   709|   697|**验证**：
   710|   698|1. 搜索 `submitProject` 不再存在
   711|   699|2. 应用正常运行
   712|   700|
   713|   701|---
   714|   702|
   715|   703|## Bug 17 — 保存/加载的 hex 大小写不统一
   716|   704|
   717|   705|**现状**：项目中存在两种 hex 格式：
   718|   706|
   719|   707|- `colors.js`（第 4-76 行）：所有 hex 使用**大写**（`#FFFFFF`, `#C12E1F`）
   720|   708|- `saveCurrentProject()`（第 803 行）：`'#' + m.color.getHexString()` — Three.js 的 `Color.getHexString()` 返回**小写**（`#ffffff`, `#c12e1f`）
   721|   709|
   722|   710|对比：
   723|   711|```javascript
   724|   712|// colors.js (大写)
   725|   713|{"hex":"#C12E1F", ...}
   726|   714|
   727|   715|// 保存时 (小写)
   728|   716|part.colors['part_name'] = '#' + m.color.getHexString();  // → '#c12e1f'
   729|   717|```
   730|   718|
   731|   719|**当前为什么能工作**：`findColorByHex()`（第 560 行）使用了 `c.hex.toLowerCase()` 做大小写归一化比较。但：
   732|   720|1. 如果未来用 `===` 直接比较 hex（如渲染缓存中），会**匹配失败**
   733|   721|2. localStorage 中存储了小写 hex，而 `colors.js` 是大写，查找时多了一次 `toLowerCase()` 转换
   734|   722|3. 代码不一致会让人困惑：「为什么颜色保存后下次打开和原始颜色对不上？」
   735|   723|
   736|   724|**注意**：此问题与 Bug 3（动画并发）中的 hex 格式问题其实是同一个根源。
   737|   725|
   738|   726|**修改方案**：
   739|   727|
   740|   728|**方案 A（推荐 — 统一为大写）**：在保存时统一转为大写：
   741|   729|```javascript
   742|   730|'#' + m.color.getHexString().toUpperCase()
   743|   731|```
   744|   732|
   745|   733|**方案 B**：不做处理，仅在查找时依赖 `toLowerCase()`。但不推荐，因为数据不一致会增加潜在 bug。
   746|   734|
   747|   735|### 修改详情
   748|   736|
   749|   737|**文件**：`app_mobile_new.js`
   750|   738|
   751|   739|```diff
   752|   740|// 第 803 行附近
   753|   741|-part.colors[partName] = '#' + m.color.getHexString();
   754|   742|+part.colors[partName] = '#' + m.color.getHexString().toUpperCase();
   755|   743|```
   756|   744|
   757|   745|**验证**：
   758|   746|1. 选色→保存→刷新页面，颜色一致
   759|   747|2. 查看 localStorage，所有 hex 均为大写
   760|   748|3. 再次加载时 `findColorByHex()` 不依赖 `toLowerCase()` 也能匹配
   761|   749|
   762|   750|---
   763|   751|
   764|   752|## Bug 18 — `FAN_COLORS` 格式不统一
   765|   753|
   766|   754|**现状**：`FAN_COLORS`（第 9-12 行）的颜色条目包含 `name` 字段：
   767|   755|```javascript
   768|   756|const FAN_COLORS = [
   769|   757|  { hex: '#9E9E9E', name: '灰色' },
   770|   758|  { hex: '#212121', name: '黑色' },
   771|   759|  { hex: '#FFFFFF', name: '白色' },
   772|   760|  { hex: '#E8732C', name: '橙色' },
   773|   761|];
   774|   762|```
   775|   763|
   776|   764|而 `colorGroups` 中的颜色条目是 `{ name, code, hex, displayHex, type, ... }` 格式或者 `{ name, hex }`（BATTERY_COLORS）格式。`FAN_COLORS` 缺了 `code`、`displayHex`、`type` 等属性。
   777|   765|
   778|   766|**影响范围**：
   779|   767|- 如果未来在 `applyProjectColors()` 或 `showPicker()` 中统一处理所有颜色数据，`FAN_COLORS` 的格式差异需要特殊处理
   780|   768|- 当前只在 `applyFanColor()`（第 225-226 行）中使用，按 `hex` 匹配，所以暂时没问题
   781|   769|- 但 `BATTERY_COLORS`（第 78-84 行）也是 `{ name, hex }` 格式— 不统一是「故意」的（非标准颜色）
   782|   770|
   783|   771|**修改方案**：不作为单独 Bug 修复。在 Bug 7（Fan 选色约束）的实现中，需要统一格式化 `FAN_COLORS` 使其与 `colorGroups` 结构兼容，以便 `showPicker()` 能正确渲染 Fan 的颜色选择。
   784|   772|
   785|   773|### 修改详情
   786|   774|
   787|   775|此 Bug 并入 Bug 7 一起处理，不单独修复。在 Bug 7 的修改中将 `FAN_COLORS` 转换为与 `colorGroups` 兼容的格式即可。
   788|   776|
   789|   777|**验证**：Bug 7 验证时确认 Fan 选色列表正确显示颜色名称。
   790|   778|
   791|   779|---
   792|   780|
   793|   781|## Bug 19 — 全屏点击关闭 Modal 时意外关闭 DetailArea
   794|   782|
   795|   783|**现状**：第 166 行附近，`document.body` 点击事件处理中，点击「底部 strip 之外」的区域时，会先调用 `this.collapseDetailArea()` 再检查是否关闭 Modal：
   796|   784|```javascript
   797|   785|document.body.addEventListener('click', (e) => {
   798|   786|  const strip = document.getElementById('bottom-strip');
   799|   787|  if (!strip || !strip.contains(e.target)) {
   800|   788|    this.collapseDetailArea();   // ← 先折叠详情
   801|   789|  }
   802|   790|  // 然后检查关闭 Modal...
   803|   791|});
   804|   792|```
   805|   793|
   806|   794|问题在于：这个事件监听在**整个 body** 上，包括 Modal 覆盖区域。如果用户：
   807|   795|1. 打开了一个方案详情
   808|   796|2. 然后打开了配色库 Modal（Modal 覆盖在详情之上）
   809|   797|3. 点击 Modal 外部（灰色蒙版区域）关闭 Modal
   810|   798|4. 这时 body 点击事件也会触发，同时折叠了详情区域
   811|   799|
   812|   800|**影响范围**：
   813|   801|- 用户关闭配色库 Modal 时意外关闭了详情面板
   814|   802|- 多次点击才能再次查看详情
   815|   803|
   816|   804|**修改方案**：在关闭 Modal 的逻辑中不执行 `collapseDetailArea()`，或者在 Modal 打开时跳过折叠操作。
   817|   805|
   818|   806|### 修改详情
   819|   807|
   820|   808|**文件**：`app_mobile_new.js`
   821|   809|
   822|   810|**方案 A（推荐 — 在 Modal 打开时跳过折叠）**：
   823|   811|```diff
   824|   812|document.body.addEventListener('click', (e) => {
   825|   813|+  // 如果 Modal 处于打开状态，不要折叠详情
   826|   814|+  const modal = document.getElementById('modal-sheet');
   827|   815|+  if (modal && modal.style.display !== 'none') return;
   828|   816|+  
   829|   817|  const strip = document.getElementById('bottom-strip');
   830|   818|  if (!strip || !strip.contains(e.target)) {
   831|   819|    this.collapseDetailArea();
   832|   820|  }
   833|   821|  // ...
   834|   822|});
   835|   823|```
   836|   824|
   837|   825|**验证**：
   838|   826|1. 打开详情 → 打开配色库 → 点击 Modal 外部关闭 → 详情保持打开
   839|   827|2. 无 Modal 时点击 strip 外部 → 详情正常折叠
   840|   828|
   841|   829|---
   842|   830|
   843|   831|## Bug 20 — localStorage key 名称不一致（"sidan" typo）
   844|   832|
   845|   833|**现状**：第 772 行：
   846|   834|```javascript
   847|   835|const raw = localStorage.getItem('sidan_projects_mobile');
   848|   836|```
   849|   837|
   850|   838|key 中使用了 `sidan`（不是 `safan`），这是一个错别字（typo）。如果未来：
   851|   839|- 有其他工具使用 `safan_projects_mobile` 这个 key
   852|   840|- 或者数据迁移/共享场景
   853|   841|这个不一致会导致数据被当作不同的存储空间。
   854|   842|
   855|   843|**影响范围**：
   856|   844|- 当前无功能影响（只是一个命名问题）
   857|   845|- 如果修复此问题，需要**迁移旧数据**，否则用户现有的配色方案会丢失
   858|   846|- `_saveProjects()` 也使用相同的 `sidan_projects_mobile` 保存，所以当前读写一致
   859|   847|
   860|   848|**修改方案**：
   861|   849|
   862|   850|**方案 A（推荐 — 迁移）**：改为 `safan_projects_mobile`，同时读旧 key 做数据迁移：
   863|   851|```javascript
   864|   852|// 加载时优先读新 key，fallback 到旧 key
   865|   853|let raw = localStorage.getItem('safan_projects_mobile');
   866|   854|if (!raw) {
   867|   855|  raw = localStorage.getItem('sidan_projects_mobile');
   868|   856|  if (raw) {
   869|   857|    // 迁移到新 key
   870|   858|    localStorage.setItem('safan_projects_mobile', raw);
   871|   859|    localStorage.removeItem('sidan_projects_mobile');
   872|   860|  }
   873|   861|}
   874|   862|```
   875|   863|
   876|   864|**方案 B**：不做修改，接受当前命名。因为新旧 key 切换有可能引入数据丢失风险。
   877|   865|
   878|   866|### 修改详情
   879|   867|
   880|   868|**文件**：`app_mobile_new.js`
   881|   869|
   882|   870|```diff
   883|   871|// _loadProjects() 第 772 行
   884|   872|-const raw = localStorage.getItem('sidan_projects_mobile');
   885|   873|+let raw = localStorage.getItem('safan_projects_mobile');
   886|   874|+if (!raw) {
   887|   875|+  raw = localStorage.getItem('sidan_projects_mobile');
   888|   876|+  if (raw) {
   889|   877|+    // 迁移旧数据到新 key
   890|   878|+    localStorage.setItem('safan_projects_mobile', raw);
   891|   879|+    localStorage.removeItem('sidan_projects_mobile');
   892|   880|+  }
   893|   881|+}
   894|   882|
   895|   883|// _saveProjects() — 保存到新 key
   896|   884|-localStorage.setItem('sidan_projects_mobile', JSON.stringify(this.projects));
   897|   885|+localStorage.setItem('safan_projects_mobile', JSON.stringify(this.projects));
   898|   886|```
   899|   887|
   900|   888|**验证**：
   901|   889|1. 首次加载（无旧数据）→ 正常初始化，key 为 `safan_projects_mobile`
   902|   890|2. 有旧数据 → 自动迁移到新 key，旧 key 被删除
   903|   891|3. 保存后 localStorage 只有 `safan_projects_mobile`
   904|   892|4. 刷新页面 → 数据完整保留
   905|   893|
   906|   894|本计划的 Bug 修复分为三类，建议按以下顺序执行：
   907|   895|
   908|   896|### 第一批（高优先级，与第 5 步/第 7 步独立）
   909|   897|在开始第 5 步和第 7 步之前完成：
   910|   898|
   911|   899|1. **Bug 5** — 选色不关 Modal（显著改善用户体验）
   912|   900|2. **Bug 4** — Fan 颜色限制（数据一致性）
   913|   901|3. **Bug 10** — 删除后颜色残留 + **Bug 14** 删除死代码（数据一致性）
   914|   902|4. **Bug 11** — colorGroups 防御（防止崩溃）
   915|   903|5. **Bug 17** — hex 大小写统一（数据一致性，简单改一行）
   916|   904|6. **Bug 20** — localStorage key 迁移（防未来数据混淆）
   917|   905|
   918|   906|### 第二批（中等优先级，可与第 5 步/第 7 步并行）
   919|   907|7. **Bug 1** — 白色/玉石白 hex 去重（colors.js，独立于 JS 逻辑）
   920|   908|8. **Bug 6** — 预览色回退（渲染层改进）
   921|   909|9. **Bug 8** — 色块 CSS 高度（纯样式修改）
   922|   910|10. **Bug 13** — 移除 preserveDrawingBuffer（纯性能优化）
   923|   911|11. **Bug 15** — 删除按钮事件委托修复（少量修改）
   924|   912|12. **Bug 19** — Modal 与 DetailArea 交互修复（少量修改）
   925|   913|
   926|   914|### 第三批（低优先级，其他步骤完成后）
   927|   915|13. **Bug 2** — 重复方法删除（纯代码清理）
   928|   916|14. **Bug 3** — 动画并发优化 + **Bug 17**（关联，在第一批已处理 hex，此处做动画节流）
   929|   917|15. **Bug 7** — Fan 选色约束（与 Bug 4 关联）
   930|   918|16. **Bug 9** — saveCurrentProject 废弃（随第 5 步执行）
   931|   919|17. **Bug 12** — Three.js 升级（最后做，需要单独验证）
   932|   920|18. **Bug 16** — submitProject 占位符删除（代码清理）
   933|   921|19. **Bug 18** — FAN_COLORS 格式统一（并入 Bug 7）
   934|   922|
   935|   923|---
   936|   924|
   937|   925|## 依赖关系
   938|   926|
   939|   927|| Bug # | 依赖其他步骤 | 被依赖 |
   940|   928||-------|-------------|--------|
   941|   929|| 1 | 无 | 无 |
   942|   930|| 2 | 第 7 步完成后（UI 整体化后 strip 行为稳定） | 无 |
   943|   931|| 3 | 无（hex 部分由 Bug 17 在第一批解决） | 无 |
   944|   932|| 4 | 无 | Bug 7, Bug 18 |
   945|   933|| 5 | 无 | 无 |
   946|   934|| 6 | 无 | 第 5 步的 `createNewProject()` 需包含 `_previews` |
   947|   935|| 7 | Bug 4 完成后，Bug 18 并入 | 无 |
   948|   936|| 8 | 无 | 无 |
   949|   937|| 9 | 第 5 步的 `createNewProject()` 实现后 | 无 |
   950|   938|| 10 | 无（与 Bug 14 一起处理） | 无 |
   951|   939|| 11 | 无 | 无 |
   952|   940|| 12 | 第 5 步、第 7 步完成后，单独验证 | 无 |
   953|   941|| 13 | 无 | 无 |
   954|   942|| 14 | 无（与 Bug 10 一起处理） | 无 |
   955|   943|| 15 | 无 | 无 |
   956|   944|| 16 | 无 | 无 |
   957|   945|| 17 | 无（独立，第一批执行） | 无 |
   958|   946|| 18 | 并入 Bug 7 | 无 |
   959|   947|| 19 | 无 | 无 |
   960|   948|| 20 | 无 | 无 |
   961|   949|
   962|   950|---
   963|   951|
   964|   952|## 验证方案（全局）
   965|   953|
   966|   954|所有 Bug 修复完成后的整体验证流程：
   967|   955|
   968|   956|1. **基本功能**：3D 模型加载、旋转、触摸选色、颜色应用
   969|   957|2. **选色交互**：连续选色（不关 Modal）、不同部件切换、删除按钮任意区域可点
   970|   958|3. **配色库**：添加/切换/删除方案，详情页显示，颜色名称正确，Modal 打开不影响详情状态
   971|   959|4. **随机配色**：Fan 仅灰/黑，其他部件任意颜色
   972|   960|5. **边界情况**：删除最后一个方案（模型颜色重置）、空配色库、旧版 localStorage key 数据兼容
   973|   961|6. **性能**：方案切换流畅、选色动画不卡顿、无 preserveDrawingBuffer 性能损耗
   974|   962|7. **样式**：Strip 卡片预览色块正确显示（带高度），详情区域背景不突变
   975|   963|8. **错误处理**：`colors.js` 加载失败不崩溃，`colorGroups` 缺失有回退
   976|   964|9. **代码清理**：无死代码（deleteCurrentProject/submitProject 已删除）、无重复方法、无 hex 大小写不统一
   977|   965|

---

## 第三轮审查记录（三轮独立审查 — 新增 Bug 21~32）

> 审查时间：2026-05-30，三轮独立逐行审查，去重后新增 12 个问题

### 第1轮审查 — app_mobile_new.js（JS 逻辑层）
**审查策略：** 逐函数分析，关注结构、状态管理、事件绑定、3D渲染逻辑、数据持久化

| 发现 | 类型 | 行号 |
|------|------|------|
| `state.isEditMode` 未在构造器中预初始化，依赖 JS 隐式 `undefined → false` | 语义 | 25-31, 379 |
| `deleteCurrentProject()` 完整实现但从未被调用（全文件搜索仅定义处出现） | 死代码 | 825-834 |
| `submitProject()` {} 空占位符 | 死代码 | 836-838 |
| `closeModal()` 只设 `modalOpen=false`, 不取消部件 `hideOutline()` → emissive 高亮残留 | 视觉瑕疵 | 612-617 |
| `onCanvasPointerUp()` 中 `_pointerMoved` 被外层消耗后设为 `false`，函数体内再检查该值永远不成立 | 冗余代码 | 164 |
| `saveCurrentProject()` 遍历 mesh traverse 取颜色而非直接用 `part.currentColor` | 性能冗余 | 789-806 |
| `btnSave` 声明缩进 6 个空格（其余 4 空格） | 代码风格 | 80 |

### 第2轮审查 — index_mobile.html（HTML/CSS 外观层）
**审查策略：** 逐行分析 HTML 结构、CSS 样式、响应式设计、语义化

| 发现 | 类型 | 行号 |
|------|------|------|
| HTML 中未定义 `id='loading'` / `id='loading-text'` 元素（JS 引用但 DOM 不存在） | 功能缺失 | — |
| `<a>` 链接缺少 `rel='noopener noreferrer'` | 安全 | 479-481 |
| iOS safe-area 未适配（`env(safe-area-inset-bottom)`） | 兼容性 | 80-88 |
| `#color-picker-modal` + `#picker-grid` + 其 close-btn 事件绑定从未被使用 | 死代码 | 515-521, 641-642 |
| `collapseBottomStrip()` 第二次定义中 `opacity=0` 直接设置 style，无 CSS transition | 视觉突兀 | 479-488, CSS |

### 第3轮审查 — colors.js + 跨文件数据流（数据层）
**审查策略：** 数据一致性、边界情况、跨函数数据流追踪

| 发现 | 类型 | 行号 |
|------|------|------|
| `window.__BATTERY_COLORS` 定义但 `app_mobile_new.js` 中从未引用 | 死数据 | 78-84 |
| `colorGroups = window.__COLOR_GROUPS` 无防御性 → colors.js 加载失败即崩溃 | 健壮性 | 57, 698, 875 |
| `type` 字段大小写不一致（"Basic" vs "matte"） | 数据不一致 | — |
| Translucent 组有 `td` 字段但 JS 从未读取 | 死字段 | — |

### 数据流总结

```
用户触摸 → onCanvasPointerUp → selectPart → openModal → renderModalGrid → selectModalSwatch → applyColor → closeModal
用户保存 → saveCurrentProject → _saveProjects (localStorage) → renderBottomStripProjects
用户选方案 → applyProjectColors → animateColorChange → renderBottomStripProjects
```

**核心路径无致命 Bug**，所有主要交互链路完整可用。

### 新增问题（Bug 21-32）执行建议

Bug 21-32 全部为 🔵 小问题，建议归入 **「第三批 — 清理/优化」**，前两批（1-13 严重+中等 + 14-20 小问题）处理完毕后再执行。其中：

- Bug 22（outline 残留）、Bug 29（pointerMoved 死代码）→ 与 Bug 5（选色后关闭 Modal）的修改区域重叠，可一并处理
- Bug 26（picker-modal 死代码）、Bug 28（BATTERY_COLORS 死数据）→ 与 Bug 14/16 死代码清理一起处理
- Bug 31（isEditMode 初始化）→ 与死代码清理分开处理，因涉及行为逻辑
- Bug 21（loading 元素缺失）→ 简单添加 DOM，无风险
- Bug 23~25, 27, 30, 32 → 各自独立低风险修复
