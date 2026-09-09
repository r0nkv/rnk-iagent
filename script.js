(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('.reveal');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!navToggle || !nav) return;

  function closeNav() {
    nav.classList.remove('is-open');
    navToggle.classList.remove('is-active');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menú');
  }

  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    navToggle.classList.toggle('is-active', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      closeNav();
      navToggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!nav.classList.contains('is-open')) return;
    if (nav.contains(event.target) || navToggle.contains(event.target)) return;
    closeNav();
  });

  const header = document.querySelector('.site-header');
  const backToTop = document.querySelector('.back-to-top');

  // Umbral que evita que el header reaccione a movimientos mínimos del dedo
  const DIRECTION_TOLERANCE = 8;
  const ALWAYS_VISIBLE_ZONE = 90;
  const BACK_TO_TOP_OFFSET = 700;

  let lastY = window.pageYOffset;
  let ticking = false;

  function onScrollFrame() {
    ticking = false;
    const y = Math.max(0, window.pageYOffset);
    const delta = y - lastY;

    if (backToTop) {
      backToTop.classList.toggle('is-visible', y > BACK_TO_TOP_OFFSET);
    }

    // Con el menú abierto el header debe permanecer anclado
    if (header && !nav.classList.contains('is-open')) {
      if (y <= ALWAYS_VISIBLE_ZONE) {
        header.classList.remove('site-header--hidden');
      } else if (delta > DIRECTION_TOLERANCE) {
        header.classList.add('site-header--hidden');
      } else if (delta < -DIRECTION_TOLERANCE) {
        header.classList.remove('site-header--hidden');
      }
    }

    if (Math.abs(delta) > DIRECTION_TOLERANCE || y <= ALWAYS_VISIBLE_ZONE) {
      lastY = y;
    }
  }

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScrollFrame);
  }, { passive: true });

  onScrollFrame();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      if (header) header.classList.remove('site-header--hidden');
    });
  }
})();
