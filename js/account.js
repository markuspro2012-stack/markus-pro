/* ============================================================
   MARKUS PRO — account.js
   User account page: profile, order history, settings.
   Supabase auth (primary) with localStorage fallback.
   Requires: utils.js, products.js, app.js
============================================================ */

(function () {
  'use strict';

  var USER_KEY     = 'mp_user';
  var CART_KEY     = 'mp_cart';
  var WISHLIST_KEY = 'mp_wishlist';

  var STATUS_LABEL = {
    pending:   'Pending',
    confirmed: 'Confirmed',
    shipped:   'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };

  var state = { user: null, sbUser: null, orders: [] };

  /* ── Supabase available? ─────────────────────────────────── */

  function useSb() { return !!(window.sb); }

  /* ── Auth guard (async-capable) ─────────────────────────── */

  function guardAuth(cb) {
    if (useSb()) {
      window.sb.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        if (!session) { window.location.replace('login.html'); return; }
        var u = session.user;
        state.sbUser = u;
        state.user = {
          name:     (u.user_metadata && u.user_metadata.full_name) || u.email.split('@')[0],
          email:    u.email,
          provider: (u.app_metadata && u.app_metadata.provider) || 'email'
        };
        loadSupabaseData(cb);
      }).catch(function () { window.location.replace('login.html'); });
      return;
    }

    /* localStorage fallback */
    var user = storage.get(USER_KEY, null);
    if (!user) { window.location.replace('login.html'); return; }
    state.user = user;
    cb();
  }

  /* ── Load Supabase profile + orders ─────────────────────── */

  function loadSupabaseData(cb) {
    var uid = state.sbUser.id;
    Promise.all([
      window.sb.from('profiles').select('name, provider').eq('id', uid).single(),
      window.sb.from('orders').select('*').eq('user_id', uid).order('created_at', { ascending: false })
    ]).then(function (results) {
      var profile = results[0].data;
      if (profile) {
        if (profile.name)     state.user.name     = profile.name;
        if (profile.provider) state.user.provider = profile.provider;
      }
      state.orders = results[1].data || [];
      cb();
    }).catch(function () { cb(); });
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

    setText('sidebar-avatar', initial);
    setText('sidebar-name',   u.name  || 'User');
    setText('sidebar-email',  u.email || '—');

    setText('profile-avatar',   initial);
    setText('profile-name',     u.name  || 'User');
    setText('profile-email',    u.email || '—');
    setText('profile-provider', u.provider || 'Email');

    var cartQty  = storage.get(CART_KEY, []).reduce(function (s, i) { return s + (i.qty || 1); }, 0);
    var wishQty  = storage.get(WISHLIST_KEY, []).length;
    var ordCount = state.orders.length;

    setText('stat-cart',     cartQty);
    setText('stat-wishlist', wishQty);
    setText('stat-orders',   ordCount);

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
      var date    = formatOrderDate(order.created_at || order.date);
      var status  = order.status || 'pending';

      var thumbsHtml = preview.map(function (it) {
        var product = (typeof PRODUCTS !== 'undefined')
          ? PRODUCTS.find(function (p) { return p.id === it.id; })
          : null;
        var src = (product && product.image) || ('https://picsum.photos/seed/' + (it.id || 1) + '/56/56');
        return '<img class="order-item-thumb" src="' + esc(src) + '" alt="' + esc(it.name || '') + '" loading="lazy">';
      }).join('');

      if (more > 0) thumbsHtml += '<div class="order-item-more">+' + more + '</div>';

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

    var provider = (state.user.provider || 'email').toLowerCase();
    var isSocial = provider === 'google' || provider === 'apple';
    var pwSection = document.getElementById('section-password');
    if (pwSection) pwSection.style.display = isSocial ? 'none' : '';
  }

  /* ── Save display name ───────────────────────────────────── */

  function doSaveName() {
    var input = document.getElementById('setting-name');
    var name  = input ? input.value.trim() : '';
    if (!name) { showToast('Name cannot be empty', '⚠'); return; }

    if (useSb() && state.sbUser) {
      window.sb.from('profiles').update({ name: name }).eq('id', state.sbUser.id)
        .then(function () {
          state.user.name = name;
          renderProfile();
          showToast('Name updated', '✓');
        }).catch(function (err) { showToast('Update failed: ' + (err.message || ''), '✕'); });
      return;
    }

    /* localStorage fallback */
    state.user.name = name;
    storage.set(USER_KEY, state.user);
    renderProfile();
    showToast('Name updated', '✓');
  }

  /* ── Change password ─────────────────────────────────────── */

  function doChangePassword() {
    var next    = val('pass-new');
    var confirm = val('pass-confirm');

    if (!next || !confirm) { showToast('Fill in all fields', '⚠'); return; }
    if (next.length < 8)   { showToast('Password must be at least 8 characters', '⚠'); return; }
    if (next !== confirm)  { showToast('Passwords do not match', '⚠'); return; }

    if (useSb()) {
      window.sb.auth.updateUser({ password: next }).then(function (result) {
        if (result.error) { showToast(result.error.message, '✕'); return; }
        clearPasswordFields();
        showToast('Password changed successfully', '✓');
      });
      return;
    }
    showToast('Password change is only available when signed in via email', '⚠');
  }

  /* ── Sign out ────────────────────────────────────────────── */

  function doSignOut() {
    if (useSb()) {
      window.sb.auth.signOut().then(function () {
        storage.remove(USER_KEY);
        window.location.replace('index.html');
      });
      return;
    }
    storage.remove(USER_KEY);
    window.location.replace('index.html');
  }

  /* ── Delete account ──────────────────────────────────────── */

  function doDeleteAccount() {
    if (!window.confirm('Delete your account? This cannot be undone.')) return;
    if (useSb()) {
      showToast('To delete your account, contact support at markuspro2012@gmail.com', '⚠');
      return;
    }
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
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function clearPasswordFields() {
    ['pass-current', 'pass-new', 'pass-confirm'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  function formatOrderDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch (e) { return String(iso); }
  }

  /* ── Main init (called after auth + data load) ───────────── */

  function continueInit() {
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

    var nameInput = document.getElementById('setting-name');
    if (nameInput) {
      nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doSaveName();
      });
    }

    var btnDel = document.getElementById('btn-delete-account');
    if (btnDel) btnDel.addEventListener('click', doDeleteAccount);
  }

  /* ── Bootstrap ───────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    guardAuth(continueInit);
  });

}());
