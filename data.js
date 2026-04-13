window.APP_CONFIG = {
  defaultDt: 1,
  defaultSteps: 20,
  stepLabels: ['模型识别', '方程配置', '速率计算', '水准更新', '响应判读'],

  models: [
    {
      id: 'positive_feedback',
      name: '一阶正反馈',
      shortTag: '增长系统',
      feedbackType: '正反馈',
      description: '客运量与年增加量构成一阶正反馈回路，系统会不断自我强化，呈现指数增长特征。',
      sourceHint: '教材例题 5-5：铁路客运量系统',
      summary: '库存量越大，增长流量越大，系统不断放大，典型响应是指数型上升。',
      primaryVar: 'L1',
      secondaryVars: ['R1'],
      timeLabel: '时间（年）',
      units: '亿人次',
      presets: [
        { key: '教材参数', text: 'L1(0)=38.54，C1=0.05，DT=1，步数=20' },
        { key: '含义', text: '增长流量 R1 由当前库存 L1 直接决定' }
      ],
      params: [
        { key: 'L1', label: '初始客运量 L1', desc: '库存变量初值', value: 38.54, min: 1, max: 100, step: 0.01 },
        { key: 'C1', label: '年增长率 C1', desc: '正反馈放大速度', value: 0.05, min: 0.01, max: 0.2, step: 0.005 },
        { key: 'DT', label: '时间步长 DT', desc: '离散仿真步长', value: 1, min: 0.1, max: 2, step: 0.1 },
        { key: 'steps', label: '仿真步数', desc: '总离散迭代步数', value: 20, min: 5, max: 100, step: 1 }
      ],
      equations: [
        { title: '水准方程', latex: 'L1(k+1)=L1(k)+DT\\cdot R1(k)' },
        { title: '速率方程', latex: 'R1(k)=L1(k)\\cdot C1' },
        { title: '赋初值', latex: 'L1(0)=38.54' },
        { title: '常量方程', latex: 'C1=0.05' }
      ],
      stepsGuide: [
        {
          title: '1. 模型识别',
          text: '系统只包含一个库存变量 L1 和一个增长流量 R1。流量由库存本身决定，形成自我强化回路。',
          bullets: ['库存变量：L1（客运量）', '速率变量：R1（客运量年增加量）', '参数变量：C1（增长率）']
        },
        {
          title: '2. 方程配置',
          text: '根据教材的 DYNAMO 形式，先写出库存更新方程，再写速率方程。',
          bullets: ['L1(k+1)=L1(k)+DT·R1(k)', 'R1(k)=L1(k)·C1']
        },
        {
          title: '3. 速率计算',
          text: '每一步先利用当前库存 L1(k) 计算当前流量 R1(k)，库存越大，增长越快。'
        },
        {
          title: '4. 水准更新',
          text: '用当前流量乘以步长 DT，累加到库存量，得到下一时刻 L1(k+1)。'
        },
        {
          title: '5. 响应判读',
          text: '由于 R1 与 L1 正相关，系统会越涨越快，主响应曲线通常表现为指数上升。'
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
          { id: 'src', type: 'cloud', x: 70, y: 220, label: '源' },
          { id: 'valve', type: 'valve', x: 200, y: 220, label: 'R1' },
          { id: 'stock', type: 'stock', x: 360, y: 220, label: 'L1\\n客运量' },
          { id: 'sink', type: 'cloud', x: 585, y: 220, label: '汇' },
          { id: 'c1', type: 'aux', x: 185, y: 90, label: 'C1\\n增长率' }
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
      name: '一阶负反馈',
      shortTag: '收敛系统',
      feedbackType: '负反馈',
      description: '库存偏差驱动订货速度，库存越偏离目标越会被纠偏，最终逐步收敛到期望值附近。',
      sourceHint: '教材例题 5-6：库存控制系统',
      summary: '当前库存偏离目标时，系统自动产生纠偏动作，偏差越小，纠偏越弱，因此系统会逐步收敛。',
      primaryVar: 'D',
      secondaryVars: ['R1', 'X'],
      timeLabel: '时间（周）',
      units: '件',
      presets: [
        { key: '教材参数', text: 'D(0)=800，Y=5000，W=4，DT=1，步数=20' },
        { key: '含义', text: '库存差额 X 驱动订货速度 R1' }
      ],
      params: [
        { key: 'D', label: '初始库存量 D', desc: '库存变量初值', value: 800, min: 0, max: 5000, step: 10 },
        { key: 'Y', label: '期望库存 Y', desc: '目标库存水平', value: 5000, min: 1000, max: 10000, step: 50 },
        { key: 'W', label: '调整时间 W', desc: '库存调整所需时间', value: 4, min: 1, max: 20, step: 0.5 },
        { key: 'DT', label: '时间步长 DT', desc: '离散仿真步长', value: 1, min: 0.1, max: 2, step: 0.1 },
        { key: 'steps', label: '仿真步数', desc: '总离散迭代步数', value: 20, min: 5, max: 80, step: 1 }
      ],
      equations: [
        { title: '水准方程', latex: 'D(k+1)=D(k)+DT\\cdot R1(k)' },
        { title: '速率方程', latex: 'R1(k)=\\frac{X(k)}{W}' },
        { title: '辅助方程', latex: 'X(k)=Y-D(k)' },
        { title: '赋初值', latex: 'D(0)=800' },
        { title: '常量方程', latex: 'W=4,\\quad Y=5000' }
      ],
      stepsGuide: [
        {
          title: '1. 模型识别',
          text: '这是单库存负反馈系统。库存差额 X 作为中间变量，将目标库存与当前库存联系起来。',
          bullets: ['库存变量：D（库存量）', '辅助变量：X（库存差额）', '速率变量：R1（订货速度）']
        },
        {
          title: '2. 方程配置',
          text: '库存由订货速度驱动，订货速度由库存差额除以调整时间得到。',
          bullets: ['D(k+1)=D(k)+DT·R1(k)', 'X(k)=Y-D(k)', 'R1(k)=X(k)/W']
        },
        {
          title: '3. 速率计算',
          text: '每一步先计算偏差 X(k)。偏差越大，订货越快；偏差越小，订货越慢。'
        },
        {
          title: '4. 水准更新',
          text: '用订货速度累加到库存量中，系统逐步靠近期望库存。'
        },
        {
          title: '5. 响应判读',
          text: '主变量 D 曲线快速上升后逐渐变缓，最终逼近期望库存 Y，体现典型负反馈收敛。'
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
          { id: 'src', type: 'cloud', x: 70, y: 220, label: '源' },
          { id: 'valve', type: 'valve', x: 205, y: 220, label: 'R1' },
          { id: 'stock', type: 'stock', x: 365, y: 220, label: 'D\\n库存量' },
          { id: 'sink', type: 'cloud', x: 590, y: 220, label: '汇' },
          { id: 'x', type: 'aux', x: 330, y: 365, label: 'X\\n库存差额' },
          { id: 'y', type: 'aux', x: 515, y: 365, label: 'Y\\n期望库存' },
          { id: 'w', type: 'aux', x: 155, y: 365, label: 'W\\n调整时间' }
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
      name: '二阶负反馈',
      shortTag: '耦合系统',
      feedbackType: '二阶负反馈',
      description: '在校学生人数与人才拥有量耦合演化，供需差驱动招生，而毕业进一步影响人才拥有量，产生更复杂的动态。',
      sourceHint: '教材例题 5-7：交通运输类人才培养系统',
      summary: '供需差经招生和毕业双通道影响系统状态，通常呈现超调、振荡后再趋稳的二阶负反馈特征。',
      primaryVar: 'Q',
      secondaryVars: ['M', 'R1', 'R2', 'D'],
      timeLabel: '时间（年）',
      units: '人',
      presets: [
        { key: '教材参数', text: 'M(0)=2000，Q(0)=1000，Y=6000，Z=5，W=4，DT=1，步数=30' },
        { key: '含义', text: '供需差 D 同时影响招生率与系统耦合反馈' }
      ],
      params: [
        { key: 'M', label: '初始在校学生 M', desc: '教育库存变量', value: 2000, min: 0, max: 8000, step: 50 },
        { key: 'Q', label: '初始人才拥有量 Q', desc: '社会人才存量', value: 1000, min: 0, max: 8000, step: 50 },
        { key: 'Y', label: '期望人才拥有量 Y', desc: '系统目标人才量', value: 6000, min: 1000, max: 12000, step: 100 },
        { key: 'Z', label: '调整时间 Z', desc: '招生调节响应时间', value: 5, min: 1, max: 20, step: 0.5 },
        { key: 'W', label: '学制 W', desc: '毕业平均培养周期', value: 4, min: 1, max: 10, step: 0.5 },
        { key: 'DT', label: '时间步长 DT', desc: '离散仿真步长', value: 1, min: 0.1, max: 2, step: 0.1 },
        { key: 'steps', label: '仿真步数', desc: '总离散迭代步数', value: 30, min: 8, max: 100, step: 1 }
      ],
      equations: [
        { title: '在校学生方程', latex: 'M(k+1)=M(k)+DT\\cdot (R1(k)-R2(k))' },
        { title: '人才拥有量方程', latex: 'Q(k+1)=Q(k)+DT\\cdot R2(k)' },
        { title: '招生率方程', latex: 'R1(k)=\\frac{D(k)}{Z}' },
        { title: '毕业率方程', latex: 'R2(k)=\\frac{M(k)}{W}' },
        { title: '供需差方程', latex: 'D(k)=Y-Q(k)' }
      ],
      stepsGuide: [
        {
          title: '1. 模型识别',
          text: '该系统有两个库存量：在校学生 M 与人才拥有量 Q。招生与毕业分别连接两者，构成二阶负反馈。',
          bullets: ['库存变量：M、Q', '速率变量：R1（招生）、R2（毕业）', '辅助变量：D（供需差）']
        },
        {
          title: '2. 方程配置',
          text: '供需差 D 决定招生率，学生库存通过毕业率转化为人才拥有量。',
          bullets: ['M(k+1)=M(k)+DT·(R1-R2)', 'Q(k+1)=Q(k)+DT·R2', 'D=Y-Q', 'R1=D/Z', 'R2=M/W']
        },
        {
          title: '3. 速率计算',
          text: '先根据当前 Q 计算供需差 D，再求招生率 R1；与此同时，根据在校学生 M 求毕业率 R2。'
        },
        {
          title: '4. 水准更新',
          text: '招生使 M 增加，毕业使 M 减少同时推动 Q 增加，形成双库存耦合更新。'
        },
        {
          title: '5. 响应判读',
          text: '系统通常表现出超调和振荡衰减，这是二阶负反馈系统的典型动态特征。'
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
          { id: 'src', type: 'cloud', x: 50, y: 215, label: '源' },
          { id: 'r1', type: 'valve', x: 170, y: 215, label: 'R1' },
          { id: 'm', type: 'stock', x: 315, y: 215, label: 'M\\n在校学生' },
          { id: 'r2', type: 'valve', x: 465, y: 215, label: 'R2' },
          { id: 'q', type: 'stock', x: 610, y: 215, label: 'Q\\n人才拥有量' },
          { id: 'sink', type: 'cloud', x: 765, y: 215, label: '汇' },
          { id: 'd', type: 'aux', x: 455, y: 370, label: 'D\\n供需差' },
          { id: 'y', type: 'aux', x: 660, y: 370, label: 'Y\\n期望人才量' },
          { id: 'z', type: 'aux', x: 155, y: 365, label: 'Z\\n调整时间' },
          { id: 'w', type: 'aux', x: 465, y: 80, label: 'W\\n学制' }
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
