/* bh-rep.js — Brain Hive sales-rep attribution.
 * On a /reps/<slug> landing page: read the rep's display name from `.bh-rep-name`
 * and store it in the `bh_rep` cookie (30 days).
 * On any page with a form: for each <form>, ensure a hidden input named "Rep" exists
 * (inject it if missing) and set its value from the cookie — so the rep rides along in
 * the Webflow notification email + stored submission. No Designer form field required.
 * Site-wide + idempotent: only acts when a rep cookie is present. */
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
  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run);
})();
