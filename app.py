from __future__ import annotations

import json
import math
from dataclasses import dataclass
from typing import Dict, List, Tuple

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)


@dataclass
class ParamDef:
    key: str
    label: str
    min: float
    max: float
    step: float
    default: float
    unit: str
    description: str


MODEL_META: Dict[str, Dict] = {
    "positive_feedback": {
        "name": "例题一：一阶正反馈回路",
        "short_name": "铁路客运量增长",
        "badge": "指数增长型",
        "description": "以铁路客运量 LI 为水准变量，客运量年增加量 R1 为速率变量，增长率 C1 为常量，展示正反馈系统的持续放大效应。",
        "feedback_type": "正反馈",
        "time_unit": "年",
        "step_notes": [
            "依据当前客运量 LI(K) 计算年增加量 R1(K)=LI(K)×C1。",
            "再用离散积分 LI(K+1)=LI(K)+DT×R1(K) 更新下一时刻客运量。",
            "正反馈会不断放大系统状态，因此曲线通常呈指数上升。",
        ],
        "equations": [
            r"L\; LI_K = LI_J + DT \times R1_{JK}",
            r"R\; R1_{KL} = LI_K \times C1",
            r"N\; LI = 38.54,\quad C\; C1 = 0.05",
        ],
        "params": [
            ParamDef("li0", "初始客运量 LI₀", 1, 200, 0.01, 38.54, "亿人次", "系统起始时刻的铁路客运量。"),
            ParamDef("c1", "年增长率 C1", 0.001, 0.2, 0.001, 0.05, "", "客运量相对当前规模的增长比例。"),
            ParamDef("dt", "仿真步长 DT", 0.1, 2, 0.1, 1.0, "年", "DYNAMO 离散积分步长。"),
            ParamDef("horizon", "未来仿真时长", 5, 120, 1, 100, "年", "总推演时间范围。"),
        ],
        "series": [
            {"key": "LI", "label": "客运量 LI", "unit": "亿人次"},
            {"key": "R1", "label": "年增加量 R1", "unit": "亿人次/年"},
        ],
        "defaults": {"li0": 38.54, "c1": 0.05, "dt": 1.0, "horizon": 100},
        "preset_sets": {
            "教材参数": {"li0": 38.54, "c1": 0.05, "dt": 1.0, "horizon": 100},
            "温和增长": {"li0": 38.54, "c1": 0.03, "dt": 1.0, "horizon": 80},
            "高速增长": {"li0": 38.54, "c1": 0.08, "dt": 1.0, "horizon": 80},
        },
    },
    "negative_feedback": {
        "name": "例题二：一阶负反馈回路",
        "short_name": "库存控制系统",
        "badge": "目标收敛型",
        "description": "以库存量 D 为水准变量，库存差额 X 为辅助变量，订货速度 R1 为速率变量，展示负反馈系统对目标库存的逼近过程。",
        "feedback_type": "负反馈",
        "time_unit": "周",
        "step_notes": [
            "先根据当前库存量 D(K) 求出差额 X(K)=Y-D(K)。",
            "再按调整时间 W 计算订货速度 R1(K)=X(K)/W。",
            "最后用 D(K+1)=D(K)+DT×R1(K) 更新库存；负反馈会逐步缩小差额。",
        ],
        "equations": [
            r"L\; D_K = D_J + DT \times R1_{JK}",
            r"A\; X_K = Y - D_K",
            r"R\; R1_{KL} = X_K / W",
            r"N\; D = 800,\quad C\; W = 4,\quad C\; Y = 5000",
        ],
        "params": [
            ParamDef("d0", "初始库存 D₀", 0, 8000, 1, 800, "件", "系统起始库存。"),
            ParamDef("y", "期望库存 Y", 500, 10000, 10, 5000, "件", "库存控制目标值。"),
            ParamDef("w", "调整时间 W", 0.5, 20, 0.1, 4, "周", "库存差额被消化的期望时间尺度。"),
            ParamDef("dt", "仿真步长 DT", 0.1, 2, 0.1, 1.0, "周", "离散仿真步长。"),
            ParamDef("horizon", "未来仿真时长", 4, 80, 1, 50, "周", "总推演周数。"),
        ],
        "series": [
            {"key": "D", "label": "库存量 D", "unit": "件"},
            {"key": "X", "label": "库存差额 X", "unit": "件"},
            {"key": "R1", "label": "订货速度 R1", "unit": "件/周"},
        ],
        "defaults": {"d0": 800, "y": 5000, "w": 4, "dt": 1.0, "horizon": 50},
        "preset_sets": {
            "教材参数": {"d0": 800, "y": 5000, "w": 4, "dt": 1.0, "horizon": 50},
            "更快补货": {"d0": 800, "y": 5000, "w": 2.5, "dt": 1.0, "horizon": 40},
            "更稳控制": {"d0": 800, "y": 5000, "w": 7.0, "dt": 1.0, "horizon": 60},
        },
    },
    "second_order": {
        "name": "例题三：二阶负反馈回路",
        "short_name": "交通运输类人才培养",
        "badge": "双库存耦合型",
        "description": "以在校学生数 M 与人才拥有量 Q 为双水准变量，供需差 D 为辅助变量，招生人数 R1、毕业人数 R2 为速率变量，展示二阶负反馈的波动与收敛特征。",
        "feedback_type": "二阶负反馈",
        "time_unit": "年",
        "step_notes": [
            "根据当前人才拥有量 Q(K) 计算供需差 D(K)=Y-Q(K)。",
            "根据供需差和调整时间 Z 得到招生人数 R1(K)=D(K)/Z。",
            "根据在校学生数和学制 W 得到毕业人数 R2(K)=M(K)/W。",
            "同步更新 M(K+1)=M(K)+DT×(R1-R2) 与 Q(K+1)=Q(K)+DT×R2。",
        ],
        "equations": [
            r"L\; M_K = M_J + DT \times (R1_{JK} - R2_{JK})",
            r"L\; Q_K = Q_J + DT \times (R2_{JK} - 0)",
            r"A\; D_K = Y - Q_K",
            r"R\; R1_{KL} = D_K / Z,\quad R2_{KL} = M_K / W",
            r"N\; M = 2000,\; N\; Q = 1000,\; C\; Z = 5,\; C\; W = 4,\; C\; Y = 6000",
        ],
        "params": [
            ParamDef("m0", "初始在校学生 M₀", 0, 10000, 10, 2000, "人", "系统初始在校人数。"),
            ParamDef("q0", "初始人才拥有量 Q₀", 0, 10000, 10, 1000, "人", "系统初始人才存量。"),
            ParamDef("y", "期望人才拥有量 Y", 1000, 20000, 50, 6000, "人", "系统最终希望达到的人才规模。"),
            ParamDef("z", "人才调整时间 Z", 1, 20, 0.1, 5, "年", "供需差转化为招生动作的反应时间。"),
            ParamDef("w", "学制 W", 1, 10, 0.1, 4, "年", "学生从入学到毕业的平均年限。"),
            ParamDef("dt", "仿真步长 DT", 0.1, 1.5, 0.1, 1.0, "年", "离散仿真步长。"),
            ParamDef("horizon", "未来仿真时长", 10, 120, 1, 100, "年", "总推演时间范围。"),
        ],
        "series": [
            {"key": "M", "label": "在校学生 M", "unit": "人"},
            {"key": "Q", "label": "人才拥有量 Q", "unit": "人"},
            {"key": "D", "label": "供需差 D", "unit": "人"},
            {"key": "R1", "label": "招生人数 R1", "unit": "人/年"},
            {"key": "R2", "label": "毕业人数 R2", "unit": "人/年"},
        ],
        "defaults": {"m0": 2000, "q0": 1000, "y": 6000, "z": 5, "w": 4, "dt": 1.0, "horizon": 100},
        "preset_sets": {
            "教材参数": {"m0": 2000, "q0": 1000, "y": 6000, "z": 5, "w": 4, "dt": 1.0, "horizon": 100},
            "紧缺人才扩招": {"m0": 2000, "q0": 1000, "y": 9000, "z": 4, "w": 4, "dt": 1.0, "horizon": 100},
            "长学制平稳": {"m0": 2000, "q0": 1000, "y": 6000, "z": 6, "w": 5, "dt": 1.0, "horizon": 100},
        },
    },
}


