(function () {
  'use strict';

  var work = document.getElementById('work');
  var items = work ? Array.prototype.slice.call(work.querySelectorAll('.work__item')) : [];

  // מעבר בין הסקיצה (הסטנסיל) לקעקוע הגמור
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

  // מי שביקש פחות תנועה: הסרטון בפתיח עוצר על תמונת הפתיחה
  var heroVideo = document.querySelector('.hero__video');
  if (heroVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }

  // ===== תנועה (GSAP) =====
  // התוכן גלוי גם בלי סקריפט; האנימציות רק מוסיפות כניסה.
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) return;

  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  // החתימה למעלה: סקיצה אפורה -> קווי דיו -> מילוי בדיו, לאורך כל הגלילה של העמוד
  var sigLines = document.querySelectorAll('.sig__line path');
  var clip = document.querySelector('.sig__clip');
  if (sigLines.length && clip) {
    var fullWidth = clip.getAttribute('width');
    sigLines.forEach(function (path) {
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
    });
    gsap.set(clip, { attr: { width: 0 } });

    var hand = document.querySelector('.hand');
    var sig = document.querySelector('.bar .sig');
    var vb = sig.viewBox.baseVal;
    var lens = Array.prototype.map.call(sigLines, function (path) { return path.getTotalLength(); });
    var hideTimer;

    // איפה המחט צריכה להיות: על הקו שנמשך עכשיו, ואחר כך על קצה המילוי
    function needlePoint(progress) {
      for (var i = 0; i < sigLines.length; i++) {
        var offset = parseFloat(sigLines[i].style.strokeDashoffset) || 0;
        if (offset > 0.5) return sigLines[i].getPointAtLength(lens[i] - offset);
      }
      var x = Math.max(vb.x, Math.min(parseFloat(clip.getAttribute('width')), vb.x + vb.width));
      var y = vb.y + vb.height * (0.5 + 0.32 * Math.sin(progress * 160));
      return { x: x, y: y };
    }

    function moveHand(progress) {
      if (!hand) return;
      var p = needlePoint(progress);
      var pt = sig.createSVGPoint();
      pt.x = p.x; pt.y = p.y;
      var screen = pt.matrixTransform(sig.getScreenCTM());
      var s = window.innerWidth < 760 ? 0.38 : 0.65;
      hand.style.transform = 'translate(' + (screen.x - 6) + 'px,' + (screen.y - 60) + 'px) rotate(-35deg) scale(' + -s + ',' + s + ')';
    }

    // קודם כל הקווים מסתיימים, ורק אז מתחיל המילוי, כדי שהמחט לא תקפוץ קדימה
    var inkTl = gsap.timeline({ paused: true, onUpdate: function () { moveHand(inkTl.progress()); } })
      .to(sigLines, { strokeDashoffset: 0, ease: 'none', duration: 0.18, stagger: 0.03 }, 0)
      .to(clip, { attr: { width: fullWidth }, ease: 'none', duration: 0.5 }, 0.46)
      .to('.sig__stencil', { opacity: 0, ease: 'none', duration: 0.2 }, 0.76);

    // הדיו רק מתקדם: מה שנצבע נשאר, גם כשגוללים חזרה למעלה
    var inked = 0;
    window.ScrollTrigger.create({
      trigger: document.documentElement, start: 'top top', end: 'bottom bottom',
      onUpdate: function (self) {
        if (self.progress <= inked + 0.0005) return;
        inked = self.progress;
        if (hand && inked < 0.999) {
          hand.classList.add('is-working');
          clearTimeout(hideTimer);
        }
        gsap.to(inkTl, {
          progress: inked, duration: 0.6, ease: 'power2.out', overwrite: true,
          onComplete: function () {
            if (!hand) return;
            hideTimer = setTimeout(function () { hand.classList.remove('is-working'); }, 250);
          }
        });
      }
    });
  }

  gsap.from('.hero__title, .hero .lead, .hero .actions', { y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 });
  gsap.from('.hero__video', { scale: 1.08, duration: 1.8, ease: 'power3.out' });

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
