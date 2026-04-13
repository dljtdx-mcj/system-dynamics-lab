(() => {
  if (!window.APP_CONFIG || !window.APP_CONFIG.models) {
    document.body.innerHTML = `
      <div style="padding:40px;font-family:'Segoe UI','Microsoft YaHei',sans-serif;">
        <h2>数据未加载</h2>
        <p>请确认 <span class="mono">data.js</span> 文件存在，且位于仓库根目录。</p>
      </div>
    `;
    return;
  }

  const state = {
    modelIndex: 0,
    params: {},
    result: null,
    primaryChart: null,
    secondaryChart: null,
    compareChart: null,
    stepIndex: 0,
    diagramTransform: { x: 0, y: 0, scale: 1 },
    drag: { active: false, startX: 0, startY: 0, origX: 0, origY: 0 }
  };

  const dom = {
    tabs: [...document.querySelectorAll('.top-tab')],
    panels: [...document.querySelectorAll('.tab-panel')],
    modelSwitcher: document.getElementById('model-switcher'),
    modelMetaCard: document.getElementById('model-meta-card'),
    presetRow: document.getElementById('preset-row'),
    paramForm: document.getElementById('param-form'),
    runBtn: document.getElementById('run-btn'),
    resetBtn: document.getElementById('reset-btn'),
    exportBtn: document.getElementById('export-btn'),
    smartTip: document.getElementById('smart-tip'),
    feedbackChip: document.getElementById('feedback-chip'),
    equationList: document.getElementById('equation-list'),
    insightBanner: document.getElementById('insight-banner'),
    kpiGrid: document.getElementById('kpi-grid'),
    resultTable: document.getElementById('result-table'),
    primaryChartCanvas: document.getElementById('primary-chart'),
    secondaryChartCanvas: document.getElementById('secondary-chart'),
    primaryChartLabel: document.getElementById('primary-chart-label'),
    secondaryChartLabel: document.getElementById('secondary-chart-label'),
    processStrip: document.getElementById('process-strip'),
    stepHeadline: document.getElementById('step-headline'),
    stepExplainer: document.getElementById('step-explainer'),
    codeBlock: document.getElementById('code-block'),
    codeBadge: document.getElementById('code-badge'),
    overviewCards: document.getElementById('overview-cards'),
    compareChartCanvas: document.getElementById('compare-chart'),
    diagramStage: document.getElementById('diagram-stage'),
    diagramContainer: document.getElementById('diagram-container'),
    diagramResetBtn: document.getElementById('diagram-reset-btn')
  };

  const models = window.APP_CONFIG.models;

  function currentModel() {
    return models[state.modelIndex];
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function round(value, digits = 3) {
    return Number.isFinite(value) ? Number(value.toFixed(digits)) : value;
  }

  function fmt(value, digits = 2) {
    if (!Number.isFinite(value)) return '-';
    return Number(value).toLocaleString('zh-CN', {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function resetParamsForModel() {
    const model = currentModel();
    state.params[model.id] = {};
    model.params.forEach(p => {
      state.params[model.id][p.key] = p.value;
    });
  }

  function getParams() {
    const model = currentModel();
    return state.params[model.id];
  }

  function initState() {
    models.forEach((_, idx) => {
      state.modelIndex = idx;
      resetParamsForModel();
    });
    state.modelIndex = 0;
  }

  function bindTabs() {
    dom.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const key = tab.dataset.tab;
        dom.tabs.forEach(t => t.classList.toggle('active', t === tab));
        dom.panels.forEach(panel => panel.classList.toggle('active', panel.id === `tab-${key}`));
        if (key === 'analysis') renderAnalysis();
        if (key === 'source') renderCode();
        if (window.MathJax?.typesetPromise) {
          window.MathJax.typesetPromise().catch(() => {});
        }
      });
    });
  }

  function renderModelSwitcher() {
    dom.modelSwitcher.innerHTML = models.map((m, idx) => `
      <button class="model-card-btn ${idx === state.modelIndex ? 'active' : ''}" data-model-index="${idx}">
        <h3>${m.name}</h3>
        <p>${m.description}</p>
        <div class="model-card-meta">${m.feedbackType} · ${m.shortTag}</div>
      </button>
    `).join('');

    [...dom.modelSwitcher.querySelectorAll('.model-card-btn')].forEach(btn => {
      btn.addEventListener('click', () => {
        state.modelIndex = Number(btn.dataset.modelIndex);
        state.stepIndex = 0;
        if (!state.params[currentModel().id]) resetParamsForModel();
        rerenderAll();
      });
    });
  }

  function renderMeta() {
    const model = currentModel();
    dom.modelMetaCard.innerHTML = `
      <h3>${model.name}</h3>
      <p>${model.description}</p>
      <p style="margin-top:10px;"><strong>教材映射：</strong>${model.sourceHint}</p>
    `;

    dom.presetRow.innerHTML = model.presets.map(p => `
      <span class="preset-chip">${p.key}：${p.text}</span>
    `).join('');

    dom.feedbackChip.textContent = model.feedbackType;
  }

  function renderParamForm() {
    const model = currentModel();
    const params = getParams();

    dom.paramForm.innerHTML = model.params.map(p => `
      <div class="param-item">
        <div class="param-top">
          <div>
            <div class="param-label">${p.label}</div>
            <div class="param-desc">${p.desc}</div>
          </div>
          <div class="param-value-wrap">
            <input class="param-number" type="number"
                   data-key="${p.key}" data-role="number"
                   min="${p.min}" max="${p.max}" step="${p.step}"
                   value="${params[p.key]}" />
          </div>
        </div>
        <input type="range"
               data-key="${p.key}" data-role="range"
               min="${p.min}" max="${p.max}" step="${p.step}"
               value="${params[p.key]}" />
        <div class="param-range-meta">
          <span>最小：${p.min}</span>
          <span>最大：${p.max}</span>
        </div>
      </div>
    `).join('');

    [...dom.paramForm.querySelectorAll('input')].forEach(input => {
      input.addEventListener('input', () => {
        const key = input.dataset.key;
        const val = Number(input.value);
        params[key] = val;

        dom.paramForm.querySelectorAll(`[data-key="${key}"]`).forEach(el => {
          if (el !== input) el.value = val;
        });
      });
    });
  }

  function simulate(model, params) {
    if (model.id === 'positive_feedback') {
      return simulatePositive(params);
    }
    if (model.id === 'negative_feedback') {
      return simulateNegative(params);
    }
    return simulateSecondOrder(params);
  }

  function simulatePositive(params) {
    const steps = Math.max(1, Math.round(params.steps));
    const DT = Number(params.DT);
    const C1 = Number(params.C1);

    let L1 = Number(params.L1);

    const rows = [];
    for (let k = 0; k <= steps; k++) {
      const R1 = L1 * C1;
      rows.push({
        t: k,
        L1: round(L1, 4),
        R1: round(R1, 4)
      });
      L1 = L1 + DT * R1;
    }

    return {
      time: rows.map(r => r.t),
      rows,
      primaryKey: 'L1',
      secondaryKeys: ['R1']
    };
  }

  function simulateNegative(params) {
    const steps = Math.max(1, Math.round(params.steps));
    const DT = Number(params.DT);
    const W = Number(params.W);
    const Y = Number(params.Y);

    let D = Number(params.D);

    const rows = [];
    for (let k = 0; k <= steps; k++) {
      const X = Y - D;
      const R1 = X / W;
      rows.push({
        t: k,
        D: round(D, 4),
        X: round(X, 4),
        R1: round(R1, 4)
      });
      D = D + DT * R1;
    }

    return {
      time: rows.map(r => r.t),
      rows,
      primaryKey: 'D',
      secondaryKeys: ['R1', 'X']
    };
  }

  function simulateSecondOrder(params) {
    const steps = Math.max(1, Math.round(params.steps));
    const DT = Number(params.DT);
    const Z = Number(params.Z);
    const W = Number(params.W);
    const Y = Number(params.Y);

    let M = Number(params.M);
    let Q = Number(params.Q);

    const rows = [];
    for (let k = 0; k <= steps; k++) {
      const D = Y - Q;
      const R1 = D / Z;
      const R2 = M / W;

      rows.push({
        t: k,
        M: round(M, 4),
        Q: round(Q, 4),
        D: round(D, 4),
        R1: round(R1, 4),
        R2: round(R2, 4)
      });

      const nextM = M + DT * (R1 - R2);
      const nextQ = Q + DT * R2;

      M = nextM;
      Q = nextQ;
    }

    return {
      time: rows.map(r => r.t),
      rows,
      primaryKey: 'Q',
      secondaryKeys: ['M', 'R1', 'R2', 'D']
    };
  }

  function buildSmartTip(result) {
    const model = currentModel();
    const rows = result.rows;
    const first = rows[0];
    const last = rows[rows.length - 1];
    let text = '';

    if (model.id === 'positive_feedback') {
      const ratio = last.L1 / first.L1;
      text = `智能提示：当前参数下，客运量从 ${fmt(first.L1, 2)} 增长到 ${fmt(last.L1, 2)}，放大倍数约 ${fmt(ratio, 2)}。若继续增大增长率 C1 或步长 DT，指数增长会更明显。`;
    } else if (model.id === 'negative_feedback') {
      const gapAbs = Math.abs(last.X);
      text = `智能提示：系统末期库存为 ${fmt(last.D, 2)}，距离目标库存的偏差约 ${fmt(gapAbs, 2)}。若希望更快收敛，可减小调整时间 W；但过小可能导致响应过快。`;
    } else {
      const diff = Math.abs(last.D);
      text = `智能提示：系统末期人才拥有量为 ${fmt(last.Q, 2)}，供需差约 ${fmt(diff, 2)}。较小的 Z 会强化招生响应，较小的 W 会加快毕业转化，系统可能出现更强超调。`;
    }
    dom.smartTip.textContent = text;
  }

  function buildInsightBanner(result) {
    const model = currentModel();
    const rows = result.rows;
    const first = rows[0];
    const last = rows[rows.length - 1];

    let html = '';
    if (model.id === 'positive_feedback') {
      html = `当前系统呈现 <strong>单库存正反馈放大</strong>：主变量 <strong>${model.primaryVar}</strong> 从 <strong>${fmt(first.L1, 2)}</strong> 增长到 <strong>${fmt(last.L1, 2)}</strong>，增长流量随库存同步放大。`;
    } else if (model.id === 'negative_feedback') {
      html = `当前系统呈现 <strong>目标驱动型负反馈收敛</strong>：库存 <strong>D</strong> 从 <strong>${fmt(first.D, 2)}</strong> 逐步逼近目标值 <strong>${fmt(getParams().Y, 2)}</strong>。`;
    } else {
      html = `当前系统呈现 <strong>二阶耦合负反馈</strong>：在校学生与人才拥有量双库存联动，常伴随 <strong>超调 + 调整 + 逐步收敛</strong> 的过程。`;
    }
    dom.insightBanner.innerHTML = html;
  }

  function renderEquations() {
    const model = currentModel();
    dom.equationList.innerHTML = model.equations.map(eq => `
      <div class="equation-item">
        <div class="equation-item-title">${eq.title}</div>
        <div>\\(${eq.latex}\\)</div>
      </div>
    `).join('');
  }

  function renderKPIs(result) {
    const model = currentModel();
    const rows = result.rows;
    const first = rows[0];
    const last = rows[rows.length - 1];

    const kpis = [];
    if (model.id === 'positive_feedback') {
      kpis.push(
        ['初始主变量', fmt(first.L1, 2)],
        ['末期主变量', fmt(last.L1, 2)],
        ['末期增长流量', fmt(last.R1, 2)],
        ['放大倍数', fmt(last.L1 / first.L1, 2)]
      );
    } else if (model.id === 'negative_feedback') {
      kpis.push(
        ['初始库存', fmt(first.D, 2)],
        ['末期库存', fmt(last.D, 2)],
        ['末期差额', fmt(last.X, 2)],
        ['末期订货速度', fmt(last.R1, 2)]
      );
    } else {
      kpis.push(
        ['末期人才量 Q', fmt(last.Q, 2)],
        ['末期在校学生 M', fmt(last.M, 2)],
        ['末期供需差 D', fmt(last.D, 2)],
        ['末期毕业率 R2', fmt(last.R2, 2)]
      );
    }

    dom.kpiGrid.innerHTML = kpis.map(([label, value]) => `
      <div class="kpi-card">
        <div class="kpi-label">${label}</div>
        <div class="kpi-value">${value}</div>
      </div>
    `).join('');
  }

  function destroyCharts() {
    state.primaryChart?.destroy();
    state.secondaryChart?.destroy();
    state.compareChart?.destroy();
    state.primaryChart = null;
    state.secondaryChart = null;
    state.compareChart = null;
  }

  function renderCharts(result) {
    state.primaryChart?.destroy();
    state.secondaryChart?.destroy();

    const model = currentModel();
    const labels = result.time;

    let primaryDataset = [];
    let secondaryDatasets = [];

    if (model.id === 'positive_feedback') {
      primaryDataset = result.rows.map(r => r.L1);
      secondaryDatasets = [
        { label: 'R1 年增加量', data: result.rows.map(r => r.R1) }
      ];
      dom.primaryChartLabel.textContent = '客运量 L1';
      dom.secondaryChartLabel.textContent = '年增加量 R1';
    } else if (model.id === 'negative_feedback') {
      primaryDataset = result.rows.map(r => r.D);
      secondaryDatasets = [
        { label: 'R1 订货速度', data: result.rows.map(r => r.R1) },
        { label: 'X 库存差额', data: result.rows.map(r => r.X) }
      ];
      dom.primaryChartLabel.textContent = '库存量 D';
      dom.secondaryChartLabel.textContent = '订货速度 / 库存差额';
    } else {
      primaryDataset = result.rows.map(r => r.Q);
      secondaryDatasets = [
        { label: 'M 在校学生', data: result.rows.map(r => r.M) },
        { label: 'R1 招生率', data: result.rows.map(r => r.R1) },
        { label: 'R2 毕业率', data: result.rows.map(r => r.R2) },
        { label: 'D 供需差', data: result.rows.map(r => r.D) }
      ];
      dom.primaryChartLabel.textContent = '人才拥有量 Q';
      dom.secondaryChartLabel.textContent = 'M / R1 / R2 / D';
    }

    state.primaryChart = new Chart(dom.primaryChartCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `${model.primaryVar} 主变量`,
          data: primaryDataset,
          borderWidth: 3,
          tension: 0.28,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true } }
      }
    });

    state.secondaryChart = new Chart(dom.secondaryChartCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: secondaryDatasets.map(ds => ({
          ...ds,
          borderWidth: 2,
          tension: 0.25,
          fill: false
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true } }
      }
    });
  }

  function renderTable(result) {
    const rows = result.rows;
    const keys = Object.keys(rows[0]);

    dom.resultTable.innerHTML = `
      <thead>
        <tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            ${keys.map(k => `<td>${fmt(r[k], 4)}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    `;
  }

  function renderSteps() {
    const model = currentModel();
    const steps = model.stepsGuide;

    dom.processStrip.innerHTML = steps.map((s, idx) => `
      <button class="process-btn ${idx === state.stepIndex ? 'active' : ''}" data-step-index="${idx}">
        ${s.title}
      </button>
    `).join('');

    [...dom.processStrip.querySelectorAll('.process-btn')].forEach(btn => {
      btn.addEventListener('click', () => {
        state.stepIndex = Number(btn.dataset.stepIndex);
        renderSteps();
      });
    });

    const step = steps[state.stepIndex];
    dom.stepHeadline.innerHTML = `
      <h3>${step.title}</h3>
      <p>${model.name} · ${model.feedbackType} · ${model.sourceHint}</p>
    `;

    dom.stepExplainer.innerHTML = `
      <div class="step-block">
        <h4>教学说明</h4>
        <p>${step.text}</p>
      </div>
      <div class="step-block">
        <h4>本例题在这一环节的关键点</h4>
        ${step.bullets?.length
          ? `<ul>${step.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`
          : `<p>这一环节主要用于将上一环节得到的变量关系转化为可计算的离散迭代逻辑。</p>`
        }
      </div>
      <div class="step-block">
        <h4>教师讲解提示</h4>
        <p>建议结合右侧 DYNAMO 方程、流程图及主响应曲线同步讲解，从“变量含义 → 方程建立 → 每一步如何更新”三个层次逐步展开。</p>
      </div>
    `;
  }

  function renderCode() {
    const model = currentModel();
    dom.codeBadge.textContent = `${model.name} / Python solver`;
    dom.codeBlock.textContent = model.codeBlock;
  }

  function renderAnalysis() {
    const results = models.map((model, idx) => {
      const params = deepClone(state.params[model.id] || Object.fromEntries(model.params.map(p => [p.key, p.value])));
      return { model, result: simulate(model, params), idx };
    });

    dom.overviewCards.innerHTML = results.map(({ model, result }) => {
      const rows = result.rows;
      const first = rows[0];
      const last = rows[rows.length - 1];
      const primaryKey = result.primaryKey;
      const ratio = last[primaryKey] / (first[primaryKey] || 1);

      return `
        <div class="overview-card">
          <h3>${model.name}</h3>
          <p>${model.description}</p>
          <div class="overview-metric">初值：${fmt(first[primaryKey], 2)}</div>
          <div class="overview-metric">末值：${fmt(last[primaryKey], 2)}</div>
          <div class="overview-metric">末/初：${fmt(ratio, 2)}</div>
        </div>
      `;
    }).join('');

    state.compareChart?.destroy();
    state.compareChart = new Chart(dom.compareChartCanvas, {
      type: 'bar',
      data: {
        labels: results.map(r => r.model.name),
        datasets: [{
          label: '主变量末期值 / 初始值',
          data: results.map(({ result }) => {
            const rows = result.rows;
            const pk = result.primaryKey;
            return rows[rows.length - 1][pk] / (rows[0][pk] || 1);
          }),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  function exportCsv() {
    if (!state.result) return;
    const rows = state.result.rows;
    const keys = Object.keys(rows[0]);
    const csv = [
      keys.join(','),
      ...rows.map(row => keys.map(k => row[k]).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${currentModel().id}_simulation.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function createSvgDiagram(diagram) {
    const width = 860;
    const height = 480;

    const defs = `
      <defs>
        <marker id="arrowFlow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
          <path d="M0,0 L12,6 L0,12 z" fill="#334155"></path>
        </marker>
        <marker id="arrowInfo" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
          <path d="M0,0 L12,6 L0,12 z" fill="#64748b"></path>
        </marker>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#6b8bc5" flood-opacity="0.12"/>
        </filter>
      </defs>
    `;

    const nodeMap = Object.fromEntries(diagram.nodes.map(n => [n.id, n]));
    const lines = diagram.links.map(link => buildLink(link, nodeMap)).join('');
    const nodes = diagram.nodes.map(buildNode).join('');

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        ${defs}
        <rect x="0" y="0" width="${width}" height="${height}" rx="26" fill="transparent"></rect>
        ${lines}
        ${nodes}
      </svg>
    `;
  }

  function buildLink(link, nodeMap) {
    const from = nodeMap[link.from];
    const to = nodeMap[link.to];
    const x1 = from.x, y1 = from.y;
    const x2 = to.x, y2 = to.y;

    if (link.type === 'flow') {
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#334155" stroke-width="4" marker-end="url(#arrowFlow)"/>`;
    }

    if (link.type === 'flowInvisible') {
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#334155" stroke-width="4" marker-end="url(#arrowFlow)" opacity="0.8"/>`;
    }

    const bend = link.bend ?? 0;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2 + bend;
    return `
      <path d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}"
            fill="none"
            stroke="#64748b"
            stroke-width="2.2"
            stroke-dasharray="6 6"
            marker-end="url(#arrowInfo)"/>
    `;
  }

  function buildNode(node) {
    if (node.type === 'stock') {
      return `
        <g filter="url(#softShadow)">
          <rect x="${node.x - 55}" y="${node.y - 28}" width="110" height="56" rx="14"
                fill="#e8f0ff" stroke="#7aa2ff" stroke-width="2"/>
          ${multiLineText(node.label, node.x, node.y - 4, '#183b72', true)}
        </g>
      `;
    }

    if (node.type === 'aux') {
      return `
        <g filter="url(#softShadow)">
          <circle cx="${node.x}" cy="${node.y}" r="34" fill="#eef7ff" stroke="#8acdb4" stroke-width="2"/>
          ${multiLineText(node.label, node.x, node.y - 4, '#224d65', true)}
        </g>
      `;
    }

    if (node.type === 'valve') {
      return `
        <g>
          <polygon points="${node.x-14},${node.y} ${node.x},${node.y-14} ${node.x+14},${node.y} ${node.x},${node.y+14}"
                   fill="#334155"/>
          <text x="${node.x}" y="${node.y - 22}" text-anchor="middle" font-size="14" font-weight="800" fill="#334155">${node.label}</text>
        </g>
      `;
    }

    return `
      <g>
        <path d="M ${node.x-25} ${node.y} C ${node.x-40} ${node.y-20}, ${node.x-8} ${node.y-34}, ${node.x+8} ${node.y-16}
                 C ${node.x+32} ${node.y-18}, ${node.x+36} ${node.y+16}, ${node.x+12} ${node.y+24}
                 C ${node.x-2} ${node.y+40}, ${node.x-38} ${node.y+22}, ${node.x-25} ${node.y}"
              fill="#f2f6fb" stroke="#8292ab" stroke-width="2"/>
        <text x="${node.x}" y="${node.y + 42}" text-anchor="middle" font-size="13" fill="#64748b">${node.label}</text>
      </g>
    `;
  }

  function multiLineText(label, x, y, color, bold = false) {
    const parts = String(label).split('\\n');
    return `
      <text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-size="13" font-weight="${bold ? 800 : 600}">
        ${parts.map((p, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : 16}">${p}</tspan>`).join('')}
      </text>
    `;
  }

  function applyDiagramTransform() {
    const { x, y, scale } = state.diagramTransform;
    dom.diagramContainer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  function resetDiagramTransform() {
    state.diagramTransform = { x: 0, y: 0, scale: 1 };
    applyDiagramTransform();
  }

  function renderDiagram() {
    const model = currentModel();
    dom.diagramContainer.innerHTML = createSvgDiagram(model.diagram);
    resetDiagramTransform();
  }

  function bindDiagramInteraction() {
    dom.diagramStage.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      state.diagramTransform.scale = Math.min(2.8, Math.max(0.55, state.diagramTransform.scale + delta));
      applyDiagramTransform();
    }, { passive: false });

    dom.diagramStage.addEventListener('mousedown', e => {
      state.drag.active = true;
      state.drag.startX = e.clientX;
      state.drag.startY = e.clientY;
      state.drag.origX = state.diagramTransform.x;
      state.drag.origY = state.diagramTransform.y;
      dom.diagramStage.classList.add('dragging');
    });

    window.addEventListener('mousemove', e => {
      if (!state.drag.active) return;
      const dx = e.clientX - state.drag.startX;
      const dy = e.clientY - state.drag.startY;
      state.diagramTransform.x = state.drag.origX + dx;
      state.diagramTransform.y = state.drag.origY + dy;
      applyDiagramTransform();
    });

    window.addEventListener('mouseup', () => {
      state.drag.active = false;
      dom.diagramStage.classList.remove('dragging');
    });

    dom.diagramStage.addEventListener('dblclick', resetDiagramTransform);
    dom.diagramResetBtn.addEventListener('click', resetDiagramTransform);
  }

  function renderResult() {
    const model = currentModel();
    const params = deepClone(getParams());
    state.result = simulate(model, params);

    buildSmartTip(state.result);
    buildInsightBanner(state.result);
    renderEquations();
    renderKPIs(state.result);
    renderCharts(state.result);
    renderTable(state.result);
    renderDiagram();
    renderSteps();
    renderCode();

    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise().catch(() => {});
    }
  }

  function rerenderAll() {
    renderModelSwitcher();
    renderMeta();
    renderParamForm();
    renderResult();
    renderAnalysis();
  }

  function bindActions() {
    dom.runBtn.addEventListener('click', () => renderResult());
    dom.resetBtn.addEventListener('click', () => {
      resetParamsForModel();
      rerenderAll();
    });
    dom.exportBtn.addEventListener('click', exportCsv);
  }

  initState();
  bindTabs();
  bindActions();
  bindDiagramInteraction();
  rerenderAll();
})();
