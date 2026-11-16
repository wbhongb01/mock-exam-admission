const univEl = document.getElementById("univ");
const deptEl = document.getElementById("dept");
const detailEl = document.getElementById("detail");
const listEl = document.getElementById("univ-list");
const trackEls = document.querySelectorAll('input[name="track"]');

// 백분위 → "1등급 (상위)" 처럼 등급과 등급 안에서의 위치
function gradeLabel(p) {
  const g = pctToGrade(p);
  const lo = g === 9 ? 0 : GRADE_BOUNDS[g - 1];
  const hi = g === 1 ? 100 : GRADE_BOUNDS[g - 2];
  const pos = hi === lo ? 1 : (p - lo) / (hi - lo);
  const where = pos >= 0.66 ? "상위" : pos >= 0.33 ? "중위" : "하위";
  return `${g}등급 ${where}`;
}

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const track = () => document.querySelector('input[name="track"]:checked').value;
const inTrack = (d) => track() === "전체" || d.track === track() || d.track === "공통";

function fillUnivs(selected) {
  const univs = [...new Set(DEPARTMENTS.filter(inTrack).map((d) => d.univ))];
  univEl.innerHTML = univs.map((u) => `<option>${esc(u)}</option>`).join("");
  univEl.value = univs.includes(selected) ? selected : univs[0];
}

function fillDepts(selected) {
  const depts = DEPARTMENTS.filter((d) => d.univ === univEl.value && inTrack(d)).sort((a, b) => b.cut - a.cut);
  deptEl.innerHTML =
    `<option value="">— 학교 전체 학과 보기 —</option>` +
    depts.map((d) => `<option value="${esc(d.dept)}">${esc(d.dept)}</option>`).join("");
  deptEl.value = depts.some((d) => d.dept === selected) ? selected : "";
  document.getElementById("dept-count").textContent = `${depts.length}개`;
}

function syncUrl() {
  const p = new URLSearchParams({ track: track(), univ: univEl.value });
  if (deptEl.value) p.set("dept", deptEl.value);
  history.replaceState(null, "", `target.html?${p}`);
}

function render() {
  syncUrl();
  const d = DEPARTMENTS.find((x) => x.univ === univEl.value && x.dept === deptEl.value);
  if (d) {
    listEl.innerHTML = "";
    renderDetail(d);
  } else {
    detailEl.innerHTML = "";
    renderUnivList();
  }
}

