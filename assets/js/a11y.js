// תפריט הנגישות: הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, גופן קריא ועצירת אנימציות.
// הבחירות נשמרות בדפדפן של המבקר. הן מופעלות כבר בראש העמוד (ב-<head>), כדי שלא יהבהב.
(function () {
  'use strict';

  var KEY = 'a11y';
  var MAX_TEXT = 3;
  var root = document.documentElement;
  var btn = document.querySelector('.a11y-btn');
  var panel = document.getElementById('a11y');
  if (!btn || !panel) return;

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
    btn.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    if (open) panel.querySelector('button').focus();
  }

  btn.addEventListener('click', function () {
    setOpen(btn.getAttribute('aria-expanded') !== 'true');
  });

  panel.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a11y]');
    if (!b) return;
    var k = b.dataset.a11y;
    if (k === 'close') { setOpen(false); btn.focus(); return; }
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
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });

  apply();
})();
