window.APP_CONFIG = {
  defaultDt: 1,
  defaultSteps: 20,
  stepLabels: ['模型识别', '方程配置', '速率计算', '水准更新', '响应判读'],

  models: [
    {
      id: 'positive_feedback',
      theme: 'positive',
      name: '一阶正反馈',
      shortTag: '增长系统',
      feedbackType: '正反馈',
      description: '客运量 L1 与客运量年增加量 R1 构成一阶正反馈回路。水准变量越大，速率变量越大，系统呈指数增长。',
      sourceHint: '教材例题 5-5：铁路客运量系统',
      summary: '水准变量 L1 通过速率变量 R1 自我强化，典型响应为指数增长。',
      primaryVar: 'L1',
      secondaryVars: ['R1'],
      timeLabel: '时间（年）',
      units: '亿人次',
      reportText: '一阶正反馈系统的核心特征是“越大越快”。水准变量本身直接放大速率变量，因而系统呈现指数增长，这类模型适合解释扩张型、自增强型现象。',
      presets: [
        { key: '教材参数', text: 'L1(0)=38.54，C1=0.05，DT=1，步数=20' },
        { key: '教学重点', text: '速率变量 R1 由当前水准变量 L1 直接决定' }
      ],
      params: [
        { key: 'L1', label: '初始客运量 L1', desc: '水准变量初值', value: 38.54, min: 1, max: 100, step: 0.01 },
        { key: 'C1', label: '年增长率 C1', desc: '常量参数', value: 0.05, min: 0.01, max: 0.2, step: 0.005 },
        { key: 'DT', label: '时间步长 DT', desc: '离散仿真步长', value: 1, min: 0.1, max: 2, step: 0.1 },
        { key: 'steps', label: '仿真步数', desc: '总离散迭代步数', value: 20, min: 5, max: 100, step: 1 }
      ],
      equations: [
        { title: '水准方程', latex: '\\mathrm{L}\\;L1\\cdot K = L1\\cdot J + DT * R1\\cdot JK' },
        { title: '赋初值方程', latex: '\\mathrm{N}\\;L1 = 38.54' },
        { title: '速率方程', latex: '\\mathrm{R}\\;R1\\cdot KL = L1\\cdot K * C1' },
        { title: '常量方程', latex: '\\mathrm{C}\\;C1 = 0.05' }
      ],
      stepsGuide: [
        {
          title: '1. 模型识别',
          text: '系统只包含一个水准变量 L1 和一个速率变量 R1，常量 C1 决定增长强度，构成一阶正反馈回路。',
          bullets: ['水准变量：L1（客运量）', '速率变量：R1（客运量年增加量）', '常量：C1（年增长率）']
        },
        {
          title: '2. 方程配置',
          text: '按照教材 DYNAMO 写法，依次列出水准方程、赋初值方程、速率方程和常量方程。',
          bullets: [
            'L L1·K = L1·J + DT * R1·JK',
            'N L1 = 38.54',
            'R R1·KL = L1·K * C1',
            'C C1 = 0.05'
          ]
        },
        {
          title: '3. 速率计算',
          text: '先利用当前时刻的水准变量 L1·K 计算速率变量 R1·KL。水准变量越大，速率变量越大。'
        },
        {
          title: '4. 水准更新',
          text: '再根据水准方程，把 DT * R1·JK 累加到上一时刻水准变量 L1·J 上，得到本时刻 L1·K。'
        },
        {
          title: '5. 响应判读',
          text: '由于速率变量 R1 与水准变量 L1 正相关，系统不断自我强化，主响应曲线表现为指数上升。'
        }
      ],
      codeBlock: `def simulate_positive_feedback(L1=38.54, C1=0.05, DT=1.0, steps=20):
    time = [0]
    level = [L1]
    rate = [L1 * C1]

    for k in range(steps):
        current_L = level[-1]
        current_R = current_L * C1
        next_L = current_L + DT * current_R

        rate[-1] = current_R
        level.append(next_L)
        time.append(k + 1)

        if k < steps - 1:
            rate.append(next_L * C1)

    return time, level, rate`,
      diagram: {
        nodes: [
          { id: 'src', type: 'cloud', x: 70, y: 220, label: '源', hint: '系统流入端的概念化表示。' },
          { id: 'valve', type: 'valve', x: 200, y: 220, label: 'R1', hint: '客运量年增加量，决定水准变量增长速度。' },
          { id: 'stock', type: 'stock', x: 360, y: 220, label: 'L1\\n客运量', hint: '系统的核心水准变量，越大则速率变量越大。' },
          { id: 'sink', type: 'cloud', x: 585, y: 220, label: '汇', hint: '系统流出端的概念化表示。' },
          { id: 'c1', type: 'aux', x: 185, y: 90, label: 'C1\\n增长率', hint: '决定正反馈放大速度的常量参数。' }
        ],
        links: [
          { from: 'src', to: 'valve', type: 'flow' },
          { from: 'valve', to: 'stock', type: 'flow' },
          { from: 'stock', to: 'sink', type: 'flowInvisible' },
          { from: 'stock', to: 'valve', type: 'info', bend: -90 },
          { from: 'c1', to: 'valve', type: 'info' }
        ]
      }
    },

    {
      id: 'negative_feedback',
      theme: 'negative',
      name: '一阶负反馈',
      shortTag: '收敛系统',
      feedbackType: '负反馈',
      description: '库存控制系统中，水准变量 D 受速率变量 R1 调节，辅助变量 X 表示库存差额，系统在期望库存 Y 附近逐步收敛。',
      sourceHint: '教材例题 5-6：库存控制系统',
      summary: '辅助变量 X 表示目标库存与当前库存的差额，差额驱动速率变量 R1，系统逐步收敛。',
      primaryVar: 'D',
      secondaryVars: ['R1', 'X'],
      timeLabel: '时间（周）',
      units: '件',
      reportText: '一阶负反馈系统的核心特征是“偏差驱动纠偏”。当水准变量 D 偏离目标库存 Y 时，辅助变量 X 形成差额，速率变量 R1 自动调整系统状态并逐步收敛，因此适合描述库存控制、温度控制等调节型过程。',
      presets: [
        { key: '教材参数', text: 'D(0)=800，Y=5000，W=4，DT=1，步数=20' },
        { key: '教学重点', text: '辅助变量 X 驱动速率变量 R1' }
      ],
      params: [
        { key: 'D', label: '初始库存量 D', desc: '水准变量初值', value: 800, min: 0, max: 5000, step: 10 },
        { key: 'Y', label: '期望库存 Y', desc: '常量参数', value: 5000, min: 1000, max: 10000, step: 50 },
        { key: 'W', label: '调整时间 W', desc: '常量参数', value: 4, min: 1, max: 20, step: 0.5 },
        { key: 'DT', label: '时间步长 DT', desc: '离散仿真步长', value: 1, min: 0.1, max: 2, step: 0.1 },
        { key: 'steps', label: '仿真步数', desc: '总离散迭代步数', value: 20, min: 5, max: 80, step: 1 }
      ],
      equations: [
        { title: '水准方程', latex: '\\mathrm{L}\\;D\\cdot K = D\\cdot J + DT * R1\\cdot JK' },
        { title: '赋初值方程', latex: '\\mathrm{N}\\;D = 800' },
        { title: '速率方程', latex: '\\mathrm{R}\\;R1\\cdot KL = X\\cdot K / W' },
        { title: '辅助方程', latex: '\\mathrm{A}\\;X\\cdot K = Y - D\\cdot K' },
        { title: '常量方程', latex: '\\mathrm{C}\\;W = 4' },
        { title: '常量方程', latex: '\\mathrm{C}\\;Y = 5000' }
      ],
      stepsGuide: [
        {
          title: '1. 模型识别',
          text: '这是一个单水准变量的一阶负反馈系统。水准变量 D 与速率变量 R1 构成主回路，辅助变量 X 用于表示库存差额。',
          bullets: ['水准变量：D（库存量）', '速率变量：R1（订货速度）', '辅助变量：X（库存差额）', '常量：Y（期望库存）、W（调整时间）']
        },
        {
          title: '2. 方程配置',
          text: '按照教材 DYNAMO 写法，依次写出水准方程、赋初值方程、速率方程、辅助方程和常量方程。',
          bullets: [
            'L D·K = D·J + DT * R1·JK',
            'N D = 800',
            'R R1·KL = X·K / W',
            'A X·K = Y - D·K',
            'C W = 4',
            'C Y = 5000'
          ]
        },
        {
          title: '3. 速率计算',
          text: '先根据当前时刻水准变量 D·K 计算辅助变量 X·K = Y - D·K，再由 R1·KL = X·K / W 求出速率变量。偏差越大，调节越强。'
        },
        {
          title: '4. 水准更新',
          text: '依据水准方程，将 DT * R1·JK 累加到上一时刻水准变量 D·J 上，得到本时刻 D·K。'
        },
        {
          title: '5. 响应判读',
          text: '随着水准变量 D 逐步接近期望库存 Y，辅助变量 X 和速率变量 R1 会逐渐减小，系统最终表现为稳定收敛。'
        }
      ],
      codeBlock: `def simulate_negative_feedback(D=800, Y=5000, W=4, DT=1.0, steps=20):
    time = [0]
    level = [D]
    gap = [Y - D]
    rate = [gap[0] / W]

    for k in range(steps):
        current_D = level[-1]
        current_X = Y - current_D
        current_R = current_X / W
        next_D = current_D + DT * current_R

        gap[-1] = current_X
        rate[-1] = current_R

        level.append(next_D)
        time.append(k + 1)

        if k < steps - 1:
            gap.append(Y - next_D)
            rate.append((Y - next_D) / W)

    return time, level, rate, gap`,
      diagram: {
        nodes: [
          { id: 'src', type: 'cloud', x: 70, y: 220, label: '源', hint: '系统流入端的概念化表示。' },
          { id: 'valve', type: 'valve', x: 205, y: 220, label: 'R1', hint: '订货速度，受辅助变量 X 影响。' },
          { id: 'stock', type: 'stock', x: 365, y: 220, label: 'D\\n库存量', hint: '系统当前水准变量。' },
          { id: 'sink', type: 'cloud', x: 590, y: 220, label: '汇', hint: '系统流出端的概念化表示。' },
          { id: 'x', type: 'aux', x: 330, y: 365, label: 'X\\n库存差额', hint: '目标库存与当前库存之间的偏差。' },
          { id: 'y', type: 'aux', x: 515, y: 365, label: 'Y\\n期望库存', hint: '系统希望达到的库存目标。' },
          { id: 'w', type: 'aux', x: 155, y: 365, label: 'W\\n调整时间', hint: '库存从偏差调整到目标所需时间。' }
        ],
        links: [
          { from: 'src', to: 'valve', type: 'flow' },
          { from: 'valve', to: 'stock', type: 'flow' },
          { from: 'stock', to: 'sink', type: 'flowInvisible' },
          { from: 'stock', to: 'x', type: 'info' },
          { from: 'y', to: 'x', type: 'info' },
          { from: 'x', to: 'valve', type: 'info' },
          { from: 'w', to: 'valve', type: 'info' }
        ]
      }
    },

    {
      id: 'second_order_negative',
      theme: 'coupled',
      name: '二阶负反馈',
      shortTag: '耦合系统',
      feedbackType: '二阶负反馈',
      description: '在校学生 M 与人才拥有量 Q 为两个水准变量，辅助变量 D 表示供需差，速率变量 R1 与 R2 构成二阶负反馈耦合系统。',
      sourceHint: '教材例题 5-7：交通运输类人才培养系统',
      summary: '供需差 D 通过招生率 R1 与毕业率 R2 共同作用于两个水准变量，系统常出现超调与振荡衰减。',
      primaryVar: 'Q',
      secondaryVars: ['M', 'R1', 'R2', 'D'],
      timeLabel: '时间（年）',
      units: '人',
      reportText: '二阶负反馈系统包含两个水准变量 M 与 Q，通过招生和毕业两个速率通道耦合演化。由于存在培养周期与调整滞后，系统不仅会纠偏，还可能出现超调和振荡，更适合描述培养、输送、库存转换等链式系统。',
      presets: [
        { key: '教材参数', text: 'M(0)=2000，Q(0)=1000，Y=6000，Z=5，W=4，DT=1，步数=30' },
        { key: '教学重点', text: '辅助变量 D 通过速率变量 R1、R2 影响两个水准变量' }
      ],
      params: [
        { key: 'M', label: '初始在校学生 M', desc: '水准变量 M 的初值', value: 2000, min: 0, max: 8000, step: 50 },
        { key: 'Q', label: '初始人才拥有量 Q', desc: '水准变量 Q 的初值', value: 1000, min: 0, max: 8000, step: 50 },
        { key: 'Y', label: '期望人才拥有量 Y', desc: '常量参数', value: 6000, min: 1000, max: 12000, step: 100 },
        { key: 'Z', label: '调整时间 Z', desc: '常量参数', value: 5, min: 1, max: 20, step: 0.5 },
        { key: 'W', label: '学制 W', desc: '常量参数', value: 4, min: 1, max: 10, step: 0.5 },
        { key: 'DT', label: '时间步长 DT', desc: '离散仿真步长', value: 1, min: 0.1, max: 2, step: 0.1 },
        { key: 'steps', label: '仿真步数', desc: '总离散迭代步数', value: 30, min: 8, max: 100, step: 1 }
      ],
      equations: [
        { title: '水准方程', latex: '\\mathrm{L}\\;M\\cdot K = M\\cdot J + DT * (R1\\cdot JK - R2\\cdot JK)' },
        { title: '赋初值方程', latex: '\\mathrm{N}\\;M = 2000' },
        { title: '速率方程', latex: '\\mathrm{R}\\;R1\\cdot KL = D\\cdot K / Z' },
        { title: '辅助方程', latex: '\\mathrm{A}\\;D\\cdot K = Y - Q\\cdot K' },
        { title: '常量方程', latex: '\\mathrm{C}\\;Z = 5' },
        { title: '常量方程', latex: '\\mathrm{C}\\;Y = 6000' },
        { title: '速率方程', latex: '\\mathrm{R}\\;R2\\cdot KL = M\\cdot K / W' },
        { title: '常量方程', latex: '\\mathrm{C}\\;W = 4' },
        { title: '水准方程', latex: '\\mathrm{L}\\;Q\\cdot K = Q\\cdot J + DT * (R2\\cdot JK - 0)' },
        { title: '赋初值方程', latex: '\\mathrm{N}\\;Q = 1000' }
      ],
      stepsGuide: [
        {
          title: '1. 模型识别',
          text: '该系统包含两个水准变量 M 和 Q。招生率 R1 与毕业率 R2 分别连接两个水准变量，辅助变量 D 表示供需差，构成二阶负反馈。',
          bullets: ['水准变量：M（在校学生）、Q（人才拥有量）', '速率变量：R1（招生率）、R2（毕业率）', '辅助变量：D（供需差）', '常量：Y、Z、W']
        },
        {
          title: '2. 方程配置',
          text: '按照教材 DYNAMO 写法，依次写出两个水准方程、两个速率方程、一个辅助方程以及对应常量方程。',
          bullets: [
            'L M·K = M·J + DT * (R1·JK - R2·JK)',
            'N M = 2000',
            'R R1·KL = D·K / Z',
            'A D·K = Y - Q·K',
            'C Z = 5',
            'C Y = 6000',
            'R R2·KL = M·K / W',
            'C W = 4',
            'L Q·K = Q·J + DT * (R2·JK - 0)',
            'N Q = 1000'
          ]
        },
        {
          title: '3. 速率计算',
          text: '先根据当前时刻人才拥有量 Q·K 计算辅助变量 D·K = Y - Q·K，再由 D·K / Z 求得招生率 R1·KL；同时由 M·K / W 求得毕业率 R2·KL。'
        },
        {
          title: '4. 水准更新',
          text: '招生率 R1 使 M 增加，毕业率 R2 使 M 减少并推动 Q 增加，因此两个水准变量在每一步都要同时更新。'
        },
        {
          title: '5. 响应判读',
          text: '由于系统存在两个水准变量和培养周期滞后，常表现为超调、振荡衰减后再趋于稳定，这是二阶负反馈系统的典型动态特征。'
        }
      ],
      codeBlock: `def simulate_second_order(M=2000, Q=1000, Y=6000, Z=5, W=4, DT=1.0, steps=30):
    time = [0]
    M_list = [M]
    Q_list = [Q]
    D_list = [Y - Q]
    R1_list = [D_list[0] / Z]
    R2_list = [M / W]

    for k in range(steps):
        current_M = M_list[-1]
        current_Q = Q_list[-1]
        current_D = Y - current_Q
        current_R1 = current_D / Z
        current_R2 = current_M / W

        next_M = current_M + DT * (current_R1 - current_R2)
        next_Q = current_Q + DT * current_R2

        D_list[-1] = current_D
        R1_list[-1] = current_R1
        R2_list[-1] = current_R2

        M_list.append(next_M)
        Q_list.append(next_Q)
        time.append(k + 1)

        if k < steps - 1:
            D_list.append(Y - next_Q)
            R1_list.append((Y - next_Q) / Z)
            R2_list.append(next_M / W)

    return time, M_list, Q_list, R1_list, R2_list, D_list`,
      diagram: {
        nodes: [
          { id: 'src', type: 'cloud', x: 50, y: 215, label: '源', hint: '系统流入端的概念化表示。' },
          { id: 'r1', type: 'valve', x: 170, y: 215, label: 'R1', hint: '招生率，受辅助变量 D 与调整时间 Z 控制。' },
          { id: 'm', type: 'stock', x: 315, y: 215, label: 'M\\n在校学生', hint: '水准变量 M，招生流入、毕业流出。' },
          { id: 'r2', type: 'valve', x: 465, y: 215, label: 'R2', hint: '毕业率，由水准变量 M 与学制 W 决定。' },
          { id: 'q', type: 'stock', x: 610, y: 215, label: 'Q\\n人才拥有量', hint: '水准变量 Q，由毕业流入形成。' },
          { id: 'sink', type: 'cloud', x: 765, y: 215, label: '汇', hint: '系统流出端的概念化表示。' },
          { id: 'd', type: 'aux', x: 455, y: 370, label: 'D\\n供需差', hint: '期望人才量与当前人才量之间的偏差。' },
          { id: 'y', type: 'aux', x: 660, y: 370, label: 'Y\\n期望人才量', hint: '系统期望达到的人才拥有量。' },
          { id: 'z', type: 'aux', x: 155, y: 365, label: 'Z\\n调整时间', hint: '招生调节对供需差的响应时间。' },
          { id: 'w', type: 'aux', x: 465, y: 80, label: 'W\\n学制', hint: '从入学到毕业的平均培养周期。' }
        ],
        links: [
          { from: 'src', to: 'r1', type: 'flow' },
          { from: 'r1', to: 'm', type: 'flow' },
          { from: 'm', to: 'r2', type: 'flow' },
          { from: 'r2', to: 'q', type: 'flow' },
          { from: 'q', to: 'sink', type: 'flowInvisible' },
          { from: 'q', to: 'd', type: 'info' },
          { from: 'y', to: 'd', type: 'info' },
          { from: 'd', to: 'r1', type: 'info' },
          { from: 'z', to: 'r1', type: 'info' },
          { from: 'm', to: 'r2', type: 'info' },
          { from: 'w', to: 'r2', type: 'info' }
        ]
      }
    }
  ]
};
