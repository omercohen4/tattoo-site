(function () {
  'use strict';

  var work = document.getElementById('work');
  var items = work ? Array.prototype.slice.call(work.querySelectorAll('.work__item')) : [];

  // מעבר בין הסקיצה (הסטנסיל הסגול) לקעקוע הגמור
  function setView(view) {
    work.classList.toggle('is-stencil', view === 'stencil');
    work.classList.toggle('is-final', view !== 'stencil');
    work.querySelectorAll('[data-view]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.view === view));
    });
  }

  // סינון לפי סגנון
  function setFilter(style) {
    items.forEach(function (li) {
      li.hidden = style !== 'all' && li.dataset.style !== style;
    });
    work.querySelectorAll('[data-filter]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.filter === style));
    });
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  if (work) {
    work.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.view) setView(btn.dataset.view);
      if (btn.dataset.filter) setFilter(btn.dataset.filter);
    });
  }

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  // ===== תנועה (GSAP) =====
  // התוכן גלוי גם בלי סקריפט; האנימציות רק מוסיפות כניסה.
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) return;

  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  // הכותרת הראשית עולה שורה אחרי שורה
  gsap.from('.hero__title .line > span', { yPercent: 110, duration: 1, ease: 'power4.out', stagger: 0.12 });
  gsap.from('.hero [data-reveal]', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.09, delay: 0.35 });

  // התמונה הראשית: התקרבות עדינה בטעינה, ותזוזה איטית בגלילה
  gsap.from('.hero__media img, .hero__media video', { scale: 1.12, duration: 1.6, ease: 'power3.out' });
  gsap.to('.hero__media img, .hero__media video', {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  // העבודות עולות מתחת לכותרת הנעוצה
  items.forEach(function (li) {
    gsap.from(li.querySelector('.work__media'), {
      y: 80, opacity: 0, scale: 0.94, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: li, start: 'top 88%', once: true }
    });
  });

  // כניסה מדורגת לכל קבוצת תוכן
  document.querySelectorAll('main section:not(.hero) [data-reveal-group]').forEach(function (group) {
    gsap.from(group.querySelectorAll('[data-reveal]'), {
      y: 28, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: group, start: 'top 85%', once: true }
    });
  });

  document.querySelectorAll('.how .h2, .faq .h2, .contact .h2').forEach(function (h) {
    gsap.from(h, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });

  gsap.from('.about__media img', {
    scale: 1.15, ease: 'none',
    scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'center center', scrub: true }
  });

  gsap.from('.contact__phone', {
    y: 40, opacity: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.contact__phone', start: 'top 90%', once: true }
  });
})();