def clamp(v: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, v))


def sanitize_params(model_id: str, raw: Dict) -> Dict[str, float]:
    meta = MODEL_META[model_id]
    params: Dict[str, float] = {}
    for p in meta["params"]:
        value = raw.get(p.key, p.default)
        try:
            value = float(value)
        except (TypeError, ValueError):
            value = p.default
        value = clamp(value, p.min, p.max)
        if p.step >= 1:
            # keep integers clean for horizon and count-like params when appropriate
            if float(p.step).is_integer():
                value = round(value)
        params[p.key] = value
    return params


def make_time_grid(horizon: float, dt: float) -> List[float]:
    steps = max(1, int(round(horizon / dt)))
    return [round(i * dt, 6) for i in range(steps + 1)]


def simulate_positive_feedback(params: Dict[str, float]) -> Dict:
    li = [params["li0"]]
    r1 = []
    time = make_time_grid(params["horizon"], params["dt"])
    for i in range(len(time) - 1):
        current_li = li[-1]
        current_r1 = current_li * params["c1"]
        r1.append(current_r1)
        li.append(current_li + params["dt"] * current_r1)
    r1.append(li[-1] * params["c1"])

    summary = summarize_series(li, time, target=None, model_id="positive_feedback", params=params)
    summary.update(
        {
            "dominant_variable": "客运量 LI",
            "final_rate": round(r1[-1], 4),
            "final_rate_label": "末期年增加量",
            "final_rate_unit": "亿人次/年",
        }
    )
    insight = positive_feedback_insight(li, r1, params)
    rows = [
        {
            "t": round(time[i], 6),
            "LI": round(li[i], 4),
            "R1": round(r1[i], 4),
        }
        for i in range(len(time))
    ]
    return {
        "time": time,
        "series": {"LI": li, "R1": r1},
        "summary": summary,
        "insight": insight,
        "rows": rows,
    }


