const MODEL_META = window.APP_CONFIG;
const CODE_BLOCKS = window.PYTHON_CODE_BLOCKS;

const STEP_LABELS = ['模型识别', '方程配置', '速率计算', '水准更新', '响应判读'];

const STEP_GUIDE = {
  positive_feedback: {
    structure: {
      stocks: ['LI：客运量（系统累积状态）'],
      rates: ['R1：客运量年增加量（增长流量）'],
      aux: ['本例无独立辅助变量，增长率 C1 直接进入速率方程。'],
      constants: ['C1：年增长率，决定正反馈放大速度。'],
      summary: '该模型是一阶正反馈回路。库存 LI 越大，速率 R1 越大，系统会不断自我强化，典型响应是指数型上升。'
    },
    rateFormula: 'R1(K)=LI(K)×C1',
    levelFormula: 'LI(K+1)=LI(K)+DT×R1(K)',
  },
  negative_feedback: {
    structure: {
      stocks: ['D：库存量（需要被调节到目标值）'],
      rates: ['R1：订货速度（对差额的纠偏动作）'],
      aux: ['X：库存差额，X(K)=Y-D(K)。'],
      constants: ['Y：期望库存，W：调整时间。'],
      summary: '该模型是一阶负反馈回路。当前库存偏离目标时，系统自动产生订货动作；偏差越小，纠偏越弱，因此系统会逐步收敛到目标附近。'
    },
    rateFormula: 'X(K)=Y-D(K)，R1(K)=X(K)/W',
    levelFormula: 'D(K+1)=D(K)+DT×R1(K)',
  },
  second_order: {
    structure: {
      stocks: ['M：在校学生数（培养过程中的库存）', 'Q：人才拥有量（输出端库存）'],
      rates: ['R1：招生人数', 'R2：毕业人数'],
      aux: ['D：供需差，D(K)=Y-Q(K)。'],
      constants: ['Y：期望人才拥有量，Z：调整时间，W：学制。'],
      summary: '该模型是二阶负反馈回路。供需差先推动招生，招生再通过学制延迟转化为毕业与人才拥有量，因此常出现“先扩张、后回落、再趋稳”的动态。'
    },
    rateFormula: 'D(K)=Y-Q(K)，R1(K)=D(K)/Z，R2(K)=M(K)/W',
    levelFormula: 'M(K+1)=M(K)+DT×(R1(K)-R2(K))；Q(K+1)=Q(K)+DT×R2(K)',
  },
};

const STATE = {
  activeModel: 'positive_feedback',
  activeStep: 0,
  params: {},
  result: null,
  primaryChart: null,
  secondaryChart: null,
  compareChart: null,
  debounceTimer: null,
  diagramCleanup: null,
};

const PALETTE = {
  positive_feedback: {
    primary: '#2563eb',
    secondary: '#06b6d4',
    accent: '#1d4ed8',
    soft: 'rgba(37, 99, 235, 0.12)',
  },
  negative_feedback: {
    primary: '#16a34a',
    secondary: '#f59e0b',
    accent: '#15803d',
    soft: 'rgba(22, 163, 74, 0.12)',
  },
  second_order: {
    primary: '#7c3aed',
    secondary: '#ec4899',
    accent: '#6d28d9',
    soft: 'rgba(124, 58, 237, 0.12)',
  },
};

