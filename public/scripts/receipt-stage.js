const THREE_MODULE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const FIXED_TIME_STEP = 1 / 60;
const RECEIPT_WIDTH = 1.18;
const RECEIPT_HEIGHT = 2.34;
const WAKEUP_VELOCITY_SQ = 0.0000032;
const INTRO_DROP_DISTANCE = 1.34;
const INTRO_DURATION_MS = 1080;
const PIN_DROP_DISTANCE = 0.28;
const PIN_ANIMATION_DURATION_MS = 220;
const PIN_ANIMATION_STAGGER_MS = 90;
const PIN_LAYOUT = Object.freeze([
  Object.freeze({
    x: -RECEIPT_WIDTH * 0.41,
    y: RECEIPT_HEIGHT * 0.464,
    z: 0.036,
    rotationZ: -0.16
  }),
  Object.freeze({
    x: RECEIPT_WIDTH * 0.41,
    y: RECEIPT_HEIGHT * 0.464,
    z: 0.036,
    rotationZ: 0.16
  })
]);
const PIN_CORE_RADIUS_X = 0.072;
const PIN_CORE_RADIUS_Y = 0.06;
const PIN_TETHER_RADIUS_X = 0.152;
const PIN_TETHER_RADIUS_Y = 0.138;
const PIN_SURFACE_BULGE = 0.018;
const PIN_SURFACE_DENT = 0.011;

let threeModulePromise;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
const receiptPointToTexture = (x, y, width, height) => ({
  x: (x / RECEIPT_WIDTH + 0.5) * width,
  y: (0.5 - y / RECEIPT_HEIGHT) * height
});

const loadThreeModule = async () => {
  if (!threeModulePromise) {
    threeModulePromise = import(THREE_MODULE_URL);
  }
  return threeModulePromise;
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.decoding = 'async';
  image.onload = async () => {
    try {
      if (typeof image.decode === 'function') {
        await image.decode();
      }
    } catch {
      // Ignore decode failures and continue with the loaded bitmap.
    }
    resolve(image);
  };
  image.onerror = () => reject(new Error('Failed to load QR image'));
  image.src = src;
});

const shortenUrl = (url) => {
  if (!url) {
    return '';
  }

  if (url.length <= 44) {
    return url;
  }

  return `${url.slice(0, 41)}...`;
};