function renderDetail(d) {
  const s = d.subjects;
  const ranges = [
    ["안정", d.cut + 2, null],
    ["적정", d.cut, d.cut + 2],
    ["소신", d.cut - 2, d.cut],
    ["도전", d.cut - 4, d.cut - 2],
  ];
  const clamp = (v) => Math.min(100, Math.max(0, v));
  // 100점(만점)을 넘는 구간은 실제로 불가능하므로 따로 표시
  const rangeText = (lo, hi) => {
    if (lo > 100) return "해당 없음 (만점보다 높음)";
    if (hi == null || hi > 100) return `${fmt(clamp(lo))} 이상`;
    return `${fmt(clamp(lo))} ~ ${fmt(hi)} 미만`;
  };

  // 저장된 내 성적이 있으면 비교
  const saved = loadInput();
  const meAvg = saved ? toScores(saved).avg : null;

  // 위치 게이지: 합격선 기준 판정 구간을 색 띠로, 합격선·내 점수를 표시
  const lo = Math.max(0, Math.floor(Math.min(d.cut - 8, meAvg ?? 100) - 1));
  const hi = 100;
  const pct = (v) => ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 100;
  const bounds = [lo, d.cut - 4, d.cut - 2, d.cut, d.cut + 2, hi].map((v) => Math.min(hi, Math.max(lo, v)));
  const zones = bounds.slice(1).map((b, i) => b - bounds[i]);
  const scale = `
    <div class="scale">
      <div class="scale-bar">
        ${zones.map((w, i) => (w > 0 ? `<span class="z${i}" style="flex:${w}" title="${["어려움", "도전", "소신", "적정", "안정"][i]}"></span>` : "")).join("")}
        <div class="marker cut" style="left:${pct(d.cut)}%">합격선 ${d.cut.toFixed(1)}</div>
        ${meAvg != null ? `<div class="marker me" style="left:${pct(meAvg)}%">나 ${meAvg.toFixed(1)}</div>` : ""}
      </div>
      <div class="scale-ticks"><span>${lo}</span><span>${Math.round((lo + hi) / 2)}</span><span>100</span></div>
    </div>`;
  let mine = `<p class="small-note">내 성적과 비교하려면 <a href="input.html">성적을 입력</a>하세요.</p>`;
  if (saved) {
    const me = toScores(saved);
    const diff = me.avg - d.cut;
    const level = LEVELS.find((l) => diff >= l.min).key;
    const sign = diff >= 0 ? "+" : "";
    mine = `
      <div class="compare">
        <span>내 국수탐 평균 <b>${me.avg.toFixed(1)}</b> (${gradeLabel(me.avg)})</span>
        <span class="badge ${level}">${level}</span>
        <span class="diff ${diff >= 0 ? "up" : "down"}">${sign}${diff.toFixed(1)}</span>
        ${diff < 0 ? `<span class="small-note">합격선까지 평균 ${(-diff).toFixed(1)}점 더 필요해요</span>` : ""}
      </div>`;
  }

  detailEl.innerHTML = `
    <div class="card target-card">
      <div class="target-head">
        <div>
          <h2>${esc(d.univ)} ${esc(d.dept)}</h2>
          <p class="small-note">${d.gun ? d.gun + "군 · " : ""}${d.track === "공통" ? "인문·자연 공통" : d.track + "계열"} · ${esc(d.region)}
            · <a href="${ADIGA_URL(d.code)}" target="_blank" rel="noopener">대학어디가 원자료</a></p>
        </div>
        <div class="target-cut">
          <span>합격선 (국수탐 평균 백분위)</span>
          <b>${d.cut.toFixed(1)}</b>
          <em>약 ${gradeLabel(d.cut)}</em>
        </div>
      </div>

      ${scale}
      ${mine}

      <h3>합격자(70% 위치) 과목별 성적</h3>
      <table class="data-table">
        <tr><th>과목</th><th>국어</th><th>수학</th><th>탐구 평균</th><th>영어</th></tr>
        <tr><th>백분위</th><td>${fmt(s.korean)}</td><td>${fmt(s.math)}</td><td>${fmt(s.inquiry)}</td><td>—</td></tr>
        <tr><th>등급(대략)</th><td>${pctToGrade(s.korean)}등급</td><td>${pctToGrade(s.math)}등급</td><td>${pctToGrade(s.inquiry)}등급</td>
          <td>${d.english != null ? d.english + "등급" : "—"}</td></tr>
      </table>
      <p class="small-note">과목별 값은 70% 위치에 있는 <b>한 학생</b>의 성적이라 과목마다 들쭉날쭉할 수 있어요. 국·수·탐 <b>평균</b>을 기준으로 보세요.</p>

      <h3>내 국수탐 평균이 이 정도면</h3>
      <table class="data-table">
        <tr><th>판정</th><th>필요한 국수탐 평균 백분위</th><th>등급으로 보면</th></tr>
        ${ranges
          .map(
            ([k, lo, hi]) => `<tr><td><span class="badge ${k}">${k}</span></td><td>${rangeText(lo, hi)}</td>
              <td>${lo > 100 ? "—" : gradeLabel(clamp(lo)) + " 이상"}</td></tr>`
          )
          .join("")}
      </table>
      ${d.english != null ? `<p class="small-note">영어는 <b>${d.english}등급 이내</b>를 함께 맞추는 게 좋아요 (70% 합격자 기준).</p>` : ""}
    </div>`;
}

function renderUnivList() {
  const depts = DEPARTMENTS.filter((d) => d.univ === univEl.value && inTrack(d)).sort((a, b) => b.cut - a.cut);
  listEl.innerHTML = `
    <div class="card">
      <h2 class="list-title">${esc(univEl.value)} 학과별 합격선 <small>(${depts.length}개, 높은 순)</small></h2>
      <div class="table-scroll">
        <table class="data-table clickable">
          <thead><tr><th>학과</th><th>계열</th><th>합격선<br /><small>국수탐 평균</small></th><th>등급(대략)</th><th>영어</th></tr></thead>
          <tbody>
            ${depts
              .map(
                (d) => `<tr data-dept="${esc(d.dept)}" tabindex="0">
                  <td class="left">${esc(d.dept)} <small>${d.gun ? d.gun + "군" : ""}</small></td>
                  <td>${d.track}</td><td><b>${d.cut.toFixed(1)}</b></td><td>${gradeLabel(d.cut)}</td>
                  <td>${d.english != null ? d.english + "등급" : "—"}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <p class="small-note">학과를 누르면 자세히 볼 수 있어요.</p>
    </div>`;
}

listEl.addEventListener("click", (e) => {
  const tr = e.target.closest("tr[data-dept]");
  if (!tr) return;
  deptEl.value = tr.dataset.dept;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
listEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") e.target.closest("tr[data-dept]")?.click();
});

trackEls.forEach((el) =>
  el.addEventListener("change", () => {
    fillUnivs(univEl.value);
    fillDepts(deptEl.value);
    render();
  })
);
univEl.addEventListener("change", () => {
  fillDepts("");
  render();
});
deptEl.addEventListener("change", render);

// 시작: 주소의 track/univ/dept → 없으면 저장된 내 계열
const params = new URLSearchParams(location.search);
const startTrack = params.get("track") || loadInput()?.track || "전체";
const radio = document.querySelector(`input[name="track"][value="${startTrack}"]`);
if (radio) radio.checked = true;
fillUnivs(params.get("univ"));
fillDepts(params.get("dept"));
render();