const FLOW_DIAGRAMS = {
  positive_feedback: `
  <svg viewBox="0 0 860 430" role="img" aria-label="一阶正反馈系统流程图">
    <defs>
      <marker id="arrowA" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#334155"></path>
      </marker>
    </defs>
    <text x="34" y="40" class="diagram-note">教材例题 5-5：铁路客运量系统</text>
    <path class="flow-line" d="M95 215 H270" marker-end="url(#arrowA)"></path>
    <polygon class="valve" points="235,198 250,215 235,232 220,215"></polygon>
    <rect x="270" y="170" width="160" height="90" rx="18" class="stock-box"></rect>
    <text x="350" y="207" text-anchor="middle" class="svg-label">LI</text>
    <text x="350" y="232" text-anchor="middle" class="svg-sub">客运量</text>
    <path class="flow-line" d="M430 215 H620" marker-end="url(#arrowA)"></path>
    <circle cx="120" cy="312" r="42" class="constant-circle"></circle>
    <text x="120" y="304" text-anchor="middle" class="svg-label">C1</text>
    <text x="120" y="327" text-anchor="middle" class="svg-sub">年增长率</text>
    <path class="info-link" d="M120 270 C150 240, 180 225, 230 215" marker-end="url(#arrowA)"></path>
    <circle cx="555" cy="110" r="50" class="aux-circle"></circle>
    <text x="555" y="102" text-anchor="middle" class="svg-label">R1</text>
    <text x="555" y="126" text-anchor="middle" class="svg-sub">年增加量</text>
    <path class="info-link" d="M430 190 C470 150, 500 130, 505 118" marker-end="url(#arrowA)"></path>
    <path class="info-link" d="M515 136 C450 155, 300 145, 250 205" marker-end="url(#arrowA)"></path>
    <text x="508" y="170" class="diagram-note">正反馈放大：LI ↑ → R1 ↑ → LI 更快增长</text>
  </svg>`,
  negative_feedback: `
  <svg viewBox="0 0 860 430" role="img" aria-label="一阶负反馈库存控制系统流程图">
    <defs>
      <marker id="arrowB" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#334155"></path>
      </marker>
    </defs>
    <text x="34" y="40" class="diagram-note">教材例题 5-6：库存控制系统</text>
    <path class="flow-line" d="M95 215 H270" marker-end="url(#arrowB)"></path>
    <polygon class="valve" points="235,198 250,215 235,232 220,215"></polygon>
    <rect x="270" y="170" width="160" height="90" rx="18" class="stock-box"></rect>
    <text x="350" y="207" text-anchor="middle" class="svg-label">D</text>
    <text x="350" y="232" text-anchor="middle" class="svg-sub">库存量</text>
    <path class="flow-line" d="M430 215 H620" marker-end="url(#arrowB)"></path>
    <circle cx="565" cy="120" r="50" class="aux-circle"></circle>
    <text x="565" y="112" text-anchor="middle" class="svg-label">X</text>
    <text x="565" y="136" text-anchor="middle" class="svg-sub">库存差额</text>
    <circle cx="130" cy="320" r="44" class="constant-circle"></circle>
    <text x="130" y="312" text-anchor="middle" class="svg-label">W</text>
    <text x="130" y="336" text-anchor="middle" class="svg-sub">调整时间</text>
    <circle cx="700" cy="315" r="44" class="constant-circle"></circle>
    <text x="700" y="307" text-anchor="middle" class="svg-label">Y</text>
    <text x="700" y="331" text-anchor="middle" class="svg-sub">期望库存</text>
    <path class="info-link" d="M430 240 C490 265, 520 220, 540 160" marker-end="url(#arrowB)"></path>
    <path class="info-link" d="M700 272 C680 220, 645 162, 605 140" marker-end="url(#arrowB)"></path>
    <path class="info-link" d="M160 288 C195 255, 212 242, 230 220" marker-end="url(#arrowB)"></path>
    <path class="info-link" d="M540 152 C480 160, 310 130, 245 205" marker-end="url(#arrowB)"></path>
    <text x="470" y="330" class="diagram-note">负反馈控制：D 越接近 Y，X 越小，订货速度 R1 自动回落</text>
  </svg>`,
  second_order: `
  <svg viewBox="0 0 900 460" role="img" aria-label="二阶负反馈人才培养系统流程图">
    <defs>
      <marker id="arrowC" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#334155"></path>
      </marker>
    </defs>
    <text x="34" y="40" class="diagram-note">教材例题 5-7：交通运输类人才培养系统</text>
    <path class="flow-line" d="M90 210 H230" marker-end="url(#arrowC)"></path>
    <polygon class="valve" points="200,193 215,210 200,227 185,210" class="valve"></polygon>
    <rect x="230" y="165" width="140" height="90" rx="18" class="stock-box"></rect>
    <text x="300" y="202" text-anchor="middle" class="svg-label">M</text>
    <text x="300" y="227" text-anchor="middle" class="svg-sub">在校学生</text>
    <path class="flow-line" d="M370 210 H520" marker-end="url(#arrowC)"></path>
    <polygon class="valve" points="490,193 505,210 490,227 475,210" class="valve"></polygon>
    <rect x="520" y="165" width="140" height="90" rx="18" class="stock-box"></rect>
    <text x="590" y="202" text-anchor="middle" class="svg-label">Q</text>
    <text x="590" y="227" text-anchor="middle" class="svg-sub">人才拥有量</text>
    <path class="flow-line" d="M660 210 H805" marker-end="url(#arrowC)"></path>

    <circle cx="440" cy="350" r="50" class="aux-circle"></circle>
    <text x="440" y="342" text-anchor="middle" class="svg-label">D</text>
    <text x="440" y="366" text-anchor="middle" class="svg-sub">供需差</text>

    <circle cx="130" cy="330" r="44" class="constant-circle"></circle>
    <text x="130" y="322" text-anchor="middle" class="svg-label">Z</text>
    <text x="130" y="346" text-anchor="middle" class="svg-sub">调整时间</text>

    <circle cx="470" cy="96" r="44" class="constant-circle"></circle>
    <text x="470" y="88" text-anchor="middle" class="svg-label">W</text>
    <text x="470" y="112" text-anchor="middle" class="svg-sub">学制</text>

    <circle cx="705" cy="345" r="48" class="constant-circle"></circle>
    <text x="705" y="337" text-anchor="middle" class="svg-label">Y</text>
    <text x="705" y="361" text-anchor="middle" class="svg-sub">期望人才量</text>

    <path class="info-link" d="M130 286 C160 250, 177 235, 190 214" marker-end="url(#arrowC)"></path>
    <path class="info-link" d="M470 138 C468 168, 500 185, 485 205" marker-end="url(#arrowC)"></path>
    <path class="info-link" d="M590 255 C545 290, 525 316, 487 335" marker-end="url(#arrowC)"></path>
    <path class="info-link" d="M705 296 C655 285, 575 300, 480 338" marker-end="url(#arrowC)"></path>
    <path class="info-link" d="M438 300 C410 274, 365 250, 322 225" marker-end="url(#arrowC)"></path>
    <path class="info-link" d="M440 300 C452 260, 468 238, 487 220" marker-end="url(#arrowC)"></path>
    <text x="265" y="115" class="diagram-note">R1：招生人数，R2：毕业人数，双库存耦合形成二阶负反馈</text>
  </svg>`,
};

