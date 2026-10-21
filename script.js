/* ============================================================
   BOOT SEQUENCE
============================================================ */
const researcherId = '#' + String(Math.floor(Math.random() * 9000) + 1000);
document.getElementById('researcherId').textContent = researcherId;
document.getElementById('labUserId').textContent = researcherId;

function updateClock() {
  const now = new Date();
  const t = now.toTimeString().split(' ')[0];
  const boot = document.getElementById('bootTime');
  const lab = document.getElementById('labClock');
  if (boot) boot.textContent = t;
  if (lab) lab.textContent = t;
}
setInterval(updateClock, 1000);
updateClock();

let bootCompleted = false;
let progressValue = 0;

function showBootLogs() {
  document.querySelectorAll('.boot-log').forEach(log => {
    setTimeout(() => log.classList.add('active'), parseInt(log.dataset.delay));
  });
}

function runProgress() {
  const fill = document.getElementById('progressFill');
  const percent = document.getElementById('progressPercent');

  const interval = setInterval(() => {
    if (bootCompleted) { clearInterval(interval); return; }
    progressValue += Math.random() * 4 + 1.5;
    if (progressValue > 100) progressValue = 100;
    fill.style.width = progressValue + '%';
    percent.textContent = Math.floor(progressValue) + '%';
    if (progressValue >= 100) {
      clearInterval(interval);
      finishBoot();
    }
  }, 80);
}

let audioCtx = null;

function playHeartbeat() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    playThump(0);
    playThump(0.25);
  } catch (e) {}
}

function playThump(delay) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, audioCtx.currentTime + delay);
  osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + delay + 0.15);
  gain.gain.setValueAtTime(0, audioCtx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + delay + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + 0.2);
  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + 0.25);
}

function finishBoot() {
  if (bootCompleted) return;
  bootCompleted = true;
  playHeartbeat();
  document.getElementById('heartbeat').classList.add('show');
  setTimeout(() => {
    document.getElementById('bootFinal').classList.add('show');
    setTimeout(playHeartbeat, 800);
  }, 1500);
}

document.getElementById('skipBtn').addEventListener('click', () => {
  progressValue = 100;
  document.getElementById('progressFill').style.width = '100%';
  document.getElementById('progressPercent').textContent = '100%';
  document.querySelectorAll('.boot-log').forEach(log => log.classList.add('active'));
  finishBoot();
});

document.getElementById('enterLabBtn').addEventListener('click', () => {
  const boot = document.getElementById('bootScreen');
  const lab = document.getElementById('laboratory');
  boot.classList.add('exit');
  setTimeout(() => {
    lab.classList.remove('hidden');
    setTimeout(() => {
      lab.classList.add('show');
      setTimeout(() => {
        if (typeof initBrain3D === 'function') initBrain3D();
        if (typeof initHuman3D === 'function') initHuman3D();
      }, 300);
    }, 50);
    setTimeout(() => { boot.style.display = 'none'; }, 800);
  }, 400);
});

document.getElementById('aboutProjectBtn').addEventListener('click', () => {
  document.getElementById('projectModal').classList.remove('hidden');
});

function closeModal() {
  document.getElementById('projectModal').classList.add('hidden');
}

document.getElementById('projectModal').addEventListener('click', (e) => {
  if (e.target.id === 'projectModal') closeModal();
});

/* ============================================================
   SIDEBAR NAVIGATION
============================================================ */
document.querySelectorAll('.side-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.side-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    const section = link.dataset.section;
    document.querySelectorAll('.lab-section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + section).classList.add('active');

    const titles = {
      brain: ['МИ 3D МОДЕЛІ', 'Интерактивті нейроанатомия'],
      human: ['АДАМ МОДЕЛІ', 'Сезім мүшелері және импланттар'],
      implants: ['ИМПЛАНТТАР', 'Заманауи киборг технологиялары'],
      history: ['ТАРИХ', 'Киборг технологиясының дамуы'],
      safety: ['ҚАУІПСІЗДІК', 'Артықшылықтар мен шектеулер'],
      future: ['БОЛАШАҚ', 'Келесі онжылдықтар болжамы'],
      survey: ['САУАЛНАМА', 'Өз көзқарасыңызды білдіріңіз'],
      authors: ['АВТОРЛАР', 'Жоба авторлары мен жетекшісі']
    };
    const [t, s] = titles[section] || ['', ''];
    document.getElementById('toolbarTitle').textContent = t;
    document.getElementById('toolbarSub').textContent = s;

    if (section === 'brain' && !window.brainInited) {
      setTimeout(() => { if (typeof initBrain3D === 'function') initBrain3D(); }, 100);
      window.brainInited = true;
    }
    if (section === 'human' && !window.humanInited) {
      setTimeout(() => { if (typeof initHuman3D === 'function') initHuman3D(); }, 100);
      window.humanInited = true;
    }
  });
});

/* ============================================================
   МИ 3D МОДЕЛІ
============================================================ */
let brainScene, brainCamera, brainRenderer, brainGroup;
let brainIsDragging = false;
let brainPrevMouse = { x: 0, y: 0 };
let brainTargetRot = { x: 0, y: 0 };
let brainCurrentRot = { x: 0, y: 0 };
let brainAutoRotate = true;
let brainPartsMeshes = [];
let brainHovered = null;
let brainRaycaster, brainMouse;
let brainModel = null;
let brainActivePart = null;