def simulate_negative_feedback(params: Dict[str, float]) -> Dict:
    d = [params["d0"]]
    x = []
    r1 = []
    time = make_time_grid(params["horizon"], params["dt"])
    for _ in range(len(time) - 1):
        current_d = d[-1]
        current_x = params["y"] - current_d
        current_r1 = current_x / params["w"]
        x.append(current_x)
        r1.append(current_r1)
        d.append(current_d + params["dt"] * current_r1)
    x.append(params["y"] - d[-1])
    r1.append(x[-1] / params["w"])

    summary = summarize_series(d, time, target=params["y"], model_id="negative_feedback", params=params)
    summary.update(
        {
            "dominant_variable": "库存量 D",
            "final_gap": round(x[-1], 4),
            "final_gap_label": "末期库存差额",
            "final_gap_unit": "件",
        }
    )
    insight = negative_feedback_insight(d, x, r1, params)
    rows = [
        {
            "t": round(time[i], 6),
            "D": round(d[i], 4),
            "X": round(x[i], 4),
            "R1": round(r1[i], 4),
        }
        for i in range(len(time))
    ]
    return {
        "time": time,
        "series": {"D": d, "X": x, "R1": r1},
        "summary": summary,
        "insight": insight,
        "rows": rows,
    }


def simulate_second_order(params: Dict[str, float]) -> Dict:
    m = [params["m0"]]
    q = [params["q0"]]
    d_gap = []
    r1 = []
    r2 = []
    time = make_time_grid(params["horizon"], params["dt"])
    for _ in range(len(time) - 1):
        current_m = m[-1]
        current_q = q[-1]
        current_d = params["y"] - current_q
        current_r1 = current_d / params["z"]
        current_r2 = current_m / params["w"]
        d_gap.append(current_d)
        r1.append(current_r1)
        r2.append(current_r2)
        m.append(current_m + params["dt"] * (current_r1 - current_r2))
        q.append(current_q + params["dt"] * current_r2)
    current_d = params["y"] - q[-1]
    d_gap.append(current_d)
    r1.append(current_d / params["z"])
    r2.append(m[-1] / params["w"])

    summary = summarize_series(q, time, target=params["y"], model_id="second_order", params=params)
    q_peak = max(q)
    q_peak_time = time[q.index(q_peak)]
    summary.update(
        {
            "dominant_variable": "人才拥有量 Q",
            "peak_q": round(q_peak, 4),
            "peak_q_time": round(q_peak_time, 4),
            "peak_q_label": "人才峰值",
            "peak_q_unit": "人",
        }
    )
    insight = second_order_insight(m, q, d_gap, r1, r2, params, time)
    rows = [
        {
            "t": round(time[i], 6),
            "M": round(m[i], 4),
            "Q": round(q[i], 4),
            "D": round(d_gap[i], 4),
            "R1": round(r1[i], 4),
            "R2": round(r2[i], 4),
        }
        for i in range(len(time))
    ]
    return {
        "time": time,
        "series": {"M": m, "Q": q, "D": d_gap, "R1": r1, "R2": r2},
        "summary": summary,
        "insight": insight,
        "rows": rows,
    }


