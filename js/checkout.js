/* ============================================================
   MARKUS PRO — checkout.js
   3-step checkout: Delivery → Payment → Confirmation
   Guest and registered user modes.
============================================================ */

(function () {
  'use strict';

  var delivery = {};

  /* ── Helpers ─────────────────────────────────────────────── */

  function getSession(cb) {
    if (window.sb) {
      window.sb.auth.getSession().then(function (r) {
        cb(r.data && r.data.session ? r.data.session : null);
      }).catch(function () { cb(null); });
    } else {
      cb(null);
    }
  }

  function formatCard(v) {
    return v.replace(/\D/g, '').substring(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  function formatExpiry(v) {
    var d = v.replace(/\D/g, '').substring(0, 4);
    return d.length > 2 ? d.substring(0, 2) + ' / ' + d.substring(2) : d;
  }

  /* ── Steps ───────────────────────────────────────────────── */

  function goToStep(n) {
    [1, 2, 3].forEach(function (i) {
      var s = document.getElementById('step-' + i);
      var p = document.querySelector('.progress-step[data-step="' + i + '"]');
      if (s) s.classList.toggle('is-active', i === n);
      if (p) {
        p.classList.toggle('is-active', i === n);
        p.classList.toggle('is-done',   i < n);
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Order summary ───────────────────────────────────────── */

  function renderSummary() {
    var items     = Cart.getItems();
    var container = document.getElementById('order-items');
    if (!container) return;

    container.innerHTML = items.map(function (item) {
      return '<div class="summary-item">'
        + '<img src="' + item.image + '" alt="' + item.name + '" loading="lazy">'
        + '<div class="summary-item-info">'
          + '<span class="summary-item-name">' + item.name + '</span>'
          + '<span class="summary-item-meta">Size ' + item.size + '  ×  ' + item.qty + '</span>'
        + '</div>'
        + '<span class="summary-item-price">' + formatPrice(item.price * item.qty) + '</span>'
      + '</div>';
    }).join('');

    var subtotal = Cart.getSubtotal();
    var el;
    el = document.getElementById('summary-subtotal'); if (el) el.textContent = formatPrice(subtotal);
    el = document.getElementById('summary-total');    if (el) el.textContent = formatPrice(subtotal);
  }

  /* ── Delivery recap (shown on step 2) ────────────────────── */

  function renderDeliveryRecap() {
    var el = document.getElementById('delivery-recap');
    if (!el) return;
    el.innerHTML =
      '<strong>' + delivery.name + '</strong>'
      + delivery.address + ', ' + delivery.city + ' ' + delivery.zip
      + (delivery.country ? ', ' + delivery.country : '')
      + '<br>' + delivery.email
      + (delivery.phone ? ' · ' + delivery.phone : '');
  }

  /* ── Step 1 ──────────────────────────────────────────────── */

  function initStep1() {
    var form = document.getElementById('form-delivery');
    if (!form) return;

    getSession(function (session) {
      if (session && session.user) {
        var u = session.user;
        var nameEl  = form.querySelector('[name="fullname"]');
        var emailEl = form.querySelector('[name="email"]');
        if (nameEl)  nameEl.value     = u.user_metadata.full_name || '';
        if (emailEl) { emailEl.value  = u.email || ''; emailEl.readOnly = true; }
        var banner = document.getElementById('signin-banner');
        if (banner) banner.style.display = 'none';
      }
    });

    var dismissBtn = document.getElementById('dismiss-banner');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function () {
        var banner = document.getElementById('signin-banner');
        if (banner) banner.style.display = 'none';
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      function val(name) {
        var el = form.querySelector('[name="' + name + '"]');
        return el ? el.value.trim() : '';
      }
      delivery = {
        name:    val('fullname'),
        email:   val('email'),
        phone:   val('phone'),
        address: val('address'),
        city:    val('city'),
        zip:     val('zip'),
        country: val('country')
      };
      renderSummary();
      renderDeliveryRecap();
      goToStep(2);
    });
  }

  /* ── Step 2 ──────────────────────────────────────────────── */

  function initStep2() {
    var form = document.getElementById('form-payment');
    if (!form) return;

    var backBtn = document.getElementById('back-to-delivery');
    if (backBtn) backBtn.addEventListener('click', function () { goToStep(1); });

    var editBtn = document.getElementById('edit-delivery');
    if (editBtn) editBtn.addEventListener('click', function () { goToStep(1); });

    /* Card number formatting */
    var cardInput   = form.querySelector('[name="card-number"]');
    var expiryInput = form.querySelector('[name="expiry"]');
    var cvvInput    = form.querySelector('[name="cvv"]');

    if (cardInput) {
      cardInput.addEventListener('input', function () {
        var start = cardInput.selectionStart;
        var prev  = cardInput.value.length;
        cardInput.value = formatCard(cardInput.value);
        var diff = cardInput.value.length - prev;
        try { cardInput.setSelectionRange(start + diff, start + diff); } catch(e) {}
      });
    }
    if (expiryInput) {
      expiryInput.addEventListener('input', function () {
        expiryInput.value = formatExpiry(expiryInput.value);
      });
    }
    if (cvvInput) {
      cvvInput.addEventListener('input', function () {
        cvvInput.value = cvvInput.value.replace(/\D/g, '').substring(0, 4);
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Processing…'; }

      getSession(function (session) {
        var userId = session ? session.user.id : null;

        fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:    delivery.name,
            email:   delivery.email,
            phone:   delivery.phone,
            address: delivery.address,
            city:    delivery.city,
            zip:     delivery.zip,
            country: delivery.country,
            items:   Cart.getItems(),
            userId:  userId
          })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.error) throw new Error(data.error);

          /* Populate confirmation screen */
          var el;
          el = document.getElementById('conf-order-num');   if (el) el.textContent = data.orderId;
          el = document.getElementById('conf-email');        if (el) el.textContent = delivery.email;
          el = document.getElementById('conf-total');        if (el) el.textContent = formatPrice(data.total);
          el = document.getElementById('conf-account-link');
          if (el) el.style.display = userId ? 'inline' : 'none';

          /* Clear cart */
          storage.remove('mp_cart');
          syncCartBadge();

          goToStep(3);
        })
        .catch(function (err) {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Place Order'; }
          showToast('Order failed: ' + err.message, '✕');
        });
      });
    });
  }

  /* ── Bootstrap ───────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    /* Redirect if cart is empty */
    if (Cart.getTotalQty() === 0) {
      window.location.replace('catalog.html');
      return;
    }

    initStep1();
    initStep2();
    renderSummary();
    goToStep(1);
  });

})();
