const form = document.getElementById("score-form");
const PCT_FIELDS = ["k", "m", "t1", "t2"];
const gradeHint = document.getElementById("grade-hint");

// 백분위 입력칸 ↔ 등급 선택칸 바꾸기 (입력한 값은 가능한 한 옮겨 줌)
function setMode(mode) {
  for (const name of PCT_FIELDS) {
    const old = form.elements[name];
    const unit = old.closest(".field").querySelector(".unit");
    let el;
    if (mode === "grade") {
      el = document.createElement("select");
      for (let g = 1; g <= 9; g++) el.add(new Option(`${g}등급`, g));
      el.value = old.tagName === "SELECT" ? old.value : old.value === "" ? 3 : pctToGrade(+old.value);
      unit.textContent = "등급";
    } else {
      el = document.createElement("input");
      Object.assign(el, { type: "number", min: 0, max: 100, required: true });
      el.value = old.tagName === "SELECT" ? GRADE_TO_PCT[old.value - 1] : old.value;
      unit.textContent = "백분위";
    }
    el.name = name;
    old.replaceWith(el);
  }
  gradeHint.hidden = mode !== "grade";
}

form.querySelectorAll('input[name="mode"]').forEach((r) =>
  r.addEventListener("change", () => setMode(r.value))
);

function fill(input) {
  if (!input) return;
  form.elements.track.value = input.track;
  if (input.mode === "grade") {
    form.elements.mode.value = "grade";
    setMode("grade");
  }
  for (const k of ["k", "m", "t1", "t2", "e"]) if (input[k] != null) form.elements[k].value = input[k];
}

document.getElementById("sample-btn").addEventListener("click", () => {
  form.elements.mode.value = "pct";
  setMode("pct");
  fill({ track: form.elements.track.value, mode: "pct", k: 91, m: 88, t1: 90, t2: 85, e: 2 });
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = form.elements;
  const input = {
    track: f.track.value,
    mode: f.mode.value,
    k: f.k.value,
    m: f.m.value,
    t1: f.t1.value,
    t2: f.t2.value,
    e: f.e.value,
  };
  saveInput(input);
  location.href = `result.html?${inputToQuery(input)}`;
});

// 실시간 미리보기: 입력할 때마다 국수탐 평균과 판정별 학과 수 표시
function currentInput() {
  const f = form.elements;
  return { track: f.track.value, mode: f.mode.value, k: f.k.value, m: f.m.value, t1: f.t1.value, t2: f.t2.value, e: f.e.value };
}

function updateLive() {
  const input = currentInput();
  const ring = document.getElementById("ring");
  const avgEl = document.getElementById("live-avg");
  const gradeEl = document.getElementById("live-grade");
  const descEl = document.getElementById("live-desc");
  const levelsEl = document.getElementById("live-levels");
  const filled = ["k", "m", "t1", "t2"].every((k) => input[k] !== "" && input[k] != null);
  if (!filled) {
    ring.style.background = "conic-gradient(var(--line) 0 100%)";
    avgEl.textContent = "–";
    gradeEl.textContent = "점수를 넣으면 바로 계산해 드려요";
    descEl.textContent = "국어·수학·탐구 두 과목을 모두 넣어 주세요.";
    levelsEl.innerHTML = "";
    return;
  }
  const s = toScores(input);
  const results = evaluate(s);
  const count = (k) => results.filter((r) => r.level === k).length;
  ring.style.background = `conic-gradient(var(--accent) ${s.avg}%, var(--line) 0)`;
  avgEl.textContent = s.avg.toFixed(1);
  gradeEl.textContent = `평균 약 ${pctToGrade(s.avg)}등급 수준이에요`;
  descEl.textContent = `${s.track}계열 ${results.length}개 모집단위 기준`;
  levelsEl.innerHTML = ["안정", "적정", "소신", "도전"].map((k) => `<span class="${k}">${k} ${count(k)}</span>`).join("");
}

form.addEventListener("input", updateLive);
form.addEventListener("change", updateLive);
document.getElementById("sample-btn").addEventListener("click", updateLive);

// 결과 페이지에서 '성적 수정'으로 돌아온 경우엔 URL 값, 아니면 지난번 입력값
fill(inputFromQuery() || loadInput());
updateLive();
