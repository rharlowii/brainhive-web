/* bh-quote.js — Brain Hive "Build a Quote" (semi-cart with quantities)
 * Paste (wrapped in <script>…</script>) into Page Settings → Before </body>
 * on BOTH /classroom-libraries and /build-a-quote.
 *
 * DOM hooks:
 *   Card:        .v3-libcard  (contains .v3-libh3 [name], .v3-libprice [price],
 *                              .v3-libpn [hidden Product Number])
 *   Add button:  .v3-addquote  (script swaps it for a qty stepper when in cart)
 *   Bar:         .bh-quotebar + .bh-quotebar-count + .bh-quotebar-clear
 *   Quote page:  .bh-qlist [rows container], .bh-qempty [empty state],
 *                .bh-qsubtotal [optional subtotal text], form .bh-qform,
 *                hidden field name="Selected-sets"
 * State: localStorage['bh_quote'] = [{pn, name, price, qty}]
 */
(function () {
  var KEY = 'bh_quote';
  var QUOTE_PAGE = '/build-a-quote';
  var GOLD = '#FCB924', INK = '#17130C';

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); }
  function find(list, pn) { for (var i = 0; i < list.length; i++) if (list[i].pn === pn) return list[i]; return null; }
  function num(s) { var n = parseFloat(String(s).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; }
  function money(n) { return '$' + n.toFixed(2); }

  function cardData(card) {
    var nameEl = card.querySelector('.v3-libbd .v3-libh3') || card.querySelector('.v3-libh3');
    var priceEl = card.querySelector('.v3-libprice');
    var pnEl = card.querySelector('.v3-libpn');
    var pubEl = card.querySelector('.v3-libpub');
    return {
      pn: pnEl ? pnEl.textContent.trim() : '',
      name: nameEl ? nameEl.textContent.trim() : '',
      price: priceEl ? priceEl.textContent.trim() : '',
      pub: (pubEl && pubEl.textContent.trim()) || 'Teacher Created Materials'
    };
  }

  // --- mutations ---
  function addItem(card) {
    var d = cardData(card); if (!d.pn) return;
    var list = load();
    if (!find(list, d.pn)) list.push({ pn: d.pn, name: d.name, price: d.price, qty: 1, pub: d.pub });
    save(list); renderAll();
  }
  function setQty(pn, qty) {
    var list = load(); var it = find(list, pn); if (!it) return;
    if (qty <= 0) list = list.filter(function (x) { return x.pn !== pn; });
    else it.qty = qty;
    save(list); renderAll();
  }

  // --- stepper element (inline-styled, reused on cards + review rows) ---
  function css(el, o) { for (var k in o) el.style[k] = o[k]; }
  function stepper(pn, qty) {
    var wrap = document.createElement('div');
    wrap.className = 'bh-qtywrap';
    css(wrap, { display: 'inline-flex', alignItems: 'center', columnGap: '10px',
      border: '1px solid ' + GOLD, borderRadius: '999px', padding: '4px 8px' });
    function btn(sym, act) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = sym;
      b.className = 'bh-q' + act; b.setAttribute('data-pn', pn);
      css(b, { width: '22px', height: '22px', borderRadius: '50%', border: 'none',
        background: GOLD, color: INK, cursor: 'pointer', fontWeight: '700', lineHeight: '1', fontSize: '15px' });
      return b;
    }
    var n = document.createElement('span'); n.className = 'bh-qnum'; n.textContent = qty;
    css(n, { minWidth: '18px', textAlign: 'center', fontWeight: '600', fontSize: '14px', color: INK });
    wrap.appendChild(btn('−', 'minus')); wrap.appendChild(n); wrap.appendChild(btn('+', 'plus'));
    return wrap;
  }

  // --- render the card controls (Add button ⇄ stepper) ---
  function renderCards() {
    var list = load();
    var btns = document.querySelectorAll('.v3-addquote');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i], card = btn.closest('.v3-libcard'); if (!card) continue;
      var it = find(list, cardData(card).pn);
      var existing = card.querySelector('.bh-qtywrap');
      if (it) {
        btn.style.display = 'none';
        if (existing) { existing.querySelector('.bh-qnum').textContent = it.qty; }
        else { btn.parentNode.insertBefore(stepper(it.pn, it.qty), btn.nextSibling); }
      } else {
        btn.style.display = '';
        if (existing) existing.parentNode.removeChild(existing);
      }
    }
  }

  function renderBar() {
    var bar = document.querySelector('.bh-quotebar'); if (!bar) return;
    var list = load(), sets = list.length, copies = 0, subtotal = 0;
    for (var i = 0; i < list.length; i++) { copies += list[i].qty; subtotal += num(list[i].price) * list[i].qty; }
    var textEl = bar.querySelector('.bh-quotebar-text');
    if (textEl) textEl.innerHTML = '<span class="bh-quotebar-count">' + sets + '</span> set' + (sets === 1 ? '' : 's') + ' · ' + copies + ' cop' + (copies === 1 ? 'y' : 'ies') + ' · ' + money(subtotal);
    bar.style.display = sets > 0 ? 'block' : 'none';
  }

  // Inject/toggle a "Clear all" control on the quote review page (no Webflow
  // edit needed). If the user adds their own element with class .bh-qclear,
  // this reuses it instead of injecting a second one.
  function ensureClearBtn(hasItems) {
    var anchor = document.querySelector('.bh-qsubtotal') || document.querySelector('.bh-qlist');
    if (!anchor || !anchor.parentNode) return;
    var btn = document.querySelector('.bh-qclear');
    if (hasItems) {
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'bh-qclear'; btn.textContent = 'Clear all';
        css(btn, { display: 'inline-block', marginTop: '10px', cursor: 'pointer', border: 'none',
          background: 'transparent', color: '#8A8172', textDecoration: 'underline',
          fontSize: '14px', padding: '0' });
        anchor.parentNode.insertBefore(btn, anchor.nextSibling);
      }
      btn.style.display = '';
    } else if (btn) {
      btn.style.display = 'none';
    }
  }

  function renderQuoteList() {
    var wrap = document.querySelector('.bh-qlist'); if (!wrap) return;
    var list = load();
    var empty = document.querySelector('.bh-qempty');
    var subEl = document.querySelector('.bh-qsubtotal');
    var hidden = document.querySelector('[name="Selected-sets"], [name="Selected sets"]');
    wrap.innerHTML = '';
    var subtotal = 0;
    for (var i = 0; i < list.length; i++) {
      var it = list[i]; var lineTotal = num(it.price) * it.qty; subtotal += lineTotal;
      var row = document.createElement('div'); row.className = 'bh-qrow';
      var info = document.createElement('div'); info.className = 'bh-qinfo';
      info.textContent = it.name + '  ·  TCM ' + it.pn + '  ·  ' + money(num(it.price)) + ' each';
      var right = document.createElement('div');
      css(right, { display: 'flex', alignItems: 'center', columnGap: '16px' });
      var lt = document.createElement('span'); lt.textContent = money(lineTotal);
      css(lt, { fontWeight: '600', minWidth: '72px', textAlign: 'right' });
      var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'bh-qremove';
      rm.setAttribute('data-pn', it.pn); rm.textContent = '✕';
      rm.title = 'Remove from quote'; rm.setAttribute('aria-label', 'Remove from quote');
      css(rm, { cursor: 'pointer', border: 'none', background: 'transparent', color: '#8A8172',
        fontSize: '18px', lineHeight: '1', padding: '8px', minWidth: '40px', minHeight: '40px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center' });
      right.appendChild(stepper(it.pn, it.qty)); right.appendChild(lt); right.appendChild(rm);
      row.appendChild(info); row.appendChild(right);
      wrap.appendChild(row);
    }
    if (empty) empty.style.display = list.length ? 'none' : '';
    if (subEl) subEl.textContent = list.length ? ('Subtotal: ' + money(subtotal) + ' (before shipping & discounts)') : '';
    if (hidden) {
      // Tab-delimited for direct paste into the Hive spreadsheet (spreadAddFreeForm):
      // ISBN(Product#) \t Title \t QTY \t List Price \t Publisher  — one row per set, no header.
      var lines = list.map(function (x) {
        return [x.pn, x.name, x.qty, num(x.price).toFixed(2), x.pub || 'Teacher Created Materials'].join('\t');
      });
      hidden.value = lines.join('\n');
    }
    ensureClearBtn(list.length > 0);
  }

  function renderAll() { renderCards(); renderBar(); renderQuoteList(); }

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var add = e.target.closest('.v3-addquote');
    if (add) { e.preventDefault(); var card = add.closest('.v3-libcard'); if (card) addItem(card); return; }
    var minus = e.target.closest('.bh-qminus');
    if (minus) { e.preventDefault(); var pn = minus.getAttribute('data-pn'); var it = find(load(), pn); if (it) setQty(pn, it.qty - 1); return; }
    var plus = e.target.closest('.bh-qplus');
    if (plus) { e.preventDefault(); var p = plus.getAttribute('data-pn'); var i2 = find(load(), p); if (i2) setQty(p, i2.qty + 1); return; }
    var rm = e.target.closest('.bh-qremove');
    if (rm) { e.preventDefault(); setQty(rm.getAttribute('data-pn'), 0); return; }
    var qclear = e.target.closest('.bh-qclear');
    if (qclear) { e.preventDefault(); if (window.confirm('Remove all sets from your quote?')) { save([]); renderAll(); } return; }
    var clr = e.target.closest('.bh-quotebar-clear');
    if (clr) { e.preventDefault(); save([]); renderAll(); }
  });

  // clear the quote after a successful Webflow form submit
  function watchSuccess() {
    var form = document.querySelector('.bh-qform');
    var wrap = form && (form.closest('.w-form') || form.parentElement);
    if (!wrap) return;
    var obs = new MutationObserver(function () {
      var done = wrap.querySelector('.w-form-done');
      if (done && getComputedStyle(done).display !== 'none') save([]);
    });
    obs.observe(wrap, { attributes: true, childList: true, subtree: true });
  }

  // re-apply card controls when the grid gains cards (custom load-all appends 578 more)
  function watchGrid() {
    var grid = document.querySelector('.v3-libgrid'); if (!grid) return;
    var t; var obs = new MutationObserver(function () { clearTimeout(t); t = setTimeout(renderCards, 150); });
    obs.observe(grid, { childList: true });
  }

  function init() { renderAll(); watchSuccess(); watchGrid(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