function $(id) {
  return document.getElementById(id);
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  const num = Number(value);
  if (Math.abs(num) >= 1000) {
    return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(num);
  }
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 }).format(num);
}

function getParamMeta(key) {
  return MODEL_META[STATE.activeModel].params.find((item) => item.key === key);
}

function buildModelSwitcher() {
  const box = $('model-switcher');
  box.innerHTML = '';
  Object.entries(MODEL_META).forEach(([modelId, meta]) => {
    const button = document.createElement('button');
    button.className = `model-pill ${STATE.activeModel === modelId ? 'active' : ''}`;
    button.innerHTML = `
      <div class="model-pill-title">
        <span>${meta.name}</span>
        <span class="small-badge">${meta.badge}</span>
      </div>
      <p>${meta.description}</p>
    `;
    button.addEventListener('click', () => switchModel(modelId));
    box.appendChild(button);
  });
}

function switchModel(modelId) {
  STATE.activeModel = modelId;
  STATE.activeStep = 0;
  const meta = MODEL_META[modelId];
  STATE.params = { ...meta.defaults };
  buildModelSwitcher();
  renderModelMeta();
  renderPresets();
  renderParamForm();
  renderEquations();
  renderDiagram();
  renderCode();
  renderStepExplain();
  updateSmartTip();
  requestSimulation();
}

function renderModelMeta() {
  const meta = MODEL_META[STATE.activeModel];
  $('model-meta-card').innerHTML = `
    <div class="model-meta-top">
      <h3>${meta.short_name}</h3>
      <span class="small-badge">${meta.feedback_type}</span>
    </div>
    <p>${meta.description}</p>
    <p><strong>时间单位：</strong>${meta.time_unit}　　<strong>结构标签：</strong>${meta.badge}</p>
  `;
  $('feedback-chip').textContent = meta.feedback_type;
}

function renderPresets() {
  const meta = MODEL_META[STATE.activeModel];
  const row = $('preset-row');
  row.innerHTML = '';
  Object.entries(meta.preset_sets).forEach(([name, values], index) => {
    const btn = document.createElement('button');
    btn.className = `preset-btn ${index === 0 ? 'active' : ''}`;
    btn.textContent = name;
    btn.addEventListener('click', () => {
      row.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.params = { ...STATE.params, ...values };
      renderParamForm();
      updateSmartTip();
      requestSimulation();
    });
    row.appendChild(btn);
  });
}

