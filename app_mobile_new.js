import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const MODELS_COLORABLE = ['Back_Color','Bar_Color','FrontCap_Color','Knob_Color','MainFrame_Color','Usb_Color','Fan','Battery'];
const MODELS_FIXED     = ['Screw'];
const DEFAULT_COLOR    = '#888888';

const FAN_COLORS = [
  { hex: '#9E9E9E', name: '白' },
  { hex: '#212121', name: '黑' },
];

class SafanColorPickerMobile {
  constructor() {
    this.state = {
      parts: {},
      selectedPart: null,
      focusedProjectId: null,
      pendingColor: null,
      currentColors: {},
      projects: [],
    };

    // Mobile-specific state
    this.state.modalOpen = false;
    this.state.modalPartName = null;
    this.state.modalColorType = 'PLA Basic';
    this.state.modalPendingColor = null;

    // 统一手势识别器
    this._gesture = {
      type: null,           // null | 'tap' | 'drag' | 'pinch'
      pointers: [],         // 当前所有活跃 pointer 的 {id, x, y}
      startX: 0,           // 第一个 pointer 的 down x
      startY: 0,           // 第一个 pointer 的 down y
      maxDist: 0,          // 第一个 pointer 累计最大位移
      tapThreshold: 8,     // px — 超过此值为 drag/pinch
      _canceled: false,    // pointercancel 发生过，后续 pointerup 应忽略
      _activePointers: 0,  // 独立计数器，不依赖数组，防止 cancel 清空后丢计数
      _wasPinch: false,    // 曾设为 pinch，防止 cancel 后残留 up 误触 tap
      pointerDownPos: null, // {x, y} 仅用于 drag 的 _pointerMoved 兼容
      pointerMoved: false,  // 仅用于向下兼容
    };

    // Renderer / scene / camera refs
    this.container = document.getElementById('canvas-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    this.mainScene = null;
    this.mainCamera = null;
    this.mainRenderer = null;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.gltfLoader = new GLTFLoader();
    // 配置 DRACO 解码器，支持压缩后的 glb 模型
    const dracoLoader = new DRACOLoader();
    // three@0.128.0 CDN 上的 DRACO lib 在 examples/js/libs/draco/ 下
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');
    this.gltfLoader.setDRACOLoader(dracoLoader);
    this.colorAnimTimers = {};
    this.loadedCount = 0;
    this.totalModels = MODELS_COLORABLE.length + MODELS_FIXED.length;
    this._onModelsLoaded = null;
  }

  /**
   * 初始化应用入口。
   * 依赖全局 window.__COLOR_GROUPS 数据，依次执行场景、灯光、控制器和事件绑定。
   */
  init() {
    // Grab window data first
    this.colorGroups = window.__COLOR_GROUPS;

    this.setupScene();
    this.setupLights();
    this.setupControls();
    this.bindEventsMobile();

    // Mobile: load projects from mobile storage key
    this.state.projects = this._loadProjects();

    this.renderBottomStripProjects();

    this._onModelsLoaded = () => {
      // 开场动画前背景球体完全透明，避免闪烁
      if (this._bgSphere) {
        this._bgSphere.material.opacity = 0;
      }
      this._isIntroPlaying = true;
      if (this.state.projects.length > 0) {
        const latest = this.state.projects[this.state.projects.length - 1];
        this.applyProjectColors(latest.id);
        this.state.focusedProjectId = latest.id;
      } else {
        // 首次加载无配色方案时自动随机
        this.randomizeColors();
      }
      // 模型加载后 currentColors 已由 randomizeColors/applyProjectColors 正确设置
      // 不要调用 _syncCurrentColorsFromScene()，它会在 animateColorChange 异步动画
      // 完成前读取场景材质颜色（仍是初始色），覆盖掉正确的 currentColors

      // 开场动画：所有部件从下方升入
      this._playIntroAnimation();
    };

    this.loadAllModels();

    // Action bar: 随机配色 — 由 _renderActionBar 动态渲染
    this._renderActionBar();

    // Detail button (toolbar 右上角) — 始终查看当前方案
    const btnDetail = document.getElementById('btn-detail-action');
    if (btnDetail) btnDetail.addEventListener('click', () => this.openDetailPage());

    // Bottom strip swipe
    this.initBottomStrip();

    this.animate();
  }

  // ──────────────── Scene & Camera & Renderer ────────────────

/** Three.js 场景设置：创建场景、相机、WebGL渲染器、背景球体，挂载到 #canvas-container */
  setupScene() {
    this.mainScene = new THREE.Scene();
    this.mainScene.background = new THREE.Color(this._getBGColor());
    this.mainCamera = new THREE.PerspectiveCamera(25, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
    this.mainCamera.position.set(0, 30, 80);
    this.mainCamera.lookAt(0, 6.5, 0.4);
    this.mainRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.mainRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.mainRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.mainRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.mainRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.mainRenderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.mainRenderer.domElement);
    this.scene = this.mainScene;
    this.camera = this.mainCamera;
    this.renderer = this.mainRenderer;

    // 创建两层背景球体（视差效果：近处转得快，远处转得慢）
    this._createBackgroundSpheres();
  }

  /**
   * 创建两层 SVG 纹理球体作为 3D 背景，产生 parallax 视差效果。
   * 内层球体半径小、转速快；外层半径大、转速慢。
   * 摄像机始终在球体内部，用 BackSide 渲染内壁。
   */
  _createBackgroundSpheres() {
    // 多层图案列表
    const patterns = [
      'assets/topography.svg',
      'assets/patterns/bubbles.svg',
      'assets/patterns/circuit-board.svg',
      'assets/patterns/i-like-food.svg',
      'assets/patterns/random-shapes.svg',
      'assets/patterns/tic-tac-toe.svg',
    ];
    this._bgPatterns = patterns;
    // 随机选一个作为初始背景
    const selected = patterns[Math.floor(Math.random() * patterns.length)];
    this._currentPattern = selected;

    // 先创建 Image 获取尺寸
    const img = new Image();
    const canvas = document.createElement('canvas');
    img.onload = () => {
      const svgW = img.naturalWidth || 100;
      const svgH = img.naturalHeight || 100;
      const maxDim = Math.max(svgW, svgH);
      const tileSize = Math.round(Math.max(maxDim, 50) * 5.0);
      canvas.width = tileSize;
      canvas.height = tileSize;
      const ctx = canvas.getContext('2d');

      this._buildTileTexture(ctx, canvas, img, tileSize);

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      // topography viewBox 600x600 线条多，减少平铺次数让图案更疏
      const topoRepeat = selected.includes('topography') ? [8, 4] : [20, 10];
      tex.repeat.set(topoRepeat[0], topoRepeat[1]);
      tex.offset.set(Math.random(), 0);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;

      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(140, 64, 32), mat);
      sphere.position.set(0, 6.5, 0.4);
      sphere.userData.isBackground = true;
      this._bgSphere = sphere;
      this.mainScene.add(sphere);

      this.mainScene.background = new THREE.Color(this._getBGColor());
    };
    img.src = selected;
  }

  _buildTileTexture(ctx, canvas, img, tileSize) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const lineColor = isDark ? '#d0d0d0' : '#666666';
    const lineAlpha = 0.25;

    ctx.clearRect(0, 0, tileSize, tileSize);

    // 在 tile canvas 上完成所有处理（不预先平铺，让 Three.js RepeatWrapping 处理）
    const svgW = img.naturalWidth || 100;
    const svgH = img.naturalHeight || 100;
    const drawW = svgW > svgH ? tileSize : Math.round(svgW / svgH * tileSize);
    const drawH = svgH >= svgW ? tileSize : Math.round(svgH / svgW * tileSize);
    const offX = Math.round((tileSize - drawW) / 2);
    const offY = Math.round((tileSize - drawH) / 2);
    ctx.drawImage(img, offX, offY, drawW, drawH);

    // 用 source-in 在 tile canvas 上直接换色 + 透明度
    ctx.globalCompositeOperation = 'source-in';
    ctx.globalAlpha = lineAlpha;
    ctx.fillStyle = lineColor;
    ctx.fillRect(0, 0, tileSize, tileSize);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }

  _switchBackgroundPattern() {
    const patterns = this._bgPatterns || [
      'assets/topography.svg',
      'assets/patterns/bubbles.svg',
      'assets/patterns/circuit-board.svg',
      'assets/patterns/i-like-food.svg',
      'assets/patterns/random-shapes.svg',
      'assets/patterns/tic-tac-toe.svg',
    ];
    // 避免选到当前同一个
    let selected;
    do {
      selected = patterns[Math.floor(Math.random() * patterns.length)];
    } while (selected === this._currentPattern && patterns.length > 1);
    this._currentPattern = selected;

    function _loadNewPattern() {
      const img = new Image();
      img.onload = () => {
        const svgW = img.naturalWidth || 100;
        const svgH = img.naturalHeight || 100;
        const maxDim = Math.max(svgW, svgH);
        const tileSize = Math.round(Math.max(maxDim, 50) * 5.0);
        const canvas = document.createElement('canvas');
        canvas.width = tileSize;
        canvas.height = tileSize;
        const ctx = canvas.getContext('2d');
        this._buildTileTexture(ctx, canvas, img, tileSize);
        if (this._bgSphere) {
          const newTex = new THREE.CanvasTexture(canvas);
          newTex.wrapS = THREE.RepeatWrapping;
          newTex.wrapT = THREE.RepeatWrapping;
          newTex.repeat.set(20, 10);
          // topography viewBox 600x600 线条多，减少平铺次数让图案更疏
          if (selected.includes('topography')) {
            newTex.repeat.set(8, 4);
          }
          newTex.offset.set(Math.random(), 0);
          newTex.magFilter = THREE.LinearFilter;
          newTex.minFilter = THREE.LinearMipmapLinearFilter;
          this._bgSphere.material.map = newTex;
          this._bgSphere.material.needsUpdate = true;
        }
        // 纹理就绪后渐显
        if (!this._isIntroPlaying) doFadeIn();
      };
      img.src = selected;
    }

    // intro 动画尚未完成时，直接无动画替换纹理（intro 自己会渐入背景）
    if (this._isIntroPlaying) {
      _loadNewPattern.call(this);
      return;
    }

    const restoreOpacity = 0.55;

    // 如果背景正在动画中，取消当前动画，硬切换到新纹理并恢复透明度（防连点）
    if (this._bgAnimating) {
      this._bgAnimating = false;
      _loadNewPattern.call(this);
      if (this._bgSphere) this._bgSphere.material.opacity = restoreOpacity;
      return;
    }
    this._bgAnimating = true;

    // 后续随机操作：渐隐 → 加载纹理（onload 中渐显）
    const doFadeIn = () => {
      if (!this._bgSphere) { this._bgAnimating = false; return; }
      const fadeInStart = performance.now();
      const fadeInDuration = 800;
      const fadeInStep = (now) => {
        const t = Math.min((now - fadeInStart) / fadeInDuration, 1);
        const ease = 1 - Math.pow(1 - t, 4);
        this._bgSphere.material.opacity = restoreOpacity * ease;
        if (t < 1) {
          requestAnimationFrame(fadeInStep);
        } else {
          this._bgAnimating = false;
        }
      };
      requestAnimationFrame(fadeInStep);
    };

    const doFadeOut = () => {
      if (!this._bgSphere) {
        _loadNewPattern.call(this);
        return;
      }
      const fadeOutStart = performance.now();
      const fadeOutDuration = 800;
      const fadeOutStep = (now) => {
        const t = Math.min((now - fadeOutStart) / fadeOutDuration, 1);
        const ease = 1 - Math.pow(1 - t, 4);
        this._bgSphere.material.opacity = restoreOpacity * (1 - ease);
        if (t < 1) {
          requestAnimationFrame(fadeOutStep);
        } else {
          this._bgAnimating = false;
          _loadNewPattern.call(this);
        }
      };
      requestAnimationFrame(fadeOutStep);
    };
    doFadeOut();
  }

