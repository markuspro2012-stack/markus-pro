/* ============================================================
   MARKUS PRO — account.js
   User account page: profile, order history, settings.
   Requires: utils.js, products.js, app.js
============================================================ */

(function () {
  'use strict';

  var USER_KEY     = 'mp_user';
  var USERS_KEY    = 'mp_users';
  var ORDERS_KEY   = 'mp_orders';
  var CART_KEY     = 'mp_cart';
  var WISHLIST_KEY = 'mp_wishlist';

  var STATUS_LABEL = {
    pending:   'Pending',
    confirmed: 'Confirmed',
    shipped:   'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };

  var state = { user: null, orders: [] };

  /* ── Auth guard ──────────────────────────────────────────── */

  function guardAuth() {
    var user = storage.get(USER_KEY, null);
    if (!user) { window.location.replace('login.html'); return false; }
    state.user = user;
    return true;
  }

  /* ── Panel switching ─────────────────────────────────────── */

  function switchPanel(name) {
    document.querySelectorAll('.account-panel').forEach(function (el) {
      el.classList.toggle('is-active', el.id === 'panel-' + name);
    });
    document.querySelectorAll('.account-nav-btn[data-panel]').forEach(function (btn) {
      var active = btn.dataset.panel === name;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    window.location.hash = name === 'profile' ? '' : name;
  }

  /* ── Render profile ──────────────────────────────────────── */

  function renderProfile() {
    var u       = state.user;
    var initial = (u.name || 'U').charAt(0).toUpperCase();

    /* Sidebar */
    setText('sidebar-avatar', initial);
    setText('sidebar-name',   u.name  || 'User');
    setText('sidebar-email',  u.email || '—');

    /* Profile panel */
    setText('profile-avatar',   initial);
    setText('profile-name',     u.name  || 'User');
    setText('profile-email',    u.email || '—');
    setText('profile-provider', u.provider || 'Email');

    /* Stats */
    var cartQty  = storage.get(CART_KEY, []).reduce(function (s, i) { return s + (i.qty || 1); }, 0);
    var wishQty  = storage.get(WISHLIST_KEY, []).length;
    var ordCount = state.orders.length;

    setText('stat-cart',     cartQty);
    setText('stat-wishlist', wishQty);
    setText('stat-orders',   ordCount);

    /* Nav badge */
    var badge = document.getElementById('nav-orders-count');
    if (badge) {
      badge.style.display = ordCount > 0 ? 'inline-flex' : 'none';
      badge.textContent   = ordCount;
    }
  }

  /* ── Render orders ───────────────────────────────────────── */

  function renderOrders() {
    var container = document.getElementById('orders-list');
    var subtitle  = document.getElementById('orders-subtitle');
    if (!container) return;

    var orders = state.orders;

    if (subtitle) {
      subtitle.textContent = orders.length
        ? orders.length + ' order' + (orders.length !== 1 ? 's' : '')
        : 'Your order history';
    }

    if (!orders.length) {
      container.innerHTML =
        '<div class="account-empty">'
          + '<div class="account-empty-icon">📦</div>'
          + '<h3 class="account-empty-title">No orders yet</h3>'
          + '<p class="account-empty-text">Your purchase history will appear here after you place an order.</p>'
          + '<a href="catalog.html" class="btn btn-primary">Start Shopping</a>'
        + '</div>';
      return;
    }

    var html = '<div class="orders-list">';
    orders.forEach(function (order) {
      var items   = Array.isArray(order.items) ? order.items : [];
      var preview = items.slice(0, 3);
      var more    = items.length - preview.length;
      var date    = formatOrderDate(order.date || order.created_at);
      var status  = order.status || 'pending';

      var thumbsHtml = preview.map(function (it) {
        var product = (typeof PRODUCTS !== 'undefined')
          ? PRODUCTS.find(function (p) { return p.id === it.id; })
          : null;
        var src = (product && product.image) || ('https://picsum.photos/seed/' + (it.id || 1) + '/56/56');
        return '<img class="order-item-thumb" src="' + src + '" alt="' + esc(it.name || '') + '" loading="lazy">';
      }).join('');

      if (more > 0) {
        thumbsHtml += '<div class="order-item-more">+' + more + '</div>';
      }

      html +=
        '<div class="order-card">'
          + '<div class="order-card-head">'
            + '<span class="order-id">' + esc(order.id) + '</span>'
            + '<span class="order-date">' + date + '</span>'
            + '<span class="order-status order-status--' + status + '">' + (STATUS_LABEL[status] || status) + '</span>'
          + '</div>'
          + '<div class="order-card-body">'
            + '<div class="order-items-preview">' + thumbsHtml + '</div>'
            + '<div>'
              + '<div class="order-total">' + formatPrice(order.total || 0) + '</div>'
              + '<div class="order-items-count">' + items.length + ' item' + (items.length !== 1 ? 's' : '') + '</div>'
            + '</div>'
          + '</div>'
        + '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  /* ── Render settings ─────────────────────────────────────── */

  function renderSettings() {
    var nameInput = document.getElementById('setting-name');
    if (nameInput) nameInput.value = state.user.name || '';

    /* Hide password section for social login users */
    var pwSection = document.getElementById('section-password');
    if (pwSection && state.user.provider && state.user.provider !== 'Email') {
      pwSection.style.display = 'none';
    }
  }

  /* ── Save display name ───────────────────────────────────── */

  function doSaveName() {
    var input = document.getElementById('setting-name');
    var name  = input ? input.value.trim() : '';
    if (!name) { showToast('Name cannot be empty', '⚠'); return; }

    state.user.name = name;
    storage.set(USER_KEY, state.user);

    /* Also update mp_users array (email accounts) */
    var users = storage.get(USERS_KEY, []);
    var found = users.find(function (u) { return u.email === state.user.email; });
    if (found) { found.name = name; storage.set(USERS_KEY, users); }

    renderProfile();
    showToast('Name updated', '✓');
  }

  /* ── Change password ─────────────────────────────────────── */

  function doChangePassword() {
    var curr    = val('pass-current');
    var next    = val('pass-new');
    var confirm = val('pass-confirm');

    if (!curr || !next || !confirm) { showToast('Fill in all fields', '⚠'); return; }
    if (next.length < 8)            { showToast('Password must be at least 8 characters', '⚠'); return; }
    if (next !== confirm)           { showToast('Passwords do not match', '⚠'); return; }

    var users = storage.get(USERS_KEY, []);
    var found = users.find(function (u) { return u.email === state.user.email; });
    if (!found)                        { showToast('Account not found', '✕'); return; }
    if (found.password !== curr)       { showToast('Current password is incorrect', '✕'); return; }

    found.password = next;
    storage.set(USERS_KEY, users);
    ['pass-current', 'pass-new', 'pass-confirm'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    showToast('Password changed successfully', '✓');
  }

  /* ── Sign out ────────────────────────────────────────────── */

  function doSignOut() {
    storage.remove(USER_KEY);
    window.location.replace('index.html');
  }

  /* ── Delete account ──────────────────────────────────────── */

  function doDeleteAccount() {
    if (!window.confirm('Delete your account? This cannot be undone.')) return;
    var email = state.user.email;
    var users = storage.get(USERS_KEY, []).filter(function (u) { return u.email !== email; });
    storage.set(USERS_KEY, users);
    storage.remove(USER_KEY);
    window.location.replace('index.html');
  }

  /* ── Helpers ─────────────────────────────────────────────── */

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatOrderDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch (e) { return iso; }
  }

  /* ── Bootstrap ───────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    if (!guardAuth()) return;

    /* Load orders that belong to this user */
    var allOrders = storage.get(ORDERS_KEY, []);
    state.orders  = allOrders.filter(function (o) {
      return o.customer && o.customer.email === state.user.email;
    });

    /* Deep-link via URL hash (e.g. account.html#orders) */
    var hash = window.location.hash.replace('#', '');
    if (['orders', 'settings'].indexOf(hash) !== -1) switchPanel(hash);

    renderProfile();
    renderOrders();
    renderSettings();

    /* Tab nav */
    document.querySelectorAll('.account-nav-btn[data-panel]').forEach(function (btn) {
      btn.addEventListener('click', function () { switchPanel(btn.dataset.panel); });
    });

    /* Orders stat card */
    var ordBtn = document.getElementById('stat-orders-btn');
    if (ordBtn) ordBtn.addEventListener('click', function () { switchPanel('orders'); });

    /* Sign out */
    ['sidebar-signout', 'profile-signout'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', doSignOut);
    });

    /* Settings */
    var btnName = document.getElementById('btn-save-name');
    if (btnName) btnName.addEventListener('click', doSaveName);

    var btnPass = document.getElementById('btn-change-pass');
    if (btnPass) btnPass.addEventListener('click', doChangePassword);

    /* Enter key on name field */
    var nameInput = document.getElementById('setting-name');
    if (nameInput) {
      nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doSaveName();
      });
    }

    /* Delete account */
    var btnDel = document.getElementById('btn-delete-account');
    if (btnDel) btnDel.addEventListener('click', doDeleteAccount);
  });

})();