function createParamCard(param) {
  const wrapper = document.createElement('div');
  wrapper.className = 'param-card';
  const value = STATE.params[param.key] ?? param.default;
  wrapper.innerHTML = `
    <div class="param-top">
      <div>
        <div class="param-title">${param.label}</div>
        <div class="param-desc">${param.description}</div>
      </div>
      <div class="small-badge">${param.unit || '参数'}</div>
    </div>
    <div class="param-input-wrap">
      <input class="param-slider" type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${value}" />
      <input class="param-number" type="number" min="${param.min}" max="${param.max}" step="${param.step}" value="${value}" />
    </div>
    <div class="param-range">范围：${param.min} ～ ${param.max} ${param.unit}</div>
  `;
  const slider = wrapper.querySelector('.param-slider');
  const number = wrapper.querySelector('.param-number');

  const sync = (raw) => {
    let v = Number(raw);
    if (Number.isNaN(v)) v = param.default;
    v = Math.min(param.max, Math.max(param.min, v));
    slider.value = v;
    number.value = v;
    STATE.params[param.key] = v;
    updateSmartTip();
    debouncedSimulation();
  };

  slider.addEventListener('input', (e) => sync(e.target.value));
  number.addEventListener('input', (e) => sync(e.target.value));
  number.addEventListener('change', () => sync(number.value));

  return wrapper;
}

function renderParamForm() {
  const form = $('param-form');
  form.innerHTML = '';
  MODEL_META[STATE.activeModel].params.forEach((param) => form.appendChild(createParamCard(param)));
}

function renderEquations() {
  const meta = MODEL_META[STATE.activeModel];
  $('equation-list').innerHTML = meta.equations
    .map((eq) => `<div class="equation-item">\\(${eq}\\)</div>`)
    .join('');
  typesetMath();
}

function typesetMath() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

function renderDiagram() {
  $('diagram-container').innerHTML = FLOW_DIAGRAMS[STATE.activeModel];
  initDiagramPanZoom();
}

function initDiagramPanZoom() {
  const stage = $('diagram-stage');
  const svg = stage?.querySelector('svg');
  const resetBtn = $('diagram-reset-btn');
  if (!stage || !svg) return;

  if (STATE.diagramCleanup) STATE.diagramCleanup();

  const view = { scale: 1, x: 0, y: 0, dragging: false, startX: 0, startY: 0 };
  const clampScale = (value) => Math.max(0.8, Math.min(4.5, value));
  const apply = () => {
    svg.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  };
  const reset = () => {
    view.scale = 1;
    view.x = 0;
    view.y = 0;
    apply();
  };
  const onWheel = (e) => {
    e.preventDefault();
    const rect = stage.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2 - view.x;
    const mouseY = e.clientY - rect.top - rect.height / 2 - view.y;
    const factor = e.deltaY < 0 ? 1.12 : 0.9;
    const nextScale = clampScale(view.scale * factor);
    const ratio = nextScale / view.scale;
    view.x -= mouseX * (ratio - 1);
    view.y -= mouseY * (ratio - 1);
    view.scale = nextScale;
    apply();
  };
  const onDown = (e) => {
    if (e.button !== 0) return;
    view.dragging = true;
    view.startX = e.clientX - view.x;
    view.startY = e.clientY - view.y;
    stage.classList.add('dragging');
    svg.classList.add('dragging');
  };
  const onMove = (e) => {
    if (!view.dragging) return;
    view.x = e.clientX - view.startX;
    view.y = e.clientY - view.startY;
    apply();
  };
  const onUp = () => {
    view.dragging = false;
    stage.classList.remove('dragging');
    svg.classList.remove('dragging');
  };

  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  stage.addEventListener('dblclick', reset);
  if (resetBtn) resetBtn.onclick = reset;
  apply();

  STATE.diagramCleanup = () => {
    stage.removeEventListener('wheel', onWheel);
    stage.removeEventListener('mousedown', onDown);
    stage.removeEventListener('dblclick', reset);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    if (resetBtn) resetBtn.onclick = null;
  };
}

function renderProcessStrip() {
  const row = $('process-strip');
  row.innerHTML = STEP_LABELS.map((label, index) => `
    <button type="button" class="process-chip ${STATE.activeStep === index ? 'active' : ''}" data-step="${index}">
      ${index + 1}. ${label}
    </button>
  `).join('');
  row.querySelectorAll('.process-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      STATE.activeStep = Number(btn.dataset.step);
      renderStepExplain();
    });
  });
}

function buildParamChips() {
  const meta = MODEL_META[STATE.activeModel];
  return meta.params.map((item) => {
    const value = STATE.params[item.key];
    const unit = item.unit ? ` ${item.unit}` : '';
    return `<div class="param-chip">${item.label}：${formatNumber(value)}${unit}</div>`;
  }).join('');
}

