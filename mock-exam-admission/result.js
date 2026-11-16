const groupsEl = document.getElementById("groups");
const summaryEl = document.getElementById("summary");
const qEl = document.getElementById("q");
const regionEl = document.getElementById("region");
const showHardEl = document.getElementById("show-hard");

// URL에 성적이 있으면 그것을, 없으면 이 브라우저에 기억된 마지막 입력을 사용
let input = inputFromQuery();
if (!input) {
  input = loadInput();
  if (input) history.replaceState(null, "", `result.html?${inputToQuery(input)}`);
}

if (!input) {
  document.getElementById("no-input").hidden = false;
} else {
  start(input);
}

function start(input) {
  const s = toScores(input);
  const results = evaluate(s);
  const back = `input.html?${inputToQuery(input)}`;
  document.getElementById("edit-btn").href = back;
  document.getElementById("progress-input").href = back;

  [...new Set(DEPARTMENTS.map((d) => d.region))].forEach((r) => regionEl.add(new Option(r, r)));
  document.getElementById("legend").innerHTML =
    "내 국수탐 평균 − 70%컷: " +
    LEVELS.slice(0, 4).map((l) => `<span class="badge ${l.key}">${l.key}</span> ${l.desc}`).join(" ");

  renderSummary(s, results);
  const render = () => renderList(results);
  [qEl, regionEl, showHardEl].forEach((el) => el.addEventListener("input", render));
  render();
  document.getElementById("results").hidden = false;
}

function renderSummary(s, results) {
  const counts = Object.fromEntries(LEVELS.map((l) => [l.key, 0]));
  results.forEach((r) => counts[r.level]++);
  const best = results.find((r) => (r.level === "적정" || r.level === "안정") && !r.warns.length);
  const unit = s.mode === "grade" ? " (등급 → 대표 백분위)" : "";

  summaryEl.innerHTML = `
    <div class="stats">
      <div class="main"><b>${s.avg.toFixed(1)}</b><span>내 국수탐 평균</span></div>
      <div><b>${s.track}</b><span>계열</span></div>
      <div><b>${s.korean}</b><span>국어${unit}</span></div>
      <div><b>${s.math}</b><span>수학${unit}</span></div>
      <div><b>${s.inquiry.toFixed(1)}</b><span>탐구 평균${unit}</span></div>
      <div><b>${s.english}등급</b><span>영어</span></div>
    </div>
    <div class="count-bar">
      ${LEVELS.slice(0, 4)
        .map((l) => `<div class="count ${l.key}"><b>${counts[l.key]}</b><span>${l.key}</span></div>`)
        .join("")}
    </div>
    ${best ? `<p>70%컷이 가장 높은 <b>적정</b> 이상 모집단위: <b>${esc(best.univ)} ${esc(best.dept)}</b></p>` : ""}
    ${s.mode === "grade" ? `<p class="warn-text">등급으로 입력해 오차가 큽니다. 성적표의 백분위를 넣으면 더 정확해요.</p>` : ""}
  `;
}

function renderList(results) {
  const q = qEl.value.trim();
  const region = regionEl.value;
  const showHard = showHardEl.checked;

  const visible = results.filter(
    (r) =>
      (!q || r.univ.includes(q) || r.dept.includes(q)) &&
      (!region || r.region === region) &&
      (showHard || r.level !== "어려움")
  );

  groupsEl.innerHTML = "";
  for (const { key } of LEVELS) {
    const items = visible.filter((r) => r.level === key);
    if (!items.length) continue;

    const section = document.createElement("section");
    section.className = "group";
    section.innerHTML = `<h2><span class="badge ${key}">${key}</span> ${items.length}개 모집단위</h2>`;
    const list = document.createElement("ul");
    list.className = "list";
    list.innerHTML = items.map(itemHtml).join("");
    section.appendChild(list);
    groupsEl.appendChild(section);
  }

  if (!groupsEl.children.length) {
    groupsEl.innerHTML = `<p class="empty">조건에 맞는 학과가 없어요. 검색어나 지역을 바꾸거나 '어려움도 보기'를 켜 보세요.</p>`;
  }
}

function itemHtml(r) {
  const sign = r.diff >= 0 ? "+" : "";
  const sub = r.subjects;
  return `
    <li class="${r.warns.length ? "warned" : ""}">
      <div class="name">
        <strong>${esc(r.univ)}</strong> ${esc(r.dept)}
        <small>${r.gun ? r.gun + "군 · " : ""}${esc(r.region)}</small>
        ${r.warns.map((w) => `<span class="warn">${esc(w)}</span>`).join("")}
        <div class="detail">70% 합격자 백분위 — 국 ${sub.korean} · 수 ${sub.math} · 탐 ${sub.inquiry}${
          r.english != null ? ` · 영어 ${r.english}등급` : ""
        } <a href="${ADIGA_URL(r.code)}" target="_blank" rel="noopener">출처</a></div>
      </div>
      <div class="nums">
        <span title="${DATA_INFO.year}학년도 최종등록자 70%컷 (국수탐 평균 백분위)">70%컷 ${r.cut.toFixed(1)}</span>
        <span class="diff ${r.diff >= 0 ? "up" : "down"}">${sign}${r.diff.toFixed(1)}</span>
      </div>
    </li>`;
}
