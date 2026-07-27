/* bh-rep.js — Brain Hive sales-rep attribution.
 * On a /reps/<slug> landing page: read the rep's display name from `.bh-rep-name`
 * and store it in the `bh_rep` cookie (30 days).
 * On any page with a form: fill a hidden input named "Rep" from that cookie, so the
 * rep rides along in the Webflow notification email + stored submission.
 * Site-wide + idempotent: a no-op where its hooks are absent. */
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
  function run() {
    var el = document.querySelector('.bh-rep-name');
    if (el) {
      var name = (el.textContent || '').trim();
      if (name) setCookie('bh_rep', name, 30);
    }
    var rep = getCookie('bh_rep');
    if (rep) {
      [].forEach.call(document.querySelectorAll('form input[name="Rep"]'), function (inp) {
        inp.value = rep;
      });
    }
  }
  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run);
})();
