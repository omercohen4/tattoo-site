// תפריט הנגישות: הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, גופן קריא ועצירת אנימציות.
// הבחירות נשמרות בדפדפן של המבקר. הן מופעלות כבר בראש העמוד (ב-<head>), כדי שלא יהבהב.
(function () {
  'use strict';

  var KEY = 'a11y';
  var MAX_TEXT = 3;
  var root = document.documentElement;
  var panel = document.getElementById('a11y');
  // מה שפותח את התפריט: שורת "נגישות" בתפריט הצד (או בפס העליון), והכפתור שמופיע במקלדת ליד "דלג לתוכן"
  var openers = Array.prototype.slice.call(document.querySelectorAll('[data-a11y-open]'));
  if (!panel || !openers.length) return;
  var lastOpener = null;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function write(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* גלישה פרטית: הבחירה פשוט לא נשמרת */ }
  }

  var state = read();

  function apply() {
    for (var i = 1; i <= MAX_TEXT; i++) root.classList.toggle('a11y-t' + i, state.text === i);
    ['contrast', 'links', 'font', 'calm'].forEach(function (k) {
      root.classList.toggle('a11y-' + k, !!state[k]);
      var b = panel.querySelector('[data-a11y="' + k + '"]');
      if (b) b.setAttribute('aria-pressed', String(!!state[k]));
    });
    var level = panel.querySelector('.a11y__level');
    if (level) level.textContent = state.text ? '+' + state.text : 'רגיל';
    panel.querySelector('[data-a11y="smaller"]').disabled = !state.text;
    panel.querySelector('[data-a11y="bigger"]').disabled = state.text === MAX_TEXT;
  }

  function setOpen(open) {
    openers.forEach(function (o) { o.setAttribute('aria-expanded', String(open)); });
    panel.hidden = !open;
    // התפריט הצדדי נסגר באותה לחיצה, אז ממתינים רגע לפני שמעבירים אליו את המקלדת
    if (open) requestAnimationFrame(function () { panel.querySelector('button').focus(); });
  }

  // כשסוגרים, המקלדת חוזרת למה שפתח את התפריט. אם זה היה בתוך תפריט הצד (שכבר נסגר), חוזרים לכפתור התפריט
  function returnFocus() {
    var target = lastOpener;
    if (!target || target.closest('.menu')) target = document.querySelector('.menu-btn') || document.getElementById('main');
    if (target) target.focus();
  }

  openers.forEach(function (o) {
    o.addEventListener('click', function () {
      lastOpener = o;
      setOpen(panel.hidden);
    });
  });

  panel.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a11y]');
    if (!b) return;
    var k = b.dataset.a11y;
    if (k === 'close') { setOpen(false); returnFocus(); return; }
    if (k === 'bigger') state.text = Math.min(MAX_TEXT, (state.text || 0) + 1);
    else if (k === 'smaller') state.text = Math.max(0, (state.text || 0) - 1);
    else if (k === 'reset') {
      var wasCalm = state.calm;
      state = {};
      write(state);
      // האנימציות כבר נעצרו בעמוד הזה, אז כדי להחזיר אותן טוענים את העמוד מחדש
      if (wasCalm) { location.reload(); return; }
    } else {
      state[k] = !state[k];
      if (k === 'calm') {
        write(state);
        if (state.calm) { if (window.stopMotion) window.stopMotion(); }
        else { location.reload(); return; }
      }
    }
    write(state);
    apply();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); returnFocus(); }
  });
  document.addEventListener('click', function (e) {
    if (!panel.hidden && !panel.contains(e.target) && !e.target.closest('[data-a11y-open]')) setOpen(false);
  });

  apply();
})();
