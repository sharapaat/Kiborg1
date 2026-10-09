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

/* Жүрек соғысы дыбысы */
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

/* ЗЕРТХАНАҒА КІРУ */
document.getElementById('enterLabBtn').addEventListener('click', () => {
  const boot = document.getElementById('bootScreen');
  const lab = document.getElementById('laboratory');
  boot.classList.add('exit');
  setTimeout(() => {
    lab.classList.remove('hidden');
    setTimeout(() => {
      lab.classList.add('show');
      // Ми 3D моделін бастау
      setTimeout(() => {
        if (typeof initBrain3D === 'function') initBrain3D();
        if (typeof initHuman3D === 'function') initHuman3D();
      }, 300);
    }, 50);
    setTimeout(() => { boot.style.display = 'none'; }, 800);
  }, 400);
});

/* ЖОБА ТУРАЛЫ — модальді */
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

    // Toolbar тақырыбы
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

    // Ми моделін қайта іске қосу
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
   МИ 3D МОДЕЛІ — human_brain.glb ФАЙЛЫНАН
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

const BRAIN_PARTS = {
  frontal: {
    name: 'Фронталды бөлік', en: 'Frontal Lobe', icon: '🎯',
    desc: 'Мидың алдыңғы бөлігі. Шешім қабылдау, жоспарлау, сөйлеу, қозғалыс бақылауы үшін жауапты.',
    func: 'Қозғалыс, сөйлеу, шешім қабылдау',
    cyborg: 'DBS импланты осы аймаққа әсер етеді.'
  },
  parietal: {
    name: 'Париеталды бөлік', en: 'Parietal Lobe', icon: '🖐️',
    desc: 'Сезімді өңдеу, кеңістікті қабылдау үшін жауапты.',
    func: 'Сипап сезу, температура, ауырсыну',
    cyborg: 'Жасанды тері импланттары осында жалғанады.'
  },
  temporal: {
    name: 'Темпоралды бөлік', en: 'Temporal Lobe', icon: '👂',
    desc: 'Есту, есте сақтау, тілді түсіну үшін жауапты.',
    func: 'Есту, тіл, есте сақтау',
    cyborg: 'Кохлеарлы импланттар осында қосылады.'
  },
  occipital: {
    name: 'Оксипиталды бөлік', en: 'Occipital Lobe', icon: '👁️',
    desc: 'Көру ақпаратын өңдейтін ми бөлігі.',
    func: 'Көру, түс, пішін тану',
    cyborg: 'Argus II торлы қабық осында сигнал жібереді.'
  },
  cerebellum: {
    name: 'Мишық', en: 'Cerebellum', icon: '⚖️',
    desc: 'Тепе-теңдік, координация үшін жауапты.',
    func: 'Тепе-теңдік, үйлестіру',
    cyborg: 'Вестибулярлы импланттар осында орнатылады.'
  }
};

