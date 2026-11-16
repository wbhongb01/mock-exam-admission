const groupsEl = document.getElementById("groups");
const summaryEl = document.getElementById("summary");
const qEl = document.getElementById("q");
const regionEl = document.getElementById("region");
const levelButtonsEl = document.getElementById("level-buttons");

// 판정 필터: "전체"(어려움 제외) 또는 판정 하나. 주소의 #소신 처럼 시작 판정을 지정할 수도 있음
let levelFilter = "전체";

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
  const render = () => {
    renderLevelButtons(results);
    renderList(results);
  };
  [qEl, regionEl].forEach((el) => el.addEventListener("input", render));
  // 판정 버튼과 요약의 분포 막대 모두 클릭하면 그 판정만 보기
  const onPick = (e) => {
    const btn = e.target.closest("button[data-level]");
    if (!btn) return;
    levelFilter = btn.dataset.level;
    history.replaceState(null, "", levelFilter === "전체" ? location.pathname + location.search : `#${levelFilter}`);
    render();
    if (e.currentTarget === summaryEl) levelButtonsEl.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  levelButtonsEl.addEventListener("click", onPick);
  summaryEl.addEventListener("click", onPick);
  const hash = decodeURIComponent(location.hash.slice(1));
  if (LEVELS.some((l) => l.key === hash)) levelFilter = hash;
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
    <div class="dist" role="group" aria-label="판정별 학과 분포">
      ${LEVELS.filter((l) => counts[l.key] > 0)
        .map(
          (l) => `<button type="button" class="${l.key}" data-level="${l.key}" style="flex-grow:${counts[l.key]}"
            title="${l.key} ${counts[l.key]}개 — 눌러서 보기" aria-label="${l.key} ${counts[l.key]}개"></button>`
        )
        .join("")}
    </div>
    <p class="dist-legend">판정별 학과 분포 (전체 ${results.length}개) · 색깔 막대를 누르면 그 판정만 볼 수 있어요</p>
    ${best ? `<p>70%컷이 가장 높은 <b>적정</b> 이상 모집단위: <b>${esc(best.univ)} ${esc(best.dept)}</b></p>` : ""}
    ${s.mode === "grade" ? `<p class="warn-text">등급으로 입력해 오차가 큽니다. 성적표의 백분위를 넣으면 더 정확해요.</p>` : ""}
  `;
}

// 검색어·지역 조건만 적용한 목록 (판정 버튼의 개수 표시에 사용)
function searchFiltered(results) {
  const q = qEl.value.trim();
  const region = regionEl.value;
  return results.filter(
    (r) => (!q || r.univ.includes(q) || r.dept.includes(q)) && (!region || r.region === region)
  );
}

function renderLevelButtons(results) {
  const base = searchFiltered(results);
  const count = (key) => base.filter((r) => r.level === key).length;
  const buttons = [
    { key: "전체", label: "전체", n: base.filter((r) => r.level !== "어려움").length },
    ...LEVELS.map((l) => ({ key: l.key, label: l.key, n: count(l.key) })),
  ];
  levelButtonsEl.innerHTML = buttons
    .map(
      (b) => `<button type="button" class="level-btn ${b.key}" data-level="${b.key}"
        aria-pressed="${levelFilter === b.key}"><span>${b.label}</span><b>${b.n}</b></button>`
    )
    .join("");
}

function renderList(results) {
  const visible = searchFiltered(results).filter((r) =>
    levelFilter === "전체" ? r.level !== "어려움" : r.level === levelFilter
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
    const hint = levelFilter === "전체" ? "검색어나 지역을 바꿔 보세요." : "다른 판정을 고르거나 검색어·지역을 바꿔 보세요.";
    groupsEl.innerHTML = `<p class="empty">조건에 맞는 학과가 없어요. ${hint}</p>`;
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
        } <a href="${ADIGA_URL(r.code)}" target="_blank" rel="noopener">출처</a>
          <a href="target.html?univ=${encodeURIComponent(r.univ)}&dept=${encodeURIComponent(r.dept)}">자세히</a></div>
      </div>
      <div class="nums">
        <span class="pos" title="합격선 대비 내 위치 (왼쪽 도전 → 오른쪽 안정)"><i style="left:${Math.min(100, Math.max(0, ((r.diff + 4) / 8) * 100))}%"></i></span>
        <span title="${DATA_INFO.year}학년도 최종등록자 70%컷 (국수탐 평균 백분위)">70%컷 ${r.cut.toFixed(1)}</span>
        <span class="diff ${r.diff >= 0 ? "up" : "down"}">${sign}${r.diff.toFixed(1)}</span>
      </div>
    </li>`;
}