const buildReceiptTexture = (THREE, renderer, qrImage, meta) => {
  const width = 1024;
  const height = 1820;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas is unavailable');
  }

  const baseGradient = context.createLinearGradient(0, 0, 0, height);
  baseGradient.addColorStop(0, '#ffffff');
  baseGradient.addColorStop(0.45, '#ffffff');
  baseGradient.addColorStop(1, '#fbfbfb');
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, width, height);

  const sheenGradient = context.createLinearGradient(0, 0, width, height);
  sheenGradient.addColorStop(0, 'rgba(255,255,255,0.42)');
  sheenGradient.addColorStop(0.28, 'rgba(255,255,255,0.02)');
  sheenGradient.addColorStop(1, 'rgba(210,210,210,0.05)');
  context.fillStyle = sheenGradient;
  context.fillRect(0, 0, width, height);

  for (const pinLayout of PIN_LAYOUT) {
    const pinPoint = receiptPointToTexture(pinLayout.x, pinLayout.y, width, height);

    context.save();
    context.translate(pinPoint.x, pinPoint.y + 4);
    context.scale(1.18, 0.72);
    const contactGradient = context.createRadialGradient(0, -4, 5, 0, 0, 58);
    contactGradient.addColorStop(0, 'rgba(26, 22, 18, 0.18)');
    contactGradient.addColorStop(0.48, 'rgba(26, 22, 18, 0.08)');
    contactGradient.addColorStop(1, 'rgba(26, 22, 18, 0)');
    context.fillStyle = contactGradient;
    context.beginPath();
    context.arc(0, 0, 58, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.fillStyle = 'rgba(38, 31, 26, 0.16)';
    context.beginPath();
    context.arc(pinPoint.x, pinPoint.y + 2, 7, 0, Math.PI * 2);
    context.fill();
  }

  for (let row = 0; row < height; row += 4) {
    const alpha = 0.004 + ((row % 28) / 28) * 0.005;
    context.fillStyle = `rgba(68, 68, 68, ${alpha.toFixed(3)})`;
    context.fillRect(0, row, width, 1);
  }

  for (let index = 0; index < 3800; index += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 1.6 + 0.3;
    const alpha = Math.random() * 0.012;
    context.fillStyle = `rgba(90, 90, 90, ${alpha.toFixed(3)})`;
    context.fillRect(x, y, radius, radius);
  }

  context.fillStyle = 'rgba(36, 30, 24, 0.86)';
  context.textAlign = 'center';
  context.font = '700 50px "SF Mono", "Menlo", "PingFang SC", monospace';
  context.fillText('CCC ATTENDANCE', width / 2, 136);

  context.fillStyle = 'rgba(36, 30, 24, 0.68)';
  context.font = '500 24px "SF Mono", "Menlo", "PingFang SC", monospace';
  context.fillText('THERMAL RECEIPT PREVIEW', width / 2, 184);

  context.strokeStyle = 'rgba(35, 28, 24, 0.18)';
  context.lineWidth = 3;
  context.setLineDash([10, 9]);
  context.beginPath();
  context.moveTo(92, 226);
  context.lineTo(width - 92, 226);
  context.stroke();
  context.setLineDash([]);

  const lines = [
    ['TIME', meta.generatedTime ?? '--'],
    ['MODE', meta.modeLabel ?? '--'],
    ['IDENTITY', meta.identityLabel ?? '--'],
    ['COURSE', shortenUrl(meta.courseUrl)]
  ];

  context.textAlign = 'left';
  context.font = '600 25px "SF Mono", "Menlo", "PingFang SC", monospace';
  let currentY = 300;

  for (const [label, value] of lines) {
    context.fillStyle = 'rgba(28, 24, 20, 0.72)';
    context.fillText(label, 102, currentY);
    context.textAlign = 'right';
    context.fillStyle = 'rgba(28, 24, 20, 0.94)';
    context.fillText(value || '--', width - 102, currentY);
    context.textAlign = 'left';
    context.strokeStyle = 'rgba(35, 28, 24, 0.12)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(100, currentY + 18);
    context.lineTo(width - 100, currentY + 18);
    context.stroke();
    currentY += 82;
  }

  const qrSize = 472;
  const qrX = (width - qrSize) / 2;
  const qrY = 656;

  context.fillStyle = 'rgba(255,255,255,0.92)';
  context.fillRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
  context.strokeStyle = 'rgba(18, 18, 18, 0.12)';
  context.lineWidth = 2;
  context.strokeRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);

  context.imageSmoothingEnabled = false;
  context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  context.setLineDash([12, 10]);
  context.strokeStyle = 'rgba(35, 28, 24, 0.18)';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(92, qrY + qrSize + 158);
  context.lineTo(width - 92, qrY + qrSize + 158);
  context.stroke();
  context.setLineDash([]);

  context.textAlign = 'left';
  context.fillStyle = 'rgba(28, 24, 20, 0.66)';
  context.font = '500 22px "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText('1. 使用手机微信扫描二维码完成签到。', 102, qrY + qrSize + 224);
  context.fillText('2. 如果出现“答题”选项，请继续完成答题流程。', 102, qrY + qrSize + 266);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bumpContext = bumpCanvas.getContext('2d');
  if (!bumpContext) {
    throw new Error('Bump canvas is unavailable');
  }

  const bumpImageData = bumpContext.createImageData(256, 256);
  for (let index = 0; index < bumpImageData.data.length; index += 4) {
    const base = 126 + Math.round((Math.random() - 0.5) * 26);
    bumpImageData.data[index] = base;
    bumpImageData.data[index + 1] = base;
    bumpImageData.data[index + 2] = base;
    bumpImageData.data[index + 3] = 255;
  }
  bumpContext.putImageData(bumpImageData, 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);

  if ('colorSpace' in map) {
    map.colorSpace = THREE.SRGBColorSpace;
  }

  map.anisotropy = Math.max(1, Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  map.needsUpdate = true;

  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 7);
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
};