function getInitialComputedMetrics() {
  const p = STATE.params;
  if (STATE.activeModel === 'positive_feedback') {
    const r1 = p.li0 * p.c1;
    const li1 = p.li0 + p.dt * r1;
    return {
      rateA: ['初始速率 R1(0)', r1, '亿人次/年'],
      updateA: ['一步更新后 LI(1)', li1, '亿人次'],
    };
  }
  if (STATE.activeModel === 'negative_feedback') {
    const x = p.y - p.d0;
    const r1 = x / p.w;
    const d1 = p.d0 + p.dt * r1;
    return {
      rateA: ['初始差额 X(0)', x, '件'],
      rateB: ['初始订货速度 R1(0)', r1, '件/周'],
      updateA: ['一步更新后 D(1)', d1, '件'],
    };
  }
  const d = p.y - p.q0;
  const r1 = d / p.z;
  const r2 = p.m0 / p.w;
  const m1 = p.m0 + p.dt * (r1 - r2);
  const q1 = p.q0 + p.dt * r2;
  return {
    rateA: ['初始供需差 D(0)', d, '人'],
    rateB: ['初始招生人数 R1(0)', r1, '人/年'],
    rateC: ['初始毕业人数 R2(0)', r2, '人/年'],
    updateA: ['一步更新后 M(1)', m1, '人'],
    updateB: ['一步更新后 Q(1)', q1, '人'],
  };
}