def summarize_series(series: List[float], time: List[float], target: float | None, model_id: str, params: Dict[str, float]) -> Dict:
    final_value = series[-1]
    initial_value = series[0]
    delta = final_value - initial_value
    ratio = None if abs(initial_value) < 1e-12 else final_value / initial_value
    max_value = max(series)
    min_value = min(series)
    max_time = time[series.index(max_value)]
    min_time = time[series.index(min_value)]
    overshoot = None
    convergence_time = None
    if target is not None and target != 0:
        overshoot = (max_value - target) / abs(target) * 100
        threshold = 0.05 * abs(target)
        for i in range(len(series)):
            remaining = series[i:]
            if all(abs(v - target) <= threshold for v in remaining):
                convergence_time = time[i]
                break
    stability = infer_stability(model_id, params)
    return {
        "initial": round(initial_value, 4),
        "final": round(final_value, 4),
        "delta": round(delta, 4),
        "ratio": None if ratio is None else round(ratio, 4),
        "max": round(max_value, 4),
        "min": round(min_value, 4),
        "max_time": round(max_time, 4),
        "min_time": round(min_time, 4),
        "target": None if target is None else round(target, 4),
        "overshoot_pct": None if overshoot is None else round(overshoot, 4),
        "convergence_time": None if convergence_time is None else round(convergence_time, 4),
        "stability": stability,
    }


def infer_stability(model_id: str, params: Dict[str, float]) -> str:
    dt = params.get("dt", 1.0)
    if model_id == "positive_feedback":
        multiplier = 1 + dt * params["c1"]
        return "持续放大" if multiplier > 1 else "边界稳定"
    if model_id == "negative_feedback":
        ratio = dt / params["w"]
        if ratio < 1:
            return "单调收敛"
        if math.isclose(ratio, 1, rel_tol=1e-9):
            return "临界响应"
        if ratio < 2:
            return "振荡收敛"
        return "离散发散风险"
    if model_id == "second_order":
        ratio = dt / max(params["w"], params["z"])
        if ratio <= 0.3:
            return "平滑收敛"
        if ratio <= 0.8:
            return "轻微波动后收敛"
        return "易出现较强振荡"
    return "待判断"


def positive_feedback_insight(li: List[float], r1: List[float], params: Dict[str, float]) -> Dict:
    growth_multiple = li[-1] / li[0] if li[0] else float("inf")
    doubling_time = math.log(2) / math.log(1 + params["dt"] * params["c1"]) * params["dt"] if params["c1"] > 0 else None
    narrative = (
        f"该模型是典型正反馈：当前客运量越大，年增加量 R1 越大，从而再次推动客运量增长。"
        f"在当前参数下，客运量从 {li[0]:.2f} 增长到 {li[-1]:.2f}，约为初值的 {growth_multiple:.2f} 倍。"
    )
    if doubling_time is not None and doubling_time > 0:
        narrative += f" 以离散步长折算，规模翻倍大约需要 {doubling_time:.2f} 年。"
    risk = "增长率较高，后期规模会迅速放大，建议在课堂展示时结合对数坐标或缩短推演时长。" if params["c1"] >= 0.07 else "当前增长较温和，适合展示正反馈的放大机制。"
    return {
        "headline": "指数增长洞察",
        "narrative": narrative,
        "risk_tip": risk,
    }


def negative_feedback_insight(d: List[float], x: List[float], r1: List[float], params: Dict[str, float]) -> Dict:
    final_gap = x[-1]
    settle = None
    threshold = 0.05 * abs(params["y"])
    for i, gap in enumerate(x):
        if abs(gap) <= threshold:
            settle = i * params["dt"]
            break
    ratio = params["dt"] / params["w"]
    narrative = (
        f"该模型体现了负反馈的目标修正机制：库存低于目标时，差额 X 产生正向订货；库存接近目标后，订货速度自动衰减。"
        f" 当前末期差额为 {final_gap:.2f} 件。"
    )
    if settle is not None:
        narrative += f" 库存进入目标±5%范围大约发生在 {settle:.2f} 周左右。"
    control_tip = (
        "DT/W 比值较大，离散仿真可能出现过冲或锯齿波动，可减小 DT 或增大 W。"
        if ratio >= 1
        else "DT/W 比值较小，系统表现为较平稳的单调收敛。"
    )
    return {
        "headline": "收敛控制洞察",
        "narrative": narrative,
        "risk_tip": control_tip,
    }


