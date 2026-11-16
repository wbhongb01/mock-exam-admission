const form = document.getElementById("score-form");
const PCT_FIELDS = ["k", "m", "t1", "t2"];
const gradeHint = document.getElementById("grade-hint");

function pctToGrade(p) {
  const bounds = [96, 89, 77, 60, 40, 23, 11, 4]; // 등급 경계 백분위
  const idx = bounds.findIndex((b) => p >= b);
  return idx === -1 ? 9 : idx + 1;
}

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

// 결과 페이지에서 '성적 수정'으로 돌아온 경우엔 URL 값, 아니면 지난번 입력값
fill(inputFromQuery() || loadInput());