function metricGridHtml(items) {
  return `
    <div class="step-metrics">
      ${items.map(([label, value, unit]) => `
        <div class="step-metric">
          <span>${label}</span>
          <strong>${formatNumber(value)}</strong>
          <div class="kpi-unit">${unit || ''}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function getStepContent() {
  const meta = MODEL_META[STATE.activeModel];
  const guide = STEP_GUIDE[STATE.activeModel];
  const s = STATE.result?.summary || {};
  const insight = STATE.result?.insight || {};
  const metrics = getInitialComputedMetrics();
  const structure = guide.structure;

  const structureCard = `
    <div class="step-card">
      <h3>① 识别系统结构</h3>
      <p>${structure.summary}</p>
      <ul>
        <li><strong>水准变量：</strong>${structure.stocks.join('；')}</li>
        <li><strong>速率变量：</strong>${structure.rates.join('；')}</li>
        <li><strong>辅助变量：</strong>${structure.aux.join('；')}</li>
        <li><strong>常量参数：</strong>${structure.constants.join('；')}</li>
      </ul>
    </div>
  `;

  const equationCard = `
    <div class="step-card">
      <h3>② 方程配置</h3>
      <p>先确定库存、流量与辅助变量的对应关系，再写出 DYNAMO 方程组。下面展示当前例题的方程形式与正在使用的参数组。</p>
      <div class="equation-list">
        ${meta.equations.map((eq) => `<div class="equation-item">\\(${eq}\\)</div>`).join('')}
      </div>
      <div class="inline-note">当前参数：${Object.entries(STATE.params).map(([key, value]) => {
        const item = getParamMeta(key);
        const label = item?.label || key;
        const unit = item?.unit ? ` ${item.unit}` : '';
        return `${label}=${formatNumber(value)}${unit}`;
      }).join('，')}</div>
    </div>
  `;

  const rateCard = `
    <div class="step-card">
      <h3>③ 速率计算</h3>
      <p><strong>当前速率逻辑：</strong>\\(${guide.rateFormula}\\)</p>
      ${metricGridHtml(Object.values(metrics).filter((item, index) => index < (STATE.activeModel === 'second_order' ? 3 : STATE.activeModel === 'negative_feedback' ? 2 : 1)))}
      <div class="inline-note">速率方程决定“此刻变化有多快”，正反馈决定加速增长，负反馈决定偏差修正，二阶系统则体现延迟与耦合。</div>
    </div>
  `;

  const updateItems = Object.entries(metrics)
    .filter(([key]) => key.startsWith('update'))
    .map(([, value]) => value);

  const levelCard = `
    <div class="step-card">
      <h3>④ 水准更新</h3>
      <p><strong>当前离散积分关系：</strong>\\(${guide.levelFormula}\\)</p>
      ${metricGridHtml(updateItems)}
      <ul>
        ${meta.step_notes.map((text) => `<li>${text}</li>`).join('')}
      </ul>
      <div class="inline-note">课堂上可强调：水准变量不是直接跳变，而是通过速率在 DT 时间步上逐次累积更新。</div>
    </div>
  `;

  const responseCards = `
    <div class="step-card">
      <h3>⑤ 响应判读</h3>
      <p>${insight.narrative || '正在根据当前参数计算动态响应...'}</p>
      <div class="step-metrics">
        <div class="step-metric"><span>稳定性判别</span><strong>${s.stability || '--'}</strong><div class="kpi-unit">结构特征</div></div>
        <div class="step-metric"><span>末期值</span><strong>${formatNumber(s.final)}</strong><div class="kpi-unit">主变量</div></div>
        <div class="step-metric"><span>变化量</span><strong>${formatNumber(s.delta)}</strong><div class="kpi-unit">相对初始</div></div>
        <div class="step-metric"><span>倍率 / 峰值</span><strong>${formatNumber(s.ratio ?? s.max)}</strong><div class="kpi-unit">用于教学判读</div></div>
      </div>
      <div class="inline-note">${insight.risk_tip || '通过改变参数，可以观察放大、收敛、过冲和振荡等不同动态行为。'}</div>
    </div>
  `;

  return [
    {
      title: '模型识别',
      description: '先分清系统里哪些是库存、哪些是流量、哪些是辅助逻辑，这是理解系统动力学的第一步。',
      html: structureCard,
    },
    {
      title: '方程配置',
      description: '用 DYNAMO 的 L、R、A、N、C 标记把结构翻译成可计算方程组，并与当前参数绑定。',
      html: equationCard,
    },
    {
      title: '速率计算',
      description: '速率方程回答“这一时刻系统变化多快”，它直接决定库存下一步将朝哪个方向、以什么速度演化。',
      html: rateCard,
    },
    {
      title: '水准更新',
      description: '系统动力学中的库存更新本质上是离散积分。理解这一步，才能看懂动态曲线如何一步步生成。',
      html: levelCard,
    },
    {
      title: '响应判读',
      description: '结合曲线、关键指标与系统结构，判断当前参数下属于放大、收敛、超调还是振荡。',
      html: responseCards,
    },
  ];
}

function renderStepExplain() {
  renderProcessStrip();
  const steps = getStepContent();
  const current = steps[STATE.activeStep];
  $('step-headline').innerHTML = `
    <h3>${STATE.activeStep + 1}. ${current.title}</h3>
    <p>${current.description}</p>
  `;
  $('step-explainer').innerHTML = current.html;
  typesetMath();
}

function renderCode() {
  $('code-badge').textContent = `${STATE.activeModel} / solver`;
  $('code-block').textContent = CODE_BLOCKS[STATE.activeModel];
}

function updateSmartTip() {
  const modelId = STATE.activeModel;
  const p = STATE.params;
  let html = '<strong>智能提醒：</strong>';
  if (modelId === 'positive_feedback') {
    html += p.c1 >= 0.07
      ? '当前年增长率较高，曲线后段会迅速陡升，建议缩短仿真时长或配合对数坐标讲解。'
      : '当前参数适合观察正反馈的放大趋势，曲线增长不会过于激烈。';
  } else if (modelId === 'negative_feedback') {
    const ratio = p.dt / p.w;
    html += ratio >= 1
      ? `DT/W = ${ratio.toFixed(2)}，离散系统可能出现过冲或锯齿波动。`
      : `DT/W = ${ratio.toFixed(2)}，库存将表现为较平稳的单调收敛。`;
  } else {
    html += p.z < p.w
      ? '当前 Z < W，扩招响应快于毕业释放，系统更容易出现峰值和波动。'
      : '当前 Z 与 W 接近或更大，双库存耦合趋于平稳，适合展示缓和收敛。';
  }
  $('smart-tip').innerHTML = html;
}

function debouncedSimulation() {
  clearTimeout(STATE.debounceTimer);
  STATE.debounceTimer = setTimeout(requestSimulation, 180);
}

async function requestSimulation() {
  const modelId = STATE.activeModel;
  const response = await fetch(`/api/model/${modelId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(STATE.params),
  });
  const data = await response.json();
  STATE.result = data;
  STATE.params = { ...data.params };
  renderInsight(data);
  renderKpis(data);
  renderCharts(data);
  renderTable(data);
  renderStepExplain();
}

function renderInsight(data) {
  const insight = data.insight;
  $('insight-banner').innerHTML = `
    <h3>${insight.headline}</h3>
    <p>${insight.narrative}</p>
    <div class="insight-warning">${insight.risk_tip}</div>
  `;
}

function kpiCard(label, value, unit = '') {
  const displayValue = typeof value === 'string' ? value : formatNumber(value);
  return `
    <div class="kpi-card">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${displayValue}</div>
      <div class="kpi-unit">${unit}</div>
    </div>
  `;
}

function renderKpis(data) {
  const s = data.summary;
  const modelId = STATE.activeModel;
  let cards = [
    kpiCard('初始值', s.initial, ''),
    kpiCard('末期值', s.final, ''),
    kpiCard('变化量', s.delta, ''),
    kpiCard('稳定性判别', s.stability, ''),
  ];
  if (modelId === 'positive_feedback') {
    cards = [
      kpiCard('初始客运量', s.initial, '亿人次'),
      kpiCard('末期客运量', s.final, '亿人次'),
      kpiCard('增长倍数', s.ratio, '倍'),
      kpiCard(data.summary.final_rate_label, data.summary.final_rate, data.summary.final_rate_unit),
    ];
  }
  if (modelId === 'negative_feedback') {
    cards = [
      kpiCard('初始库存', s.initial, '件'),
      kpiCard('末期库存', s.final, '件'),
      kpiCard('收敛时间', s.convergence_time ?? '未进入±5%', '周'),
      kpiCard(data.summary.final_gap_label, data.summary.final_gap, data.summary.final_gap_unit),
    ];
  }
  if (modelId === 'second_order') {
    cards = [
      kpiCard('初始人才量', s.initial, '人'),
      kpiCard('末期人才量', s.final, '人'),
      kpiCard(data.summary.peak_q_label, data.summary.peak_q, data.summary.peak_q_unit),
      kpiCard('峰值时刻', data.summary.peak_q_time, '年'),
    ];
  }
  $('kpi-grid').innerHTML = cards.join('');
}

function chartBaseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { usePointStyle: true, boxWidth: 10, padding: 14 } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)}` } },
    },
    scales: {
      x: { grid: { color: 'rgba(148,163,184,0.12)' }, ticks: { maxTicksLimit: 8 } },
      y: { grid: { color: 'rgba(148,163,184,0.12)' }, beginAtZero: true },
    },
  };
}