def second_order_insight(
    m: List[float],
    q: List[float],
    d_gap: List[float],
    r1: List[float],
    r2: List[float],
    params: Dict[str, float],
    time: List[float],
) -> Dict:
    q_peak = max(q)
    q_peak_time = time[q.index(q_peak)]
    overshoot = (q_peak - params["y"]) / params["y"] * 100 if params["y"] else 0
    narrative = (
        f"这是一个双库存耦合的二阶负反馈系统：招生人数 R1 受供需差驱动，毕业人数 R2 受在校生规模驱动。"
        f" 人才拥有量 Q 最终由招生与毕业链条共同塑形。当前峰值约为 {q_peak:.2f} 人，出现于 {q_peak_time:.2f} 年。"
    )
    if overshoot > 0:
        narrative += f" 相对目标 Y={params['y']:.0f}，峰值超调约 {overshoot:.2f}%。"
    else:
        narrative += " 当前参数下没有明显超调。"
    control_tip = (
        "当 Z 较小且 W 较大时，系统更容易先扩招后滞后毕业，形成明显波峰。"
        if params["z"] < params["w"]
        else "当 Z 与 W 接近或更大时，系统波动更缓和，更偏向平稳逼近。"
    )
    return {
        "headline": "双库存耦合洞察",
        "narrative": narrative,
        "risk_tip": control_tip,
    }


SIMULATORS = {
    "positive_feedback": simulate_positive_feedback,
    "negative_feedback": simulate_negative_feedback,
    "second_order": simulate_second_order,
}


PYTHON_CORE_SNIPPETS = {
    "positive_feedback": '''def simulate_positive_feedback(li0, c1, dt=1.0, horizon=100):\n    li = [li0]\n    r1 = []\n    steps = int(horizon / dt)\n    for _ in range(steps):\n        current_r1 = li[-1] * c1\n        r1.append(current_r1)\n        li.append(li[-1] + dt * current_r1)\n    r1.append(li[-1] * c1)\n    return li, r1''',
    "negative_feedback": '''def simulate_negative_feedback(d0, y, w, dt=1.0, horizon=50):\n    d = [d0]\n    x, r1 = [], []\n    steps = int(horizon / dt)\n    for _ in range(steps):\n        current_x = y - d[-1]\n        current_r1 = current_x / w\n        x.append(current_x)\n        r1.append(current_r1)\n        d.append(d[-1] + dt * current_r1)\n    x.append(y - d[-1])\n    r1.append(x[-1] / w)\n    return d, x, r1''',
    "second_order": '''def simulate_second_order(m0, q0, y, z, w, dt=1.0, horizon=100):\n    m, q = [m0], [q0]\n    d_gap, r1, r2 = [], [], []\n    steps = int(horizon / dt)\n    for _ in range(steps):\n        current_d = y - q[-1]\n        current_r1 = current_d / z\n        current_r2 = m[-1] / w\n        d_gap.append(current_d)\n        r1.append(current_r1)\n        r2.append(current_r2)\n        m.append(m[-1] + dt * (current_r1 - current_r2))\n        q.append(q[-1] + dt * current_r2)\n    d_gap.append(y - q[-1])\n    r1.append(d_gap[-1] / z)\n    r2.append(m[-1] / w)\n    return m, q, d_gap, r1, r2''',
}


@app.route("/")
def index():
    serializable_meta = {}
    for model_id, meta in MODEL_META.items():
        serializable_meta[model_id] = {
            k: v
            for k, v in meta.items()
            if k not in {"params"}
        }
        serializable_meta[model_id]["params"] = [p.__dict__ for p in meta["params"]]
    return render_template(
        "index.html",
        model_meta=json.dumps(serializable_meta, ensure_ascii=False),
        code_blocks=json.dumps(PYTHON_CORE_SNIPPETS, ensure_ascii=False),
    )


@app.route("/api/model/<model_id>", methods=["POST"])
def simulate_model(model_id: str):
    if model_id not in SIMULATORS:
        return jsonify({"error": "未知模型"}), 404
    payload = request.get_json(silent=True) or {}
    params = sanitize_params(model_id, payload)
    result = SIMULATORS[model_id](params)
    return jsonify({"model_id": model_id, "params": params, **result})


@app.route("/api/overview", methods=["GET"])
def overview():
    cards = []
    for model_id, meta in MODEL_META.items():
        params = meta["defaults"]
        result = SIMULATORS[model_id](params)
        cards.append(
            {
                "model_id": model_id,
                "name": meta["name"],
                "short_name": meta["short_name"],
                "feedback_type": meta["feedback_type"],
                "summary": result["summary"],
                "headline": result["insight"]["headline"],
            }
        )
    return jsonify(cards)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
