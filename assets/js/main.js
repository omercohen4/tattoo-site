(function () {
  'use strict';

  var work = document.getElementById('work');
  var items = work ? Array.prototype.slice.call(work.querySelectorAll('.work__item')) : [];

  // סינון: קעקועים או ציורים, 6 עבודות בכל עמוד. כשאין עבודות בסוג שנבחר, מופיעה הודעה במקומן
  var PER_PAGE = 6;
  var empty = work ? work.querySelector('.work__empty') : null;
  var pager = work ? work.querySelector('.pager') : null;
  var pagerCount = pager ? pager.querySelector('.pager__count') : null;
  var current = { type: 'tattoo', page: 1 };

  function render() {
    var ofType = items.filter(function (li) { return li.dataset.style === current.type; });
    var pages = Math.max(1, Math.ceil(ofType.length / PER_PAGE));
    current.page = Math.min(current.page, pages);
    var first = (current.page - 1) * PER_PAGE;
    items.forEach(function (li) { li.hidden = true; li.classList.remove('is-offset'); });
    ofType.slice(first, first + PER_PAGE).forEach(function (li, i) {
      li.hidden = false;
      // כל עבודה שנייה יורדת קצת, כדי שהעמודות יהיו מדורגות
      li.classList.toggle('is-offset', i % 2 === 1);
    });
    if (empty) empty.hidden = ofType.length > 0;
    work.querySelectorAll('[data-filter]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.filter === current.type));
    });
    if (pager) {
      pager.hidden = pages < 2;
      pagerCount.textContent = current.page + ' / ' + pages;
      pagerCount.setAttribute('aria-label', 'עמוד ' + current.page + ' מתוך ' + pages);
      pager.querySelector('[data-page="prev"]').disabled = current.page === 1;
      pager.querySelector('[data-page="next"]').disabled = current.page === pages;
    }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  // מעבר בין לשוניות או עמודים לא מזיז את הדף: הלשוניות נשארות באותו מקום על המסך,
  // ואם גללו לתוך העבודות, חוזרים לתחילת הרשימה, ממש מתחת ללשוניות
  var controls = work ? work.querySelector('.work__controls') : null;
  var list = work ? work.querySelector('.work__list') : null;
  function update(change, toListStart) {
    var before = controls.getBoundingClientRect().top;
    var wasInsideList = toListStart || list.getBoundingClientRect().top < before;
    change();
    render();
    var y = window.scrollY + (controls.getBoundingClientRect().top - before);
    if (wasInsideList) {
      y = window.scrollY + list.getBoundingClientRect().top - controls.getBoundingClientRect().bottom - 16;
    }
    window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
  }

  if (work) {
    render();
    work.addEventListener('click', function (e) {
      var tab = e.target.closest('button[data-filter]');
      if (tab && tab.getAttribute('aria-pressed') !== 'true') {
        update(function () { current.type = tab.dataset.filter; current.page = 1; });
      }
      var step = e.target.closest('.pager button');
      if (step && !step.disabled) {
        update(function () {
          current.page += step.dataset.page === 'next' ? 1 : -1;
        }, true);
      }
    });
  }

  // גלילה חלקה לקישורים בתוך הדף (במקום scroll-behavior ב-CSS, שמתנגש עם ספריית האנימציות)
  var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
    history.replaceState(null, '', a.getAttribute('href'));
  });

  // תפריט ☰: מגירה בצד, נסגרת בלחיצה על קישור, מחוץ למגירה, על הכפתור או על Esc
  var menuBtn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'סגירת התפריט' : 'פתיחת התפריט');
    document.body.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      menu.querySelector('a').focus();
    } else {
      menu.classList.remove('is-open');
      setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 300);
    }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      // לחיצה על קישור, או על האזור הכהה שמחוץ למגירה, סוגרת את התפריט
      if (e.target.closest('a') || e.target === menu) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuBtn.focus();
      }
    });
  }

  // ביקורות: החצים מגלגלים כרטיס אחד בכל לחיצה, ונכבים בקצוות
  var reviewList = document.querySelector('.reviews__list');
  if (reviewList) {
    var revPrev = document.querySelector('[data-review="prev"]');
    var revNext = document.querySelector('[data-review="next"]');
    var revStep = function () {
      var first = reviewList.querySelector('.review');
      return first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(reviewList).columnGap || 0) : 0;
    };
    var revUpdate = function () {
      var max = reviewList.scrollWidth - reviewList.clientWidth;
      var pos = Math.abs(reviewList.scrollLeft); // בעברית הגלילה היא לשמאל, והערך שלילי
      revPrev.disabled = pos < 4;
      revNext.disabled = pos > max - 4;
    };
    var revGo = function (dir) {
      var smoothRev = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      reviewList.scrollBy({ left: -dir * revStep(), behavior: smoothRev ? 'smooth' : 'auto' });
    };
    revPrev.addEventListener('click', function () { revGo(-1); });
    revNext.addEventListener('click', function () { revGo(1); });
    reviewList.addEventListener('scroll', revUpdate, { passive: true });
    window.addEventListener('resize', revUpdate);
    revUpdate();
  }

  // כרטיס הביקור: לחיצה על הלוגו בפס העליון פותחת אותו, והוא "גדל" מהלוגו למרכז המסך
  var logoBtn = document.querySelector('.bar__logo-btn');
  var card = document.getElementById('card');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // תנועה מהמיקום והגודל של הלוגו אל המיקום של הכרטיס (או בחזרה)
  function fromLogo() {
    var a = logoBtn.getBoundingClientRect();
    var b = card.getBoundingClientRect();
    var s = Math.max(a.height / b.height, 0.08);
    var dx = (a.left + a.width / 2) - (b.left + b.width / 2);
    var dy = (a.top + a.height / 2) - (b.top + b.height / 2);
    return [
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', opacity: 0.2 },
      { transform: 'none', opacity: 1 }
    ];
  }

  function openCard() {
    card.showModal();
    document.body.classList.add('card-open');
    if (!calm && card.animate) card.animate(fromLogo(), { duration: 450, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }

  function closeCard() {
    if (!card.open) return;
    var done = function () {
      card.close();
      document.body.classList.remove('card-open');
      logoBtn.focus();
    };
    if (calm || !card.animate) return done();
    var anim = card.animate(fromLogo().reverse(), { duration: 320, easing: 'cubic-bezier(.4,0,.6,1)' });
    anim.onfinish = done;
  }

  if (logoBtn && card && card.showModal) {
    logoBtn.addEventListener('click', openCard);
    card.querySelector('.card__close').addEventListener('click', closeCard);
    // Esc ולחיצה על האזור הכהה שמחוץ לכרטיס סוגרים אותו, עם אותה תנועה בחזרה ללוגו
    card.addEventListener('cancel', function (e) { e.preventDefault(); closeCard(); });
    card.addEventListener('click', function (e) { if (e.target === card) closeCard(); });
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
      var s = window.innerWidth < 760 ? 0.36 : 0.62;
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

  // הפתיח מוסתר כרגע (בהערה ב-index.html); האנימציות שלו רצות רק אם הוא חוזר
  if (document.querySelector('.hero')) {
    gsap.from('.hero__title, .hero .lead, .hero .actions', { y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 });
    gsap.from('.hero__video', { scale: 1.08, duration: 1.8, ease: 'power3.out' });
  }

  // העבודות עולות מתחת לכותרת הנעוצה
  items.forEach(function (li) {
    gsap.from(li.querySelector('.work__media'), {
      y: 80, opacity: 0, scale: 0.94, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: li, start: 'top 88%', once: true }
    });
  });

  // כניסה מדורגת לכל קבוצת תוכן
  document.querySelectorAll('main section:not(.hero) [data-reveal-group]').forEach(function (group) {
    var parts = group.querySelectorAll('[data-reveal]');
    if (!parts.length) return;
    gsap.from(parts, {
      y: 28, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: group, start: 'top 85%', once: true }
    });
  });

  document.querySelectorAll('.how .h2, .faq .h2, .reviews .h2, .contact .h2').forEach(function (h) {
    gsap.from(h, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });

  gsap.from('.contact__phone', {
    y: 40, opacity: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.contact__phone', start: 'top 90%', once: true }
  });
})();