function buildPrimarySecondaryDatasets(data) {
  const modelId = STATE.activeModel;
  const palette = PALETTE[modelId];
  const t = data.time;
  let primary = { labels: t, datasets: [] };
  let secondary = { labels: t, datasets: [] };

  if (modelId === 'positive_feedback') {
    primary.datasets = [{
      label: '客运量 LI',
      data: data.series.LI,
      borderColor: palette.primary,
      backgroundColor: palette.soft,
      tension: 0.26,
      fill: true,
    }];
    secondary.datasets = [{
      label: '年增加量 R1',
      data: data.series.R1,
      borderColor: palette.secondary,
      backgroundColor: 'rgba(6,182,212,0.08)',
      tension: 0.24,
      fill: true,
    }];
    $('primary-chart-label').textContent = '客运量主曲线';
    $('secondary-chart-label').textContent = '年增加量响应';
  }

  if (modelId === 'negative_feedback') {
    primary.datasets = [
      {
        label: '库存量 D',
        data: data.series.D,
        borderColor: palette.primary,
        backgroundColor: palette.soft,
        tension: 0.24,
        fill: true,
      },
      {
        label: '目标库存 Y',
        data: data.time.map(() => STATE.params.y),
        borderColor: '#334155',
        borderDash: [7, 5],
        pointRadius: 0,
        tension: 0,
        fill: false,
      },
    ];
    secondary.datasets = [
      { label: '库存差额 X', data: data.series.X, borderColor: palette.secondary, tension: 0.25, fill: false },
      { label: '订货速度 R1', data: data.series.R1, borderColor: palette.accent, tension: 0.25, fill: false },
    ];
    $('primary-chart-label').textContent = '库存收敛曲线';
    $('secondary-chart-label').textContent = '差额与订货速度';
  }

  if (modelId === 'second_order') {
    primary.datasets = [
      {
        label: '人才拥有量 Q',
        data: data.series.Q,
        borderColor: palette.primary,
        backgroundColor: palette.soft,
        tension: 0.24,
        fill: true,
      },
      {
        label: '在校学生 M',
        data: data.series.M,
        borderColor: palette.secondary,
        tension: 0.24,
        fill: false,
      },
      {
        label: '目标人才量 Y',
        data: data.time.map(() => STATE.params.y),
        borderColor: '#334155',
        borderDash: [7, 5],
        pointRadius: 0,
        tension: 0,
        fill: false,
      },
    ];
    secondary.datasets = [
      { label: '供需差 D', data: data.series.D, borderColor: palette.accent, tension: 0.25 },
      { label: '招生人数 R1', data: data.series.R1, borderColor: '#0ea5e9', tension: 0.25 },
      { label: '毕业人数 R2', data: data.series.R2, borderColor: '#f97316', tension: 0.25 },
    ];
    $('primary-chart-label').textContent = 'Q / M 双库存联动';
    $('secondary-chart-label').textContent = '供需差与流量响应';
  }

  return { primary, secondary };
}

