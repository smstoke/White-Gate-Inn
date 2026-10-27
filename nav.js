(function () {
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav__toggle");
  if (!nav || !toggle) return;

  function set(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  toggle.addEventListener("click", function () {
    set(!nav.classList.contains("is-open"));
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest(".nav__links a")) set(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") set(false);
  });
  window.matchMedia("(min-width: 961px)").addEventListener("change", function (e) {
    if (e.matches) set(false);
  });

  /* Clear nav over the hero, solid once the page scrolls */
  function onScroll() {
    nav.classList.toggle("is-solid", window.scrollY > 40);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Fade-up reveals. Everything shows after 2.5s even if the observer never fires. */
  var items = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window) || !items.length ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.documentElement.classList.add("reveal-on");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  items.forEach(function (el) { io.observe(el); });
  setTimeout(function () { items.forEach(function (el) { el.classList.add("is-in"); }); }, 2500);
})();