const BRAIN_PARTS = {
  frontal: {
    name: 'Маңдай бөлігі', en: 'Frontal Lobe', icon: '🎯',
    desc: 'Мидың алдыңғы бөлігі. Шешім қабылдау, жоспарлау, сөйлеу, қозғалыс бақылауы үшін жауапты.',
    func: 'Қозғалыс, сөйлеу, шешім қабылдау',
    cyborg: 'DBS импланты осы аймаққа әсер етеді.',
    color: 0x4dc3eb
  },
  parietal: {
    name: 'Төбе бөлігі', en: 'Parietal Lobe', icon: '🖐️',
    desc: 'Сезімді өңдеу, кеңістікті қабылдау үшін жауапты.',
    func: 'Сипап сезу, температура, ауырсыну',
    cyborg: 'Жасанды тері импланттары осында жалғанады.',
    color: 0xec4877
  },
  temporal: {
    name: 'Самай бөлігі', en: 'Temporal Lobe', icon: '👂',
    desc: 'Есту, есте сақтау, тілді түсіну үшін жауапты.',
    func: 'Есту, тіл, есте сақтау',
    cyborg: 'Кохлеарлы импланттар осында қосылады.',
    color: 0xf5c542
  },
  occipital: {
    name: 'Шүйде бөлігі', en: 'Occipital Lobe', icon: '👁️',
    desc: 'Көру ақпаратын өңдейтін ми бөлігі.',
    func: 'Көру, түс, пішін тану',
    cyborg: 'Argus II торлы қабық осында сигнал жібереді.',
    color: 0x8b6bd9
  },
  cerebellum: {
    name: 'Мишық', en: 'Cerebellum', icon: '⚖️',
    desc: 'Тепе-теңдік, координация үшін жауапты.',
    func: 'Тепе-теңдік, үйлестіру',
    cyborg: 'Вестибулярлы импланттар осында орнатылады.',
    color: 0xe8a4a4
  }
};