function renderCharts(data) {
  const { primary, secondary } = buildPrimarySecondaryDatasets(data);
  if (STATE.primaryChart) STATE.primaryChart.destroy();
  if (STATE.secondaryChart) STATE.secondaryChart.destroy();

  STATE.primaryChart = new Chart($('primary-chart'), {
    type: 'line',
    data: primary,
    options: chartBaseOptions(),
  });
  STATE.secondaryChart = new Chart($('secondary-chart'), {
    type: 'line',
    data: secondary,
    options: chartBaseOptions(),
  });
}

function sampleRows(rows, maxRows = 18) {
  if (!rows || rows.length <= maxRows) return rows;
  const sampled = [];
  const step = (rows.length - 1) / (maxRows - 1);
  for (let i = 0; i < maxRows; i += 1) {
    sampled.push(rows[Math.round(i * step)]);
  }
  const map = new Map(sampled.map((row) => [row.t, row]));
  return Array.from(map.values());
}

function renderTable(data) {
  const rows = sampleRows(data.rows, 18);
  const keys = Object.keys(rows[0] || {});
  const table = $('result-table');
  table.innerHTML = `
    <thead><tr>${keys.map((k) => `<th>${k}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((row) => `<tr>${keys.map((k) => `<td>${formatNumber(row[k])}</td>`).join('')}</tr>`).join('')}
    </tbody>
  `;
}

function exportCsv() {
  if (!STATE.result) return;
  const rows = STATE.result.rows;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')]
    .concat(rows.map((row) => headers.map((h) => row[h]).join(',')))
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${STATE.activeModel}_simulation.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function bindTabs() {
  document.querySelectorAll('.top-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.top-tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

async function renderOverview() {
  const response = await fetch('/api/overview');
  const cards = await response.json();
  $('overview-cards').innerHTML = cards.map((card) => {
    const s = card.summary;
    const targetText = s.target !== null && s.target !== undefined ? `目标：${formatNumber(s.target)}` : '无固定目标';
    return `
      <div class="overview-item">
        <h3>${card.name}</h3>
        <p><strong>${card.feedback_type}</strong> · ${card.headline}</p>
        <div class="overview-kpis">
          <div class="mini-kpi"><span>初始</span><strong>${formatNumber(s.initial)}</strong></div>
          <div class="mini-kpi"><span>末期</span><strong>${formatNumber(s.final)}</strong></div>
          <div class="mini-kpi"><span>倍率</span><strong>${s.ratio ? formatNumber(s.ratio) : '--'}</strong></div>
          <div class="mini-kpi"><span>结构判别</span><strong>${s.stability}</strong></div>
        </div>
        <p style="margin-top:12px;">${targetText}</p>
      </div>
    `;
  }).join('');

  const labels = cards.map((card) => card.short_name);
  const values = cards.map((card) => card.summary.ratio || 1);
  if (STATE.compareChart) STATE.compareChart.destroy();
  STATE.compareChart = new Chart($('compare-chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '末期值 / 初始值',
        data: values,
        backgroundColor: ['rgba(37,99,235,0.7)', 'rgba(22,163,74,0.7)', 'rgba(124,58,237,0.7)'],
        borderRadius: 12,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.12)' } },
      },
    },
  });
}

function bindButtons() {
  $('run-btn').addEventListener('click', requestSimulation);
  $('reset-btn').addEventListener('click', () => switchModel(STATE.activeModel));
  $('export-btn').addEventListener('click', exportCsv);
}

function init() {
  bindTabs();
  bindButtons();
  switchModel(STATE.activeModel);
  renderOverview();
}

document.addEventListener('DOMContentLoaded', init);
