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
  window.matchMedia("(min-width: 861px)").addEventListener("change", function (e) {
    if (e.matches) set(false);
  });
})();
