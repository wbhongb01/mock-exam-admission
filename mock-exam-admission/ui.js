// 페이지 공통 인터랙션: 스크롤 등장 효과, 숫자 카운트업, 상단 메뉴 그림자
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1) 스크롤하면 .reveal 요소가 부드럽게 나타남
  const revealAll = () => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
  if (reduce || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    const watch = () => document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
    watch();
    window.observeReveal = watch; // 동적으로 추가된 요소용
  }
  window.observeReveal = window.observeReveal || revealAll;

  // 2) data-countup 숫자 카운트업 (표시 텍스트가 숫자일 때)
  window.countUp = (el, to, { duration = 900, decimals = 0 } = {}) => {
    if (reduce) return void (el.textContent = to.toFixed(decimals));
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (to * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  document.querySelectorAll("[data-countup]").forEach((el) => {
    const to = Number(el.textContent.replace(/,/g, ""));
    if (!Number.isFinite(to)) return;
    const run = () => countUp(el, to);
    if (reduce || !("IntersectionObserver" in window)) return run();
    const io = new IntersectionObserver((es) => es[0].isIntersecting && (run(), io.disconnect()));
    io.observe(el);
  });

  // 3) 스크롤하면 상단 메뉴에 그림자
  const nav = document.querySelector(".topnav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();
