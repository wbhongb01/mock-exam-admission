// 여러 페이지가 함께 쓰는 계산·유틸 (data.js 다음에 불러옵니다)

// 등급만 아는 경우 쓰는 등급별 대표 백분위(각 등급 구간의 중간값 근사)
const GRADE_TO_PCT = [98, 92, 83, 68, 50, 31, 17, 7, 2];

// 내 국수탐 평균 백분위 − 학과 70%컷 차이로 판정
const LEVELS = [
  { key: "안정", min: 2, desc: "+2 이상" },
  { key: "적정", min: 0, desc: "0 ~ +2" },
  { key: "소신", min: -2, desc: "−2 ~ 0" },
  { key: "도전", min: -4, desc: "−4 ~ −2" },
  { key: "어려움", min: -Infinity, desc: "−4 미만" },
];

const STORAGE_KEY = "mock-exam-admission:v3";

const ADIGA_URL = (code) =>
  `https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&unvCd=${code}&searchSyr=${DATA_INFO.searchSyr}`;

const esc = (t) =>
  String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const univNames = () => [...new Set(DEPARTMENTS.map((d) => d.univ.replace(/\(.*\)/, "")))];

// 입력값(원래 입력 그대로) ↔ URL 쿼리
// mode=pct: k/m/t1/t2 는 백분위, mode=grade: 등급(1~9)
function inputToQuery(input) {
  const p = new URLSearchParams();
  for (const k of ["track", "mode", "k", "m", "t1", "t2", "e"]) p.set(k, input[k]);
  return p.toString();
}

function inputFromQuery(search = location.search) {
  const p = new URLSearchParams(search);
  const input = {};
  for (const k of ["track", "mode", "k", "m", "t1", "t2", "e"]) input[k] = p.get(k);
  if (!input.track || !input.k || !input.m || !input.t1 || !input.t2 || !input.e) return null;
  if (input.track !== "인문" && input.track !== "자연") return null;
  if (input.mode !== "grade") input.mode = "pct";
  return input;
}

// 입력값 → 계산용 점수(백분위)
function toScores(input) {
  const pct = (v) => {
    const n = Number(v);
    if (input.mode === "grade") return GRADE_TO_PCT[Math.min(9, Math.max(1, Math.round(n))) - 1];
    return Math.min(100, Math.max(0, n));
  };
  const s = {
    track: input.track,
    mode: input.mode,
    korean: pct(input.k),
    math: pct(input.m),
    inquiry: (pct(input.t1) + pct(input.t2)) / 2,
    english: Math.min(9, Math.max(1, Math.round(Number(input.e)))),
  };
  s.avg = (s.korean + s.math + s.inquiry) / 3;
  return s;
}

function warnings(s, d) {
  const w = [];
  if (d.english != null && s.english > d.english) w.push(`영어 70%컷 ${d.english}등급`);
  return w;
}

function evaluate(s) {
  return DEPARTMENTS.filter((d) => d.track === s.track || d.track === "공통")
    .map((d) => {
      const diff = s.avg - d.cut;
      const level = LEVELS.find((l) => diff >= l.min).key;
      return { ...d, diff, level, warns: warnings(s, d) };
    })
    .sort((a, b) => b.cut - a.cut);
}

// data-year / data-univ-count / data-dept-count 속성을 가진 요소에 값 채우기
function fillDataInfo() {
  const values = {
    year: DATA_INFO.year,
    "univ-count": univNames().length,
    "dept-count": DEPARTMENTS.length.toLocaleString(),
  };
  for (const [key, val] of Object.entries(values)) {
    document.querySelectorAll(`[data-${key}]`).forEach((el) => (el.textContent = val));
  }
}

function saveInput(input) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  } catch {}
}

function loadInput() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

fillDataInfo();