/** 环境光照设置：环境光 + 两方向光 + 半球光 */

/** 环境光照设置：环境光 + 两方向光 + 半球光 */
  setupLights() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const ambientIntensity = isDark ? 0.55 : 0.75;
    const dl1Intensity = isDark ? 0.7 : 1.0;
    const dl2Intensity = isDark ? 0.2 : 0.3;
    const ambient = new THREE.AmbientLight(0xffffff, ambientIntensity);
    this.scene.add(ambient);
    const dl1 = new THREE.DirectionalLight(0xffffff, dl1Intensity);
    dl1.position.set(5, 10, 5);
    this.scene.add(dl1);
    const dl2 = new THREE.DirectionalLight(0xffffff, dl2Intensity);
    dl2.position.set(-5, 3, -5);
    this.scene.add(dl2);
  }

  _updateLightsForTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    // 查找场景中的光照并调整强度
    this.scene.children.forEach(child => {
      if (child.isAmbientLight) {
        child.intensity = isDark ? 0.55 : 0.75;
      } else if (child.isDirectionalLight) {
        // 根据位置区分主光/补光
        if (child.position.x > 0) {
          child.intensity = isDark ? 0.7 : 1.0;
        } else {
          child.intensity = isDark ? 0.2 : 0.3;
        }
      }
    });
  }

/** OrbitControls 配置：目标点、缩放范围、阻尼 */
  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 6.5, 0.4);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 120;
    this.controls.enablePan = false;

    this._initThemeListener();
    // 选色中旋转模型时临时恢复透明度，松开恢复
    this.controls.addEventListener('start', () => {
      if (this.state.modalOpen && this.state.selectedPart) {
        this.restoreAll();
      }
    });
    this.controls.addEventListener('end', () => {
      if (this.state.modalOpen && this.state.selectedPart) {
        const mesh = this.state.parts[this.state.selectedPart]?.mesh;
        if (mesh) this.dimOthers(mesh);
      }
    });
  }

  _getBGColor() {
    const computed = getComputedStyle(document.documentElement);
    const cssVar = computed.getPropertyValue('--bg').trim();
    // Parse CSS variable — could be hex (#1a1a1e) or named
    if (cssVar.startsWith('#')) return cssVar;
    // If transparent or empty, fall back to white
    return '#ffffff';
  }

  _initThemeListener() {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const saved = localStorage.getItem('app-theme');
      if (!saved) {
        // 无用户覆盖时跟随系统
        document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : '');
      }
      if (this.mainScene) {
        this.mainScene.background = new THREE.Color(this._getBGColor());
        this._updateLightsForTheme();
      }
    };
    mq.addEventListener('change', onChange);
    // 页面加载后也同步一次（FOUC 脚本已处理 data-theme，但需要同步 3D 场景）
    requestAnimationFrame(() => {
      if (this.mainScene) {
        this.mainScene.background = new THREE.Color(this._getBGColor());
        this._updateLightsForTheme();
      }
    });
  }

  // ──────────────── Event Binding ────────────────

/** 移动端事件绑定：触控手势、resize、按钮事件 */
  bindEventsMobile() {
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = 'none';

    // ── 统一手势识别 ──
    // 三个互斥手势：
    //   'tap'   — 单指点击（≤ 8px 位移，无第二指）
    //   'drag'  — 单指拖拽（> 8px 位移，无第二指）
    //   'pinch' — 双指捏合（≥ 2 pointer，自动触发）
    // 手势类型在 move 阶段锁定，lock 后永不改变

    canvas.addEventListener('pointerdown', (e) => {
      const g = this._gesture;
      // 独立计数器自增（不受 pointercancel 清空数组影响）
      g._activePointers++;
      // 记录 pointer（用于位置追踪）
      g.pointers.push({ id: e.pointerId, x: e.clientX, y: e.clientY });
      // 全新手势开始 → 清除 cancel 标记
      g._canceled = false;
      // 第一个 pointer 记录起始位置
      if (g._activePointers === 1) {
        g.startX = e.clientX;
        g.startY = e.clientY;
        g.maxDist = 0;
        g.type = null; // 尚未判定
      }
      // ≥ 2 活跃 pointer → 立即锁定为 pinch（使用独立计数器，不受 cancel 影响）
      if (g._activePointers >= 2) {
        g._wasPinch = true; // 标记，防止 cancel 后残留 up 误触
        g.type = 'pinch';
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      const g = this._gesture;
      // 更新当前 pointer 位置
      const p = g.pointers.find(p => p.id === e.pointerId);
      if (p) { p.x = e.clientX; p.y = e.clientY; }
      // pointermove 锁定时直接返回，无需进一步判定
      if (g.type === 'pinch') return;
      if (g.type === 'drag') return;

      // 未锁定 → 检查第一个 pointer 的累计位移
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > g.maxDist) g.maxDist = dist;
      // 超过阈值 → 锁定为 drag
      if (g.maxDist > g.tapThreshold) {
        g.type = 'drag';
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      const g = this._gesture;
      // 独立计数器递减
      if (g._activePointers > 0) g._activePointers--;
      // 移除 pointer
      g.pointers = g.pointers.filter(p => p.id !== e.pointerId);

      if (g._activePointers > 0) {
        // 还有剩余 pointer → 手势未结束，不触发任何回调
        return;
      }

      // 【防御】如果 type 曾经是 pinch 但被错误重置为 null，用 _wasPinch 标记兜底
      if (g._wasPinch) {
        g._wasPinch = false;
        g._canceled = false;
        return;
      }

      // 所有手指都已抬起 → 最终判定

      // 【关键】如果发生过 pointercancel（iOS 双指缩放后残留的 up），忽略本次 up
      // 此时 type 可能为 null（被 cancel 重置过），但不应视为 tap
      if (g._canceled) {
        g.type = null;
        g._canceled = false;
        return;
      }

      const finalType = g.type || 'tap'; // null（从未判定）视为 tap
      g.type = null; // 重置

      // 根据最终手势类型分发
      if (finalType === 'tap') {
        this._onTap(e);
      }
      // drag 和 pinch 由 OrbitControls 内部处理，我们什么也不做
      // （OrbitControls 已经在自己的 pointerup 里完成了旋转/缩放）
    });

    // canvas 失去指针时也要重置（安全兜底）
    canvas.addEventListener('pointerleave', () => {
      const g = this._gesture;
      if (g._activePointers > 0) g._activePointers--;
      g.pointers = [];
      g.type = null;
    });
    canvas.addEventListener('pointercancel', (e) => {
      const g = this._gesture;
      if (g._activePointers > 0) g._activePointers--;
      // pointercancel：iOS 双指缩放时浏览器取消第一根指针
      // 标记 _canceled=true，让后续残留的 pointerup 忽略本次手势
      g._canceled = true;
      g.pointers = [];
      g.type = null;
    });

    window.addEventListener('resize', () => this.onContainerResize());
    const ro = new ResizeObserver(() => this.onContainerResize());
    ro.observe(this.container);
  }

/** 点击手势处理：关闭详情页/选色面板，或射线检测选中模型部件 */
  _onTap(e) {
    // 点击 Canvas 空白区域：关闭详情全屏页
    this.closeDetailPage();
    if (this.state.modalOpen) {
      // 选色打开时单点关闭
      this.closePicker();
      return;
    }
    // 选色关闭时单点 → 尝试选中模型
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [];
    Object.values(this.state.parts).forEach(({ mesh }) => mesh.traverse(c => { if (c.isMesh) meshes.push(c); }));
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj.parent && !obj.userData.partName) obj = obj.parent;
      const pn = obj.userData.partName;
      if (pn && this.state.parts[pn]) {
        this.selectPart(pn);
        // 用户点击了模型→淡出提示
        this._dismissHint();
      }
    }
  }

  onContainerResize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (w > 0 && h > 0) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  }

  // ──────────────── Animation Loop ────────────────

  _dismissHint() {
    const hint = document.getElementById('scene-hint');
    if (hint) {
      hint.style.opacity = '0';
      setTimeout(() => hint.remove(), 800);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // 背景球体：按总旋转量比例跟随（用户转360°球体只转一小部分）
    if (this._bgSphere) {
      const camPos = this.camera.position.clone();
      const angleNow = Math.atan2(camPos.x, camPos.z);
      if (this._bgCamBaseAngle === undefined) {
        this._bgCamBaseAngle = angleNow;
        this._bgSphereBaseRot = this._bgSphere.rotation.y;
      }
      // 计算相机累计旋转角度
      let totalCamAngle = angleNow - this._bgCamBaseAngle;
      if (totalCamAngle > Math.PI) totalCamAngle -= 2 * Math.PI;
      if (totalCamAngle < -Math.PI) totalCamAngle += 2 * Math.PI;
      // 球体只跟随极小比例
      this._bgSphere.rotation.y = this._bgSphereBaseRot + totalCamAngle * 0.015;
    }

    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // ──────────────── Model Loading ────────────────

/** 加载单个 GLB 模型，挂载到场景并记录 part 状态 */
  loadModel(filename, partName, isColorable) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        'Models/' + filename + '.glb',
        (gltf) => {
          const mesh = gltf.scene;
          mesh.name = partName;
          mesh.userData.partName = partName;
          mesh.userData.isColorable = isColorable;
          mesh.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          mesh.scale.set(0.08, 0.08, 0.08);
          mesh.position.y = 10;
          const hex = DEFAULT_COLOR;
          if (partName === 'Fan') {
            this._setMeshColor(mesh, '#9E9E9E');
          } else if (!isColorable) {
            this.applyMetalness(mesh);
          } else {
            this._setMeshColor(mesh, hex);
          }
          this.scene.add(mesh);
          this.state.parts[partName] = { mesh, currentColor: hex, isColorable, colorType: 'Basic' };
          this.loadedCount++;
          this.updateLoadingText('Loading... ' + Math.round(this.loadedCount / this.totalModels * 100) + '%');
          resolve();
        },
        undefined,
        (err) => reject(new Error(filename + ': ' + err)),
      );
    });
  }

