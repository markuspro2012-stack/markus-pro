/* ============================================================
   MARKUS PRO — Utilities
   localStorage wrapper, formatting, helpers
   ============================================================ */

/* ── localStorage (safe wrapper) ────────────────────────── */

var storage = {
  get: function(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch(e) {
      return fallback;
    }
  },
  set: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch(e) {
      return false;
    }
  },
  remove: function(key) {
    try { localStorage.removeItem(key); } catch(e) {}
  }
};

/* ── Formatting ──────────────────────────────────────────── */

function formatPrice(amount) {
  return '€ ' + Math.round(amount).toLocaleString('en-US');
}

function formatCount(n) {
  return n > 9 ? '9+' : String(n);
}

/* ── URL params ──────────────────────────────────────────── */

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function buildProductURL(id) {
  return 'product.html?id=' + id;
}

function buildCatalogURL(category) {
  return category ? 'catalog.html?category=' + category : 'catalog.html';
}

/* ── DOM helpers ─────────────────────────────────────────── */

function qs(selector, parent) {
  return (parent || document).querySelector(selector);
}

function qsa(selector, parent) {
  return Array.from((parent || document).querySelectorAll(selector));
}

function on(el, event, handler, options) {
  if (el) el.addEventListener(event, handler, options || false);
}

/* ── Debounce ────────────────────────────────────────────── */

function debounce(fn, delay) {
  var timer;
  return function() {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function() { fn.apply(ctx, args); }, delay);
  };
}

/* ── Toast ───────────────────────────────────────────────── */

var _toastTimer = null;

function showToast(message, icon) {
  icon = icon || '✓';
  /* Use static #toast if present, else create #mp-toast */
  var el = document.getElementById('toast') || document.getElementById('mp-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mp-toast';
    el.className = 'toast';
    el.innerHTML =
      '<span class="toast-icon"></span>' +
      '<span class="toast-msg"></span>' +
      '<button class="toast-close" aria-label="Close">&times;</button>';
    document.body.appendChild(el);
    el.querySelector('.toast-close').addEventListener('click', function() {
      el.classList.remove('is-visible');
    });
  }
  var iconEl  = el.querySelector('.toast-icon') || el.querySelector('#toast-icon');
  var msgEl   = el.querySelector('.toast-msg')  || el.querySelector('#toast-msg');
  if (iconEl) iconEl.textContent = icon;
  if (msgEl)  msgEl.textContent  = message;
  el.classList.add('is-visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() {
    el.classList.remove('is-visible');
  }, 3200);
}

/* ── Scroll lock ─────────────────────────────────────────── */

function lockScroll()   { document.body.style.overflow = 'hidden'; }
function unlockScroll() { document.body.style.overflow = ''; }

/* ── Scroll reveal (IntersectionObserver) ────────────────── */

function initReveal() {
  var els = qsa('.reveal');
  if (!els.length) return;
  if (!window.IntersectionObserver) {
    els.forEach(function(el) { el.classList.add('is-visible'); });
    return;
  }
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  els.forEach(function(el) { obs.observe(el); });
}

/* ── Nav scroll ──────────────────────────────────────────── */

function initNavScroll() {
  var nav = qs('.nav');
  if (!nav) return;
  function update() {
    nav.classList.toggle('is-scrolled', window.scrollY > 20);
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ── Active nav link ─────────────────────────────────────── */

function setActiveNavLink() {
  var path = window.location.pathname.split('/').pop() || 'index.html';
  qsa('.nav-links a, .mobile-nav-links a').forEach(function(a) {
    var href = a.getAttribute('href') || '';
    a.classList.toggle('is-active', href === path || href.startsWith(path.split('.')[0]));
  });
}

/* ── Ticker duplicate ────────────────────────────────────── */

function initTicker() {
  var track = qs('.ticker-track');
  if (!track) return;
  track.innerHTML += track.innerHTML;
}

/* ── Mobile nav ──────────────────────────────────────────── */

function initMobileNav() {
  var toggle = document.getElementById('nav-toggle');
  var menu   = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  function open() {
    menu.classList.add('is-open');
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    lockScroll();
  }
  function close() {
    menu.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    unlockScroll();
  }

  toggle.addEventListener('click', function() {
    menu.classList.contains('is-open') ? close() : open();
  });

  qsa('a', menu).forEach(function(a) { a.addEventListener('click', close); });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) close();
  });
}

/* ── Nav auth state ──────────────────────────────────────── */

function initNavAuth() {
  var user = storage.get('mp_user', null);
  var accountLink = qs('.nav-icon-btn[aria-label="Account"]');
  if (!accountLink) return;

  if (!user) return; // not logged in — keep link pointing to login.html

  var initial = (user.name || 'U').charAt(0).toUpperCase();
  accountLink.setAttribute('aria-label', user.name);
  accountLink.setAttribute('href', '#');
  accountLink.innerHTML = '<span class="nav-user-init">' + initial + '</span>';
  accountLink.style.position = 'relative';

  accountLink.addEventListener('click', function (e) {
    e.preventDefault();
    var existing = document.getElementById('nav-account-menu');
    if (existing) { existing.remove(); return; }

    var menu = document.createElement('div');
    menu.id = 'nav-account-menu';
    menu.className = 'nav-account-menu';
    menu.innerHTML =
      '<div class="nav-account-name">' + user.name + '</div>'
      + '<a class="nav-account-link" href="account.html">My Account</a>'
      + '<button class="nav-account-signout" id="nav-signout">Sign Out</button>';
    accountLink.appendChild(menu);

    document.getElementById('nav-signout').addEventListener('click', function () {
      storage.remove('mp_user');
      window.location.reload();
    });

    setTimeout(function () {
      function outsideClick(ev) {
        if (!menu.contains(ev.target) && ev.target !== accountLink) {
          menu.remove();
          document.removeEventListener('click', outsideClick);
        }
      }
      document.addEventListener('click', outsideClick);
    }, 0);
  });
}

/* ── Run on DOMContentLoaded ─────────────────────────────── */

document.addEventListener('DOMContentLoaded', function() {
  initNavScroll();
  initMobileNav();
  initReveal();
  initTicker();
  setActiveNavLink();
  initNavAuth();

  /* Wire static toast close button if present */
  var closeBtn = document.getElementById('toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      var toast = document.getElementById('toast');
      if (toast) toast.classList.remove('is-visible');
    });
  }
});
