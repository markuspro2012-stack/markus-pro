/* ============================================================
   MARKUS PRO — Admin Panel Logic
   Auth via sessionStorage. Data via localStorage.
   Reads DEFAULT_PRODUCTS from products.js (loaded before this).
============================================================ */
(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────── */
  var PASS_KEY     = 'mp_admin_pass';
  var SESSION_KEY  = 'mp_admin_session';
  var PRODUCTS_KEY = 'mp_products';
  var ORDERS_KEY   = 'mp_orders';
  var SETTINGS_KEY = 'mp_settings';
  var LOG_KEY      = 'mp_admin_log';
  var DEFAULT_PASS = 'markuspro2026';

  var SIZES_BY_CAT = {
    tshirts:  ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    pants:    ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    sneakers: ['38', '39', '40', '41', '42', '43', '44', '45', '46'],
    socks:    ['S (36-39)', 'M (40-43)', 'L (44-46)']
  };

  var CAT_LABELS = {
    tshirts:  'T-Shirts',
    pants:    'Pants',
    sneakers: 'Sneakers',
    socks:    'Socks'
  };

  /* order status → CSS modifier */
  var STATUS_CSS = {
    pending:   'warning',
    confirmed: 'blue',
    shipped:   'purple',
    delivered: 'success',
    cancelled: 'error'
  };

  /* ── State ─────────────────────────────────────────────── */
  var state = {
    products:  [],
    orders:    [],
    settings:  {},
    log:       [],
    selected:  new Set(),
    section:   'dashboard',
    search:    '',
    filterCat: '',
    sortKey:   'id',
    sortDir:   'asc',
    page:      1,
    perPage:   10,
    editId:    null
  };

  var confirmCallback = null;
  var toastTimer;

  /* ── Utilities ─────────────────────────────────────────── */
  function escHtml(v) {
    if (v == null) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, c = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(c, a); }, ms);
    };
  }

  function store(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function load(key, fallback) {
    try { var r = localStorage.getItem(key); if (r) return JSON.parse(r); } catch (e) {}
    return fallback;
  }

  function getPass() { return localStorage.getItem(PASS_KEY) || DEFAULT_PASS; }

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  function setText(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; }

  function nextId() {
    if (!state.products.length) return 1;
    return Math.max.apply(null, state.products.map(function (p) { return p.id || 0; })) + 1;
  }

  function logActivity(msg) {
    state.log.unshift({ msg: msg, ts: Date.now() });
    if (state.log.length > 50) state.log.length = 50;
    store(LOG_KEY, state.log);
  }

  /* ── Auth ──────────────────────────────────────────────── */
  function isAuthed() { return sessionStorage.getItem(SESSION_KEY) === '1'; }

  function doLogin(pass) {
    if (pass === getPass()) { sessionStorage.setItem(SESSION_KEY, '1'); return true; }
    return false;
  }

  function doLogout() { sessionStorage.removeItem(SESSION_KEY); location.reload(); }

  /* ── Init ──────────────────────────────────────────────── */
  function init() {
    var dateEl = document.getElementById('topbar-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-GB', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    bindAuth();
    if (isAuthed()) {
      bootApp();
    } else {
      document.getElementById('auth-gate').style.display = '';
    }
  }

  function bootApp() {
    document.getElementById('auth-gate').style.display = 'none';
    document.getElementById('admin-app').style.display = '';

    var stored = load(PRODUCTS_KEY, null);
    state.products = (Array.isArray(stored) && stored.length)
      ? stored
      : DEFAULT_PRODUCTS.map(function (p) { return Object.assign({}, p); });

    state.orders   = load(ORDERS_KEY, []);
    state.settings = load(SETTINGS_KEY, {
      ticker: 'FREE SHIPPING ON ORDERS OVER €50\nNEW COLLECTION JUST DROPPED\nFREE RETURNS WITHIN 14 DAYS'
    });
    state.log = load(LOG_KEY, []);

    renderCounts();
    navigateTo('dashboard');
    bindApp();
  }

  /* ── Navigation ────────────────────────────────────────── */
  function navigateTo(section) {
    state.section = section;
    state.page    = 1;

    document.querySelectorAll('.admin-nav-item[data-section]').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.section === section);
    });
    document.querySelectorAll('.admin-section').forEach(function (s) {
      s.classList.toggle('is-active', s.id === 'section-' + section);
    });

    var bc = document.getElementById('topbar-section');
    if (bc) bc.textContent = cap(section);

    if (section === 'dashboard')  renderDashboard();
    if (section === 'products')   renderProducts();
    if (section === 'orders')     renderOrders();
    if (section === 'promotions') renderPromotions();
    if (section === 'settings')   renderSettings();

    document.getElementById('admin-sidebar').classList.remove('is-open');
    document.getElementById('sidebar-overlay').classList.remove('is-visible');
  }

  function renderCounts() {
    setText('nav-products-count', state.products.length);
    setText('nav-orders-count',   state.orders.length);
  }

  /* ── Dashboard ─────────────────────────────────────────── */
  function renderDashboard() {
    var total  = state.products.length;
    var active = state.products.filter(function (p) { return p.active !== false; }).length;
    var oos    = state.products.filter(function (p) {
      return p.soldOut && p.sizes && p.sizes.length > 0 && p.soldOut.length >= p.sizes.length;
    }).length;

    setText('kpi-total',  total);
    setText('kpi-active', active);
    setText('kpi-low',    oos);
    setText('kpi-orders', state.orders.length);

    /* category stats bars */
    var cats = {};
    state.products.forEach(function (p) {
      var k = p.category || 'other';
      cats[k] = (cats[k] || 0) + 1;
    });

    var statsEl = document.getElementById('category-stats');
    if (statsEl) {
      if (!total) {
        statsEl.innerHTML = '<p class="log-empty">No products yet</p>';
      } else {
        statsEl.innerHTML = Object.keys(cats).map(function (k) {
          var pct = Math.round((cats[k] / total) * 100);
          return '<div class="cat-stat">'
            + '<span class="cat-stat-name">' + escHtml(CAT_LABELS[k] || k) + '</span>'
            + '<div class="cat-stat-bar"><div class="cat-stat-fill" style="width:' + pct + '%"></div></div>'
            + '<span class="cat-stat-count">' + cats[k] + '</span>'
            + '</div>';
        }).join('');
      }
    }

    /* activity log */
    var logEl = document.getElementById('activity-log');
    if (logEl) {
      if (!state.log.length) {
        logEl.innerHTML = '<p class="log-empty">No recent activity</p>';
      } else {
        logEl.innerHTML = state.log.slice(0, 8).map(function (e) {
          return '<div class="log-entry">'
            + '<span class="log-action">' + escHtml(e.msg) + '</span>'
            + '<span class="log-time">'   + escHtml(fmtDate(e.ts)) + '</span>'
            + '</div>';
        }).join('');
      }
    }
  }

  /* ── Products — filter / sort / page ───────────────────── */
  function getFiltered() {
    var list = state.products.slice();
    var q    = state.search.toLowerCase().trim();

    if (q) {
      list = list.filter(function (p) {
        return ((p.name || '') + ' ' + (p.sku || '')).toLowerCase().indexOf(q) >= 0;
      });
    }
    if (state.filterCat) {
      list = list.filter(function (p) { return p.category === state.filterCat; });
    }

    list.sort(function (a, b) {
      var av, bv;
      if (state.sortKey === 'name')       { av = (a.name  || '').toLowerCase(); bv = (b.name  || '').toLowerCase(); }
      else if (state.sortKey === 'price') { av = a.price  || 0;                 bv = b.price  || 0; }
      else                                { av = a.id     || 0;                 bv = b.id     || 0; }
      return av < bv ? (state.sortDir === 'asc' ? -1 : 1)
           : av > bv ? (state.sortDir === 'asc' ?  1 : -1) : 0;
    });
    return list;
  }

  /* ── Products — render table ───────────────────────────── */
  function renderProducts() {
    var list  = getFiltered();
    var pages = Math.max(1, Math.ceil(list.length / state.perPage));
    if (state.page > pages) state.page = 1;
    var slice = list.slice((state.page - 1) * state.perPage, state.page * state.perPage);

    var lbl = document.getElementById('products-count-label');
    if (lbl) lbl.textContent = list.length + ' product' + (list.length !== 1 ? 's' : '');

    var tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    if (!slice.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="table-empty">No products found</td></tr>';
    } else {
      tbody.innerHTML = slice.map(function (p) {
        var sel  = state.selected.has(p.id) ? ' is-selected' : '';
        var chk  = state.selected.has(p.id) ? ' checked' : '';

        var tagHtml = p.tag
          ? '<span class="admin-tag admin-tag--' + escHtml(p.tag) + '">' + escHtml(p.tag.toUpperCase()) + '</span>'
          : '<span style="color:var(--text-muted)">—</span>';

        var featHtml = p.featured
          ? '<span class="status-dot status-dot--featured" title="Featured">★</span>'
          : '<span class="status-dot status-dot--no" title="Not featured">—</span>';

        var actHtml = p.active !== false
          ? '<span class="status-dot status-dot--active"  title="Active">●</span>'
          : '<span class="status-dot status-dot--inactive" title="Inactive">●</span>';

        var imgHtml = p.image
          ? '<div class="thumb-wrap"><img src="' + escHtml(p.image) + '" alt="" class="thumb-img" loading="lazy"></div>'
          : '<div class="thumb-wrap"></div>';

        return '<tr class="' + sel + '" data-id="' + p.id + '">'
          + '<td class="col-check"><input type="checkbox" class="row-check" data-id="' + p.id + '"' + chk + '></td>'
          + '<td class="col-img">'      + imgHtml + '</td>'
          + '<td class="col-name"><span class="product-name-cell">' + escHtml(p.name) + '</span>'
          +   '<span class="product-sku-cell">' + escHtml(p.sku || '') + '</span></td>'
          + '<td class="col-cat">'      + escHtml(CAT_LABELS[p.category] || p.category || '—') + '</td>'
          + '<td class="col-price"><span class="price-cell' + (p.originalPrice ? ' is-sale' : '') + '">€' + escHtml(p.price) + '</span>'
          + (p.originalPrice ? '<span class="price-cell-old">€' + escHtml(p.originalPrice) + '</span>' : '') + '</td>'
          + '<td class="col-tag">'      + tagHtml  + '</td>'
          + '<td class="col-featured">' + featHtml + '</td>'
          + '<td class="col-active">'   + actHtml  + '</td>'
          + '<td class="col-actions">'
          +   '<button class="action-btn action-btn--edit"   data-action="edit"   data-id="' + p.id + '" title="Edit">✏️</button>'
          +   '<button class="action-btn action-btn--delete" data-action="delete" data-id="' + p.id + '" title="Delete">🗑️</button>'
          + '</td>'
          + '</tr>';
      }).join('');
    }

    renderPagination(pages);
    updateBulkBar();
    syncCheckAll(list);
  }

  function renderPagination(pages) {
    var el = document.getElementById('products-pagination');
    if (!el) return;
    if (pages <= 1) { el.innerHTML = ''; return; }
    var html = '';
    for (var i = 1; i <= pages; i++) {
      html += '<button class="page-btn' + (i === state.page ? ' is-active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    el.innerHTML = html;
  }

  function syncCheckAll(list) {
    var ca = document.getElementById('check-all');
    if (!ca) return;
    var ids = list.slice((state.page - 1) * state.perPage, state.page * state.perPage).map(function (p) { return p.id; });
    var all = ids.length > 0 && ids.every(function (id) { return state.selected.has(id); });
    ca.checked       = all;
    ca.indeterminate = !all && ids.some(function (id) { return state.selected.has(id); });
  }

  function updateBulkBar() {
    var bar = document.getElementById('bulk-bar');
    var cnt = document.getElementById('bulk-count');
    if (!bar) return;
    var n = state.selected.size;
    bar.style.display = n > 0 ? '' : 'none';
    if (cnt) cnt.textContent = n + ' selected';
  }

  /* ── Product Modal ─────────────────────────────────────── */
  function openProductModal(id) {
    state.editId = id || null;
    var form     = document.getElementById('product-form');
    form.reset();

    /* reset tabs to Basic */
    document.querySelectorAll('.form-tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.tab === 'basic');
    });
    document.querySelectorAll('.form-tab-pane').forEach(function (p) {
      p.classList.toggle('is-active', p.id === 'tab-basic');
    });

    /* reset image preview */
    var prev = document.getElementById('img-preview-main');
    var ph   = document.getElementById('img-preview-placeholder');
    if (prev) { prev.style.display = 'none'; prev.src = ''; }
    if (ph)   ph.style.display = '';
    setText('preview-price', ''); setText('preview-original', ''); setText('preview-badge', '');
    var be = document.getElementById('preview-badge');
    if (be) be.className = 'preview-badge';

    var p = id ? state.products.find(function (x) { return x.id === id; }) : null;
    setText('modal-title', p ? 'Edit Product' : 'Add Product');

    if (p) {
      setF(form, 'name',          p.name          || '');
      setF(form, 'category',      p.category      || '');
      setF(form, 'description',   p.description   || '');
      setF(form, 'details',       p.details       || '');
      setF(form, 'sku',           p.sku           || '');
      setF(form, 'collection',    p.collection    || '');
      setF(form, 'shipping',      p.shipping      || '');
      setF(form, 'returns',       p.returns       || '');
      setF(form, 'price',         p.price         != null ? String(p.price) : '');
      setF(form, 'originalPrice', p.originalPrice != null ? String(p.originalPrice) : '');
      setF(form, 'tag',           p.tag           || '');
      setF(form, 'id',            p.id);
      form.elements['featured'].checked = !!p.featured;
      form.elements['active'].checked   = p.active !== false;
      setF(form, 'image',         p.image    || '');
      setF(form, 'imagesRaw',     (p.images  || []).join('\n'));

      if (p.image) {
        if (prev) { prev.src = p.image; prev.style.display = ''; }
        if (ph)   ph.style.display = 'none';
      }
      updatePricePreview(p.price, p.originalPrice, p.tag);
    }

    buildSizesGrid(p ? p.category : '', p ? (p.sizes || []) : [], p ? (p.soldOut || []) : []);
    document.getElementById('product-modal').style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
    document.body.style.overflow = '';
    state.editId = null;
  }

  function setF(form, name, value) {
    var el = form.elements[name];
    if (el) el.value = value != null ? value : '';
  }

  function buildSizesGrid(cat, selected, soldOut) {
    var sizes = SIZES_BY_CAT[cat] || [];
    var sEl   = document.getElementById('sizes-grid');
    var soEl  = document.getElementById('soldout-grid');
    if (!sEl || !soEl) return;

    if (!sizes.length) {
      var msg = '<p style="font-size:.75rem;color:var(--text-muted)">Select a category first</p>';
      sEl.innerHTML = msg; soEl.innerHTML = msg; return;
    }

    var h1 = '', h2 = '';
    sizes.forEach(function (sz) {
      var c1 = selected.indexOf(sz) >= 0 ? ' checked' : '';
      var c2 = soldOut.indexOf(sz)  >= 0 ? ' checked' : '';
      h1 += '<label class="size-chip"><input type="checkbox" class="size-available" value="' + escHtml(sz) + '"' + c1 + '><span>' + escHtml(sz) + '</span></label>';
      h2 += '<label class="size-chip size-chip--soldout"><input type="checkbox" class="size-soldout" value="' + escHtml(sz) + '"' + c2 + '><span>' + escHtml(sz) + '</span></label>';
    });
    sEl.innerHTML  = h1;
    soEl.innerHTML = h2;
  }

  function updatePricePreview(price, orig, tag) {
    var pe = document.getElementById('preview-price');
    var oe = document.getElementById('preview-original');
    var be = document.getElementById('preview-badge');
    if (pe) pe.textContent = (price != null && price !== '') ? '€' + price : '';
    if (oe) oe.textContent = (orig  != null && orig  !== '') ? '€' + orig  : '';
    if (be) {
      be.textContent = tag ? tag.toUpperCase() : '';
      be.className   = tag ? 'preview-badge preview-badge--' + tag : 'preview-badge';
    }
  }

  /* ── Save product ──────────────────────────────────────── */
  function saveProduct() {
    var form  = document.getElementById('product-form');
    var name  = form.elements['name'].value.trim();
    var cat   = form.elements['category'].value;
    var price = parseFloat(form.elements['price'].value);

    if (!name)        { showToast('Product name is required', 'error'); switchTab('basic');   return; }
    if (!cat)         { showToast('Please select a category', 'error'); switchTab('basic');   return; }
    if (isNaN(price)) { showToast('Valid price is required',  'error'); switchTab('pricing'); return; }

    var origRaw  = form.elements['originalPrice'].value.trim();
    var orig     = origRaw ? parseFloat(origRaw) : null;
    var tag      = form.elements['tag'].value      || null;
    var featured = form.elements['featured'].checked;
    var active   = form.elements['active'].checked;
    var imgUrl   = form.elements['image'].value.trim();
    var extras   = (form.elements['imagesRaw'].value.trim() || '')
                     .split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var allImgs  = (imgUrl ? [imgUrl] : [])
                     .concat(extras.filter(function (u) { return u !== imgUrl; }));

    /* querySelectorAll returns NodeList — convert via slice */
    var sizeCbs   = Array.prototype.slice.call(form.querySelectorAll('.size-available:checked'));
    var soldOutCbs = Array.prototype.slice.call(form.querySelectorAll('.size-soldout:checked'));
    var sizes     = sizeCbs.map(function (c) { return c.value; });
    var soldOut   = soldOutCbs.map(function (c) { return c.value; });

    var seed    = 'mp-' + Date.now();
    var product = {
      id:            state.editId || nextId(),
      name:          name,
      category:      cat,
      categoryLabel: CAT_LABELS[cat] || cat,
      price:         price,
      originalPrice: (orig != null && !isNaN(orig)) ? orig : null,
      tag:           tag,
      image:         imgUrl  || ('https://picsum.photos/seed/' + seed + '/600/750'),
      images:        allImgs.length ? allImgs : ['https://picsum.photos/seed/' + seed + '/800/1000'],
      sizes:         sizes,
      soldOut:       soldOut,
      featured:      featured,
      active:        active,
      description:   form.elements['description'].value.trim(),
      details:       form.elements['details'].value.trim(),
      shipping:      form.elements['shipping'].value.trim()  || 'Free shipping on orders over €50. Delivery 2–5 working days.',
      returns:       form.elements['returns'].value.trim()   || 'Free returns within 14 days.',
      sku:           form.elements['sku'].value.trim(),
      collection:    form.elements['collection'].value.trim()
    };

    if (state.editId) {
      var idx = state.products.findIndex(function (x) { return x.id === state.editId; });
      if (idx >= 0) state.products[idx] = product; else state.products.push(product);
      logActivity('Updated: ' + name);
      showToast('Product updated', 'success');
    } else {
      state.products.push(product);
      logActivity('Added: ' + name);
      showToast('Product added', 'success');
    }

    store(PRODUCTS_KEY, state.products);
    renderCounts();
    closeProductModal();
    renderProducts();
    if (state.section === 'dashboard') renderDashboard();
  }

  /* ── Delete product ────────────────────────────────────── */
  function deleteProduct(id) {
    var p = state.products.find(function (x) { return x.id === id; });
    if (!p) return;
    showConfirm('Delete Product', 'Delete "' + p.name + '"? This cannot be undone.', function () {
      state.products = state.products.filter(function (x) { return x.id !== id; });
      state.selected.delete(id);
      store(PRODUCTS_KEY, state.products);
      logActivity('Deleted: ' + p.name);
      renderCounts(); renderProducts();
      showToast('Product deleted', 'success');
    });
  }

  /* ── Bulk actions ──────────────────────────────────────── */
  function doBulkAction(action) {
    var ids = [];
    state.selected.forEach(function (id) { ids.push(id); });
    if (!ids.length) return;

    if (action === 'delete') {
      showConfirm('Delete ' + ids.length + ' Products',
        'Permanently delete ' + ids.length + ' selected products?',
        function () {
          state.products = state.products.filter(function (p) { return !state.selected.has(p.id); });
          logActivity('Bulk deleted ' + ids.length + ' products');
          state.selected.clear();
          store(PRODUCTS_KEY, state.products);
          renderCounts(); renderProducts();
          showToast(ids.length + ' products deleted', 'success');
        }
      );
      return;
    }

    state.products.forEach(function (p) {
      if (!state.selected.has(p.id)) return;
      if (action === 'activate')   p.active   = true;
      if (action === 'deactivate') p.active   = false;
      if (action === 'feature')    p.featured = true;
    });

    logActivity('Bulk ' + action + ': ' + ids.length + ' products');
    state.selected.clear();
    store(PRODUCTS_KEY, state.products);
    renderCounts(); renderProducts();
    showToast(ids.length + ' products updated', 'success');
  }

  /* ── Orders ────────────────────────────────────────────── */
  function renderOrders() {
    var tbody = document.getElementById('orders-tbody');
    var empty = document.getElementById('orders-empty');
    var wrap  = document.getElementById('orders-table-wrap');

    if (!state.orders.length) {
      if (wrap)  wrap.style.display  = 'none';
      if (empty) empty.style.display = '';
      return;
    }
    if (wrap)  wrap.style.display  = '';
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = state.orders.map(function (o) {
      var css  = STATUS_CSS[o.status] || 'warning';
      var opts = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(function (s) {
        return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + cap(s) + '</option>';
      }).join('');

      return '<tr>'
        + '<td><span class="order-id">#' + escHtml(o.id) + '</span></td>'
        + '<td class="order-date">' + escHtml(fmtDate(o.date)) + '</td>'
        + '<td class="order-customer">' + escHtml(o.customer) + '</td>'
        + '<td class="order-items">' + (o.items ? o.items.length : 0) + ' items</td>'
        + '<td class="order-total">€' + escHtml(o.total) + '</td>'
        + '<td><select class="status-select status-select--' + css + '" data-order-id="' + escHtml(o.id) + '">' + opts + '</select></td>'
        + '<td><button class="action-btn" data-action="view-order" data-order-id="' + escHtml(o.id) + '" title="View details">👁</button></td>'
        + '</tr>';
    }).join('');
  }

  function generateMockOrders() {
    var names    = ['Alex Johnson', 'Maria Silva', 'Tom Brown', 'Sarah Lee', 'Dmitri Volkov', 'Emma García'];
    var statuses = ['pending', 'confirmed', 'shipped', 'delivered'];
    var now      = Date.now();

    for (var i = 0; i < 5; i++) {
      var num   = Math.floor(Math.random() * 3) + 1;
      var items = [];
      for (var j = 0; j < num; j++) {
        var rp = state.products[Math.floor(Math.random() * Math.max(state.products.length, 1))];
        if (rp) items.push({ name: rp.name, price: rp.price });
      }
      var total = items.reduce(function (s, it) { return s + (it.price || 0); }, 0);
      state.orders.push({
        id:       'ORD-' + String(now + i).slice(-6),
        date:     now - Math.random() * 30 * 86400000,
        customer: names[Math.floor(Math.random() * names.length)],
        items:    items,
        total:    total,
        status:   statuses[Math.floor(Math.random() * statuses.length)]
      });
    }

    store(ORDERS_KEY, state.orders);
    renderCounts(); renderOrders();
    logActivity('Generated 5 mock orders');
    showToast('5 mock orders generated', 'success');
  }

  function viewOrder(id) {
    var o = state.orders.find(function (x) { return x.id === id; });
    if (!o) return;

    var rows = (o.items || []).map(function (it) {
      return '<div class="order-item-row"><span>' + escHtml(it.name) + '</span><span>€' + escHtml(it.price) + '</span></div>';
    }).join('');

    document.getElementById('order-modal-body').innerHTML =
        '<div class="order-detail">'
      + '<div class="order-detail-row"><span>Order #</span><strong>' + escHtml(o.id)               + '</strong></div>'
      + '<div class="order-detail-row"><span>Date</span><strong>'    + escHtml(fmtDate(o.date))    + '</strong></div>'
      + '<div class="order-detail-row"><span>Customer</span><strong>' + escHtml(o.customer)        + '</strong></div>'
      + '<div class="order-detail-row"><span>Status</span><strong>'  + cap(o.status)               + '</strong></div>'
      + '<hr class="order-hr">'
      + '<div class="order-items-list">' + rows + '</div>'
      + '<div class="order-detail-row order-detail-total"><span>Total</span><strong>€' + escHtml(o.total) + '</strong></div>'
      + '</div>';

    document.getElementById('order-modal').style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function closeOrderModal() {
    document.getElementById('order-modal').style.display = 'none';
    document.body.style.overflow = '';
  }

  /* ── Promotions ────────────────────────────────────────── */
  function renderPromotions() { renderFeaturedList(); }

  function renderFeaturedList() {
    var el = document.getElementById('featured-list');
    if (!el) return;

    if (!state.products.length) {
      el.innerHTML = '<p style="font-size:.75rem;color:var(--text-muted)">No products yet.</p>';
      return;
    }

    el.innerHTML = '<div class="featured-list">'
      + state.products.map(function (p) {
          return '<div class="featured-item">'
            + '<input type="checkbox" data-action="toggle-feature" data-id="' + p.id + '"' + (p.featured ? ' checked' : '') + '>'
            + '<span class="featured-item-name">' + escHtml(p.name)                          + '</span>'
            + '<span class="featured-item-cat">'  + escHtml(CAT_LABELS[p.category] || p.category || '') + '</span>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  function applyDiscount() {
    var cat = document.getElementById('promo-cat').value;
    var pct = parseFloat(document.getElementById('promo-discount').value);
    if (isNaN(pct) || pct <= 0 || pct >= 100) { showToast('Enter a valid discount % (1–99)', 'error'); return; }

    var count = 0;
    state.products.forEach(function (p) {
      if (cat !== 'all' && p.category !== cat) return;
      if (!p.originalPrice) p.originalPrice = p.price;
      p.price = Math.round(p.originalPrice * (1 - pct / 100));
      p.tag   = 'sale';
      count++;
    });
    store(PRODUCTS_KEY, state.products);
    logActivity('Applied ' + pct + '% discount to ' + count + ' products');
    showToast(count + ' products updated with ' + pct + '% discount', 'success');
    if (state.section === 'products') renderProducts();
  }

  function removeDiscount() {
    var cat   = document.getElementById('promo-remove-cat').value;
    var count = 0;
    state.products.forEach(function (p) {
      if (cat !== 'all' && p.category !== cat) return;
      if (p.originalPrice) { p.price = p.originalPrice; p.originalPrice = null; }
      if (p.tag === 'sale') p.tag = null;
      count++;
    });
    store(PRODUCTS_KEY, state.products);
    logActivity('Removed sale from ' + count + ' products');
    showToast('Sale removed from ' + count + ' products', 'success');
    if (state.section === 'products') renderProducts();
  }

  function applyBadge() {
    var badge = document.getElementById('promo-badge').value;
    var cat   = document.getElementById('promo-badge-cat').value;
    var count = 0;
    state.products.forEach(function (p) {
      if (cat !== 'all' && p.category !== cat) return;
      p.tag = badge; count++;
    });
    store(PRODUCTS_KEY, state.products);
    logActivity('Applied ' + badge.toUpperCase() + ' badge to ' + count + ' products');
    showToast(badge.toUpperCase() + ' applied to ' + count + ' products', 'success');
    if (state.section === 'products') renderProducts();
  }

  function clearBadges() {
    var cat   = document.getElementById('promo-badge-cat').value;
    var count = 0;
    state.products.forEach(function (p) {
      if (cat !== 'all' && p.category !== cat) return;
      p.tag = null; count++;
    });
    store(PRODUCTS_KEY, state.products);
    logActivity('Cleared badges from ' + count + ' products');
    showToast('Badges cleared from ' + count + ' products', 'success');
    if (state.section === 'products') renderProducts();
  }

  /* ── Settings ──────────────────────────────────────────── */
  function renderSettings() {
    var el = document.getElementById('setting-ticker');
    if (el) el.value = state.settings.ticker || '';
  }

  function doSaveSettings() {
    state.settings.ticker = (document.getElementById('setting-ticker').value || '').trim();
    store(SETTINGS_KEY, state.settings);
    try {
      localStorage.setItem('mp_ticker', JSON.stringify(
        state.settings.ticker.split('\n').filter(Boolean)
      ));
    } catch (e) {}
    logActivity('Store settings updated');
    showToast('Settings saved', 'success');
  }

  function doChangePassword() {
    var cur  = document.getElementById('pass-current').value;
    var nw   = document.getElementById('pass-new').value;
    var conf = document.getElementById('pass-confirm').value;
    if (cur !== getPass())  { showToast('Current password is incorrect', 'error');          return; }
    if (nw.length < 6)      { showToast('New password must be at least 6 characters', 'error'); return; }
    if (nw !== conf)        { showToast('Passwords do not match', 'error');                 return; }
    localStorage.setItem(PASS_KEY, nw);
    document.getElementById('pass-current').value = '';
    document.getElementById('pass-new').value     = '';
    document.getElementById('pass-confirm').value = '';
    logActivity('Admin password changed');
    showToast('Password updated', 'success');
  }

  function doExport() {
    var blob = new Blob([JSON.stringify(state.products, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'markuspro-products-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
    logActivity('Exported products JSON');
    showToast('Products exported', 'success');
  }

  function doImport(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('not array');
        showConfirm('Import Products',
          'Replace all current products with ' + data.length + ' imported products?',
          function () {
            state.products = data;
            store(PRODUCTS_KEY, state.products);
            renderCounts();
            logActivity('Imported ' + data.length + ' products from file');
            showToast(data.length + ' products imported', 'success');
            if (state.section === 'products') renderProducts();
          }
        );
      } catch (err) { showToast('Invalid JSON file', 'error'); }
    };
    reader.readAsText(file);
  }

  function doReset() {
    showConfirm('Reset to Defaults',
      'Replace all products with the 8 default products? Orders will be kept.',
      function () {
        state.products = DEFAULT_PRODUCTS.map(function (p) { return Object.assign({}, p); });
        store(PRODUCTS_KEY, state.products);
        renderCounts();
        logActivity('Reset products to defaults');
        showToast('Products reset to defaults', 'success');
        if (state.section === 'products')  renderProducts();
        if (state.section === 'dashboard') renderDashboard();
      }
    );
  }

  /* ── Confirm modal ─────────────────────────────────────── */
  function showConfirm(title, msg, cb) {
    confirmCallback = cb;
    setText('confirm-title',   title);
    setText('confirm-message', msg);
    document.getElementById('confirm-modal').style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function closeConfirm() {
    document.getElementById('confirm-modal').style.display = 'none';
    document.body.style.overflow = '';
    confirmCallback = null;
  }

  /* ── Toast ─────────────────────────────────────────────── */
  function showToast(msg, type) {
    var el = document.getElementById('admin-toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = msg;
    el.className   = 'admin-toast admin-toast--' + (type || 'info') + ' is-visible';
    toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 3000);
  }

  /* ── Tab switching ─────────────────────────────────────── */
  function switchTab(tab) {
    document.querySelectorAll('.form-tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.tab === tab);
    });
    document.querySelectorAll('.form-tab-pane').forEach(function (p) {
      p.classList.toggle('is-active', p.id === 'tab-' + tab);
    });
  }

  /* ── Event bindings ────────────────────────────────────── */
  function bindAuth() {
    var form = document.getElementById('auth-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pass  = document.getElementById('auth-pass').value;
      var errEl = document.getElementById('auth-error');
      if (doLogin(pass)) {
        bootApp();
      } else {
        if (errEl) errEl.style.display = '';
        document.getElementById('auth-pass').value = '';
        document.getElementById('auth-pass').focus();
      }
    });
  }

  function bindApp() {
    /* logout */
    var logoutBtn = document.getElementById('admin-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', doLogout);

    /* mobile sidebar */
    var toggle  = document.getElementById('admin-menu-toggle');
    var sidebar = document.getElementById('admin-sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (toggle)  toggle.addEventListener('click',  function () { sidebar.classList.toggle('is-open'); overlay.classList.toggle('is-visible'); });
    if (overlay) overlay.addEventListener('click', function () { sidebar.classList.remove('is-open'); overlay.classList.remove('is-visible'); });

    /* nav items */
    document.querySelectorAll('.admin-nav-item[data-section]').forEach(function (b) {
      b.addEventListener('click', function () { navigateTo(this.dataset.section); });
    });

    /* add product button */
    var addBtn = document.getElementById('btn-add-product');
    if (addBtn) addBtn.addEventListener('click', function () { openProductModal(null); });

    /* search */
    var searchEl = document.getElementById('product-search');
    if (searchEl) {
      var dSearch = debounce(function () { state.search = searchEl.value; state.page = 1; renderProducts(); }, 280);
      searchEl.addEventListener('input', dSearch);
    }

    /* filter by category */
    var filterEl = document.getElementById('product-filter-cat');
    if (filterEl) filterEl.addEventListener('change', function () { state.filterCat = this.value; state.page = 1; renderProducts(); });

    /* sort */
    var sortEl = document.getElementById('product-sort');
    if (sortEl) sortEl.addEventListener('change', function () {
      var parts = this.value.split('-');
      state.sortKey = parts[0]; state.sortDir = parts[1] || 'asc'; state.page = 1; renderProducts();
    });

    /* check-all */
    var checkAll = document.getElementById('check-all');
    if (checkAll) {
      checkAll.addEventListener('change', function () {
        var page = getFiltered().slice((state.page - 1) * state.perPage, state.page * state.perPage);
        page.forEach(function (p) { if (checkAll.checked) state.selected.add(p.id); else state.selected.delete(p.id); });
        renderProducts();
      });
    }

    /* products tbody delegation */
    var tbody = document.getElementById('products-tbody');
    if (tbody) {
      tbody.addEventListener('change', function (e) {
        var cb = e.target;
        if (cb.classList.contains('row-check')) {
          var id = parseInt(cb.dataset.id, 10);
          if (cb.checked) state.selected.add(id); else state.selected.delete(id);
          updateBulkBar(); syncCheckAll(getFiltered());
        }
      });
      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var id = parseInt(btn.dataset.id, 10);
        if (btn.dataset.action === 'edit')   openProductModal(id);
        if (btn.dataset.action === 'delete') deleteProduct(id);
      });
    }

    /* bulk bar */
    var bulkClear = document.getElementById('bulk-clear');
    if (bulkClear) bulkClear.addEventListener('click', function () { state.selected.clear(); renderProducts(); });
    document.querySelectorAll('[data-bulk]').forEach(function (b) {
      b.addEventListener('click', function () { doBulkAction(this.dataset.bulk); });
    });

    /* pagination */
    var pag = document.getElementById('products-pagination');
    if (pag) pag.addEventListener('click', function (e) {
      var b = e.target.closest('.page-btn');
      if (b) { state.page = parseInt(b.dataset.page, 10); renderProducts(); }
    });

    /* product modal controls */
    var mClose  = document.getElementById('modal-close');
    var mCancel = document.getElementById('modal-cancel');
    var mSave   = document.getElementById('modal-save');
    if (mClose)  mClose.addEventListener('click',  closeProductModal);
    if (mCancel) mCancel.addEventListener('click', closeProductModal);
    if (mSave)   mSave.addEventListener('click',   saveProduct);

    var pModal = document.getElementById('product-modal');
    if (pModal) pModal.addEventListener('click', function (e) { if (e.target === pModal) closeProductModal(); });

    /* form tabs */
    document.querySelectorAll('.form-tab').forEach(function (t) {
      t.addEventListener('click', function () { switchTab(this.dataset.tab); });
    });

    /* product form: category → rebuild sizes */
    var pForm = document.getElementById('product-form');
    if (pForm) {
      pForm.elements['category'].addEventListener('change', function () {
        var p = state.editId ? state.products.find(function (x) { return x.id === state.editId; }) : null;
        buildSizesGrid(this.value, p ? (p.sizes || []) : [], p ? (p.soldOut || []) : []);
      });

      /* image preview */
      pForm.elements['image'].addEventListener('input', function () {
        var url  = this.value.trim();
        var prev = document.getElementById('img-preview-main');
        var ph   = document.getElementById('img-preview-placeholder');
        if (url) { if (prev) { prev.src = url; prev.style.display = ''; } if (ph) ph.style.display = 'none'; }
        else     { if (prev) { prev.style.display = 'none'; prev.src = ''; } if (ph) ph.style.display = ''; }
      });

      /* price preview */
      var upd = function () {
        updatePricePreview(
          pForm.elements['price'].value         || null,
          pForm.elements['originalPrice'].value || null,
          pForm.elements['tag'].value
        );
      };
      pForm.elements['price'].addEventListener('input',         upd);
      pForm.elements['originalPrice'].addEventListener('input', upd);
      pForm.elements['tag'].addEventListener('change',          upd);
    }

    /* confirm modal */
    var cOk  = document.getElementById('confirm-ok');
    var cCan = document.getElementById('confirm-cancel');
    if (cOk)  cOk.addEventListener('click',  function () { if (confirmCallback) confirmCallback(); closeConfirm(); });
    if (cCan) cCan.addEventListener('click', closeConfirm);
    var cModal = document.getElementById('confirm-modal');
    if (cModal) cModal.addEventListener('click', function (e) { if (e.target === cModal) closeConfirm(); });

    /* orders tbody delegation */
    var ot = document.getElementById('orders-tbody');
    if (ot) {
      ot.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action="view-order"]');
        if (btn) viewOrder(btn.dataset.orderId);
      });
      ot.addEventListener('change', function (e) {
        var sel = e.target;
        if (sel.classList.contains('status-select')) {
          var o = state.orders.find(function (x) { return x.id === sel.dataset.orderId; });
          if (o) {
            o.status      = sel.value;
            sel.className = 'status-select status-select--' + (STATUS_CSS[sel.value] || 'warning');
            store(ORDERS_KEY, state.orders);
            showToast('Order status updated', 'success');
          }
        }
      });
    }

    /* generate mock orders */
    var genBtn = document.getElementById('btn-gen-orders');
    if (genBtn) genBtn.addEventListener('click', generateMockOrders);

    /* order modal close */
    var om  = document.getElementById('order-modal');
    var oc1 = document.getElementById('order-modal-close');
    var oc2 = document.getElementById('order-modal-close2');
    if (oc1) oc1.addEventListener('click', closeOrderModal);
    if (oc2) oc2.addEventListener('click', closeOrderModal);
    if (om)  om.addEventListener('click', function (e) { if (e.target === om) closeOrderModal(); });

    /* promotions buttons */
    var ad = document.getElementById('btn-apply-discount');
    var rd = document.getElementById('btn-remove-discount');
    var ab = document.getElementById('btn-apply-badge');
    var rb = document.getElementById('btn-remove-badge');
    if (ad) ad.addEventListener('click', applyDiscount);
    if (rd) rd.addEventListener('click', removeDiscount);
    if (ab) ab.addEventListener('click', applyBadge);
    if (rb) rb.addEventListener('click', clearBadges);

    /* featured list — toggle feature via checkbox */
    var fl = document.getElementById('featured-list');
    if (fl) {
      fl.addEventListener('change', function (e) {
        var cb = e.target;
        if (cb.dataset.action === 'toggle-feature') {
          var id = parseInt(cb.dataset.id, 10);
          var p  = state.products.find(function (x) { return x.id === id; });
          if (p) {
            p.featured = cb.checked;
            store(PRODUCTS_KEY, state.products);
            showToast(p.name + (cb.checked ? ' added to featured' : ' removed from featured'), 'success');
          }
        }
      });
    }

    /* settings */
    var ss  = document.getElementById('btn-save-settings');
    var cp  = document.getElementById('btn-change-pass');
    var ex  = document.getElementById('btn-export');
    var imp = document.getElementById('btn-import');
    var rst = document.getElementById('btn-reset');
    if (ss)  ss.addEventListener('click',  doSaveSettings);
    if (cp)  cp.addEventListener('click',  doChangePassword);
    if (ex)  ex.addEventListener('click',  doExport);
    if (imp) imp.addEventListener('change', function () { if (this.files[0]) doImport(this.files[0]); this.value = ''; });
    if (rst) rst.addEventListener('click', doReset);

    /* dashboard quick-action buttons */
    document.querySelectorAll('.quick-btn[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = this.dataset.action;
        if (action === 'add-product')   { navigateTo('products'); openProductModal(null); }
        if (action === 'go-promotions') navigateTo('promotions');
        if (action === 'go-orders')     navigateTo('orders');
        if (action === 'export')        doExport();
      });
    });

    /* ESC closes any open modal */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (document.getElementById('product-modal').style.display !== 'none') closeProductModal();
      if (document.getElementById('confirm-modal').style.display !== 'none') closeConfirm();
      if (document.getElementById('order-modal').style.display   !== 'none') closeOrderModal();
    });
  }

  /* ── Boot ──────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