const createPushPin = (THREE) => {
  const pin = new THREE.Group();

  const headMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xc9463f,
    roughness: 0.34,
    metalness: 0.08,
    clearcoat: 0.44,
    clearcoatRoughness: 0.16
  });
  const headBaseMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb43731,
    roughness: 0.4,
    metalness: 0.12,
    clearcoat: 0.28,
    clearcoatRoughness: 0.22
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0xcbd2da,
    roughness: 0.24,
    metalness: 0.92
  });
  const ferruleMaterial = new THREE.MeshStandardMaterial({
    color: 0xaab1bb,
    roughness: 0.32,
    metalness: 0.88
  });

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.056, 28, 22),
    headMaterial
  );
  head.scale.set(1, 0.52, 1);
  head.position.y = 0.012;
  pin.add(head);

  const headBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.054, 0.026, 28),
    headBaseMaterial
  );
  headBase.position.y = -0.003;
  pin.add(headBase);

  const ferrule = new THREE.Mesh(
    new THREE.CylinderGeometry(0.019, 0.024, 0.024, 22),
    ferruleMaterial
  );
  ferrule.position.y = -0.033;
  pin.add(ferrule);

  const needle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0054, 0.0032, 0.204, 16),
    metalMaterial
  );
  needle.position.y = -0.145;
  pin.add(needle);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.0048, 0.042, 16),
    metalMaterial
  );
  tip.position.y = -0.268;
  pin.add(tip);

  const highlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 14, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    })
  );
  highlight.position.set(-0.014, 0.032, 0.025);
  highlight.scale.set(1.16, 0.62, 0.92);
  pin.add(highlight);

  pin.rotation.x = 0.3;
  return pin;
};

class ReceiptStage {
  constructor(container, options, THREE) {
    this.container = container;
    this.options = options;
    this.THREE = THREE;

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.receiptMesh = null;
    this.receiptMaterial = null;
    this.receiptGeometry = null;
    this.receiptTexture = null;
    this.receiptBumpMap = null;
    this.pushPins = [];
    this.frameId = 0;
    this.accumulator = 0;
    this.isRunning = false;
    this.idleFrames = 0;
    this.lastTimestamp = 0;
    this.maxVelocitySq = WAKEUP_VELOCITY_SQ * 3;
    this.dragState = null;
    this.introAnimation = null;
    this.pinAnimation = null;
    this.pinsPlaced = false;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resizeObserver = null;

    this.particles = [];
    this.constraints = [];
    this.positions = null;
    this.xSegments = 0;
    this.ySegments = 0;

    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.dragPlane = new THREE.Plane();
    this.dragPlanePoint = new THREE.Vector3();
    this.dragWorldPoint = new THREE.Vector3();
    this.tempVectorA = new THREE.Vector3();
    this.tempVectorB = new THREE.Vector3();
    this.tempVectorC = new THREE.Vector3();
    this.tempCameraDirection = new THREE.Vector3();

    this.handlePointerDown = this.onPointerDown.bind(this);
    this.handlePointerMove = this.onPointerMove.bind(this);
    this.handlePointerUp = this.onPointerUp.bind(this);
    this.handleVisibilityChange = this.onVisibilityChange.bind(this);
    this.handleResize = this.onResize.bind(this);
  }

  async init() {
    this.buildDom();
    this.setupRenderer();
    await this.createReceipt();
    this.bindEvents();
    this.resetPose();
    this.onResize();
    this.startIntroAnimation();
    this.wake();
  }

  buildDom() {
    this.container.innerHTML = '<canvas class="receipt-stage-canvas"></canvas>';
    this.view = this.container;
    this.canvas = this.container.querySelector('.receipt-stage-canvas');
  }

