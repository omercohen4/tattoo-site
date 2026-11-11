(function () {
  'use strict';

  // פחות תנועה: לפי הגדרת המערכת של המבקר, או לפי "עצירת אנימציות" בתפריט הנגישות
  function lessMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('a11y-calm');
  }

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
      pagerCount.querySelector('.pager__num').textContent = current.page + ' / ' + pages;
      pagerCount.querySelector('.pager__sr').textContent = 'עמוד ' + current.page + ' מתוך ' + pages;
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

  // מעבר חלק: העבודות של העמוד הנוכחי נעלמות לצד אחד, הדף גולל בעדינות לתחילת הרשימה,
  // והעבודות החדשות נכנסות מהצד השני אחת אחרי השנייה
  var busy = false;
  var entranceCleared = false;
  function visibleMedia() {
    return items.filter(function (li) { return !li.hidden; }).map(function (li) { return li.querySelector('.work__media'); });
  }
  function transition(change, toListStart, dir) {
    var gsap = window.gsap;
    if (!gsap || lessMotion()) {
      update(change, toListStart);
      return;
    }
    if (busy) return;
    busy = true;
    // אנימציות הכניסה בגלילה מתנגשות עם המעבר, אז מבטלים אותן בפעם הראשונה
    if (!entranceCleared) {
      entranceCleared = true;
      (window.workEntrances || []).forEach(function (t) { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
      gsap.set(items.map(function (li) { return li.querySelector('.work__media'); }), { clearProps: 'opacity,transform' });
    }
    var shift = 48 * dir; // בעברית "הבא" נמצא משמאל: הישנות יוצאות ימינה, החדשות נכנסות משמאל
    var outgoing = visibleMedia();
    var wasInsideList = toListStart || list.getBoundingClientRect().top < controls.getBoundingClientRect().top;
    var target = null;
    if (wasInsideList) {
      target = Math.max(0, window.scrollY + list.getBoundingClientRect().top - controls.getBoundingClientRect().bottom - 16);
      window.scrollTo({ top: target, behavior: 'smooth' });
    }
    // מחכים שהגלילה תסתיים לפני שמחליפים את העבודות, כדי שהדף לא יקפוץ באמצע
    function afterScroll(cb) {
      var start = Date.now();
      (function check() {
        if (target === null || Math.abs(window.scrollY - target) < 2 || Date.now() - start > 1200) cb();
        else requestAnimationFrame(check);
      })();
    }
    if (!outgoing.length) { afterScroll(swap); return; }
    gsap.to(outgoing, {
      opacity: 0, x: shift, y: dir ? 0 : -24, duration: 0.35, ease: 'power2.in', stagger: 0.03,
      onComplete: function () { afterScroll(swap); }
    });
    function swap() {
      update(change, wasInsideList);
      gsap.set(outgoing, { clearProps: 'opacity,transform' });
      var incoming = visibleMedia();
      if (!incoming.length) { busy = false; return; }
      gsap.fromTo(incoming,
        { opacity: 0, x: -shift, y: dir ? 0 : 32 },
        { opacity: 1, x: 0, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07, clearProps: 'opacity,transform',
          onComplete: function () { busy = false; } });
    }
  }

  if (work) {
    render();
    work.addEventListener('click', function (e) {
      var tab = e.target.closest('button[data-filter]');
      if (tab && tab.getAttribute('aria-pressed') !== 'true') {
        transition(function () { current.type = tab.dataset.filter; current.page = 1; }, false, 0);
      }
      var step = e.target.closest('.pager button');
      if (step && !step.disabled) {
        var forward = step.dataset.page === 'next';
        transition(function () { current.page += forward ? 1 : -1; }, true, forward ? 1 : -1);
      }
    });
  }

  // גלילה חלקה לקישורים בתוך הדף (במקום scroll-behavior ב-CSS, שמתנגש עם ספריית האנימציות)
  var smooth = !lessMotion();
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
    // כשהתפריט פתוח, המקלדת וקוראי המסך נשארים בתוכו ובכפתור הסגירה, לא בעמוד שמאחוריו
    document.querySelectorAll('main, footer, .quick').forEach(function (el) { el.inert = open; });
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
      if (e.target.closest('a, [data-a11y-open]') || e.target === menu) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuBtn.focus();
      }
    });
  }

  // כניסה נסתרת לפאנל הניהול: לחיצה ארוכה (שנייה) על "Sahar Tzaig" בשורה התחתונה
  var adminLink = document.querySelector('.footer__admin');
  if (adminLink) {
    var holdTimer;
    var startHold = function () {
      holdTimer = setTimeout(function () { window.location.href = 'https://app.pagescms.org/'; }, 1000);
    };
    var stopHold = function () { clearTimeout(holdTimer); };
    adminLink.addEventListener('pointerdown', startHold);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { adminLink.addEventListener(ev, stopHold); });
    adminLink.addEventListener('contextmenu', function (e) { e.preventDefault(); });
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
      var smoothRev = !lessMotion();
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
  var calm = lessMotion();

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
  if (heroVideo && lessMotion()) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }

  // ===== תנועה (GSAP) =====
  // התוכן גלוי גם בלי סקריפט; האנימציות רק מוסיפות כניסה.
  var reduce = lessMotion();
  if (reduce || !window.gsap || !window.ScrollTrigger) return;

  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  // "עצירת אנימציות" בתפריט הנגישות: כל אנימציה קופצת למצב הסופי שלה ונעצרת
  window.stopMotion = function () {
    window.ScrollTrigger.getAll().forEach(function (st) {
      if (st.animation) st.animation.progress(1);
      st.kill();
    });
    gsap.globalTimeline.getChildren(true, true, true).forEach(function (t) { t.progress(1); });
    document.documentElement.classList.remove('intro');
    var h = document.querySelector('.hand');
    if (h) h.classList.remove('is-working');
  };

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

  // פתיחת העמוד: הרקע נמוג פנימה, התמונה של סהר נחשפת מלמטה,
  // שורות הכותרת עולות אחת אחרי השנייה, ואחריהן שאר החלק הראשון
  function splitLines(el) {
    var original = el.innerHTML;
    var sr = el.querySelector('.sr-only');
    var words = Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 3; })
      .map(function (n) { return n.textContent; }).join(' ').trim().split(/\s+/);
    var prefix = sr ? sr.outerHTML : '';
    el.innerHTML = prefix + words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    var lines = [];
    var lastTop = null;
    el.querySelectorAll('.w').forEach(function (w) {
      var top = w.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 4) { lines.push([]); lastTop = top; }
      lines[lines.length - 1].push(w.textContent);
    });
    el.innerHTML = prefix + lines.map(function (l) {
      return '<span class="line"><span class="line__in">' + l.join(' ') + '</span></span>';
    }).join('');
    return {
      inner: el.querySelectorAll('.line__in'),
      restore: function () { el.innerHTML = original; } // חוזרים לטקסט רגיל, כדי שהשורות יתחלקו נכון גם אחרי שינוי גודל
    };
  }

  var introItems = items.filter(function (li) {
    return !li.hidden && li.getBoundingClientRect().top < window.innerHeight;
  });

  function playIntro() {
    var title = document.querySelector('.work__title');
    var split = title ? splitLines(title) : null;
    var portrait = document.querySelector('.work__portrait');
    var media = introItems.map(function (li) { return li.querySelector('.work__media'); });

    gsap.set('.bar', { opacity: 0 });
    if (portrait) {
      gsap.set(portrait, { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set(portrait.querySelector('img'), { scale: 1.25 });
    }
    if (split) gsap.set(split.inner, { yPercent: 115 });
    gsap.set('.work__note, .work__controls', { y: 24, opacity: 0 });
    gsap.set(media, { y: 70, opacity: 0 });
    document.documentElement.classList.remove('intro');

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.bar', { opacity: 1, duration: 0.8 }, 0);
    if (portrait) {
      tl.to(portrait, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power4.inOut' }, 0.1)
        .to(portrait.querySelector('img'), { scale: 1, duration: 1.6 }, 0.1);
    }
    if (split) {
      tl.to(split.inner, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.12 }, 0.45)
        .add(split.restore);
    }
    tl.to('.work__note', { y: 0, opacity: 1, duration: 0.8 }, 0.95)
      .to('.work__controls', { y: 0, opacity: 1, duration: 0.8 }, 1.05)
      .to(media, { y: 0, opacity: 1, duration: 1, stagger: 0.1, clearProps: 'transform' }, 1.1);
  }

  // מחכים לפונט של הכותרת, כדי שהחלוקה לשורות תהיה נכונה
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1200); })]).then(playIntro);

  // הפתיח מוסתר כרגע (בהערה ב-index.html); האנימציות שלו רצות רק אם הוא חוזר
  if (document.querySelector('.hero')) {
    gsap.from('.hero__title, .hero .lead, .hero .actions', { y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 });
    gsap.from('.hero__video', { scale: 1.08, duration: 1.8, ease: 'power3.out' });
  }

  // העבודות עולות מתחת לכותרת הנעוצה
  items.forEach(function (li) {
    if (introItems.indexOf(li) !== -1) return; // אלה כבר נכנסים בפתיחה
    window.workEntrances = window.workEntrances || [];
    window.workEntrances.push(gsap.from(li.querySelector('.work__media'), {
      y: 80, opacity: 0, scale: 0.94, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: li, start: 'top 88%', once: true }
    }));
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