function initBrain3D() {
  const container = document.getElementById('brain3D');
  if (!container || typeof THREE === 'undefined') return;
  if (brainRenderer) return;

  const w = container.clientWidth;
  const h = container.clientHeight;

  // SCENE
  brainScene = new THREE.Scene();

  // CAMERA
  brainCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  brainCamera.position.set(0, 0, 5);

  // RENDERER
  brainRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  brainRenderer.setSize(w, h);
  brainRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  brainRenderer.outputEncoding = THREE.sRGBEncoding;
  brainRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  brainRenderer.toneMappingExposure = 1.1;
  container.appendChild(brainRenderer.domElement);

  // LIGHTS — жарқын, табиғи
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

  // BRAIN GROUP
  brainGroup = new THREE.Group();
  brainScene.add(brainGroup);

  // GLTFLoader жүктеу
  const loaderScript = document.createElement('script');
  loaderScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  loaderScript.onload = () => {
    loadBrainModel();
  };
  loaderScript.onerror = () => {
    console.error('GLTFLoader жүктелмеді');
    showBrainError();
  };
  document.head.appendChild(loaderScript);

  function loadBrainModel() {
    const loader = new THREE.GLTFLoader();
    
    // Loading indicator
    document.getElementById('brainInfo').innerHTML = `
      <div class="info-placeholder">
        <div class="info-placeholder-icon" style="animation: brainPulse 1.5s infinite;">🧠</div>
        <h3>Ми моделі жүктелуде...</h3>
        <p>human_brain.glb файлы оқылуда</p>
      </div>
    `;

    loader.load(
      'human_brain.glb',
      
      // ✅ Сәтті жүктелді
      (gltf) => {
        brainModel = gltf.scene;
        
        // Модельді центрге қою
        const box = new THREE.Box3().setFromObject(brainModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        brainModel.position.sub(center);
        
        // Өлшемін автоматты реттеу (2.5 бірлікке)
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;
        brainModel.scale.setScalar(scale);
        
        // Материалдарды жақсарту
        brainModel.traverse((child) => {
          if (child.isMesh) {
            child.material.side = THREE.DoubleSide;
            if (child.material.map) {
              child.material.map.encoding = THREE.sRGBEncoding;
            }
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Атауы бойынша бөлік анықтау
            const name = child.name.toLowerCase();
            let partKey = null;
            if (name.includes('frontal') || name.includes('front')) partKey = 'frontal';
            else if (name.includes('parietal')) partKey = 'parietal';
            else if (name.includes('temporal')) partKey = 'temporal';
            else if (name.includes('occipital')) partKey = 'occipital';
            else if (name.includes('cerebellum') || name.includes('cerebel')) partKey = 'cerebellum';
            
            if (partKey) {
              child.userData.partKey = partKey;
              brainPartsMeshes.push(child);
            }
          }
        });
        
        brainGroup.add(brainModel);
        
        // Егер бөліктер табылмаса — бүкіл модельді бір бөлік ретінде қарастыру
        if (brainPartsMeshes.length === 0) {
          console.warn('Бөліктер атаулары табылмады, бүкіл модель интерактивті');
          brainModel.traverse((child) => {
            if (child.isMesh) {
              brainPartsMeshes.push(child);
            }
          });
        }
        
        // Импульс эффектісін қосу
        addPulses();
        
        // Info панелін қалпына келтіру
        resetBrainInfoPanel();
        
        console.log('✅ Ми моделі жүктелді!', brainPartsMeshes.length, 'бөлік');
      },
      
      // Жүктелу барысы
      (xhr) => {
        if (xhr.total) {
          const percent = Math.floor((xhr.loaded / xhr.total) * 100);
          console.log('Ми моделі: ' + percent + '%');
        }
      },
      
      // ❌ Қате
      (error) => {
        console.error('Ми моделі жүктелмеді:', error);
        showBrainError();
      }
    );
  }

  function showBrainError() {
    document.getElementById('brainInfo').innerHTML = `
      <div class="info-placeholder">
        <div class="info-placeholder-icon">⚠️</div>
        <h3>Модель жүктелмеді</h3>
        <p style="color: #dc2626;">human_brain.glb файлы табылмады</p>
        <div style="margin-top: 20px; padding: 16px; background: #fef2f2; border-radius: 10px; text-align: left; font-size: 0.85rem;">
          <strong>Тексеру:</strong><br>
          1. Файл аты дұрыс па: <code>human_brain.glb</code><br>
          2. Файл index.html жанында ма?<br>
          3. Формат: <code>.glb</code> пе?
        </div>
      </div>
    `;
  }

  // Импульс нүктелері
  function addPulses() {
    const pulseGroup = new THREE.Group();
    brainGroup.add(pulseGroup);

    for (let i = 0; i < 25; i++) {
      const geo = new THREE.SphereGeometry(0.025, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.9
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

  // ANIMATION
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

    // Импульстер
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

    // Raycasting
    if (!brainIsDragging && brainPartsMeshes.length > 0) {
      brainRaycaster.setFromCamera(brainMouse, brainCamera);
      const hits = brainRaycaster.intersectObjects(brainPartsMeshes, true);

      if (hits.length > 0) {
        const obj = hits[0].object;
        const partKey = obj.userData.partKey || (obj.parent && obj.parent.userData.partKey);
        
        if (partKey && brainHovered !== partKey) {
          brainHovered = partKey;
          document.body.style.cursor = 'pointer';
          highlightBrainPart(partKey, true);
        }
      } else if (brainHovered) {
        brainHovered = null;
        document.body.style.cursor = '';
        brainPartsMeshes.forEach(m => {
          if (m.material && m.material.emissive) {
            m.material.emissiveIntensity = 0.1;
          }
        });
      }
    }

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
    const key = m.userData.partKey || (m.parent && m.parent.userData.partKey);
    if (m.material && m.material.emissive) {
      if (key === partKey) {
        m.material.emissiveIntensity = on ? 0.6 : 0.1;
      } else {
        m.material.emissiveIntensity = 0.1;
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

    if (!brainIsDragging) return;
    const dx = e.clientX - brainPrevMouse.x;
    const dy = e.clientY - brainPrevMouse.y;
    brainTargetRot.y += dx * 0.008;
    brainTargetRot.x += dy * 0.008;
    brainTargetRot.x = Math.max(-1.2, Math.min(1.2, brainTargetRot.x));
    brainPrevMouse.x = e.clientX;
    brainPrevMouse.y = e.clientY;
    brainAutoRotate = false;
  });

  container.addEventListener('click', e => {
    if (Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3) return;
    const rect = container.getBoundingClientRect();
    brainMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    brainMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    brainRaycaster.setFromCamera(brainMouse, brainCamera);
    const hits = brainRaycaster.intersectObjects(brainPartsMeshes, true);
    
    if (hits.length > 0) {
      const obj = hits[0].object;
      const partKey = obj.userData.partKey || (obj.parent && obj.parent.userData.partKey);
      if (partKey) selectBrainPart(partKey);
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
  document.getElementById('brainInfo').innerHTML = `
    <div class="info-placeholder">
      <div class="info-placeholder-icon">🧠</div>
      <h3>Ми бөлігін таңдаңыз</h3>
      <p>Модельдегі кез келген бөлікті басып, оның қызметі туралы біліңіз</p>
      <div class="brain-parts-list">
        <button class="part-chip" onclick="selectBrainPart('frontal')">Фронталды</button>
        <button class="part-chip" onclick="selectBrainPart('parietal')">Париеталды</button>
        <button class="part-chip" onclick="selectBrainPart('temporal')">Темпоралды</button>
        <button class="part-chip" onclick="selectBrainPart('occipital')">Оксипиталды</button>
        <button class="part-chip" onclick="selectBrainPart('cerebellum')">Мишық</button>
      </div>
    </div>
  `;
}

function resetBrainView() {
  brainTargetRot.x = 0;
  brainTargetRot.y = 0;
  brainCamera.position.z = 5;
  brainAutoRotate = true;
  brainPartsMeshes.forEach(m => {
    if (m.material && m.material.emissive) {
      m.material.emissiveIntensity = 0.1;
    }
  });
  resetBrainInfoPanel();
}

function toggleBrainRotate() { brainAutoRotate = !brainAutoRotate; }
/* ============================================================
   АДАМ 3D МОДЕЛІ
============================================================ */
let humanScene, humanCamera, humanRenderer, humanGroup;
let humanIsDragging = false;
let humanPrevMouse = { x: 0, y: 0 };
let humanTargetRot = { x: 0, y: 0 };
let humanCurrentRot = { x: 0, y: 0 };
let humanAutoRotate = true;
let humanPartsMeshes = [];
let humanRaycaster, humanMouse;

const HUMAN_PARTS = {
  eye: {
    name: 'Көз', en: 'Eye', icon: '👁️',
    desc: 'Көру мүшесі. Жарықты қабылдап, миға сигнал жібереді.',
    implant: 'Argus II — жасанды торлы қабық. 60 электрод арқылы көру мүмкіндігін қайтарады.',
    price: '$150,000',
    success: '78%'
  },
  ear: {
    name: 'Құлақ', en: 'Ear', icon: '👂',
    desc: 'Есту мүшесі. Дыбыс толқындарын қабылдайды.',
    implant: 'Cochlear Implant — 1978 жылдан бері қолданылады. 1 млн+ адамға орнатылған.',
    price: '$30,000',
    success: '95%'
  },
  hand: {
    name: 'Қол', en: 'Hand', icon: '✋',
    desc: 'Сипап сезу мүшесі. Температура, ауырсыну, қысымды қабылдайды.',
    implant: 'Bionic Arm — ми сигналдарымен басқарылады. 26 градус еркіндік.',
    price: '$100,000',
    success: '88%'
  },
  heart: {
    name: 'Жүрек', en: 'Heart', icon: '❤️',
    desc: 'Қан айналым жүйесінің негізгі мүшесі.',
    implant: 'Artificial Heart (SynCardia) — толық жасанды жүрек. Күнде 100,000 соғыс.',
    price: '$150,000',
    success: '70%'
  },
  leg: {
    name: 'Аяқ', en: 'Leg', icon: '🦵',
    desc: 'Қозғалыс мүшесі. Жүру, жүгіру, секіру.',
    implant: 'Bionic Leg — қозғалысты қалпына келтіреді. Спортқа жарамды.',
    price: '$80,000',
    success: '90%'
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
  humanCamera.position.set(0, 0.5, 6);

  humanRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  humanRenderer.setSize(w, h);
  humanRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(humanRenderer.domElement);

  humanScene.add(new THREE.AmbientLight(0xffffff, 0.8));

  const l1 = new THREE.DirectionalLight(0xffffff, 1);
  l1.position.set(5, 5, 5);
  humanScene.add(l1);

  const l2 = new THREE.DirectionalLight(0x88ccff, 0.5);
  l2.position.set(-5, 3, 3);
  humanScene.add(l2);

  humanGroup = new THREE.Group();
  humanScene.add(humanGroup);

  // Адам денесі — қарапайым геометриялардан
  const skinMat = new THREE.MeshPhongMaterial({
    color: 0xf0d0b8,
    shininess: 30,
    flatShading: false
  });

  // Басы
  const headGeo = new THREE.SphereGeometry(0.42, 32, 32);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.9;
  head.scale.set(0.95, 1.1, 0.95);
  humanGroup.add(head);

  // Мойын
  const neckGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.25, 20);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = 1.45;
  humanGroup.add(neck);

  // Дене
  const torsoGeo = new THREE.CylinderGeometry(0.5, 0.55, 1.5, 24);
  const torso = new THREE.Mesh(torsoGeo, skinMat);
  torso.position.y = 0.55;
  humanGroup.add(torso);

  // Қолдар
  const armGeo = new THREE.CylinderGeometry(0.13, 0.11, 1.4, 16);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.set(-0.65, 0.5, 0);
  leftArm.rotation.z = 0.15;
  humanGroup.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, skinMat);
  rightArm.position.set(0.65, 0.5, 0);
  rightArm.rotation.z = -0.15;
  humanGroup.add(rightArm);

  // Аяқтар
  const legGeo = new THREE.CylinderGeometry(0.16, 0.14, 1.5, 16);
  const leftLeg = new THREE.Mesh(legGeo, skinMat);
  leftLeg.position.set(-0.22, -1.2, 0);
  humanGroup.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, skinMat);
  rightLeg.position.set(0.22, -1.2, 0);
  humanGroup.add(rightLeg);

  // Мүшелер (интерактивті нүктелер)
  humanPartsMeshes = [];

  const partMarkers = [
    { key: 'eye', pos: [0, 1.95, 0.4], color: 0x4a90e2 },
    { key: 'ear', pos: [0.42, 1.9, 0], color: 0x7ed321 },
    { key: 'hand', pos: [-0.85, -0.2, 0], color: 0xf5a623 },
    { key: 'heart', pos: [0.15, 0.9, 0.35], color: 0xe94b6f },
    { key: 'leg', pos: [0.22, -1.8, 0], color: 0x9b59b6 }
  ];

  partMarkers.forEach(pm => {
    // Жарқыраған нүкте
    const markerGeo = new THREE.SphereGeometry(0.12, 20, 20);
    const markerMat = new THREE.MeshPhongMaterial({
      color: pm.color,
      emissive: pm.color,
      emissiveIntensity: 0.6,
      shininess: 80
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(...pm.pos);
    marker.userData = { partKey: pm.key };
    humanGroup.add(marker);
    humanPartsMeshes.push(marker);

    // Галo
    const haloGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: pm.color,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(...pm.pos);
    humanGroup.add(halo);
  });

  humanRaycaster = new THREE.Raycaster();
  humanMouse = new THREE.Vector2();

  setupHumanEvents(container);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (humanAutoRotate && !humanIsDragging) humanTargetRot.y += 0.004;

    humanCurrentRot.x += (humanTargetRot.x - humanCurrentRot.x) * 0.08;
    humanCurrentRot.y += (humanTargetRot.y - humanCurrentRot.y) * 0.08;
    humanGroup.rotation.x = humanCurrentRot.x;
    humanGroup.rotation.y = humanCurrentRot.y;

    // Нүктелер пульсациясы
    humanPartsMeshes.forEach((m, i) => {
      const s = 1 + Math.sin(t * 3 + i) * 0.2;
      m.scale.setScalar(s);
    });

    if (!humanIsDragging) {
      humanRaycaster.setFromCamera(humanMouse, humanCamera);
      const hits = humanRaycaster.intersectObjects(humanPartsMeshes);
      document.body.style.cursor = hits.length > 0 ? 'pointer' : '';
    }

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

    if (!humanIsDragging) return;
    const dx = e.clientX - humanPrevMouse.x;
    const dy = e.clientY - humanPrevMouse.y;
    humanTargetRot.y += dx * 0.008;
    humanTargetRot.x += dy * 0.008;
    humanTargetRot.x = Math.max(-0.8, Math.min(0.8, humanTargetRot.x));
    humanPrevMouse.x = e.clientX;
    humanPrevMouse.y = e.clientY;
    humanAutoRotate = false;
  });

  container.addEventListener('click', e => {
    if (Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3) return;
    const rect = container.getBoundingClientRect();
    humanMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    humanMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    humanRaycaster.setFromCamera(humanMouse, humanCamera);
    const hits = humanRaycaster.intersectObjects(humanPartsMeshes);
    if (hits.length > 0) selectHumanPart(hits[0].object.userData.partKey);
  });

  container.addEventListener('wheel', e => {
    e.preventDefault();
    const nz = humanCamera.position.z + e.deltaY * 0.005;
    humanCamera.position.z = Math.max(3, Math.min(10, nz));
  }, { passive: false });
}

function selectHumanPart(key) {
  const part = HUMAN_PARTS[key];
  if (!part) return;
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