  setupRenderer() {
    const { THREE } = this;

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: this.canvas,
      powerPreference: 'high-performance'
    });
    if ('outputColorSpace' in this.renderer) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    this.camera.position.set(0, 0.08, 5.35);
    this.camera.lookAt(0, 0.16, 0);

    const ambient = new THREE.HemisphereLight(0xffffff, 0xf4efe6, 1.24);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.62);
    keyLight.position.set(1.8, 2.6, 2.5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfffaf2, 0.38);
    fillLight.position.set(-2.4, -0.4, 2.1);
    this.scene.add(fillLight);

    this.presentationGroup = new THREE.Group();
    this.presentationGroup.rotation.x = -0.08;
    this.presentationGroup.position.y = 0.2;
    this.scene.add(this.presentationGroup);
  }

  async createReceipt() {
    const { THREE } = this;
    const qrImage = await loadImage(this.options.imageUrl);
    const textures = buildReceiptTexture(THREE, this.renderer, qrImage, this.options);
    this.receiptTexture = textures.map;
    this.receiptBumpMap = textures.bumpMap;

    this.buildPhysicsGrid();
    this.buildGeometry();

    this.receiptMaterial = new THREE.MeshPhysicalMaterial({
      map: this.receiptTexture,
      bumpMap: this.receiptBumpMap,
      bumpScale: 0.007,
      color: 0xffffff,
      roughness: 0.94,
      metalness: 0,
      clearcoat: 0.01,
      reflectivity: 0.03,
      side: THREE.DoubleSide
    });

    this.receiptMesh = new THREE.Mesh(this.receiptGeometry, this.receiptMaterial);
    this.baseReceiptPositionY = this.receiptMesh.position.y;
    this.baseReceiptRotationX = this.receiptMesh.rotation.x;
    this.baseReceiptRotationZ = this.receiptMesh.rotation.z;
    this.presentationGroup.add(this.receiptMesh);

    this.pushPins = PIN_LAYOUT.map((pinLayout) => {
      const pin = createPushPin(THREE);
      pin.position.set(pinLayout.x, pinLayout.y, pinLayout.z);
      pin.rotation.z = pinLayout.rotationZ;
      return pin;
    });

    for (const pin of this.pushPins) {
      pin.userData.restPosition = pin.position.clone();
      pin.userData.restRotationX = pin.rotation.x;
      pin.visible = false;
      this.presentationGroup.add(pin);
    }
  }

  buildPhysicsGrid() {
    const width = this.container.clientWidth;
    this.xSegments = width >= 920 ? 24 : (width >= 640 ? 22 : 18);
    this.ySegments = width >= 920 ? 42 : (width >= 640 ? 38 : 30);

    this.particles = [];
    this.constraints = [];

    const { THREE } = this;

    for (let row = 0; row <= this.ySegments; row += 1) {
      for (let column = 0; column <= this.xSegments; column += 1) {
        const u = column / this.xSegments;
        const v = row / this.ySegments;
        const x = (u - 0.5) * RECEIPT_WIDTH;
        const y = RECEIPT_HEIGHT * 0.5 - v * RECEIPT_HEIGHT;
        const forwardCurl = Math.pow(v, 1.7) * 0.092;
        const wrinkle = Math.sin(u * Math.PI * 6) * Math.pow(v, 1.95) * 0.0038;
        const z = row === 0 ? 0 : forwardCurl + wrinkle;
        const position = new THREE.Vector3(x, y, z);

        this.particles.push({
          column,
          row,
          pinned: false,
          pinHoldStrength: 0,
          position,
          previous: position.clone(),
          home: position.clone(),
          anchor: new THREE.Vector3(x, y, 0)
        });
      }
    }

    const indexOf = (column, row) => row * (this.xSegments + 1) + column;
    const addConstraint = (indexA, indexB, stiffness) => {
      this.constraints.push({
        indexA,
        indexB,
        restLength: this.particles[indexA].home.distanceTo(this.particles[indexB].home),
        stiffness
      });
    };

    for (let row = 0; row <= this.ySegments; row += 1) {
      for (let column = 0; column <= this.xSegments; column += 1) {
        const currentIndex = indexOf(column, row);
        const rowInfluence = 1 - row / this.ySegments;
        const structuralBoost = 0.01 + rowInfluence * 0.03;

        if (column < this.xSegments) {
          addConstraint(currentIndex, indexOf(column + 1, row), clamp(0.981 + structuralBoost, 0, 0.998));
        }

        if (row < this.ySegments) {
          addConstraint(currentIndex, indexOf(column, row + 1), clamp(0.986 + structuralBoost, 0, 0.999));
        }

        if (column < this.xSegments && row < this.ySegments) {
          addConstraint(currentIndex, indexOf(column + 1, row + 1), 0.79);
        }

        if (column > 0 && row < this.ySegments) {
          addConstraint(currentIndex, indexOf(column - 1, row + 1), 0.79);
        }

        if (column + 2 <= this.xSegments) {
          addConstraint(currentIndex, indexOf(column + 2, row), clamp(0.46 + rowInfluence * 0.06, 0, 0.54));
        }

        if (row + 2 <= this.ySegments) {
          addConstraint(currentIndex, indexOf(column, row + 2), clamp(0.52 + rowInfluence * 0.08, 0, 0.62));
        }
      }
    }

    this.configurePinAnchors();
  }

  configurePinAnchors() {
    for (const particle of this.particles) {
      particle.pinned = false;
      particle.pinHoldStrength = 0;
      particle.anchor.copy(particle.home);
    }

    for (const pinLayout of PIN_LAYOUT) {
      for (const particle of this.particles) {
        const dx = particle.home.x - pinLayout.x;
        const dy = particle.home.y - pinLayout.y;
        const tetherDistance = Math.hypot(dx / PIN_TETHER_RADIUS_X, dy / PIN_TETHER_RADIUS_Y);

        if (tetherDistance > 1) {
          continue;
        }

        const tetherFalloff = easeOutCubic(1 - tetherDistance);
        const coreDistance = Math.hypot(dx / PIN_CORE_RADIUS_X, dy / PIN_CORE_RADIUS_Y);
        const coreFalloff = easeOutCubic(clamp(1 - coreDistance, 0, 1));
        const nextAnchor = particle.home.clone();

        nextAnchor.x -= dx * tetherFalloff * 0.045;
        nextAnchor.y -= dy * tetherFalloff * 0.038;
        nextAnchor.z += tetherFalloff * 0.003 + coreFalloff * PIN_SURFACE_BULGE;
        nextAnchor.z -= Math.max(tetherFalloff - coreFalloff * 0.68, 0) * PIN_SURFACE_DENT;

        if (tetherFalloff >= particle.pinHoldStrength) {
          particle.pinHoldStrength = tetherFalloff;
          particle.anchor.copy(nextAnchor);
        }

        if (coreDistance <= 1) {
          particle.pinned = true;
          particle.pinHoldStrength = 1;
          particle.anchor.copy(nextAnchor);
        }
      }
    }
  }

  buildGeometry() {
    const { THREE } = this;
    this.receiptGeometry = new THREE.BufferGeometry();

    const vertexCount = (this.xSegments + 1) * (this.ySegments + 1);
    const positionArray = new Float32Array(vertexCount * 3);
    const uvArray = new Float32Array(vertexCount * 2);
    const indices = [];

    for (let row = 0; row <= this.ySegments; row += 1) {
      for (let column = 0; column <= this.xSegments; column += 1) {
        const index = row * (this.xSegments + 1) + column;
        const particle = this.particles[index];
        const positionOffset = index * 3;
        const uvOffset = index * 2;
        positionArray[positionOffset] = particle.position.x;
        positionArray[positionOffset + 1] = particle.position.y;
        positionArray[positionOffset + 2] = particle.position.z;
        uvArray[uvOffset] = column / this.xSegments;
        uvArray[uvOffset + 1] = 1 - row / this.ySegments;
      }
    }

    for (let row = 0; row < this.ySegments; row += 1) {
      for (let column = 0; column < this.xSegments; column += 1) {
        const topLeft = row * (this.xSegments + 1) + column;
        const topRight = topLeft + 1;
        const bottomLeft = topLeft + this.xSegments + 1;
        const bottomRight = bottomLeft + 1;
        indices.push(topLeft, bottomLeft, topRight);
        indices.push(topRight, bottomLeft, bottomRight);
      }
    }

    this.positions = positionArray;
    this.receiptGeometry.setIndex(indices);
    this.receiptGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3).setUsage(THREE.DynamicDrawUsage));
    this.receiptGeometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
    this.receiptGeometry.computeVertexNormals();
  }

  bindEvents() {
    this.view.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove, { passive: false });
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.container);
  }

  onResize() {
    if (!this.renderer || !this.view) {
      return;
    }

    const width = Math.max(1, this.view.clientWidth);
    const height = Math.max(1, this.view.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, width >= 900 ? 1.85 : 1.55);
    const aspect = width / height;

    this.camera.aspect = aspect;
    this.camera.position.z = aspect < 0.72 ? 5.9 : (aspect < 1 ? 5.6 : 5.35);
    this.camera.position.y = aspect < 0.72 ? 0.14 : 0.08;
    this.camera.lookAt(0, aspect < 0.72 ? 0.22 : 0.16, 0);
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.render();
  }

  updatePointer(event) {
    const bounds = this.view.getBoundingClientRect();
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
  }

  createDragInfluences(centerParticle) {
    const influences = [];
    const radius = 2.8;

    for (const particle of this.particles) {
      if (particle.row === 0) {
        continue;
      }

      const deltaColumn = particle.column - centerParticle.column;
      const deltaRow = particle.row - centerParticle.row;
      const distance = Math.hypot(deltaColumn, deltaRow);

      if (distance > radius) {
        continue;
      }

      influences.push({
        index: particle.row * (this.xSegments + 1) + particle.column,
        weight: Math.exp(-(distance * distance) / (radius * radius * 0.56)),
        offset: particle.home.clone().sub(centerParticle.home)
      });
    }

    return influences;
  }

  onPointerDown(event) {
    if (event.button !== 0 || !this.receiptMesh) {
      return;
    }

    this.updatePointer(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObject(this.receiptMesh, false);

    if (!intersections.length) {
      return;
    }

    event.preventDefault();
    this.finishIntroAnimation();

    const hit = intersections[0];
    const localPoint = this.receiptMesh.worldToLocal(hit.point.clone());
    const column = clamp(Math.round(((localPoint.x / RECEIPT_WIDTH) + 0.5) * this.xSegments), 0, this.xSegments);
    const row = clamp(Math.round(((RECEIPT_HEIGHT * 0.5 - localPoint.y) / RECEIPT_HEIGHT) * this.ySegments), 1, this.ySegments);
    const centerParticle = this.particles[row * (this.xSegments + 1) + column];
    const dragPoint = centerParticle.position.clone();

    this.view.classList.add('is-grabbing');
    this.view.setPointerCapture(event.pointerId);

    this.dragState = {
      pointerId: event.pointerId,
      startPointer: this.pointer.clone(),
      startLocal: dragPoint.clone(),
      target: dragPoint.clone(),
      influences: this.createDragInfluences(centerParticle)
    };

    this.camera.getWorldDirection(this.tempCameraDirection);
    this.dragPlane.setFromNormalAndCoplanarPoint(this.tempCameraDirection, hit.point.clone());
    this.dragPlanePoint.copy(hit.point);

    this.wake();
  }

  onPointerMove(event) {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }

    this.updatePointer(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    if (!this.raycaster.ray.intersectPlane(this.dragPlane, this.dragWorldPoint)) {
      return;
    }

    event.preventDefault();

    const localPoint = this.receiptMesh.worldToLocal(this.dragWorldPoint.clone());
    const dragDistance = Math.hypot(
      this.pointer.x - this.dragState.startPointer.x,
      this.pointer.y - this.dragState.startPointer.y
    );
    const lift = 0.11 + dragDistance * 0.56 + Math.abs(localPoint.x - this.dragState.startLocal.x) * 0.12;

    localPoint.z = clamp(localPoint.z + lift, -0.1, 0.58);
    localPoint.y = clamp(localPoint.y, -RECEIPT_HEIGHT * 0.48, RECEIPT_HEIGHT * 0.48);
    localPoint.x = clamp(localPoint.x, -RECEIPT_WIDTH * 0.46, RECEIPT_WIDTH * 0.46);

    this.dragState.target.copy(localPoint);
    this.wake();
  }

  onPointerUp(event) {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }

    if (this.view.hasPointerCapture(event.pointerId)) {
      this.view.releasePointerCapture(event.pointerId);
    }

    this.view.classList.remove('is-grabbing');
    this.dragState = null;
    this.wake();
  }

  onVisibilityChange() {
    if (document.hidden) {
      this.stop();
      return;
    }

    this.wake();
  }

  resetPose() {
    const time = performance.now() * 0.0017;

    for (const particle of this.particles) {
      const restPosition = particle.pinHoldStrength > 0 ? particle.anchor : particle.home;
      particle.position.copy(restPosition);
      particle.previous.copy(restPosition);

      if (!particle.pinned) {
        const sway = Math.sin((particle.column + 1) * 0.6 + time) * 0.004 * (particle.row / this.ySegments);
        particle.position.z += sway;
        particle.previous.z = particle.position.z - 0.017 * Math.pow(particle.row / this.ySegments, 1.35);
      }
    }

    this.idleFrames = 0;
    this.maxVelocitySq = WAKEUP_VELOCITY_SQ * 4;
    this.updateGeometry();
    this.render();
    this.wake();
  }

  startIntroAnimation() {
    if (this.prefersReducedMotion || !this.receiptMesh) {
      this.finishIntroAnimation();
      return;
    }

    this.introAnimation = {
      startTime: 0,
      duration: INTRO_DURATION_MS
    };

    this.receiptMesh.position.y = this.baseReceiptPositionY + INTRO_DROP_DISTANCE;
    this.receiptMesh.position.x = -0.1;
    this.receiptMesh.position.z = 0;
    this.receiptMesh.rotation.x = this.baseReceiptRotationX - 0.2;
    this.receiptMesh.rotation.z = -0.16;
  }

  startPinAnimation() {
    if (!this.pushPins.length || this.pinsPlaced) {
      return;
    }

    this.pinsPlaced = true;

    if (this.prefersReducedMotion) {
      for (const pin of this.pushPins) {
        pin.visible = true;
        pin.position.copy(pin.userData.restPosition);
        pin.rotation.x = pin.userData.restRotationX;
      }
      this.pinAnimation = null;
      return;
    }

    this.pinAnimation = {
      startTime: 0
    };

    for (const pin of this.pushPins) {
      pin.visible = true;
      pin.position.copy(pin.userData.restPosition);
      pin.position.y += PIN_DROP_DISTANCE;
      pin.rotation.x = pin.userData.restRotationX - 0.22;
    }
  }

  finishIntroAnimation() {
    this.introAnimation = null;
    if (!this.receiptMesh) {
      return;
    }

    this.receiptMesh.position.set(0, this.baseReceiptPositionY, 0);
    this.receiptMesh.rotation.x = this.baseReceiptRotationX;
    this.receiptMesh.rotation.z = this.baseReceiptRotationZ;
    this.startPinAnimation();
  }

  updatePinAnimation(timestamp) {
    if (!this.pinAnimation) {
      return;
    }

    if (!this.pinAnimation.startTime) {
      this.pinAnimation.startTime = timestamp;
    }

    let finishedPins = 0;

    for (let index = 0; index < this.pushPins.length; index += 1) {
      const pin = this.pushPins[index];
      const localElapsed = timestamp - this.pinAnimation.startTime - index * PIN_ANIMATION_STAGGER_MS;
      const progress = clamp(localElapsed / PIN_ANIMATION_DURATION_MS, 0, 1);
      const eased = easeOutCubic(progress);
      const bounce = Math.sin(progress * Math.PI * 3.4) * Math.pow(1 - progress, 1.8);

      pin.position.copy(pin.userData.restPosition);
      pin.position.y += (1 - eased) * PIN_DROP_DISTANCE - bounce * 0.045;
      pin.rotation.x = pin.userData.restRotationX - (1 - eased) * 0.22 + bounce * 0.045;

      if (progress >= 1) {
        finishedPins += 1;
      }
    }

    if (finishedPins === this.pushPins.length) {
      this.pinAnimation = null;
    }
  }

  updateIntroAnimation(timestamp) {
    if (!this.introAnimation || !this.receiptMesh) {
      return;
    }

    if (!this.introAnimation.startTime) {
      this.introAnimation.startTime = timestamp;
    }

    const elapsed = timestamp - this.introAnimation.startTime;
    const progress = clamp(elapsed / this.introAnimation.duration, 0, 1);
    const eased = easeOutCubic(progress);
    const bounce = Math.sin(progress * Math.PI * 3.2) * Math.pow(1 - progress, 1.65);

    this.receiptMesh.position.y = this.baseReceiptPositionY + (1 - eased) * INTRO_DROP_DISTANCE - bounce * 0.11;
    this.receiptMesh.position.x = (1 - eased) * -0.1 + bounce * 0.024;
    this.receiptMesh.rotation.x = this.baseReceiptRotationX - (1 - eased) * 0.2 + bounce * 0.028;
    this.receiptMesh.rotation.z = (1 - eased) * -0.16 + bounce * 0.085;

    if (progress >= 1) {
      this.finishIntroAnimation();
    }
  }

  applyVerletStep(step) {
    for (const particle of this.particles) {
      if (particle.pinned) {
        particle.position.copy(particle.anchor);
        particle.previous.copy(particle.anchor);
        continue;
      }

      const velocityX = (particle.position.x - particle.previous.x) * 0.972;
      const velocityY = (particle.position.y - particle.previous.y) * 0.974;
      const velocityZ = (particle.position.z - particle.previous.z) * 0.968;

      particle.previous.copy(particle.position);
      particle.position.x += velocityX;
      particle.position.y += velocityY - 10.2 * step * step;
      particle.position.z += velocityZ + 0.18 * step * step;
      particle.position.z = clamp(particle.position.z, -0.26, 0.64);
    }
  }

  applyDragConstraint() {
    if (!this.dragState) {
      return;
    }

    for (const influence of this.dragState.influences) {
      const particle = this.particles[influence.index];
      if (particle.pinned) {
        continue;
      }

      this.tempVectorA.copy(influence.offset);
      this.tempVectorA.multiplyScalar(0.18 + (1 - influence.weight) * 0.08);
      this.tempVectorA.add(this.dragState.target);
      particle.position.lerp(this.tempVectorA, 0.24 * influence.weight);
    }
  }

  solveConstraints() {
    for (let iteration = 0; iteration < 9; iteration += 1) {
      this.applyDragConstraint();

      for (const constraint of this.constraints) {
        const particleA = this.particles[constraint.indexA];
        const particleB = this.particles[constraint.indexB];

        this.tempVectorA.subVectors(particleB.position, particleA.position);
        const distance = this.tempVectorA.length();
        if (distance === 0) {
          continue;
        }

        const difference = ((distance - constraint.restLength) / distance) * constraint.stiffness;

        if (particleA.pinned && particleB.pinned) {
          continue;
        }

        if (particleA.pinned) {
          particleB.position.addScaledVector(this.tempVectorA, -difference);
          continue;
        }

        if (particleB.pinned) {
          particleA.position.addScaledVector(this.tempVectorA, difference);
          continue;
        }

        const halfDifference = difference * 0.5;
        particleA.position.addScaledVector(this.tempVectorA, halfDifference);
        particleB.position.addScaledVector(this.tempVectorA, -halfDifference);
      }

      for (const particle of this.particles) {
        if (particle.pinned) {
          particle.position.copy(particle.anchor);
          particle.previous.copy(particle.anchor);
          continue;
        }

        if (particle.pinHoldStrength <= 0) {
          continue;
        }

        const tetherStrength = 0.08 + particle.pinHoldStrength * 0.22;
        particle.position.lerp(particle.anchor, tetherStrength);
        particle.previous.lerp(particle.anchor, tetherStrength * 0.34);
      }
    }
  }

  updateGeometry() {
    let maxVelocitySq = 0;

    for (let index = 0; index < this.particles.length; index += 1) {
      const particle = this.particles[index];
      const offset = index * 3;
      this.positions[offset] = particle.position.x;
      this.positions[offset + 1] = particle.position.y;
      this.positions[offset + 2] = particle.position.z;

      const velocityX = particle.position.x - particle.previous.x;
      const velocityY = particle.position.y - particle.previous.y;
      const velocityZ = particle.position.z - particle.previous.z;
      const velocitySq = velocityX * velocityX + velocityY * velocityY + velocityZ * velocityZ;
      if (velocitySq > maxVelocitySq) {
        maxVelocitySq = velocitySq;
      }
    }

    this.maxVelocitySq = maxVelocitySq;
    this.receiptGeometry.attributes.position.needsUpdate = true;
    this.receiptGeometry.computeVertexNormals();
  }

  simulate(step) {
    this.applyVerletStep(step);
    this.solveConstraints();
    this.updateGeometry();
  }

  frame(timestamp) {
    if (!this.isRunning) {
      return;
    }

    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
    }

    const delta = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = timestamp;
    this.accumulator += delta;

    while (this.accumulator >= FIXED_TIME_STEP) {
      this.simulate(FIXED_TIME_STEP);
      this.accumulator -= FIXED_TIME_STEP;
    }

    this.updateIntroAnimation(timestamp);
    this.updatePinAnimation(timestamp);
    this.render();

    if (!this.dragState && this.maxVelocitySq < WAKEUP_VELOCITY_SQ) {
      this.idleFrames += 1;
    } else {
      this.idleFrames = 0;
    }

    if (this.introAnimation || this.pinAnimation || this.dragState || this.idleFrames < 10) {
      this.frameId = window.requestAnimationFrame((nextTimestamp) => this.frame(nextTimestamp));
      return;
    }

    this.stop();
  }

  wake() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.idleFrames = 0;
    this.lastTimestamp = 0;
    this.frameId = window.requestAnimationFrame((timestamp) => this.frame(timestamp));
  }

  stop() {
    this.isRunning = false;
    this.lastTimestamp = 0;
    if (this.frameId) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    this.stop();

    this.view?.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.receiptGeometry?.dispose();
    this.receiptMaterial?.dispose();
    this.receiptTexture?.dispose();
    this.receiptBumpMap?.dispose();
    for (const pin of this.pushPins) {
      for (const child of pin.children) {
        child.geometry?.dispose?.();
        child.material?.dispose?.();
      }
    }
    this.renderer?.dispose();
  }
}

export const createReceiptStage = async (container, options) => {
  const THREE = await loadThreeModule();
  const stage = new ReceiptStage(container, options, THREE);
  try {
    await stage.init();
    return stage;
  } catch (error) {
    stage.destroy();
    throw error;
  }
};
