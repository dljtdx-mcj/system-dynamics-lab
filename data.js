window.APP_CONFIG = {
  models: [
    {
      id: "positive_feedback",
      name: "一阶正反馈",
      feedbackType: "正反馈",
      description: "系统在正反馈作用下呈现不断放大的增长特征。",
      equations: [
        "L(t+\\Delta t)=L(t)+\\Delta t\\cdot R(t)",
        "R(t)=k\\cdot L(t)"
      ]
    },
    {
      id: "negative_feedback",
      name: "一阶负反馈",
      feedbackType: "负反馈",
      description: "系统在负反馈作用下逐步趋于稳定。",
      equations: [
        "L(t+\\Delta t)=L(t)+\\Delta t\\cdot R(t)",
        "R(t)=-k\\cdot L(t)"
      ]
    },
    {
      id: "second_order_negative",
      name: "二阶负反馈",
      feedbackType: "二阶负反馈",
      description: "系统存在两个状态量耦合，动态行为更复杂。",
      equations: [
        "L_1(t+\\Delta t)=L_1(t)+\\Delta t\\cdot R_1(t)",
        "L_2(t+\\Delta t)=L_2(t)+\\Delta t\\cdot R_2(t)"
      ]
    }
  ]
};

window.PYTHON_CODE_BLOCKS = {
  positive_feedback: `def solve_positive_feedback():
    # 一阶正反馈示意
    pass`,
  negative_feedback: `def solve_negative_feedback():
    # 一阶负反馈示意
    pass`,
  second_order_negative: `def solve_second_order_negative():
    # 二阶负反馈示意
    pass`
};
