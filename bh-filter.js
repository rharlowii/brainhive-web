/* bh-filter.js — Brain Hive Classroom Libraries: load-all + custom filter
 * Paste (wrapped in <script>…</script>) into Page Settings → Custom Code → Before </body>.
 *
 * Requires: the Collection List set to PAGINATE (e.g. 100 items/page) so the
 * remaining pages exist to fetch. If it's on a fixed "Limit", only that many load.
 *
 * DOM it expects on /classroom-libraries:
 *   .v3-libgrid                     the Collection List (.w-dyn-items)
 *   .v3-libcard                     one per set (grid item = its .w-dyn-item ancestor)
 *   .v3-libprice                    visible price ("84.95") — price band computed
 *   .v3-libgb/.v3-libsubj/.v3-libct/.v3-liblang  hidden bound fields
 *   .libx-fgroup > .libx-flabel + .libx-fchips   filter groups (chips auto-built)
 *   .libx-fcount                    "Showing N sets" text
 */
(function () {
  // Card-title 2-line clamp (moved here so no <head> custom code is needed).
  (function () {
    var st = document.createElement('style');
    st.textContent = '.v3-libh3{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;height:auto!important;min-height:3.3em}';
    (document.head || document.documentElement).appendChild(st);
  })();

  var GRADE_ORDER = ['PK–K', '1–2', '3–5', '6–8', '9–12'];
  var PRICE_BANDS = ['Under $50', '$50–150', '$150–300', '$300+'];

  function txt(el, sel) { var n = el.querySelector(sel); return n ? n.textContent.trim() : ''; }

  function priceBand(card) {
    var p = parseFloat((txt(card, '.v3-libprice') || '').replace(/[^0-9.]/g, ''));
    if (isNaN(p)) return '';
    if (p < 50) return 'Under $50';
    if (p < 150) return '$50–150';
    if (p < 300) return '$150–300';
    return '$300+';
  }

  function cardValues(card, dim) {
    if (dim === 'grade') return (txt(card, '.v3-libgb') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (dim === 'subject') { var s = txt(card, '.v3-libsubj'); return s ? [s] : []; }
    if (dim === 'content') { var c = txt(card, '.v3-libct'); return c ? [c] : []; }
    if (dim === 'language') { var l = txt(card, '.v3-liblang'); return l ? [l] : []; }
    if (dim === 'price') { var b = priceBand(card); return b ? [b] : []; }
    return [];
  }

  function dimForLabel(label) {
    var u = (label || '').toUpperCase();
    if (u.indexOf('GRADE') > -1) return 'grade';
    if (u.indexOf('SUBJECT') > -1) return 'subject';
    if (u.indexOf('CONTENT') > -1) return 'content';
    if (u.indexOf('PRICE') > -1) return 'price';
    if (u.indexOf('LANG') > -1) return 'language';
    return null;
  }

  function distinct(arr) {
    var seen = {}, out = [];
    for (var i = 0; i < arr.length; i++) { if (arr[i] && !seen[arr[i]]) { seen[arr[i]] = 1; out.push(arr[i]); } }
    return out;
  }
  function orderBy(values, order) {
    var inOrder = order.filter(function (v) { return values.indexOf(v) > -1; });
    var rest = values.filter(function (v) { return order.indexOf(v) < 0; }).sort();
    return inOrder.concat(rest);
  }

  function styleChip(chip, active) {
    if (active) { chip.style.background = '#FCB924'; chip.style.color = '#17130C'; chip.style.borderColor = '#FCB924'; }
    else { chip.style.background = ''; chip.style.color = ''; chip.style.borderColor = ''; }
  }

  var selected = {};
  var groups = [];

  function makeChip(label) {
    var c = document.createElement('div');
    c.className = 'libx-fchip';
    c.textContent = label;
    return c;
  }

  function buildChips() {
    var cards = [].slice.call(document.querySelectorAll('.v3-libcard'));
    groups = [];
    var fgroups = document.querySelectorAll('.libx-fgroup');
    for (var g = 0; g < fgroups.length; g++) {
      var label = txt(fgroups[g], '.libx-flabel');
      var dim = dimForLabel(label);
      var container = fgroups[g].querySelector('.libx-fchips');
      if (!dim || !container) continue;
      var vals = [];
      for (var i = 0; i < cards.length; i++) { vals = vals.concat(cardValues(cards[i], dim)); }
      vals = distinct(vals);
      if (dim === 'grade') vals = orderBy(vals, GRADE_ORDER);
      else if (dim === 'price') vals = PRICE_BANDS.filter(function (b) { return vals.indexOf(b) > -1; });
      else vals.sort();

      container.innerHTML = '';
      selected[dim] = selected[dim] || {};
      var allChip = makeChip('All');
      allChip.setAttribute('data-role', 'all');
      allChip.setAttribute('data-dim', dim);
      container.appendChild(allChip);
      for (var v = 0; v < vals.length; v++) {
        var chip = makeChip(vals[v]);
        chip.setAttribute('data-dim', dim);
        chip.setAttribute('data-val', vals[v]);
        container.appendChild(chip);
      }
      groups.push({ dim: dim, container: container, allChip: allChip });
    }
    paintChips();
  }

  function paintChips() {
    for (var g = 0; g < groups.length; g++) {
      var dim = groups[g].dim;
      var sel = selected[dim] || {};
      var anySel = Object.keys(sel).length > 0;
      styleChip(groups[g].allChip, !anySel);
      var chips = groups[g].container.querySelectorAll('[data-val]');
      for (var i = 0; i < chips.length; i++) {
        styleChip(chips[i], !!sel[chips[i].getAttribute('data-val')]);
      }
    }
  }

  function apply() {
    var cards = document.querySelectorAll('.v3-libcard');
    var shown = 0;
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var ok = true;
      for (var d in selected) {
        var sel = selected[d];
        var keys = Object.keys(sel);
        if (!keys.length) continue;
        var cv = cardValues(card, d);
        var hit = false;
        for (var k = 0; k < keys.length; k++) { if (cv.indexOf(keys[k]) > -1) { hit = true; break; } }
        if (!hit) { ok = false; break; }
      }
      var item = card.closest('.w-dyn-item') || card;
      item.style.display = ok ? '' : 'none';
      if (ok) shown++;
    }
    var count = document.querySelector('.libx-fcount');
    if (count) count.textContent = 'Showing ' + shown + ' set' + (shown === 1 ? '' : 's');
  }

  document.addEventListener('click', function (e) {
    var chip = e.target.closest ? e.target.closest('.libx-fchip') : null;
    if (!chip || !chip.getAttribute('data-dim')) return;
    var dim = chip.getAttribute('data-dim');
    selected[dim] = selected[dim] || {};
    if (chip.getAttribute('data-role') === 'all') {
      selected[dim] = {};
    } else {
      var v = chip.getAttribute('data-val');
      if (selected[dim][v]) delete selected[dim][v]; else selected[dim][v] = true;
    }
    paintChips();
    apply();
  });

  // --- Load every paginated page into the grid, then build the filter ---
  function loadAll(done) {
    var grid = document.querySelector('.v3-libgrid');
    var nextEl = document.querySelector('.w-pagination-next');
    if (!grid || !nextEl) { done(); return; }           // no pagination → nothing to load
    var nextHref = nextEl.getAttribute('href');
    var guard = 0;

    function step() {
      if (!nextHref || guard++ > 25) { finish(); return; }
      var url = new URL(nextHref, location.href).href;
      fetch(url, { cache: 'reload' })
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var items = doc.querySelectorAll('.v3-libgrid .w-dyn-item');
          for (var i = 0; i < items.length; i++) { grid.appendChild(document.importNode(items[i], true)); }
          var n = doc.querySelector('.w-pagination-next');
          nextHref = n ? n.getAttribute('href') : null;
          step();
        })
        .catch(function () { finish(); });
    }
    function finish() {
      var pager = document.querySelector('.w-pagination-wrapper');
      if (pager) pager.style.display = 'none';
      done();
    }
    step();
  }

  function init() {
    loadAll(function () { buildChips(); apply(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
