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
  var query = '';

  // Full searchable text per card (name + description + subject + content + item# + tags),
  // cached on the element. Reads data-libfull so the pre-truncation full title is searched.
  function searchText(card) {
    if (card.__bhsearch != null) return card.__bhsearch;
    var parts = [], sels = ['.v3-libh3', '.v3-libdesc', '.v3-libsubj', '.v3-libct', '.v3-libpn', '.v3-libtags', '.v3-libkw'];
    for (var s = 0; s < sels.length; s++) {
      var els = card.querySelectorAll(sels[s]);
      for (var i = 0; i < els.length; i++) parts.push(els[i].getAttribute('data-libfull') || els[i].textContent);
    }
    return (card.__bhsearch = parts.join(' ').toLowerCase());
  }

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
      if (ok && query && searchText(card).indexOf(query) < 0) ok = false;
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

  // --- Card-title 2-line truncation (canvas-measured, engine-independent) ---
  // -webkit-line-clamp is unreliable here (Webflow forces display:flow-root and
  // some engines don't honor it). Measuring each title's scrollHeight in the live
  // grid forces a full-page relayout per read → ~12s of frozen main thread for 678
  // cards (that froze the filters). Instead we measure text width with a Canvas
  // 2D context (measureText — ZERO layout) to wrap + trim with an ellipsis, then
  // write each title once. ~50ms for 678, no reflow, no freeze. Height is derived
  // from the shared line-height so cards stay even and it is breakpoint-safe.
  // Original text is kept in data-libfull + the title attr, and re-runs on resize.
  function clampTitles() {
    var titles = document.querySelectorAll('.v3-libh3');
    if (!titles.length) return;
    var s = titles[0], cs = getComputedStyle(s);
    var boxW = s.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    if (boxW <= 0) return;
    var lh = parseFloat(cs.lineHeight); if (isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.3;
    var twoH = Math.ceil(lh * 2);
    var ctx = (clampTitles._c || (clampTitles._c = document.createElement('canvas').getContext('2d')));
    ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;

    function truncate(text) {
      var w = text.split(/\s+/), n = 1, cur = '';
      for (var i = 0; i < w.length; i++) {                 // count wrapped lines
        var t = cur ? cur + ' ' + w[i] : w[i];
        if (ctx.measureText(t).width <= boxW || !cur) cur = t;
        else { n++; cur = w[i]; if (n > 2) break; }
      }
      if (n <= 2) return null;                             // fits in 2 lines
      var idx = 0, l1 = '';                                // fill line 1
      for (; idx < w.length; idx++) {
        var a = l1 ? l1 + ' ' + w[idx] : w[idx];
        if (ctx.measureText(a).width <= boxW || !l1) l1 = a; else break;
      }
      var l2 = '';                                         // fill line 2, leaving room for …
      for (; idx < w.length; idx++) {
        var b = l2 ? l2 + ' ' + w[idx] : w[idx];
        if (ctx.measureText(b + '…').width <= boxW || !l2) l2 = b; else break;
      }
      return l1 + (l2 ? ' ' + l2 : '') + '…';
    }

    for (var i = 0; i < titles.length; i++) {              // pure writes — no interleaved reads
      var el = titles[i];
      var full = el.getAttribute('data-libfull');
      if (full === null) { full = el.textContent; el.setAttribute('data-libfull', full); }
      var c = truncate(full);
      el.title = full;
      el.style.setProperty('overflow', 'hidden', 'important');
      el.style.setProperty('height', twoH + 'px', 'important');
      el.textContent = (c === null) ? full : c;
    }
  }

  // --- Load every paginated page into the grid, then rebuild the filter ---
  // Pages are fetched in PARALLEL batches (not one-at-a-time) so the grid fills
  // in ~1 round-trip instead of N. Filters are already interactive before this
  // runs (see init) so there's no dead period.
  function loadAll(done) {
    var grid = document.querySelector('.v3-libgrid');
    var nextEl = document.querySelector('.w-pagination-next');
    if (!grid || !nextEl) { done(); return; }           // no pagination → nothing to load
    var firstHref = nextEl.getAttribute('href');

    function appendItems(items) {
      for (var i = 0; i < items.length; i++) grid.appendChild(document.importNode(items[i], true));
    }
    function hidePagers() {
      var p = document.querySelectorAll('.w-pagination-wrapper');
      for (var i = 0; i < p.length; i++) p[i].style.display = 'none';
    }

    // Detect Webflow's page param (e.g. "fe268907_page") so we can request pages by number.
    var pageParam = null;
    try {
      new URL(firstHref, location.href).searchParams.forEach(function (v, k) { if (/_page$/.test(k)) pageParam = k; });
    } catch (e) {}

    // Fallback: no detectable param → follow next-links sequentially.
    if (!pageParam) {
      var nextHref = firstHref, guard = 0;
      (function step() {
        if (!nextHref || guard++ > 60) { hidePagers(); done(); return; }
        fetch(new URL(nextHref, location.href).href, { cache: 'reload' })
          .then(function (r) { return r.text(); })
          .then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            appendItems(doc.querySelectorAll('.v3-libgrid .w-dyn-item'));
            var n = doc.querySelector('.w-pagination-next');
            nextHref = n ? n.getAttribute('href') : null; step();
          })
          .catch(function () { hidePagers(); done(); });
      })();
      return;
    }

    function pageUrl(n) { var uu = new URL(location.href); uu.searchParams.set(pageParam, n); return uu.href; }
    function fetchItems(n) {
      return fetch(pageUrl(n), { cache: 'reload' })
        .then(function (r) { return r.text(); })
        .then(function (html) { return new DOMParser().parseFromString(html, 'text/html').querySelectorAll('.v3-libgrid .w-dyn-item'); })
        .catch(function () { return null; });   // null = transient error (skip, don't treat as end)
    }
    var page = 2, BATCH = 8, CAP = 300;
    (function batch() {
      var reqs = [];
      for (var i = 0; i < BATCH; i++) reqs.push(fetchItems(page + i));
      Promise.all(reqs).then(function (results) {
        var ended = false;
        for (var j = 0; j < results.length; j++) {
          var items = results[j];
          if (items === null) continue;                 // fetch error → skip this page
          if (items.length === 0) { ended = true; break; }  // empty page → past the last page
          appendItems(items);
        }
        page += BATCH;
        if (ended || page > CAP) { hidePagers(); done(); }
        else batch();
      });
    })();
  }

  // --- Sort the grid by set name, A→Z (natural/numeric, punctuation-insensitive) ---
  // The CMS's own order reads as random once filtered; this makes it predictable.
  function sortGrid() {
    var grid = document.querySelector('.v3-libgrid');
    if (!grid) return;
    var items = [].slice.call(grid.querySelectorAll('.w-dyn-item'));
    if (items.length < 2) return;
    function key(item) {
      var h = item.querySelector('.v3-libh3');           // first .v3-libh3 = the set name
      var s = h ? (h.getAttribute('data-libfull') || h.textContent) : '';
      return s.replace(/^[^0-9A-Za-zÀ-ɏ]+/, '').trim();   // drop leading ¡ ¿ " etc.
    }
    items.sort(function (a, b) { return key(a).localeCompare(key(b), undefined, { numeric: true, sensitivity: 'base' }); });
    var frag = document.createDocumentFragment();
    for (var i = 0; i < items.length; i++) frag.appendChild(items[i]);  // moves nodes into sorted order
    grid.appendChild(frag);
  }

  // --- Inject a keyword search box above the Grade filter (no Webflow edit needed) ---
  // Reuses an existing .libx-search input if the user adds one in Webflow.
  function ensureSearch() {
    var bar = document.querySelector('.libx-fbar');
    if (!bar || document.querySelector('.libx-search')) return;
    var wrap = document.createElement('div');
    wrap.className = 'libx-fgroup libx-searchgroup';       // .libx-fgroup for spacing; buildChips skips it (no dim)
    var label = document.createElement('div');
    label.className = 'libx-flabel'; label.textContent = 'Search';
    var input = document.createElement('input');
    input.type = 'search'; input.className = 'libx-search';
    input.placeholder = 'Search sets, subjects, item #…';
    input.setAttribute('autocomplete', 'off');
    input.style.cssText = 'width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #E4DFD3;'
      + 'border-radius:8px;font-size:15px;color:#17130C;background:#fff;outline:none';
    wrap.appendChild(label); wrap.appendChild(input);
    bar.insertBefore(wrap, bar.firstChild);
  }

  var searchT;
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || !t.classList || !t.classList.contains('libx-search')) return;
    clearTimeout(searchT);
    searchT = setTimeout(function () { query = (t.value || '').trim().toLowerCase(); apply(); }, 120);
  });

  function init() {
    ensureSearch();
    buildChips(); apply(); clampTitles();               // page 1 is interactive immediately
    loadAll(function () { sortGrid(); buildChips(); apply(); clampTitles(); });  // sort + fold in the rest
    var rzT;
    window.addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(clampTitles, 200); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
