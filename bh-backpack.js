/* bh-backpack.js — Brain Hive Take-Home Backpacks detail-page toggle
 * Paste (wrapped in <script>…</script>) into Page Settings → Before </body>
 * on the Backpack Lines detail page (/backpack-lines/<slug>).
 * Loads site-wide via the same footer include as bh-quote.js / bh-filter.js;
 * no-ops everywhere else (guarded on .bh-bp-grid / .bh-bp-row presence).
 *
 * DOM it expects:
 *   Wrapper: .bh-bp-grid (optional — grid or its rows must exist to run)
 *   Row:     .bh-bp-row  (one per SKU, 40 per line) with data-lang
 *            (English|Spanish), data-inc (None|Parent Guide), and the
 *            standard quote hooks: .v3-libcard .v3-addquote .v3-libpn
 *            (ISBN) .v3-libh3 (name) .v3-libprice (price) .v3-libpub
 *            (Crabtree) — bh-quote.js reads those directly, no
 *            backpack-specific Add logic lives here.
 *   Toggles: .bh-bp-toggle buttons carrying [data-bp-lang] (English|Spanish)
 *            or [data-bp-inc] (None|Parent Guide). Active button gets
 *            .is-active (aria-pressed="true" read as a fallback signal).
 *
 * Default on load: English / None.
 */
(function () {
  var state = { lang: 'English', inc: 'None' };

  function isActive(btn) {
    return btn.classList.contains('is-active') || btn.getAttribute('aria-pressed') === 'true';
  }

  function setActive(btn, group) {
    var btns = document.querySelectorAll('.bh-bp-toggle[' + group + ']');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    }
  }

  function applyRows() {
    var rows = document.querySelectorAll('.bh-bp-row');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var match = row.getAttribute('data-lang') === state.lang && row.getAttribute('data-inc') === state.inc;
      row.style.display = match ? '' : 'none';
    }
  }

  function initToggles() {
    var langBtns = document.querySelectorAll('.bh-bp-toggle[data-bp-lang]');
    var incBtns = document.querySelectorAll('.bh-bp-toggle[data-bp-inc]');
    var i, b;
    for (i = 0; i < langBtns.length; i++) {
      b = langBtns[i];
      if (isActive(b)) state.lang = b.getAttribute('data-bp-lang');
    }
    for (i = 0; i < incBtns.length; i++) {
      b = incBtns[i];
      if (isActive(b)) state.inc = b.getAttribute('data-bp-inc');
    }
    setActive(findByValue(langBtns, 'data-bp-lang', state.lang), 'data-bp-lang');
    setActive(findByValue(incBtns, 'data-bp-inc', state.inc), 'data-bp-inc');
  }

  function findByValue(btns, attr, val) {
    for (var i = 0; i < btns.length; i++) if (btns[i].getAttribute(attr) === val) return btns[i];
    return null;
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var btn = e.target.closest('.bh-bp-toggle');
    if (!btn) return;
    var lang = btn.getAttribute('data-bp-lang');
    var inc = btn.getAttribute('data-bp-inc');
    if (lang) { e.preventDefault(); state.lang = lang; setActive(btn, 'data-bp-lang'); applyRows(); return; }
    if (inc) { e.preventDefault(); state.inc = inc; setActive(btn, 'data-bp-inc'); applyRows(); return; }
  });

  function init() {
    if (!document.querySelector('.bh-bp-grid') && !document.querySelector('.bh-bp-row')) return;
    initToggles();
    applyRows();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