/** 按顺序加载所有部件模型，完成后回调 */
  loadAllModels() {
    this.updateLoadingText('Loading... 0%');
    // 按文件大小升序排列，最小模型先加载，用户能更快看到画面
    const modelOrder = [
      { name: 'Battery',       isColorable: true  },  // 71K
      { name: 'Knob_Color',    isColorable: true  },  // 109K
      { name: 'Bar_Color',     isColorable: true  },  // 119K
      { name: 'FrontCap_Color',isColorable: true  },  // 164K
      { name: 'Usb_Color',     isColorable: true  },  // 230K
      { name: 'Screw',         isColorable: false },  // 413K
      { name: 'Fan',           isColorable: true  },  // 431K
      { name: 'MainFrame_Color',isColorable: true },  // 1.1M
      { name: 'Back_Color',    isColorable: true  },  // 1.2M
    ];
    // 并行加载所有模型，互不阻塞
    const loadPromises = modelOrder.map(item =>
      this.loadModel(item.name, item.name, item.isColorable)
        .catch((e) => {
          console.error('Failed to load', item.name, e);
          // 重试一次
          return new Promise((resolve) => {
            setTimeout(() => {
              this.loadModel(item.name, item.name, item.isColorable)
                .then(resolve)
                .catch((e2) => {
                  console.error('Retry also failed for', item.name, e2);
                  resolve();
                });
            }, 500);
          });
        })
    );
    Promise.all(loadPromises).then(() => {
      const loading = document.getElementById('loading');
      if (loading) loading.classList.add('hidden');
      if (this._onModelsLoaded) this._onModelsLoaded();
    });
    setTimeout(() => {
      const loading = document.getElementById('loading');
      if (loading && !loading.classList.contains('hidden')) {
        loading.classList.add('hidden');
      }
    }, 20000);
  }

  updateLoadingText(t) {
    const el = document.getElementById('loading-text');
    if (el) el.textContent = t;
  }

  /** 开场动画：模型从下方旋转升入 */
  _playIntroAnimation() {
    if (!this.controls) return;
    // 所有部件初始位置移到下方
    const parts = Object.values(this.state.parts);
    const targets = {};
    parts.forEach(({ mesh }) => {
      targets[mesh.uuid] = mesh.position.y;
      mesh.position.y = -30;
    });
    // 背景球体初始隐藏
    if (this._bgSphere) {
      this._bgSphere.material.opacity = 0;
    }
    // 提示：拖动模型旋转
    const hint = document.getElementById('scene-hint');
    if (hint) {
      hint.textContent = '拖动模型旋转';
      hint.style.opacity = '1';
      hint.style.visibility = 'visible';
      hint.style.transition = 'opacity 0.6s ease-in-out';
    }
    // 自动旋转（升入期间旋转，到位即停）
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 3.0;
    // 升入动画
    const startTime = performance.now();
    const duration = 800;
    const step = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 5);
      parts.forEach(({ mesh }) => {
        const targetY = targets[mesh.uuid];
        mesh.position.y = -30 + (targetY + 30) * ease;
      });
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        // 升入到位 → 停旋转
        this.controls.autoRotate = false;
        // 背景渐入
        if (this._bgSphere) {
          const bgMat = this._bgSphere.material;
          const fadeDuration = 500;
          const fadeStart = performance.now();
          const fadeStep = (now) => {
            const ft = Math.min((now - fadeStart) / fadeDuration, 1);
            bgMat.opacity = 0.55 * ft;
            if (ft < 1) {
              requestAnimationFrame(fadeStep);
            }
          };
          requestAnimationFrame(fadeStep);
        }
        // intro 动画完成，背景渐入结束，后续背景切换可以走动画
        this._isIntroPlaying = false;
        // 用户首次拖动模型后显示"点击模型换色"
        const onEnd = () => {
          this.controls.removeEventListener('end', onEnd);
          if (hint) {
            // 先渐隐
            hint.style.opacity = '0';
            setTimeout(() => {
              hint.textContent = '点击模型换色';
              hint.style.opacity = '1';
            }, 600);
          }
        };
        this.controls.addEventListener('end', onEnd);
      }
    };
    requestAnimationFrame(step);
  }

  applyMetalness(mesh) {
    // 螺丝使用银色金属质感 — 无 envMap 时降低 metalness 避免发黑
    mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!child.material.isMeshStandardMaterial) {
          child.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        }
        child.material.roughness = 0.25;
        child.material.metalness = 0.45;
        child.material.color.setHex(0xC0C0C0);
        child.material.emissive.set(0x000000);
        child.material.emissiveIntensity = 0;
      }
    });
  }

/** 降低选中部件以外所有部件的透明度，形成选中高亮效果 */
  dimOthers(selectedMesh) {
    // 让非选中部件变透明
    Object.values(this.state.parts).forEach(({ mesh: m }) => {
      if (selectedMesh && m === selectedMesh) return;
      m.traverse((child) => {
        if (child.isMesh && child.material) {
          if (child.material.transparent !== true) {
            child.material._origOpacity = child.material.opacity;
            child.material.transparent = true;
          }
          child.material.opacity = 0.15;
          child.material.depthWrite = false;
        }
      });
    });
  }

