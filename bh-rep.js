/* bh-rep.js — Brain Hive sales-rep attribution.
 * Two entry points, both store the rep's DISPLAY NAME in the `bh_rep` cookie (30 days):
 *   1. A /reps/<slug> landing page: read the name from `.bh-rep-name`.
 *   2. `?rep=<slug>` on ANY page: resolve the slug to the rep's display name by
 *      fetching /reps/<slug> and reading its `.bh-rep-name`. Falls back to a
 *      title-cased slug if the lookup fails (so the email is never blank).
 * On any page: inject a hidden `input[name="Rep"]` into every <form>, filled from the
 * cookie — so the rep rides along in the Webflow notification email + stored submission.
 * No Designer form field required. Last-touch wins; only acts when a rep cookie is present. */
(function () {
  function getCookie(n) {
    var m = document.cookie.match('(^|;)\\s*' + n + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m.pop()) : '';
  }
  function setCookie(n, v, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 864e5);
    document.cookie = n + '=' + encodeURIComponent(v) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }
  function getParam(n) {
    var m = new RegExp('[?&]' + n + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')).trim() : '';
  }
  function titleCase(slug) {
    return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }).trim();
  }
  function applyRepToForms() {
    var rep = getCookie('bh_rep');
    if (!rep) return;
    [].forEach.call(document.querySelectorAll('form'), function (form) {
      var input = form.querySelector('input[name="Rep"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'Rep';
        form.appendChild(input);
      }
      input.value = rep;
    });
  }
  // Resolve a rep slug to its display name via the /reps/<slug> page, then callback.
  function resolveRep(slug, cb) {
    try {
      fetch('/reps/' + encodeURIComponent(slug), { cache: 'force-cache' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (html) {
          var name = '';
          if (html) {
            var el = new DOMParser().parseFromString(html, 'text/html').querySelector('.bh-rep-name');
            if (el) name = (el.textContent || '').trim();
          }
          cb(name || titleCase(slug));
        })
        .catch(function () { cb(titleCase(slug)); });
    } catch (e) { cb(titleCase(slug)); }
  }
  function run() {
    // 1. Landing page: the rep's own name is on the page.
    var el = document.querySelector('.bh-rep-name');
    if (el) {
      var name = (el.textContent || '').trim();
      if (name) setCookie('bh_rep', name, 30);
    }
    // 2. ?rep=<slug> on any page: resolve to the display name, then set the cookie.
    var slug = getParam('rep');
    if (slug) {
      resolveRep(slug, function (repName) {
        if (repName) setCookie('bh_rep', repName, 30);
        applyRepToForms();
      });
    }
    applyRepToForms();
  }
  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run);
})();