function initBrain3D() {
  const container = document.getElementById('brain3D');
  if (!container || typeof THREE === 'undefined') return;
  if (brainRenderer) return;

  const w = container.clientWidth;
  const h = container.clientHeight;

  brainScene = new THREE.Scene();
  brainCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  brainCamera.position.set(0, 0, 5);

  brainRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  brainRenderer.setSize(w, h);
  brainRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  brainRenderer.outputEncoding = THREE.sRGBEncoding;
  brainRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  brainRenderer.toneMappingExposure = 1.1;
  container.appendChild(brainRenderer.domElement);

  brainScene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(5, 5, 5);
  brainScene.add(key);
  const fill = new THREE.DirectionalLight(0xcce5ff, 0.7);
  fill.position.set(-5, 3, 3);
  brainScene.add(fill);
  const rim = new THREE.DirectionalLight(0xffccdd, 0.5);
  rim.position.set(0, -3, -5);
  brainScene.add(rim);
  const top = new THREE.DirectionalLight(0xffffff, 0.6);
  top.position.set(0, 8, 0);
  brainScene.add(top);

  brainGroup = new THREE.Group();
  brainScene.add(brainGroup);

  const loaderScript = document.createElement('script');
  loaderScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  loaderScript.onload = () => loadBrainModel();
  loaderScript.onerror = () => showBrainError();
  document.head.appendChild(loaderScript);

  function loadBrainModel() {
    const loader = new THREE.GLTFLoader();

    document.getElementById('brainInfo').innerHTML = `
      <div class="info-placeholder">
        <div class="info-placeholder-icon" style="animation: brainPulse 1.5s infinite;">🧠</div>
        <h3>Ми моделі жүктелуде...</h3>
        <p>human_brain.glb файлы оқылуда</p>
      </div>
    `;

    loader.load(
      'human_brain.glb',
      (gltf) => {
        brainModel = gltf.scene;
        
        const box = new THREE.Box3().setFromObject(brainModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        brainModel.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;
        brainModel.scale.setScalar(scale);

        brainModel.traverse((child) => {
          if (child.isMesh) {
            child.material.side = THREE.DoubleSide;
            if (child.material.map) {
              child.material.map.encoding = THREE.sRGBEncoding;
            }
            if (child.material.color) {
              child.material.color.multiplyScalar(1.05);
            }
          }
        });

        brainGroup.add(brainModel);

        createBrainDots();
        addPulses();
        resetBrainInfoPanel();
        console.log('✅ Ми моделі жүктелді!');
      },
      (xhr) => {
        if (xhr.total) console.log('Ми: ' + Math.floor((xhr.loaded / xhr.total) * 100) + '%');
      },
      (error) => {
        console.error('Ми моделі жүктелмеді:', error);
        showBrainError();
      }
    );
  }

  function createBrainDots() {
    brainPartsMeshes = [];

    const bbox = new THREE.Box3().setFromObject(brainModel);
    const min = bbox.min;
    const max = bbox.max;
    
    const cx = (min.x + max.x) / 2;
    const cy = (min.y + max.y) / 2;
    const cz = (min.z + max.z) / 2;
    const sx = (max.x - min.x);
    const sy = (max.y - min.y);
    const sz = (max.z - min.z);

    const parts = {
      frontal:    { x: -0.38, y: 0.05, z: 0.1 },
      parietal:   { x: 0.02, y: 0.38, z: 0.05 },
      temporal:   { x: -0.05, y: -0.38, z: 0.2 },
      occipital:  { x: 0.38, y: 0.08, z: 0.08 },
      cerebellum: { x: 0.42, y: -0.35, z: 0.08 }
    };

    Object.keys(parts).forEach(key => {
      const part = BRAIN_PARTS[key];
      const p = parts[key];

      const pos = [
        cx + sx * p.x,
        cy + sy * p.y,
        cz + sz * p.z
      ];

      const dotGeo = new THREE.SphereGeometry(1, 32, 32);
      const dotMat = new THREE.MeshPhongMaterial({
        color: part.color,
        emissive: part.color,
        emissiveIntensity: 1.5,
        shininess: 120,
        transparent: true,
        opacity: 1.0,
        depthTest: false,
        depthWrite: false
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(pos[0], pos[1], pos[2]);
      dot.scale.set(0.12, 0.12, 0.12);
      dot.renderOrder = 999;
      dot.userData = { 
        partKey: key, 
        isDot: true,
        baseScale: [0.12, 0.12, 0.12]
      };
      brainGroup.add(dot);
      brainPartsMeshes.push(dot);

      const glowGeo = new THREE.SphereGeometry(1, 20, 20);
      const glowMat = new THREE.MeshBasicMaterial({
        color: part.color,
        transparent: true,
        opacity: 0.5,
        depthTest: false,
        depthWrite: false,
        side: THREE.BackSide
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(pos[0], pos[1], pos[2]);
      glow.scale.set(0.22, 0.22, 0.22);
      glow.renderOrder = 998;
      glow.userData = { 
        partKey: key, 
        isGlow: true,
        baseScale: [0.22, 0.22, 0.22]
      };
      brainGroup.add(glow);
      brainPartsMeshes.push(glow);

      const clickGeo = new THREE.SphereGeometry(1, 16, 16);
      const clickMat = new THREE.MeshBasicMaterial({
        color: part.color,
        transparent: true,
        opacity: 0.0,
        depthTest: false,
        depthWrite: false
      });
      const clickZone = new THREE.Mesh(clickGeo, clickMat);
      clickZone.position.set(pos[0], pos[1], pos[2]);
      clickZone.scale.set(0.28, 0.28, 0.28);
      clickZone.userData = { partKey: key, isClickZone: true };
      brainGroup.add(clickZone);
      brainPartsMeshes.push(clickZone);
    });
  }

  function showBrainError() {
    document.getElementById('brainInfo').innerHTML = `
      <div class="info-placeholder">
        <div class="info-placeholder-icon">⚠️</div>
        <h3>Модель жүктелмеді</h3>
        <p style="color: #dc2626;">human_brain.glb файлы табылмады</p>
      </div>
    `;
  }

  function addPulses() {
    const pulseGroup = new THREE.Group();
    brainGroup.add(pulseGroup);
    for (let i = 0; i < 25; i++) {
      const geo = new THREE.SphereGeometry(0.025, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00aaff, transparent: true, opacity: 0.9
      });
      const pulse = new THREE.Mesh(geo, mat);
      pulse.userData = {
        baseAngle: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.2,
        radius: 1.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        yOffset: (Math.random() - 0.5) * 1.4
      };
      pulseGroup.add(pulse);
    }
    brainGroup.userData.pulseGroup = pulseGroup;
  }

  brainRaycaster = new THREE.Raycaster();
  brainMouse = new THREE.Vector2();

  setupBrainEvents(container);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (brainAutoRotate && !brainIsDragging) {
      brainTargetRot.y += 0.0025;
    }

    brainCurrentRot.x += (brainTargetRot.x - brainCurrentRot.x) * 0.08;
    brainCurrentRot.y += (brainTargetRot.y - brainCurrentRot.y) * 0.08;
    brainGroup.rotation.x = brainCurrentRot.x;
    brainGroup.rotation.y = brainCurrentRot.y;

    const pulseGroup = brainGroup.userData.pulseGroup;
    if (pulseGroup) {
      pulseGroup.children.forEach((p, i) => {
        const u = p.userData;
        const a = t * u.speed + u.baseAngle;
        p.position.x = Math.cos(a) * u.radius;
        p.position.y = u.yOffset + Math.sin(a * 2 + u.phase) * 0.3;
        p.position.z = Math.sin(a) * u.radius;
        const scale = 0.5 + Math.sin(t * 5 + i) * 0.5;
        p.scale.setScalar(scale);
        p.material.opacity = 0.3 + Math.sin(t * 5 + i) * 0.5;
      });
    }

    brainPartsMeshes.forEach((m, i) => {
      if (m.userData.isGlow) {
        const baseS = m.userData.baseScale;
        const pulse = 1 + Math.sin(t * 2 + i) * 0.18;
        m.scale.set(baseS[0] * pulse, baseS[1] * pulse, baseS[2] * pulse);
      }
    });

    const pv = document.getElementById('pulseValue');
    if (pv) pv.textContent = Math.floor(60 + Math.sin(t * 2) * 15) + ' Hz';

    brainRenderer.render(brainScene, brainCamera);
  }
  animate();

  window.addEventListener('resize', () => {
    if (!brainRenderer) return;
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    brainCamera.aspect = nw / nh;
    brainCamera.updateProjectionMatrix();
    brainRenderer.setSize(nw, nh);
  });
}

function highlightBrainPart(partKey, on) {
  brainPartsMeshes.forEach(m => {
    const key = m.userData.partKey;
    const isHover = (key === partKey && on);
    const isSelected = (brainActivePart === key);
    
    if (m.userData.isDot) {
      const baseS = m.userData.baseScale;
      if (isHover) {
        m.scale.set(baseS[0] * 1.7, baseS[1] * 1.7, baseS[2] * 1.7);
        m.material.emissiveIntensity = 2.5;
      } else if (isSelected) {
        m.scale.set(baseS[0] * 1.5, baseS[1] * 1.5, baseS[2] * 1.5);
        m.material.emissiveIntensity = 2.0;
      } else {
        m.scale.set(baseS[0], baseS[1], baseS[2]);
        m.material.emissiveIntensity = 1.5;
      }
    }
    
    if (m.userData.isGlow) {
      const baseS = m.userData.baseScale;
      if (isHover) {
        m.scale.set(baseS[0] * 1.8, baseS[1] * 1.8, baseS[2] * 1.8);
        m.material.opacity = 0.85;
      } else if (isSelected) {
        m.scale.set(baseS[0] * 1.6, baseS[1] * 1.6, baseS[2] * 1.6);
        m.material.opacity = 0.65;
      } else {
        m.scale.set(baseS[0], baseS[1], baseS[2]);
        m.material.opacity = 0.5;
      }
    }
  });
}

function setupBrainEvents(container) {
  container.addEventListener('mousedown', e => {
    brainIsDragging = true;
    brainPrevMouse.x = e.clientX;
    brainPrevMouse.y = e.clientY;
  });

  window.addEventListener('mouseup', () => brainIsDragging = false);

  window.addEventListener('mousemove', e => {
    const rect = container.getBoundingClientRect();
    brainMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    brainMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (brainIsDragging) {
      const dx = e.clientX - brainPrevMouse.x;
      const dy = e.clientY - brainPrevMouse.y;
      brainTargetRot.y += dx * 0.008;
      brainTargetRot.x += dy * 0.008;
      brainTargetRot.x = Math.max(-1.2, Math.min(1.2, brainTargetRot.x));
      brainPrevMouse.x = e.clientX;
      brainPrevMouse.y = e.clientY;
      brainAutoRotate = false;
      return;
    }

    brainRaycaster.setFromCamera(brainMouse, brainCamera);
    const clickable = brainPartsMeshes.filter(m => m.userData.isClickZone);
    const hits = brainRaycaster.intersectObjects(clickable, false);

    if (hits.length > 0) {
      const hitKey = hits[0].object.userData.partKey;
      if (brainHovered !== hitKey) {
        brainHovered = hitKey;
        document.body.style.cursor = 'pointer';
        highlightBrainPart(hitKey, true);
      }
    } else if (brainHovered) {
      brainHovered = null;
      document.body.style.cursor = '';
      if (brainActivePart) {
        highlightBrainPart(brainActivePart, true);
      } else {
        brainPartsMeshes.forEach(m => {
          if (m.userData.isDot) {
            m.scale.set(m.userData.baseScale[0], m.userData.baseScale[1], m.userData.baseScale[2]);
            m.material.emissiveIntensity = 1.5;
          }
          if (m.userData.isGlow) {
            m.scale.set(m.userData.baseScale[0], m.userData.baseScale[1], m.userData.baseScale[2]);
            m.material.opacity = 0.5;
          }
        });
      }
    }
  });

  container.addEventListener('click', e => {
    if (Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3) return;
    const rect = container.getBoundingClientRect();
    brainMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    brainMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    brainRaycaster.setFromCamera(brainMouse, brainCamera);
    
    const clickable = brainPartsMeshes.filter(m => m.userData.isClickZone);
    const hits = brainRaycaster.intersectObjects(clickable, false);
    
    if (hits.length > 0) {
      const partKey = hits[0].object.userData.partKey;
      brainActivePart = partKey;
      selectBrainPart(partKey);
    }
  });

  container.addEventListener('wheel', e => {
    e.preventDefault();
    const nz = brainCamera.position.z + e.deltaY * 0.005;
    brainCamera.position.z = Math.max(2, Math.min(10, nz));
  }, { passive: false });

  container.addEventListener('touchstart', e => {
    brainIsDragging = true;
    brainPrevMouse.x = e.touches[0].clientX;
    brainPrevMouse.y = e.touches[0].clientY;
    brainAutoRotate = false;
  }, { passive: true });

  container.addEventListener('touchend', () => brainIsDragging = false);

  container.addEventListener('touchmove', e => {
    if (!brainIsDragging) return;
    const dx = e.touches[0].clientX - brainPrevMouse.x;
    const dy = e.touches[0].clientY - brainPrevMouse.y;
    brainTargetRot.y += dx * 0.008;
    brainTargetRot.x += dy * 0.008;
    brainPrevMouse.x = e.touches[0].clientX;
    brainPrevMouse.y = e.touches[0].clientY;
  }, { passive: true });
}

function selectBrainPart(key) {
  const part = BRAIN_PARTS[key];
  if (!part) return;
  brainActivePart = key;
  
  document.getElementById('brainInfo').innerHTML = `
    <div class="info-content">
      <div class="info-icon">${part.icon}</div>
      <h3>${part.name}</h3>
      <div class="info-en">${part.en}</div>
      <p>${part.desc}</p>
      <div class="info-block">
        <div class="info-block-label">🧬 НЕГІЗГІ ҚЫЗМЕТІ</div>
        <div class="info-block-text">${part.func}</div>
      </div>
      <div class="info-block">
        <div class="info-block-label">🔌 КИБОРГ БАЙЛАНЫСЫ</div>
        <div class="info-block-text">${part.cyborg}</div>
      </div>
    </div>
  `;
  
  highlightBrainPart(key, true);
}

function resetBrainInfoPanel() {
  brainActivePart = null;
  document.getElementById('brainInfo').innerHTML = `
    <div class="info-placeholder">
      <div class="info-placeholder-icon">🧠</div>
      <h3>Ми бөлігін таңдаңыз</h3>
      <p>Мидағы түрлі-түсті нүктелерді басып, бөліктер туралы біліңіз</p>
      <div class="brain-parts-list">
        ${Object.keys(BRAIN_PARTS).map(key => {
          const p = BRAIN_PARTS[key];
          const hex = '#' + p.color.toString(16).padStart(6, '0');
          return `<button class="part-chip" onclick="selectBrainPart('${key}')" style="border-color: ${hex}; color: ${hex};">${p.icon} ${p.name}</button>`;
        }).join('')}
      </div>
      <div style="margin-top: 25px; padding: 16px; background: #f0f7ff; border-radius: 10px; font-size: 0.85rem; text-align: left;">
        <strong>💡 Қалай қолдану:</strong><br>
        1. Миды айналдырыңыз (тышқан)<br>
        2. Жақындатыңыз (дөңгелек)<br>
        3. <strong>Түсті нүктені басыңыз</strong>
      </div>
    </div>
  `;
}

function resetBrainView() {
  brainTargetRot.x = 0;
  brainTargetRot.y = 0;
  brainCamera.position.z = 5;
  brainAutoRotate = true;
  brainActivePart = null;
  brainHovered = null;
  
  brainPartsMeshes.forEach(m => {
    if (m.userData.isDot) {
      m.scale.set(m.userData.baseScale[0], m.userData.baseScale[1], m.userData.baseScale[2]);
      m.material.emissiveIntensity = 1.5;
    }
    if (m.userData.isGlow) {
      m.scale.set(m.userData.baseScale[0], m.userData.baseScale[1], m.userData.baseScale[2]);
      m.material.opacity = 0.5;
    }
  });
  resetBrainInfoPanel();
}

function toggleBrainRotate() { brainAutoRotate = !brainAutoRotate; }

/* ============================================================
   АДАМ 3D МОДЕЛІ — male_full_body_anatomy.glb
============================================================ */
let humanScene, humanCamera, humanRenderer, humanGroup;
let humanIsDragging = false;
let humanPrevMouse = { x: 0, y: 0 };
let humanTargetRot = { x: 0, y: 0 };
let humanCurrentRot = { x: 0, y: 0 };
let humanAutoRotate = true;
let humanPartsMeshes = [];
let humanRaycaster, humanMouse;
let humanModel = null;
let humanHovered = null;
let humanActivePart = null;

const HUMAN_PARTS = {
  eye: {
    name: 'Көз', en: 'Eye', icon: '👁️',
    desc: 'Көру мүшесі. Жарықты қабылдап, миға сигнал жібереді.',
    implant: 'Argus II — жасанды торлы қабық. 60 электрод арқылы көру мүмкіндігін қайтарады.',
    price: '$150,000',
    success: '78%',
    color: 0x4dc3eb
  },
  ear: {
    name: 'Құлақ', en: 'Ear', icon: '👂',
    desc: 'Есту мүшесі. Дыбыс толқындарын қабылдайды.',
    implant: 'Cochlear Implant — 1978 жылдан бері қолданылады. 1 млн+ адамға орнатылған.',
    price: '$30,000',
    success: '95%',
    color: 0x7ed321
  },
  hand: {
    name: 'Қол', en: 'Hand', icon: '✋',
    desc: 'Сипап сезу мүшесі. Температура, ауырсыну, қысымды қабылдайды.',
    implant: 'Bionic Arm — ми сигналдарымен басқарылады. 26 градус еркіндік.',
    price: '$100,000',
    success: '88%',
    color: 0xf5a623
  },
  heart: {
    name: 'Жүрек', en: 'Heart', icon: '❤️',
    desc: 'Қан айналым жүйесінің негізгі мүшесі.',
    implant: 'Artificial Heart (SynCardia) — толық жасанды жүрек. Күнде 100,000 соғыс.',
    price: '$150,000',
    success: '70%',
    color: 0xec4877
  },
  leg: {
    name: 'Аяқ', en: 'Leg', icon: '🦵',
    desc: 'Қозғалыс мүшесі. Жүру, жүгіру, секіру.',
    implant: 'Bionic Leg — қозғалысты қалпына келтіреді. Спортқа жарамды.',
    price: '$80,000',
    success: '90%',
    color: 0x9b59b6
  }
};

function initHuman3D() {
  const container = document.getElementById('human3D');
  if (!container || typeof THREE === 'undefined') return;
  if (humanRenderer) return;

  const w = container.clientWidth;
  const h = container.clientHeight;

  humanScene = new THREE.Scene();
  humanCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  
  // Камера биіктігі (модель экранда сәл төменірек тұрады)
  humanCamera.position.set(0, 0.8, 6);

  humanRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  humanRenderer.setSize(w, h);
  humanRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  humanRenderer.outputEncoding = THREE.sRGBEncoding;
  humanRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  humanRenderer.toneMappingExposure = 1.1;
  container.appendChild(humanRenderer.domElement);

  humanScene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(5, 5, 5);
  humanScene.add(key);
  const fill = new THREE.DirectionalLight(0xcce5ff, 0.7);
  fill.position.set(-5, 3, 3);
  humanScene.add(fill);
  const rim = new THREE.DirectionalLight(0xffccdd, 0.5);
  rim.position.set(0, -3, -5);
  humanScene.add(rim);
  const top = new THREE.DirectionalLight(0xffffff, 0.6);
  top.position.set(0, 8, 0);
  humanScene.add(top);

  humanGroup = new THREE.Group();
  humanScene.add(humanGroup);

  const loaderScript = document.createElement('script');
  loaderScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  loaderScript.onload = () => loadHumanModel();
  loaderScript.onerror = () => showHumanError();
  document.head.appendChild(loaderScript);

  function loadHumanModel() {
    const loader = new THREE.GLTFLoader();

    document.getElementById('humanInfo').innerHTML = `
      <div class="info-placeholder">
        <div class="info-placeholder-icon" style="animation: brainPulse 1.5s infinite;">🧑</div>
        <h3>Адам моделі жүктелуде...</h3>
        <p>male_full_body_anatomy.glb файлы оқылуда</p>
        <p style="color: #2563eb; font-weight: bold; margin-top: 10px;" id="humanProgress">0%</p>
        <p style="font-size: 0.75rem; color: #64748b;">65 MB — 2-3 минут күтуі мүмкін</p>
      </div>
    `;

    loader.load(
      'male_full_body_anatomy.glb',
      (gltf) => {
        humanModel = gltf.scene;
        
        const box = new THREE.Box3().setFromObject(humanModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        humanModel.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.0 / maxDim;
        humanModel.scale.setScalar(scale);

        humanModel.traverse((child) => {
          if (child.isMesh) {
            child.material.side = THREE.DoubleSide;
            if (child.material.map) {
              child.material.map.encoding = THREE.sRGBEncoding;
            }
            if (child.material.color) {
              child.material.color.multiplyScalar(1.05);
            }
          }
        });

        humanGroup.add(humanModel);
        
        // Модель позициясын сәл төмендету
        humanGroup.position.y = 0.3; 

        // Камера фокусын төмендету
        humanCamera.lookAt(0, 0.6, 0);

        createHumanDots();
        addHumanPulses();
        resetHumanInfoPanel();
        console.log('✅ Адам моделі жүктелді!');
      },
      (xhr) => {
        if (xhr.total) {
          const percent = Math.floor((xhr.loaded / xhr.total) * 100);
          const loadedMB = (xhr.loaded / 1024 / 1024).toFixed(1);
          const totalMB = (xhr.total / 1024 / 1024).toFixed(1);
          const progressEl = document.getElementById('humanProgress');
          if (progressEl) {
            progressEl.textContent = percent + '% (' + loadedMB + ' / ' + totalMB + ' MB)';
          }
          console.log('Адам: ' + percent + '% — ' + loadedMB + ' MB / ' + totalMB + ' MB');
        } else {
          const loadedMB = (xhr.loaded / 1024 / 1024).toFixed(1);
          const progressEl = document.getElementById('humanProgress');
          if (progressEl) {
            progressEl.textContent = loadedMB + ' MB жүктелді...';
          }
        }
      },
      (error) => {
        console.error('Адам моделі жүктелмеді:', error);
        showHumanError();
      }
    );
  }

  function createHumanDots() {
    humanPartsMeshes = [];

    const bbox = new THREE.Box3().setFromObject(humanModel);
    const min = bbox.min;
    const max = bbox.max;
    
    const cx = (min.x + max.x) / 2;
    const cy = (min.y + max.y) / 2;
    const cz = (min.z + max.z) / 2;
    const sx = (max.x - min.x);
    const sy = (max.y - min.y);
    const sz = (max.z - min.z);

    // Нүктелердің дәл орны (көз, құлақ, жүрек, қол, аяқ)
    const parts = {
      eye:   { x: -0.08,  y: 0.30,  z: 0.20 }, 
      ear:   { x: 0.18,   y: 0.28,  z: 0.0 },  
      hand:  { x: -0.35,  y: 0.02,  z: 0.1 },  
      heart: { x: -0.06,  y: 0.12,  z: 0.12 }, 
      leg:   { x: 0.12,   y: -0.30, z: 0.0 }   
    };

    Object.keys(parts).forEach(key => {
      const part = HUMAN_PARTS[key];
      const p = parts[key];

      const pos = [
        cx + sx * p.x,
        cy + sy * p.y,
        cz + sz * p.z
      ];

      // Нүктелер сәл үлкейтілді (0.05)
      const dotGeo = new THREE.SphereGeometry(1, 32, 32);
      const dotMat = new THREE.MeshPhongMaterial({
        color: part.color,
        emissive: part.color,
        emissiveIntensity: 1.5,
        shininess: 120,
        transparent: true,
        opacity: 1.0,
        depthTest: false,
        depthWrite: false
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(pos[0], pos[1], pos[2]);
      dot.scale.set(0.05, 0.05, 0.05); 
      dot.renderOrder = 999;
      dot.userData = { 
        partKey: key, 
        isDot: true,
        baseScale: [0.05, 0.05, 0.05]
      };
      humanGroup.add(dot);
      humanPartsMeshes.push(dot);

      const glowGeo = new THREE.SphereGeometry(1, 20, 20);
      const glowMat = new THREE.MeshBasicMaterial({
        color: part.color,
        transparent: true,
        opacity: 0.5,
        depthTest: false,
        depthWrite: false,
        side: THREE.BackSide
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(pos[0], pos[1], pos[2]);
      glow.scale.set(0.1, 0.1, 0.1); 
      glow.renderOrder = 998;
      glow.userData = { 
        partKey: key, 
        isGlow: true,
        baseScale: [0.1, 0.1, 0.1]
      };
      humanGroup.add(glow);
      humanPartsMeshes.push(glow);

      const clickGeo = new THREE.SphereGeometry(1, 16, 16);
      const clickMat = new THREE.MeshBasicMaterial({
        color: part.color,
        transparent: true,
        opacity: 0.0,
        depthTest: false,
        depthWrite: false
      });
      const clickZone = new THREE.Mesh(clickGeo, clickMat);
      clickZone.position.set(pos[0], pos[1], pos[2]);
      clickZone.scale.set(0.15, 0.15, 0.15); 
      clickZone.userData = { partKey: key, isClickZone: true };
      humanGroup.add(clickZone);
      humanPartsMeshes.push(clickZone);
    });
  }

  function showHumanError() {
    document.getElementById('humanInfo').innerHTML = `
      <div class="info-placeholder">
        <div class="info-placeholder-icon">⚠️</div>
        <h3>Модель жүктелмеді</h3>
        <p style="color: #dc2626;">male_full_body_anatomy.glb файлы табылмады</p>
      </div>
    `;
  }

  function addHumanPulses() {
    const pulseGroup = new THREE.Group();
    humanGroup.add(pulseGroup);
    for (let i = 0; i < 20; i++) {
      const geo = new THREE.SphereGeometry(0.02, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00aaff, transparent: true, opacity: 0.9
      });
      const pulse = new THREE.Mesh(geo, mat);
      pulse.userData = {
        baseAngle: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.2,
        radius: 1.0 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        yOffset: (Math.random() - 0.5) * 2.5
      };
      pulseGroup.add(pulse);
    }
    humanGroup.userData.pulseGroup = pulseGroup;
  }

  humanRaycaster = new THREE.Raycaster();
  humanMouse = new THREE.Vector2();

  setupHumanEvents(container);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (humanAutoRotate && !humanIsDragging) {
      humanTargetRot.y += 0.004;
    }

    humanCurrentRot.x += (humanTargetRot.x - humanCurrentRot.x) * 0.08;
    humanCurrentRot.y += (humanTargetRot.y - humanCurrentRot.y) * 0.08;
    humanGroup.rotation.x = humanCurrentRot.x;
    humanGroup.rotation.y = humanCurrentRot.y;

    const pulseGroup = humanGroup.userData.pulseGroup;
    if (pulseGroup) {
      pulseGroup.children.forEach((p, i) => {
        const u = p.userData;
        const a = t * u.speed + u.baseAngle;
        p.position.x = Math.cos(a) * u.radius;
        p.position.y = u.yOffset + Math.sin(a * 2 + u.phase) * 0.3;
        p.position.z = Math.sin(a) * u.radius;
        const scale = 0.5 + Math.sin(t * 5 + i) * 0.5;
        p.scale.setScalar(scale);
        p.material.opacity = 0.3 + Math.sin(t * 5 + i) * 0.5;
      });
    }

    humanPartsMeshes.forEach((m, i) => {
      if (m.userData.isGlow) {
        const baseS = m.userData.baseScale;
        const pulse = 1 + Math.sin(t * 2 + i) * 0.18;
        m.scale.set(baseS[0] * pulse, baseS[1] * pulse, baseS[2] * pulse);
      }
    });

    humanRenderer.render(humanScene, humanCamera);
  }
  animate();

  window.addEventListener('resize', () => {
    if (!humanRenderer) return;
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    humanCamera.aspect = nw / nh;
    humanCamera.updateProjectionMatrix();
    humanRenderer.setSize(nw, nh);
  });
}

function highlightHumanPart(partKey, on) {
  humanPartsMeshes.forEach(m => {
    const key = m.userData.partKey;
    const isHover = (key === partKey && on);
    const isSelected = (humanActivePart === key);
    
    if (m.userData.isDot) {
      const baseS = m.userData.baseScale;
      if (isHover) {
        m.scale.set(baseS[0] * 1.7, baseS[1] * 1.7, baseS[2] * 1.7);
        m.material.emissiveIntensity = 2.5;
      } else if (isSelected) {
        m.scale.set(baseS[0] * 1.5, baseS[1] * 1.5, baseS[2] * 1.5);
        m.material.emissiveIntensity = 2.0;
      } else {
        m.scale.set(baseS[0], baseS[1], baseS[2]);
        m.material.emissiveIntensity = 1.5;
      }
    }
    
    if (m.userData.isGlow) {
      const baseS = m.userData.baseScale;
      if (isHover) {
        m.scale.set(baseS[0] * 1.8, baseS[1] * 1.8, baseS[2] * 1.8);
        m.material.opacity = 0.85;
      } else if (isSelected) {
        m.scale.set(baseS[0] * 1.6, baseS[1] * 1.6, baseS[2] * 1.6);
        m.material.opacity = 0.65;
      } else {
        m.scale.set(baseS[0], baseS[1], baseS[2]);
        m.material.opacity = 0.5;
      }
    }
  });
}

function setupHumanEvents(container) {
  container.addEventListener('mousedown', e => {
    humanIsDragging = true;
    humanPrevMouse.x = e.clientX;
    humanPrevMouse.y = e.clientY;
  });

  window.addEventListener('mouseup', () => humanIsDragging = false);

  window.addEventListener('mousemove', e => {
    const rect = container.getBoundingClientRect();
    humanMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    humanMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (humanIsDragging) {
      const dx = e.clientX - humanPrevMouse.x;
      const dy = e.clientY - humanPrevMouse.y;
      humanTargetRot.y += dx * 0.008;
      humanTargetRot.x += dy * 0.008;
      humanTargetRot.x = Math.max(-1.2, Math.min(1.2, humanTargetRot.x));
      humanPrevMouse.x = e.clientX;
      humanPrevMouse.y = e.clientY;
      humanAutoRotate = false;
      return;
    }

    humanRaycaster.setFromCamera(humanMouse, humanCamera);
    const clickable = humanPartsMeshes.filter(m => m.userData.isClickZone);
    const hits = humanRaycaster.intersectObjects(clickable, false);

    if (hits.length > 0) {
      const hitKey = hits[0].object.userData.partKey;
      if (humanHovered !== hitKey) {
        humanHovered = hitKey;
        document.body.style.cursor = 'pointer';
        highlightHumanPart(hitKey, true);
      }
    } else if (humanHovered) {
      humanHovered = null;
      document.body.style.cursor = '';
      if (humanActivePart) {
        highlightHumanPart(humanActivePart, true);
      } else {
        humanPartsMeshes.forEach(m => {
          if (m.userData.isDot) {
            m.scale.set(m.userData.baseScale[0], m.userData.baseScale[1], m.userData.baseScale[2]);
            m.material.emissiveIntensity = 1.5;
          }
          if (m.userData.isGlow) {
            m.scale.set(m.userData.baseScale[0], m.userData.baseScale[1], m.userData.baseScale[2]);
            m.material.opacity = 0.5;
          }
        });
      }
    }
  });

  container.addEventListener('click', e => {
    if (Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3) return;
    const rect = container.getBoundingClientRect();
    humanMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    humanMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    humanRaycaster.setFromCamera(humanMouse, humanCamera);
    
    const clickable = humanPartsMeshes.filter(m => m.userData.isClickZone);
    const hits = humanRaycaster.intersectObjects(clickable, false);
    
    if (hits.length > 0) {
      const partKey = hits[0].object.userData.partKey;
      humanActivePart = partKey;
      selectHumanPart(partKey);
    }
  });

  container.addEventListener('wheel', e => {
    e.preventDefault();
    const nz = humanCamera.position.z + e.deltaY * 0.005;
    humanCamera.position.z = Math.max(2, Math.min(10, nz));
  }, { passive: false });

  container.addEventListener('touchstart', e => {
    humanIsDragging = true;
    humanPrevMouse.x = e.touches[0].clientX;
    humanPrevMouse.y = e.touches[0].clientY;
    humanAutoRotate = false;
  }, { passive: true });

  container.addEventListener('touchend', () => humanIsDragging = false);

  container.addEventListener('touchmove', e => {
    if (!humanIsDragging) return;
    const dx = e.touches[0].clientX - humanPrevMouse.x;
    const dy = e.touches[0].clientY - humanPrevMouse.y;
    humanTargetRot.y += dx * 0.008;
    humanTargetRot.x += dy * 0.008;
    humanPrevMouse.x = e.touches[0].clientX;
    humanPrevMouse.y = e.touches[0].clientY;
  }, { passive: true });
}

function selectHumanPart(key) {
  const part = HUMAN_PARTS[key];
  if (!part) return;
  humanActivePart = key;
  
  document.getElementById('humanInfo').innerHTML = `
    <div class="info-content">
      <div class="info-icon">${part.icon}</div>
      <h3>${part.name}</h3>
      <div class="info-en">${part.en}</div>
      <p>${part.desc}</p>
      <div class="info-block">
        <div class="info-block-label">🔌 ИМПЛАНТ</div>
        <div class="info-block-text">${part.implant}</div>
      </div>
      <div class="info-block">
        <div class="info-block-label">💰 БАҒАСЫ</div>
        <div class="info-block-text">${part.price}</div>
      </div>
      <div class="info-block">
        <div class="info-block-label">📊 ЖЕТІСТІК ДЕҢГЕЙІ</div>
        <div class="info-block-text">${part.success}</div>
      </div>
    </div>
  `;
  
  highlightHumanPart(key, true);
}

function resetHumanInfoPanel() {
  humanActivePart = null;
  humanHovered = null;
  document.getElementById('humanInfo').innerHTML = `
    <div class="info-placeholder">
      <div class="info-placeholder-icon">🧑</div>
      <h3>Мүшені таңдаңыз</h3>
      <p>Адам денесіндегі түрлі-түсті нүктелерді басып, импланттар туралы біліңіз</p>
      <div class="brain-parts-list">
        ${Object.keys(HUMAN_PARTS).map(key => {
          const p = HUMAN_PARTS[key];
          const hex = '#' + p.color.toString(16).padStart(6, '0');
          return `<button class="part-chip" onclick="selectHumanPart('${key}')" style="border-color: ${hex}; color: ${hex};">${p.icon} ${p.name}</button>`;
        }).join('')}
      </div>
      <div style="margin-top: 25px; padding: 16px; background: #f0f7ff; border-radius: 10px; font-size: 0.85rem; text-align: left;">
        <strong>💡 Қалай қолдану:</strong><br>
        1. Адамды айналдырыңыз (тышқан)<br>
        2. Жақындатыңыз (дөңгелек)<br>
        3. <strong>Түсті нүктені басыңыз</strong>
      </div>
    </div>
  `;
}

/* ============================================================
   САУАЛНАМА
============================================================ */
function submitSurvey() {
  const q1 = document.querySelector('input[name="q1"]:checked');
  const q2 = document.querySelector('input[name="q2"]:checked');
  const q3 = document.querySelector('input[name="q3"]:checked');

  if (!q1 || !q2 || !q3) {
    alert('Барлық сұрақтарға жауап беріңіз!');
    return;
  }

  let feedback = '';
  if (q1.value === 'yes') feedback = 'Сіз киборг технологияларын болашақтың маңызды бөлігі деп санайсыз. 🚀';
  else if (q1.value === 'maybe') feedback = 'Сіз технологияны қабылдайсыз, бірақ қауіпсіздікке мән бересіз. ⚖️';
  else feedback = 'Сіз табиғи жолды ұстануды жөн көресіз. 🌿';

  const result = document.getElementById('surveyResult');
  document.getElementById('resultText').textContent = feedback + ' Қатысқаныңызға рахмет!';
  result.classList.add('show');
}

/* ============================================================
   STARTUP
============================================================ */
window.addEventListener('load', () => {
  showBootLogs();
  runProgress();
});