/** 恢复所有部件的透明度至正常状态 */
  restoreAll() {
    // 恢复所有部件的不透明度
    Object.values(this.state.parts).forEach(({ mesh: m }) => {
      m.traverse((child) => {
        if (child.isMesh && child.material) {
          const orig = child.material._origOpacity;
          child.material.opacity = orig !== undefined ? orig : 1.0;
          child.material.transparent = false;
          child.material.depthWrite = true;
          delete child.material._origOpacity;
        }
      });
    });
  }

  // ──────────────── Bottom Strip ────────────────

  initBottomStrip() {
    // Long-press edit mode for cards
    this._initEditMode();
    // Drag-to-scroll for mouse users
    this._initStripDragScroll();
  }

  _initStripDragScroll() {
    const container = document.getElementById('strip-cards');
    if (!container) return;
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;

    container.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.strip-card');
      if (!card) return;
      isDragging = true;
      startX = e.clientX;
      scrollLeft = container.scrollLeft;
    });

    container.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dist = e.clientX - startX;
      container.scrollLeft = scrollLeft - dist;
    });

    container.addEventListener('pointerup', () => {
      isDragging = false;
    });

    container.addEventListener('pointerleave', () => {
      // 指针离开容器时取消拖动状态，防止干扰其他 UI
      isDragging = false;
    });
  }

  _initEditMode() {
    const container = document.getElementById('strip-cards');
    if (!container) return;
    let pressTimer = null;
    let pressStartX = 0;
    let pressStartY = 0;

    // 使用 PointerEvent 统一处理鼠标和触屏长按
    container.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.strip-card');
      if (!card) return;
      pressStartX = e.clientX;
      pressStartY = e.clientY;
      pressTimer = setTimeout(() => {
        navigator.vibrate && navigator.vibrate(50);
        this.enterEditMode();
      }, 500);
    });

    container.addEventListener('pointermove', (e) => {
      const dx = Math.abs(e.clientX - pressStartX);
      const dy = Math.abs(e.clientY - pressStartY);
      if (dx > 10 || dy > 10) clearTimeout(pressTimer);
    });

    container.addEventListener('pointerup', () => {
      clearTimeout(pressTimer);
    });

    container.addEventListener('pointerleave', () => {
      // 指针离开容器区域时清理计时器（鼠标场景）
      clearTimeout(pressTimer);
    });

    // Tap outside cards → exit edit mode
    document.addEventListener('click', (e) => {
      if (this.state.isEditMode && !e.target.closest('.strip-card') && !e.target.closest('.delete-btn')) {
        this.exitEditMode();
      }
    });
  }

  enterEditMode() {
    this.state.isEditMode = true;
    document.getElementById('bottom-strip').classList.remove('collapsed');
    document.body.classList.add('edit-mode');
    // 显示编辑模式提示
    const tip = document.getElementById('edit-mode-tip');
    if (tip) tip.classList.add('show');
    // 3D 模型虚化
    const containerEl = document.getElementById('canvas-container');
    if (containerEl) containerEl.classList.add('edit-mode-blur');
    const cardsContainer = document.getElementById('strip-cards');
    if (!cardsContainer) return;
    cardsContainer.querySelectorAll('.strip-card').forEach((card, i) => {
      card.classList.add('jiggling');
      card.classList.toggle('jiggle-odd', i % 2 === 0);
      card.classList.toggle('jiggle-even', i % 2 !== 0);
    });
  }

  exitEditMode() {
    this.state.isEditMode = false;
    document.body.classList.remove('edit-mode');
    // 隐藏编辑模式提示
    const tip = document.getElementById('edit-mode-tip');
    if (tip) tip.classList.remove('show');
    // 取消 3D 模型虚化
    const containerEl = document.getElementById('canvas-container');
    if (containerEl) containerEl.classList.remove('edit-mode-blur');
    const cardsContainer = document.getElementById('strip-cards');
    if (cardsContainer) {
      cardsContainer.querySelectorAll('.strip-card').forEach(card => {
        card.classList.remove('jiggling', 'jiggle-odd', 'jiggle-even');
      });
    }
  }

  renderBottomStripProjects() {
    const container = document.getElementById('strip-cards');
    if (!container) return;

    const focusedId = this.state.focusedProjectId;

    // 如果无任何配色方案，显示空状态 + 加号引导
    if (this.state.projects.length === 0) {
      container.innerHTML = `
        <button class="btn-add-project" id="btn-add-project">+</button>
        <div class="strip-empty">点击 + 创建第一个配色方案</div>
      `;
      const addBtn = container.querySelector('#btn-add-project');
      if (addBtn) addBtn.addEventListener('click', () => this.createNewProject());
      return;
    }

    container.innerHTML = `
      <button class="btn-add-project" id="btn-add-project">+</button>
      ${this.state.projects.map((p, i) => {
        const isFocus = p.id === focusedId;
        const colors = p.colors || {};
        const previewColors = colors._previews
          || Object.keys(colors)
            .filter(k => k !== '_previews' && typeof colors[k] === 'string' && /^#[0-9A-Fa-f]{6}$/.test(colors[k]))
            .map(k => colors[k])
            .slice(0, 5);
        const cardInner = p.thumbnail
          ? `<img src="${p.thumbnail}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`
          : previewColors.length > 0
            ? previewColors.map(hex => `<span style="background:${hex};flex:1;"></span>`).join('')
            : '<span style="flex:1;background:#bdbdbd;"></span>';
        const cardInnerHtml = p.thumbnail
          ? cardInner
          : `<div class="strip-card-colors">${cardInner}</div>`;
        return `
          <div class="strip-card${isFocus ? ' focused' : ''}" data-project-id="${p.id}" data-index="${i}">
            <span class="delete-btn" data-delete-id="${p.id}">×</span>
            ${cardInnerHtml}
          </div>
        `;
      }).join('')}
    `;

    // + 按钮事件
    const addBtn = container.querySelector('#btn-add-project');
    if (addBtn) addBtn.addEventListener('click', () => this.createNewProject());

    // 卡片事件
    container.querySelectorAll('.strip-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
          const pid = parseInt(deleteBtn.dataset.deleteId);
          if (confirm('确定要删除这个配色方案吗？')) {
            this.deleteProject(pid);
          }
          return;
        }
        if (this.state.isEditMode) return;
        const pid = parseInt(card.dataset.projectId);
        // 如果点击的是已聚焦卡片 → 不做任何事（不进入详情）
        if (this.state.focusedProjectId === pid) {
          return;
        }
        // 否则聚焦并应用
        this.state.focusedProjectId = pid;
        this.applyProjectColors(pid);
        this.renderBottomStripProjects();
        // 闪动动画
        card.classList.add('flash');
        setTimeout(() => card.classList.remove('flash'), 500);
      });
    });
  }

  _renderActionBar() {
    const bar = document.getElementById('action-bar');
    if (!bar) return;
    const favs = this._getFavorites();
    if (favs.length === 0) {
      bar.innerHTML = '<button id="btn-random-action" class="action-btn">随机配色</button>';
    } else {
      bar.innerHTML = '<button id="btn-random-action" class="action-btn">随机配色</button><button id="btn-random-fav-action" class="action-btn" style="margin-left:10px;">🎲只随机我的颜色</button>';
    }
    const btnRandom = document.getElementById('btn-random-action');
    if (btnRandom) btnRandom.addEventListener('click', () => this.randomizeColors());
    const btnFav = document.getElementById('btn-random-fav-action');
    if (btnFav) btnFav.addEventListener('click', () => this.randomizeFavoritesOnly());
  }


  deleteProject(projectId) {
    const currentFocus = this.state.focusedProjectId;
    this.state.projects = this.state.projects.filter(p => p.id !== projectId);
    // 不退出编辑模式，用户可以继续删除其他卡片
    // 自动切换聚焦到前一个（或最后一个）
    if (currentFocus === projectId) {
      if (this.state.projects.length > 0) {
        // 尝试找索引比被删项目小的最近一个，否则取最后一个
        const deletedIndex = this.state.projects.findIndex(p => p.id === projectId);
        // 注意：projectId 已经被 filter 掉了，所以用 deletedIndex 来判断
        const target = this.state.projects[Math.min(deletedIndex, this.state.projects.length - 1)]
          || this.state.projects[this.state.projects.length - 1];
        this.state.focusedProjectId = target.id;
        this.applyProjectColors(target.id);
      } else {
        this.state.focusedProjectId = null;
      }
    }
    this._saveProjects();
    this.renderBottomStripProjects();
    if (this.state.projects.length === 0) {
      const strip = document.getElementById('bottom-strip');
      if (strip) strip.classList.add('collapsed');
      // 全部删除后自动退出编辑模式，避免用户无法退出
      this.exitEditMode();
    }
  }

  // ──────────────── 详情全屏页 ────────────────

  // 配件数据
  get ACC_ITEMS() {
    return [
      { id: 'Battery', name: '充电宝', thumb: 'assets/Battery', colorable: true, spec: '[匹配颜色]', buyUrl: 'https://item.jd.com/100076329131.html' },
      { id: 'Fan', name: '风扇', thumb: 'assets/Fan.jpg', colorable: true, spec: '黑/白 反叶', buyUrl: 'https://item.jd.com/10174921968357.html' },
      { id: 'Cable_PWM', name: 'PWM 线', thumb: 'assets/PWM.jpg', colorable: false, spec: '标准 DIY-B', buyUrl: 'https://item.taobao.com/item.htm?id=688922646098&skuId=5811176123159' },
      { id: 'Cable_CTOC', name: '充电线', thumb: 'assets/ctoc.jpg', colorable: false, spec: 'A上C直 0.1M', buyUrl: 'https://item.taobao.com/item.htm?id=673744277268' },
      { id: 'Cable_CTOA', name: '连接控制器线缆', thumb: 'assets/CtoA.jpg', colorable: false, spec: '上对母 0.1M', buyUrl: 'https://item.taobao.com/item.htm?id=780828764459' },
      { id: 'Screw', name: '螺丝', thumb: 'assets/screw.jpg', colorable: false, spec: 'M3x10 8颗 + M3x5 2颗', buyUrl: 'https://detail.tmall.com/item.htm?id=996587943845' },
      { id: 'FootPad', name: '脚垫', thumb: 'assets/pad.jpg', colorable: false, spec: '9号小圆形黑色硅胶垫', buyUrl: 'https://detail.tmall.com/item.htm?id=814584391551' },
    ];
  }

  openDetailPage() {
    // 如果 currentColors 为空，从场景同步
    const colors = this.state.currentColors && Object.keys(this.state.currentColors).length > 0
      ? this.state.currentColors
      : (this._syncCurrentColorsFromScene(), this.state.currentColors || {});
    const container = document.getElementById('detail-container');
    if (!container) return;

    // 编辑模式下部件处于半透明（dim）状态，截图前须恢复
    this.state._pickerWasOpen = this.state.modalOpen;
    this.restoreAll();

    // 生成 3D 截图 — 正面 + 背面斜45°
    const shotFront = this._captureThumbnail(320);
    // 背面斜45°：从左后上方看
    const shotBack = this._captureThumbnail(320, 'back');

    // 可上色部件列表（按颜色分组）
    const COLORED_PARTS = [
      { id: 'FrontCap_Color', name: '前罩' },
      { id: 'Back_Color', name: '背板' },
      { id: 'MainFrame_Color', name: '主框架' },
      { id: 'Bar_Color', name: '提手' },
      { id: 'Knob_Color', name: '旋钮' },
      { id: 'Usb_Color', name: '充电口' },
    ];

    // 按 colorCode 分组（code 唯一，不会像 hex 那样重复）
    const colorGroups = {};
    const typeToGroup = { 'Basic': 'PLA Basic', 'matte': 'PLA Matte', 'translucent': 'PLA Translucent' };
    COLORED_PARTS.forEach(p => {
      const hex = colors[p.id] || '#888888';
      const saved = this.state.parts[p.id];
      // 从 state.parts 查找完整的颜色对象
      let colorObj = null;
      if (saved && saved.colorType && saved.colorCode) {
        const groupKey = typeToGroup[saved.colorType];
        const group = groupKey ? this.colorGroups[groupKey] : null;
        if (group) {
          colorObj = group.find(c => c.code === saved.colorCode) || null;
        }
      }
      if (!colorObj && saved && saved.currentColor && saved.currentColor !== '#888888') {
        // fallback: 通过 hex 查找（用于初始化后未打开选色器的场景）
        const fallback = this.findColorByHex(hex);
        if (fallback) colorObj = fallback;
      }
      if (!colorObj) {
        colorObj = { hex, name: '—', code: '', type: '', displayHex: '' };
      }
      // 用 code 作为分组键（空 code 的部件各自独立分组）
      const groupCode = colorObj.code || p.id;
      if (!colorGroups[groupCode]) {
        colorGroups[groupCode] = {
          hex: colorObj.displayHex || colorObj.hex,
          name: colorObj.name,
          code: colorObj.code,
          type: colorObj.type || '',
          groupKey: colorObj.code ? this._getGroupKeyForCode(colorObj.code) : '',
          parts: []
        };
      }
      colorGroups[groupCode].parts.push(p);
    });

    // 组排序：多用颜色排前面，组内部件按原始顺序
    const sortedGroups = Object.values(colorGroups).sort((a, b) => b.parts.length - a.parts.length);
    sortedGroups.forEach(g => {
      g.parts.sort((a, b) => COLORED_PARTS.indexOf(a) - COLORED_PARTS.indexOf(b));
    });

    // 获取配件的颜色
    const accItems = this.ACC_ITEMS.map(item => {
      if (item.colorable) {
        const hex = colors[item.id] || '#888888';
        // 优先从 state.parts 中获取实际选中的颜色信息
        const saved = this.state.parts[item.id];
        let colorName = '';
        let colorCode = '';
        if (saved && saved.colorType && saved.colorCode && item.id !== 'Battery' && item.id !== 'Fan') {
          const typeToGroup = { 'Basic': 'PLA Basic', 'matte': 'PLA Matte', 'translucent': 'PLA Translucent' };
          const groupKey = typeToGroup[saved.colorType];
          const group = groupKey ? this.colorGroups[groupKey] : null;
          if (group) {
            const c = group.find(c => c.code === saved.colorCode);
            if (c) { colorName = c.name; colorCode = c.code; }
          }
        }
        if (!colorCode) {
          // fallback: 通过 hex 查找（仅 Fan/Battery 走特殊列表，避免 findColorByHex 在 PLA 组中误匹配）
          if (item.id === 'Fan') {
            const fc = FAN_COLORS.find(f => f.hex.toLowerCase() === hex.toLowerCase());
            if (fc) { colorName = fc.name; }
          } else if (item.id === 'Battery') {
            const bc = (window.__BATTERY_COLORS || []).find(b => b.hex.toLowerCase() === hex.toLowerCase());
            if (bc) { colorName = bc.name; }
          } else {
            const colorObj = this.findColorByHex(hex);
            if (colorObj) {
              colorName = colorObj.name;
              colorCode = colorObj.code || '';
            }
          }
        }
        return { ...item, hex, colorName, colorCode };
      }
      return { ...item, hex: null, colorName: null, colorCode: null };
    });

    // ── 构建三段式详情页布局 ──
    let html = '';

    // ── Header ──
    html += `
      <div class="detail-header-top">
        <button id="btn-detail-back">← 返回</button>
        <span class="detail-header-title">当前配色</span>
        <div class="detail-header-actions">
          <a href="https://makerworld.com.cn/zh/models/2545233-safan-go-san-shan-zhuo-mian-feng-shan-chong-dian-b#profileId-2923264" target="_blank" rel="noopener">下载模型</a>
        </div>
      </div>
    `;

    // ── Section ①: 总览截图 — 正面 + 背面斜45° ──
    html += `
      <div class="detail-content">
        <div class="detail-model-shot dual">
          <img src="${shotFront}" alt="正面">
          <img src="${shotBack}" alt="背面">
        </div>
      </div>
    `;

    // ── Section ②: 3D主部件 — 部件网格，同色相邻 ──
    html += `<div class="detail-content"><div class="part-grid">`;
    sortedGroups.forEach(g => {
      g.parts.forEach(p => {
        const shot = this._capturePartThumbnail(p.id, 240);
        html += `
          <div class="part-card">
            <div class="part-card-img">${shot ? `<img src="${shot}" alt="${p.name}">` : ''}</div>
            <div class="part-card-info">
              <span class="part-card-name">${p.name}</span>
              <span class="part-card-color">${g.name}</span>
            </div>
          </div>
        `;
      });
    });
    html += `</div>`;  // end .part-grid
    html += `</div>`;  // end .detail-content

    // ── Section ③: 使用颜色 — 列表式，去重 ──
    html += `<div class="detail-content"><div class="detail-section-colors">`;
    sortedGroups.forEach(g => {
      const searchKeyword = `拓竹 PLA ${g.type} ${g.code || ''}`.trim();
      const buyUrl = `https://so.m.jd.com/ware/search.action?keyword=${encodeURIComponent(searchKeyword)}`;
      html += `
        <div class="color-list-item">
          <span class="cls-swatch" style="background:${g.hex}"></span>
          <span class="cls-name">${g.name}</span>
          ${g.code ? `<span class="cls-code">${g.code}</span>` : ''}
          ${g.groupKey ? `<span class="cls-group">${g.groupKey.replace('PLA ', '')}</span>` : ''}
          <a class="buy-btn" href="${buyUrl}" target="_blank" rel="noopener">购买</a>
        </div>
      `;
    });
    html += `</div>`;  // end .detail-section-colors
    html += `</div>`;  // end .detail-content

    // ── Section ④: 其他部件 — 列表式 ──
    html += `<div class="detail-content"><div class="detail-section-others">`;
    accItems.forEach(item => {
      // 过滤内部备注（如 '[匹配颜色]'），只显示实际规格
      const displaySpec = item.spec && !item.spec.startsWith('[') ? item.spec : '';
      // 构建 actions 区内容（购买按钮左侧）
      let actionsHtml = '';
      if (item.id === 'Fan') {
        // 风扇：颜色名 + "反叶" + 购买
        if (item.colorName) actionsHtml += `<span class="oli-tag">${item.colorName}</span>`;
        actionsHtml += `<span class="oli-spec">反叶</span>`;
      } else if (item.id === 'Battery') {
        // 充电宝：颜色名 + 购买
        if (item.colorName) actionsHtml += `<span class="oli-tag">${item.colorName}</span>`;
      } else {
        // 其他部件：spec + 购买
        if (displaySpec) actionsHtml += `<span class="oli-spec">${displaySpec}</span>`;
      }
      actionsHtml += item.buyUrl ? `<a class="buy-btn" href="${item.buyUrl}" target="_blank" rel="noopener">购买</a>` : '';
      html += `
        <div class="other-list-item">
          <img class="oli-thumb" src="${item.thumb || ''}" alt="${item.name}">
          <div class="oli-info">
            <span class="oli-name">${item.name}</span>
          </div>
          <div class="oli-actions">
            ${actionsHtml}
          </div>
        </div>
      `;
    });
    html += `</div>`;  // end .detail-section-others
    html += `</div>`;  // end .detail-content

    // ── 底部操作栏: 导出 PDF ──
    html += `
      <div class="detail-footer-actions">
        <button class="footer-btn-secondary" id="btn-export-pdf"><span class="print-btn-icon">⬇</span>下载为 PDF</button>
      </div>
    `;

    container.innerHTML = html;

    // 事件绑定
    container.querySelector('#btn-detail-back').addEventListener('click', () => this.closeDetailPage());
    const btnPdf = container.querySelector('#btn-export-pdf');
    if (btnPdf) {
      btnPdf.addEventListener('click', () => {
        this._exportDetailAsPdf();
      });
    }

    container.classList.add('open');
  }

  /**
   * 将当前详情页导出为 PDF 并下载
   * 先用 html2canvas 截取每个 section 的 DOM 截图，再嵌入 jsPDF
   */
  _exportDetailAsPdf() {
    const container = document.getElementById('detail-container');
    if (!container) return;

    const btn = container.querySelector('#btn-export-pdf');
    const origText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '⏳ 生成中…';

    // 隐藏底部按钮（不截进去）
    const footerActions = container.querySelector('.detail-footer-actions');

    // 收集所有需要截图渲染的区域
    const sections = [];

    // Header 标题
    const headerEl = container.querySelector('.detail-header-top');
    if (headerEl) sections.push({ el: headerEl, label: 'header' });

    // Section①: 正背面截图
    const shotEl = container.querySelector('.detail-model-shot');
    if (shotEl) sections.push({ el: shotEl, label: 'screenshot' });

    // Section②: 部件网格
    const gridEl = container.querySelector('.part-grid');
    if (gridEl) sections.push({ el: gridEl, label: 'parts' });

    // Section③: 颜色列表
    const colorSec = container.querySelector('.detail-section-colors');
    if (colorSec) sections.push({ el: colorSec, label: 'colors' });

    // Section④: 其他配件
    const otherSec = container.querySelector('.detail-section-others');
    if (otherSec) sections.push({ el: otherSec, label: 'others' });

    if (sections.length === 0) {
      if (btn) btn.innerHTML = origText;
      return;
    }

    // 等待图片加载完成
    const waitForImages = () => new Promise(resolve => {
      const imgs = container.querySelectorAll('img');
      const pending = Array.from(imgs).filter(img => !img.complete);
      if (pending.length === 0) { resolve(); return; }
      let count = 0;
      pending.forEach(img => {
        img.onload = () => { count++; if (count >= pending.length) resolve(); };
        img.onerror = () => { count++; if (count >= pending.length) resolve(); };
      });
      setTimeout(resolve, 3000);
    });

    waitForImages().then(() => {
      // 强制为浅色模式截图（统一背景色）
      const savedTheme = document.documentElement.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', 'light');
      // 同时让 container 的背景强制为白色
      const savedContainerBg = container.style.background;
      container.style.background = '#ffffff';

      // 逐个截图前：
      // 1. 隐藏按钮类元素（不出现可点击的元素）
      // 2. 在每个按钮位置插入链接文字（分两行）
      const buyBtns = container.querySelectorAll('.buy-btn');
      const linkPlaceholders = [];
      buyBtns.forEach(el => {
        const href = el.getAttribute('href') || '';
        el.style.display = 'none';
        // 在按钮的父容器末尾追加链接文字
        const parent = el.parentElement;
        if (parent && href) {
          const wrap = document.createElement('div');
          wrap.style.cssText = 'font-size:8px;color:#999;line-height:1.4;margin-top:1px;';
          wrap.innerHTML = `<div>购买:</div><div style="word-break:break-all;">${href}</div>`;
          parent.appendChild(wrap);
          linkPlaceholders.push(wrap);
        }
      });

      // 紧凑排版样式覆盖（减少间距改善空间利用）
      container.style.background = '#ffffff';
      const compactStyleId = '_pdf_compact_';
      if (!document.getElementById(compactStyleId)) {
        const sty = document.createElement('style');
        sty.id = compactStyleId;
        sty.textContent = `
          .detail-header-top { padding:6px 10px !important; }
          .detail-model-shot { padding:8px 10px 2px !important; }
          .detail-model-shot img { width:48% !important; }
          .part-grid { gap:4px !important; padding:4px 6px !important; }
          .part-card-info { padding:1px 3px 3px !important; }
          .detail-section-colors { padding:0 6px 4px !important; }
          .color-list-item { padding:4px 6px !important; min-height:32px !important; }
          .detail-section-others { padding:0 6px 16px !important; }
          .other-list-item { padding:4px 6px !important; min-height:36px !important; }
          .detail-header-actions { display:none !important; }
          .oli-thumb { width:28px !important; height:28px !important; }
        `;
        document.head.appendChild(sty);
      }
      if (footerActions) footerActions.style.display = 'none';

      const capturePromises = sections.map(sec => {
        return html2canvas(sec.el, {
          scale: 2,
          allowTaint: true,
          useCORS: false,
          backgroundColor: '#ffffff',
          logging: false
        }).then(canvas => {
          return { label: sec.label, canvas };
        }).catch(err => {
          console.warn('截图失败', sec.label, err);
          return { label: sec.label, canvas: null };
        });
      });

      Promise.all(capturePromises).then(results => {
        // 恢复原始主题和背景
        if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
        container.style.background = savedContainerBg;
        // 恢复按钮显示和清理插入的链接文字
        buyBtns.forEach(el => el.style.display = '');
        linkPlaceholders.forEach(el => el.remove());
        // 移除紧凑排版样式
        const compactStyle = document.getElementById(compactStyleId);
        if (compactStyle) compactStyle.remove();
        if (footerActions) footerActions.style.display = '';
        if (btn) btn.innerHTML = origText;

        try {
          if (typeof window.jspdf === 'undefined') {
            throw new Error('jsPDF 库未加载');
          }
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const pw = pdf.internal.pageSize.getWidth();
          const ph = pdf.internal.pageSize.getHeight();
          const margin = 10;
          const contentW = pw - margin * 2;

          let y = margin;

          results.forEach(({ label, canvas }) => {
            if (!canvas) {
              return;
            }
            // 在 A4 页中计算图片尺寸
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const imgW = contentW;
            // 保持宽高比，但宽度自适应
            const imgH = (canvas.height / canvas.width) * imgW;
            // 如果本页放不下，换页
            if (y + imgH > ph - margin) {
              pdf.addPage();
              y = margin;
            }
            pdf.addImage(imgData, 'JPEG', margin, y, imgW, imgH);
            y += imgH + 3;
          });

          const now = new Date();
          const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
          pdf.save(`Safan-配色方案-${dateStr}.pdf`);
        } catch (err) {
          console.error('PDF 生成失败:', err);
          this.showToast('导出失败: ' + (err.message || '未知错误'));
        }
      });
    });
  }

  closeDetailPage() {
    const container = document.getElementById('detail-container');
    if (container) container.classList.remove('open');
    // 如果进入详情前 picker 是打开状态，重新 dim 保持编辑环境
    if (this.state._pickerWasOpen && this.state.selectedPart && this.state.parts[this.state.selectedPart]) {
      this.dimOthers(this.state.parts[this.state.selectedPart].mesh);
    }
    delete this.state._pickerWasOpen;
  }

  // ──────────────── Strip Color Picker (替换配色库的选色面板) ────────────────

  selectPart(name) {
    const part = this.state.parts[name];
    if (!part) return;
    // 非可配色部件（如螺丝）不支持选择改色
    if (!part.isColorable) {
      this.showToast('螺丝为固定银色，不可配色');
      return;
    }
    if (this.state.selectedPart && this.state.parts[this.state.selectedPart]) {
      this.restoreAll();
    }
    this.state.selectedPart = name;
    this.state.pendingColor = null;
    this.dimOthers(this.state.parts[name].mesh);
    this.openPicker(name);
  }

  openPicker(partName) {
    this.state.modalPartName = partName;
    this.state.modalOpen = true;

    // 记录当前部件已选颜色（用于滚动定位）
    const part = this.state.parts[partName];
    if (part && part.mesh) {
      // mesh may be a Group (no material) — traverse children to find material
      let matColor = null;
      if (part.mesh.material) {
        const mat = Array.isArray(part.mesh.material) ? part.mesh.material[0] : part.mesh.material;
        matColor = mat.color?.getHexString?.();
      } else {
        part.mesh.traverse(c => {
          if (c.isMesh && c.material && !matColor) {
            const mat = Array.isArray(c.material) ? c.material[0] : c.material;
            matColor = mat.color?.getHexString?.();
          }
        });
      }
      this.state._pickerSelectedHex = matColor ? '#' + matColor.toUpperCase() : null;
    } else {
      this.state._pickerSelectedHex = null;
    }

    // 查找已选颜色所属的颜色类型，自动切换到对应 Tab
    const selectedHex = this.state._pickerSelectedHex;
    let targetType = 'PLA Basic'; // 默认
    if (selectedHex && this.colorGroups) {
      for (const [typeName, colors] of Object.entries(this.colorGroups)) {
        if (colors.some(c => c.hex === selectedHex)) {
          targetType = typeName;
          break;
        }
      }
      // 如果已选颜色在所有颜色类型中都找不到（如默认颜色 #888888），则清除选中标记
      // 让列表从头开始显示，不试图滚动到不存在的位置
      let found = false;
      for (const [, colors] of Object.entries(this.colorGroups)) {
        if (colors.some(c => c.hex === selectedHex)) { found = true; break; }
      }
      if (!found) {
        this.state._pickerSelectedHex = null;
      }
    }
    this.state.modalColorType = targetType;

    // 隐藏配色库，显示选色面板 — 先用过渡滑出，再创建选色面板升入
    const strip = document.getElementById('bottom-strip');
    const cardsContainer = document.getElementById('strip-cards');
    const actionBar = document.getElementById('action-bar');
    if (actionBar) actionBar.classList.add('hidden');
    if (strip) strip.classList.remove('collapsed');

    const doOpenPicker = () => {
      // 移除已有选色面板
      const existing = document.getElementById('strip-picker');
      if (existing) existing.remove();

      // 创建选色面板插入 bottom-strip
      const pickerEl = document.createElement('div');
      pickerEl.id = 'strip-picker';
      // 电池选色隐藏颜色类型 Tab（Basic/Matte/Translucent/我的），只显示颜色列表和关闭按钮
      const isBattery = partName === 'Battery';
      const tabBarHtml = isBattery ? '' : `
        <div class="picker-tab-bar" id="picker-tab-bar">
          <button class="picker-tab${this.state.modalColorType === 'PLA Basic' ? ' active' : ''}" data-type="PLA Basic">Basic</button>
          <button class="picker-tab${this.state.modalColorType === 'PLA Matte' ? ' active' : ''}" data-type="PLA Matte">Matte</button>
          <button class="picker-tab${this.state.modalColorType === 'PLA Translucent' ? ' active' : ''}" data-type="PLA Translucent">Translucent</button>
          <button class="picker-tab${this.state.modalColorType === '__favorites__' ? ' active' : ''}" data-type="__favorites__">我的</button>
        </div>`;
      pickerEl.innerHTML = `
        <div style="display:flex;align-items:center;padding:4px 12px 0;">
          ${tabBarHtml}
          <button id="picker-close-btn" style="${isBattery ? 'margin-left:auto;' : ''}">✕</button>
        </div>
        <div class="picker-cards" id="picker-cards"></div>
      `;
      strip.appendChild(pickerEl);

      // 绑定 Tab 点击（阻止冒泡防止触发外部关闭）
      pickerEl.querySelectorAll('.picker-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          e.stopPropagation();
          pickerEl.querySelectorAll('.picker-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.state.modalColorType = tab.dataset.type;
          this.renderPickerGrid();
        });
      });

      // 关闭按钮
      pickerEl.querySelector('#picker-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.closePicker();
      });

      // 风扇/电池限制颜色
      if (partName === 'Fan') {
        this.renderFanColors();
        return;
      }
      if (partName === 'Battery') {
        this.renderBatteryColors();
        return;
      }

      this.renderPickerGrid();
    };

    // 先过渡滑出配色库，再创建选色面板
    if (cardsContainer) {
      cardsContainer.classList.add('hidden');
      cardsContainer.addEventListener('transitionend', () => {
        doOpenPicker();
      }, { once: true });
    } else {
      doOpenPicker();
    }
    // 不再绑定额外 closeHandler —— onCanvasPointerUp 已经负责单点关闭选色
  }

  renderFanColors() {
    const container = document.getElementById('picker-cards');
    if (!container) return;
    const tabBar = document.getElementById('picker-tab-bar');
    if (tabBar) tabBar.style.display = 'none';
    container.innerHTML = FAN_COLORS.map(c => {
      const textColor = this._contrastTextColor(c.hex);
      return `<div class="picker-swatch-card" data-hex="${c.hex}" style="background:${c.hex};color:${textColor};">
        <span class="pick-color-label">${c.name}</span>
      </div>`;
    }).join('');

    // 滚动到已选择的颜色
    const selectedHex = this.state._pickerSelectedHex;
    if (selectedHex) {
      const target = container.querySelector(`.picker-swatch-card[data-hex="${selectedHex}"]`);
      if (target) {
        requestAnimationFrame(() => {
          target.scrollIntoView({ block: 'nearest', inline: 'center' });
          target.classList.add('selected');
        });
      }
    }

    container.querySelectorAll('.picker-swatch-card').forEach(el => {
      el.addEventListener('click', () => {
        const hex = el.dataset.hex;
        this.state.modalPendingColor = hex;
        this.state.pendingColor = hex;
        if (this.state.selectedPart) {
          const part = this.state.parts[this.state.selectedPart];
          if (part) {
            this.applyColor(this.state.selectedPart, hex);
            this.animateColorChange(part.mesh, hex);
          }
          const name = FAN_COLORS.find(f => f.hex === hex)?.name || hex;
          this.showToast(`已应用: ${name}`);
        }
        this.closePicker();
      });
    });
    // 同步 currentColors（直接从 part.currentColor 构建，不从场景材质读）
    // 调用时场景材质颜色可能还处在 animateColorChange 异步动画的旧颜色阶段
    this._syncCurrentColorsFromParts();
  }

  renderBatteryColors() {
    const container = document.getElementById('picker-cards');
    if (!container) return;
    const tabBar = document.getElementById('picker-tab-bar');
    if (tabBar) tabBar.style.display = 'none';
    const colors = window.__BATTERY_COLORS || [];
    container.innerHTML = colors.map(c => {
      const textColor = this._contrastTextColor(c.hex);
      return `<div class="picker-swatch-card" data-hex="${c.hex}" style="background:${c.hex};color:${textColor};">
        <span class="pick-color-label">${c.name}</span>
      </div>`;
    }).join('');

    // 滚动到已选择的颜色
    const selectedHex = this.state._pickerSelectedHex;
    if (selectedHex) {
      const target = container.querySelector(`.picker-swatch-card[data-hex="${selectedHex}"]`);
      if (target) {
        requestAnimationFrame(() => {
          target.scrollIntoView({ block: 'nearest', inline: 'center' });
          target.classList.add('selected');
        });
      }
    }

    container.querySelectorAll('.picker-swatch-card').forEach(el => {
      el.addEventListener('click', () => {
        const hex = el.dataset.hex;
        this.state.modalPendingColor = hex;
        this.state.pendingColor = hex;
        if (this.state.selectedPart) {
          const part = this.state.parts[this.state.selectedPart];
          if (part) {
            this.applyColor(this.state.selectedPart, hex);
            this.animateColorChange(part.mesh, hex);
          }
          const name = colors.find(f => f.hex === hex)?.name || hex;
          this.showToast(`已应用: ${name}`);
        }
        this._syncCurrentColorsFromParts();
        // 不关闭选色面板，用户可以通过点击空白区域或 ✕ 按钮关闭
      });
    });
  }

  closePicker() {
    this.state.modalOpen = false;
    this.state.modalPendingColor = null;

    // 恢复选色时隐藏的高亮
    if (this.state.selectedPart && this.state.parts[this.state.selectedPart]) {
      this.restoreAll();
    }
    this.state.selectedPart = null;

    // 移除选色面板，恢复配色库 — 先滑出选色面板，再恢复配色库
    const picker = document.getElementById('strip-picker');
    const cardsContainer = document.getElementById('strip-cards');
    const actionBar = document.getElementById('action-bar');
    if (picker) {
      picker.classList.add('slide-out');
      picker.addEventListener('animationend', () => {
        picker.remove();
        // 延迟一帧确保 DOM 刷新后再移除 hidden（触发 strip-cards 进入动画）
        requestAnimationFrame(() => {
          if (cardsContainer) cardsContainer.classList.remove('hidden');
          if (actionBar) actionBar.classList.remove('hidden');
          this.renderBottomStripProjects();
        });
      }, { once: true });
    } else {
      if (cardsContainer) cardsContainer.classList.remove('hidden');
      if (actionBar) actionBar.classList.remove('hidden');
      this.renderBottomStripProjects();
    }
  }

  renderPickerGrid() {
    const container = document.getElementById('picker-cards');
    if (!container) return;
    const type = this.state.modalColorType;

    if (type === '__favorites__') {
      this.renderFavorites();
      return;
    }

    const colors = this.getColorsByType(type);
    if (colors.length === 0) {
      container.innerHTML = '<div class="picker-empty-tab">暂无颜色</div>';
      return;
    }

    container.innerHTML = colors.map(c => {
      const textColor = this._contrastTextColor(c.displayHex || c.hex);
      return `<div class="picker-swatch-card" data-code="${c.code}" data-hex="${c.hex}" style="background:${c.hex};color:${textColor};"><span class="pick-color-label">${c.name}<br>${c.code || ''}</span></div>`;
    }).join('');

    // 滚动到已选择的颜色
    const selectedHex = this.state._pickerSelectedHex;
    if (selectedHex) {
      const target = container.querySelector(`.picker-swatch-card[data-hex="${selectedHex}"]`);
      if (target) {
        // 延迟一帧等待 DOM 布局完成
        requestAnimationFrame(() => {
          target.scrollIntoView({ block: 'nearest', inline: 'center' });
          target.classList.add('selected');
        });
      }
    }

    container.querySelectorAll('.picker-swatch-card').forEach(el => {
      // 单击选择颜色
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        // 清除其他选中态
        container.querySelectorAll('.picker-swatch-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        const hex = el.dataset.hex;
        const code = el.dataset.code;
        this.state.modalPendingColor = hex;
        this.state.pendingColor = hex;
        if (this.state.selectedPart) {
          const part = this.state.parts[this.state.selectedPart];
          if (part) {
            this.applyColor(this.state.selectedPart, hex, code);
            this.animateColorChange(part.mesh, hex);
          }
          const colorObj = this.findColorByCode(code);
          this.showToast(`已应用: ${colorObj ? colorObj.name : hex}`);
        }
        this._syncCurrentColorsFromParts();
        // 不关闭选色面板，用户可以通过 X 按钮关闭
      });

        // 长按收藏
      this._bindLongPress(el, (target) => {
        const code = target.dataset.code;
        if (!code) return;
        const colorObj = this.findColorByCode(code);
        if (!colorObj) return;
        if (this._isFavorite(code)) {
          this._removeFavorite(code);
          this.showToast(`已取消收藏: ${colorObj.name}`);
        } else {
          this._addFavorite(code);
          this.showToast(`已收藏: ${colorObj.name}`);
        }
      });
    });
  }

  // ────── 收藏功能 ──────

  _getStorageKey() { return 'safan_favorites'; }

  _getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(this._getStorageKey()) || '[]');
    } catch { return []; }
  }

  _saveFavorites(arr) {
    localStorage.setItem(this._getStorageKey(), JSON.stringify(arr));
  }

  _isFavorite(code) {
    return this._getFavorites().includes(code);
  }

  _addFavorite(code) {
    const favs = this._getFavorites();
    if (!favs.includes(code)) {
      favs.push(code);
      this._saveFavorites(favs);
    }
    this._renderActionBar();
  }

  _removeFavorite(code) {
    this._saveFavorites(this._getFavorites().filter(c => c !== code));
    this._renderActionBar();
  }

  /** 根据颜色编码查找所属的完整颜色组名（PLA Basic / PLA Matte / PLA Translucent） */
  _getGroupKeyForCode(code) {
    if (!this.colorGroups) return '';
    for (const [groupKey, colors] of Object.entries(this.colorGroups)) {
      if (colors.some(c => c.code === code)) {
        return groupKey;
      }
    }
    return '';
  }

  findColorByCode(code) {
    if (!this.colorGroups) return null;
    for (const group of Object.values(this.colorGroups)) {
      const found = group.find(c => c.code === code);
      if (found) return found;
    }
    return null;
  }

  findColorByHex(hex) {
    if (!this.colorGroups) return null;
    const clean = hex.toLowerCase();
    for (const group of Object.values(this.colorGroups)) {
      const found = group.find(c => (c.hex && c.hex.toLowerCase() === clean) || (c.displayHex && c.displayHex.toLowerCase() === clean));
      if (found) return found;
    }
    return null;
  }

  renderFavorites() {
    const container = document.getElementById('picker-cards');
    if (!container) return;
    const favs = this._getFavorites();
    if (favs.length === 0) {
      container.innerHTML = '<div class="picker-empty-tab">还没有收藏的颜色<br>长按色块即可收藏</div>';
      return;
    }
    const html = [];
    // 按收藏顺序逆序显示（最新的在前）
    const colors = favs.map(code => this.findColorByCode(code)).filter(Boolean);
    html.push(...colors.map(c => {
      const textColor = this._contrastTextColor(c.displayHex || c.hex);
      return `<div class="picker-swatch-card" data-code="${c.code}" data-hex="${c.hex}" style="background:${c.hex};color:${textColor};">
        <span class="pick-color-label">${c.name}<br>${c.code || ''}</span>
      </div>`;
    }).join(''));

    container.innerHTML = html.join('');

    container.querySelectorAll('.picker-swatch-card').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        container.querySelectorAll('.picker-swatch-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        const hex = el.dataset.hex;
        const code = el.dataset.code;
        this.state.modalPendingColor = hex;
        this.state.pendingColor = hex;
        if (this.state.selectedPart) {
          const part = this.state.parts[this.state.selectedPart];
          if (part) {
            this.applyColor(this.state.selectedPart, hex, code);
            this.animateColorChange(part.mesh, hex);
          }
          const colorObj = this.findColorByCode(code);
          this.showToast(`已应用: ${colorObj ? colorObj.name : hex}`);
        }
        this._syncCurrentColorsFromParts();
      });

      // 长按删除收藏
      this._bindLongPress(el, (target) => {
        const code = target.dataset.code;
        if (!code) return;
        const colorObj = this.findColorByCode(code);
        this._removeFavorite(code);
        this.showToast(`已从收藏移除: ${colorObj ? colorObj.name : code}`);
        // 刷新"我的"列表
        this.renderPickerGrid();
      });
    });
  }

  _bindLongPress(el, callback) {
    let timer = null;
    let moved = false;
    const start = (x, y) => {
      moved = false;
      timer = setTimeout(() => {
        if (!moved) {
          navigator.vibrate && navigator.vibrate(30);
          callback(el);
        }
      }, 500);
    };
    el.addEventListener('pointerdown', (e) => {
      start(e.clientX, e.clientY);
    });
    el.addEventListener('pointermove', (e) => {
      if (timer) { moved = true; clearTimeout(timer); timer = null; }
    });
    el.addEventListener('pointerup', () => { clearTimeout(timer); timer = null; });
    el.addEventListener('pointerleave', () => { clearTimeout(timer); timer = null; });
  }

  _contrastTextColor(hex) {
    if (!hex) return '#ffffff';
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0,2), 16);
    const g = parseInt(c.substring(2,4), 16);
    const b = parseInt(c.substring(4,6), 16);
    // W3C luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1a1a1a' : '#f0f0f0';
  }

  getColorsByType(type) {
    return this.colorGroups[type] || [];
  }

  // ──────────────── Color Application ────────────────

/** 对指定部件的所有材质应用颜色，更新场景状态 */
/**
 * @param {string} partName - 部件名称
 * @param {string} hex - 十六进制颜色值
 * @param {string} [code] - 颜色编码（选色器点击时可传入，用于精确匹配 colorCode）
 */
  applyColor(partName, hex, code) {
    const part = this.state.parts[partName];
    if (!part) return;
    // 螺丝等非可配色部件保持固定材质，禁止改色
    if (!part.isColorable) return;
    part.currentColor = hex;
    // 记录颜色类型（Basic / matte / translucent），用于详情页正确显示材质标签和购买链接
    // 电池和风扇的颜色来自独立特殊列表，不属于 colorGroups 体系，不设置 colorType/colorCode
    if (partName !== 'Battery' && partName !== 'Fan') {
      if (this.state.modalColorType) {
        // 从 Tab 类型名（如 "PLA Matte"）提取简写 type（如 "matte"）
        const typeMap = {
          'PLA Basic': 'Basic',
          'PLA Matte': 'matte',
          'PLA Translucent': 'translucent'
        };
        part.colorType = typeMap[this.state.modalColorType] || 'Basic';
        // 同时记录 colorCode，用于精确匹配颜色组
        if (code) {
          // 优先用传入的 code 精确查找（避免 hex 重复时 match 错颜色）
          const colorObj = this.findColorByCode(code);
          if (colorObj) {
            part.colorCode = colorObj.code || '';
          }
        } else {
          // fallback: 按 hex 查找（用于 randomizeColors、applyProjectColors 等无 code 的调用）
          const group = this.colorGroups[this.state.modalColorType] || [];
          const colorObj = group.find(c => c.hex === hex);
          if (colorObj) {
            part.colorCode = colorObj.code || '';
          }
        }
      }
    } else {
      // 电池/风扇不继承 colorType/colorCode，避免详情页在颜色组中误匹配
      delete part.colorType;
      delete part.colorCode;
    }
    // 注意：颜色实际设到材质由 animateColorChange 负责
  }

  _setMeshColor(mesh, hex) {
    const color = parseInt(hex.replace('#', ''), 16);
    mesh.traverse(c => {
      if (c.isMesh && c.material) {
        if (!c.material.isMeshStandardMaterial) {
          c.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        }
        c.material.color.setHex(color);
        // Normalize all colorable parts to consistent look
        c.material.roughness = 0.65;
        c.material.metalness = 0.0;
        c.material.emissive.set(0x000000);
        c.material.emissiveIntensity = 0;
        c.material.transparent = false;
        c.material.opacity = 1.0;
      }
    });
  }

  animateColorChange(mesh, targetHex) {
    // prefers-reduced-motion: 直接设置颜色，跳过动画
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this._setMeshColor(mesh, targetHex);
      return;
    }
    const targetColor = parseInt(targetHex.replace('#', ''), 16);
    const meshes = [];
    mesh.traverse(c => {
      if (c.isMesh && c.material) meshes.push(c.material);
    });
    if (meshes.length === 0) return;
    const targetRGB = {
      r: ((targetColor >> 16) & 255) / 255,
      g: ((targetColor >> 8) & 255) / 255,
      b: (targetColor & 255) / 255,
    };
    const startColors = meshes.map(m => ({ r: m.color.r, g: m.color.g, b: m.color.b }));
    const startTime = performance.now();
    const duration = 600;
    const timerId = 'color_' + mesh.uuid;
    if (this.colorAnimTimers[timerId]) cancelAnimationFrame(this.colorAnimTimers[timerId]);
    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      meshes.forEach((m, i) => {
        m.color.r = startColors[i].r + (targetRGB.r - startColors[i].r) * ease;
        m.color.g = startColors[i].g + (targetRGB.g - startColors[i].g) * ease;
        m.color.b = startColors[i].b + (targetRGB.b - startColors[i].b) * ease;
      });
      if (t < 1) {
        this.colorAnimTimers[timerId] = requestAnimationFrame(step);
      } else {
        // 动画结束：最终设色并重置材质参数
        this._setMeshColor(mesh, targetHex);
        delete this.colorAnimTimers[timerId];
      }
    };
    this.colorAnimTimers[timerId] = requestAnimationFrame(step);
  }

  applyProjectColors(projectId) {
    const project = this.state.projects.find(p => p.id === projectId);
    if (!project) return;
    this.state.selectedProjectId = projectId;
    // 同步到 currentColors
    this.state.currentColors = { ...project.colors };
    Object.entries(project.colors).forEach(([partName, color]) => {
      if (partName === '_previews') return;
      const hex = typeof color === 'string' ? color : (color?.hex || '#888');
      const part = this.state.parts[partName];
      if (!part) return;
      this.applyColor(partName, hex);
      this.animateColorChange(part.mesh, hex, part.colorTD);
    });
    // 如果有保存的 colorInfo，覆盖 applyColor 推断的 colorType/colorCode
    if (project.colorInfo) {
      Object.entries(project.colorInfo).forEach(([partName, info]) => {
        const part = this.state.parts[partName];
        if (!part) return;
        if (info.type) part.colorType = info.type;
        if (info.code) part.colorCode = info.code;
      });
    }
    this.renderBottomStripProjects();
  }

  _syncCurrentColorsFromParts() {
    const colors = {};
    for (const [name, part] of Object.entries(this.state.parts)) {
      if (part.currentColor) {
        colors[name] = part.currentColor;
      }
    }
    this.state.currentColors = colors;
  }

  _syncCurrentColorsFromScene() {
    const colors = {};
    for (const [name, part] of Object.entries(this.state.parts)) {
      const mesh = part?.mesh;
      if (!mesh) continue;
      // mesh 可能是 Group，需要遍历找到实际的 Mesh
      let mat = null;
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mat = mats[0];
      } else {
        mesh.traverse(c => {
          if (c.isMesh && c.material && !mat) {
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            mat = mats[0];
          }
        });
      }
      if (mat && mat.color && mat.color.getHexString) {
        colors[name] = '#' + mat.color.getHexString();
      }
    }
    this.state.currentColors = colors;
  }

  // ──────────────── Project Management ────────────────

  _loadProjects() {
    try {
      const data = localStorage.getItem('sidan_projects_mobile');
      if (data) return JSON.parse(data);
    } catch(e) { /* ignore */ }
    return [];
  }

  _saveProjects() {
    try {
      localStorage.setItem('sidan_projects_mobile', JSON.stringify(this.state.projects));
    } catch (e) {
      console.error('Failed to save projects:', e);
    }
  }

  saveCurrentProject() {
    const name = `配色方案 ${this.state.projects.length + 1}`;
    const colors = {};
    Object.entries(this.state.parts).forEach(([partName, { mesh, isColorable }]) => {
      if (!isColorable) return;
      if (mesh) {
        const mats = [];
        mesh.traverse(c => {
          if (c.isMesh && c.material) {
            if (Array.isArray(c.material)) {
              c.material.forEach(m => mats.push(m));
            } else {
              mats.push(c.material);
            }
          }
        });
        if (mats.length > 0) {
          const m = mats[0];
          colors[partName] = '#' + m.color.getHexString();
        }
      }
    });
    // 另外保存每个部件的 colorType/colorCode 以便精确恢复
    const colorInfo = {};
    Object.entries(this.state.parts).forEach(([partName, { currentColor, colorType, colorCode, isColorable }]) => {
      if (!isColorable) return;
      if (colorType && colorCode) {
        colorInfo[partName] = { type: colorType, code: colorCode };
      }
    });
    const previewHexes = Object.entries(colors)
      .filter(([k, v]) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v))
      .map(([, v]) => v)
      .slice(0, 5);
    colors._previews = previewHexes;
    // 生成小尺寸缩略图
    const thumb = this._captureThumbnail();
    const project = {
      id: Date.now(),
      name,
      colors,
      colorInfo,
      savedAt: new Date().toISOString(),
      thumbnail: thumb,
    };
    this.state.projects.push(project);
    this.state.selectedProjectId = project.id;
    this._saveProjects();
    this.showToast('已保存: ' + name);
    this.renderBottomStripProjects();
  }

  // ──────────────── 新增配色方案 ────────────────

  createNewProject() {
    const name = `配色方案 ${this.state.projects.length + 1}`;
    const colors = {};
    Object.entries(this.state.parts).forEach(([partName, { mesh, isColorable }]) => {
      if (!isColorable) return;
      if (mesh) {
        const mats = [];
        mesh.traverse(c => {
          if (c.isMesh && c.material) {
            if (Array.isArray(c.material)) {
              c.material.forEach(m => mats.push(m));
            } else {
              mats.push(c.material);
            }
          }
        });
        if (mats.length > 0) {
          const m = mats[0];
          colors[partName] = '#' + m.color.getHexString();
        }
      }
    });
    // 另外保存每个部件的 colorType/colorCode 以便精确恢复
    const colorInfo = {};
    Object.entries(this.state.parts).forEach(([partName, { currentColor, colorType, colorCode, isColorable }]) => {
      if (!isColorable) return;
      if (colorType && colorCode) {
        colorInfo[partName] = { type: colorType, code: colorCode };
      }
    });
    const previewHexes = Object.entries(colors)
      .filter(([k, v]) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v))
      .map(([, v]) => v)
      .slice(0, 5);
    colors._previews = previewHexes;
    // 生成小尺寸缩略图
    const thumb = this._captureThumbnail();
    const project = {
      id: Date.now(),
      name,
      colors,
      colorInfo,
      savedAt: new Date().toISOString(),
      thumbnail: thumb,
    };
    this.state.projects.unshift(project);
    this.state.focusedProjectId = project.id;
    this._saveProjects();
    this.showToast('已保存: ' + name);
    this.renderBottomStripProjects();
  }

  // ──────────────── Utilities ────────────────

  formatName(n) {
    const MAP = {
      Back_Color: '背板', Battery: '电池', MainFrame_Color: '主框架',
      Usb_Color: '充电口', Bar_Color: '提手', Knob_Color: '旋钮',
      FrontCap_Color: '前罩', Fan: '风扇',
    };
    return MAP[n] || n.replace(/_Color$/, '').replace(/_/g, ' ');
  }

  _captureThumbnail(size, cameraPos, cameraTarget) {
    // size 参数: 未传则默认 96 (配色卡缩略图), 传了则直接输出 size x size
    const targetSize = size || 96;
    const isCard = !size;
    const w = isCard ? 96 : targetSize;
    const h = isCard ? 96 : targetSize;

    // 计算整个场景的包围盒，用于动态定位相机
    const allParts = Object.values(this.state.parts).filter(p => p.mesh && p.mesh.visible !== false);
    const box = new THREE.Box3();
    allParts.forEach(p => { box.expandByObject(p.mesh); });
    const center = new THREE.Vector3();
    const sizeVec = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(sizeVec);

    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
    // FOV=14 时约 6.0 倍包围盒尺寸确保完整入镜
    const dist = maxDim * 6.0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.toneMapping = this.mainRenderer.toneMapping;
    renderer.toneMappingExposure = this.mainRenderer.toneMappingExposure;

    const camera = new THREE.PerspectiveCamera(14, w / h, 0.1, 1000);
    if (typeof cameraPos === 'string' && cameraPos === 'back') {
      // 背面视角：Y轴25°
      camera.position.set(center.x, center.y + dist*0.33, center.z - dist*0.7);
      camera.lookAt(center);
    } else if (cameraPos) {
      camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
      camera.lookAt(cameraTarget || new THREE.Vector3(center.x, center.y, center.z));
    } else {
      // 正面视角：Y轴25°
      camera.position.set(center.x, center.y + dist*0.33, center.z + dist*0.7);
      camera.lookAt(center);
    }
    // 渲染前临时清除场景背景，实现透明截图
    const savedBg = this.scene.background;
    this.scene.background = null;
    renderer.render(this.scene, camera);
    // 恢复场景背景色
    this.scene.background = savedBg;
    const dataUrl = renderer.domElement.toDataURL('image/png');
    renderer.dispose();
    return dataUrl;
  }

  _capturePartThumbnail(partName, size) {
    // 临时隐藏其他部件，只渲染指定部件
    const targetSize = size || 96;
    const part = this.state.parts[partName];
    if (!part || !part.mesh) return '';

    const hiddenMeshes = [];
    Object.entries(this.state.parts).forEach(([name, { mesh }]) => {
      if (name !== partName && mesh) {
        mesh.visible = false;
        hiddenMeshes.push(mesh);
      }
    });

    // 计算该部件的世界包围盒
    const box = new THREE.Box3().setFromObject(part.mesh);
    const center = new THREE.Vector3();
    const sizeVec = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(sizeVec);

    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
    // 相机距离 = 包围盒最大尺寸 * 缩放系数（FOV 14时约8.0倍）
    const dist = maxDim * 8.0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(targetSize, targetSize);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.toneMapping = this.mainRenderer.toneMapping;
    renderer.toneMappingExposure = this.mainRenderer.toneMappingExposure;
    // Y轴25°视角：从正前方上方25°斜看部件
    const camera = new THREE.PerspectiveCamera(14, 1, 0.1, 1000);
    const offset = new THREE.Vector3(0, dist * 0.33, dist * 0.7);
    camera.position.copy(center).add(offset);
    camera.lookAt(center);
    // 渲染前临时清除场景背景，实现透明截图
    const savedBg = this.scene.background;
    this.scene.background = null;
    renderer.render(this.scene, camera);
    // 恢复场景背景色
    this.scene.background = savedBg;
    const dataUrl = renderer.domElement.toDataURL('image/png');
    renderer.dispose();

    // 恢复显示
    hiddenMeshes.forEach(m => { m.visible = true; });

    return dataUrl;
  }

  showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  }

  randomizeColors() {
    // 如果选色弹窗开着，禁止触发随机配色
    if (this.state.modalOpen) return;
    const parts = Object.keys(this.state.parts).filter(k => MODELS_COLORABLE.includes(k));
    const allColors = Object.values(this.colorGroups).flat();
    parts.forEach(partName => {
      let hex;
      if (partName === 'Fan') {
        const c = FAN_COLORS[Math.floor(Math.random() * FAN_COLORS.length)];
        hex = c.hex;
        this.applyColor(partName, hex);
      } else if (partName === 'Battery') {
        const bc = window.__BATTERY_COLORS[Math.floor(Math.random() * window.__BATTERY_COLORS.length)];
        hex = bc.hex;
        this.applyColor(partName, hex);
      } else {
        const randomColor = allColors[Math.floor(Math.random() * allColors.length)];
        hex = randomColor.hex;
        this.applyColor(partName, hex);
        const part = this.state.parts[partName];
        if (part) {
          part.colorType = randomColor.type || '';
          part.colorCode = randomColor.code || '';
        }
      }
      // 动画化颜色过渡
      const p = this.state.parts[partName];
      if (p && p.mesh) {
        this.animateColorChange(p.mesh, hex);
      }
    });
    // 随机配色后，animateColorChange 异步执行，此时从场景读颜色会读到旧值
    // 直接从已选中的 part.currentColor 构建 currentColors
    const newColors = {};
    for (const [id, part] of Object.entries(this.state.parts)) {
      if (part.currentColor) {
        newColors[id] = part.currentColor;
      }
    }
    this.state.currentColors = newColors;
    this.showToast('已随机配色');
    // 随机切换背景纹理
    this._switchBackgroundPattern();
  }

  randomizeFavoritesOnly() {
    // 如果选色弹窗开着，禁止触发随机配色
    if (this.state.modalOpen) return;
    const parts = Object.keys(this.state.parts).filter(k => MODELS_COLORABLE.includes(k));
    const favCodes = this._getFavorites();
    // 从所有颜色组中找到收藏的颜色对象
    const allColors = Object.values(this.colorGroups).flat();
    const favColors = allColors.filter(c => favCodes.includes(c.code));
    if (favColors.length === 0) {
      this.showToast('还没有收藏的颜色');
      return;
    }
    parts.forEach(partName => {
      let hex;
      if (partName === 'Fan') {
        const c = FAN_COLORS[Math.floor(Math.random() * FAN_COLORS.length)];
        hex = c.hex;
        this.applyColor(partName, hex);
      } else if (partName === 'Battery') {
        const bc = window.__BATTERY_COLORS[Math.floor(Math.random() * window.__BATTERY_COLORS.length)];
        hex = bc.hex;
        this.applyColor(partName, hex);
      } else {
        const c = favColors[Math.floor(Math.random() * favColors.length)];
        hex = c.hex;
        this.applyColor(partName, hex);
        const part = this.state.parts[partName];
        if (part) {
          part.colorType = c.type || '';
          part.colorCode = c.code || '';
        }
      }
      // 动画化颜色过渡
      const p = this.state.parts[partName];
      if (p && p.mesh) {
        this.animateColorChange(p.mesh, hex);
      }
    });
    // 直接从已选中的 part.currentColor 构建 currentColors（避免异步动画未完成时读场景颜色）
    const newColors = {};
    for (const [id, part] of Object.entries(this.state.parts)) {
      if (part.currentColor) {
        newColors[id] = part.currentColor;
      }
    }
    this.state.currentColors = newColors;
    this.showToast('已从我的颜色随机配色');
    // 随机配色后关闭选色器，回到配色方案列表
    this.closePicker();
  }
}

// Bootstrap
const app = new SafanColorPickerMobile();
window.app = app;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}