# MARKUS PRO — История проекта

**Проект:** Markus Pro e-commerce сайт  
**Начало:** 2026-05-23

---

## Журнал этапов

### 2026-05-23 — Инициализация проекта

**Что сделано:**
- Собраны требования от заказчика (тема, цвета, вайб, функционал, архитектура)
- Запущен параллельный анализ через 4 специализированных агента:
  - UI Designer → дизайн-система, цвета, типографика, компоненты, анимации
  - UX Architect → информационная архитектура, user flows, wireframes
  - Frontend Developer → tech stack, файловая структура, data layer
  - Product Manager → поэтапный план, quality gates, риски
- Составлен и утверждён детальный план разработки
- Создан `PROJECT_PLAN.md` с полным планом
- Создан `PROJECT_HISTORY.md` (этот файл)

**Принятые решения:**
- Тема: Dark mode (`#0A0A0A`)
- Акцент: Electric Blue (`#00BFFF`)
- Вайб: Clean youth fashion (Sporty & Rich, Represent)
- Анимации: Smooth & subtle
- Функционал: Cart + Wishlist + Login
- Архитектура: Frontend only (Vanilla HTML/CSS/JS + localStorage)
- Шрифты: Syne + Inter + JetBrains Mono
- Изображения: picsum.photos (seed-based)
- Локальный запуск: VS Code Live Server

**Файлы созданы:**
- `PROJECT_PLAN.md`
- `PROJECT_HISTORY.md`
- `products.js` (начальная версия — создан до утверждения плана, будет доработан в Этапе 2)
- `app.js` (начальная версия — будет разбит по модулям в Этапе 3)

---

<!-- Следующие записи добавляются автоматически после завершения каждого этапа -->

### ЭТАП 1 — Дизайн-система и скаффолд
**Статус:** ✅ Завершён — 2026-05-23

**Что сделано:**
- Создана структура папок: `css/`, `css/pages/`, `js/`, `js/pages/`, `assets/images/`, `assets/icons/`
- Написана полная дизайн-система на основе анализа 4 агентов

**Файлы созданы:**
- `css/tokens.css` — 70+ CSS custom properties (цвета, шрифты, отступы, радиусы, тени, анимации, z-index)
- `css/reset.css` — нормализация браузеров, кастомный скроллбар, reduced motion
- `css/typography.css` — типографическая система: display/h1-h4/body/label/price классы, section-label паттерн
- `css/components.css` — кнопки (5 стилей × 3 размера), инпуты, бейджи, size selector, qty stepper, filter pills, toast, accordion, overlay, empty state
- `css/layout.css` — container, grid-products, grid-categories, flex utilities, spacing utilities, reveal анимации
- `css/header.css` — nav (fixed, scroll behavior), logo, links с underline анимацией, icon buttons, mobile toggle, mobile menu overlay, ticker
- `css/footer.css` — 4-колоночная сетка, social links, legal bar
- `js/utils.js` — localStorage wrapper (try/catch), formatPrice, getParam, buildProductURL, DOM helpers (qs/qsa/on), debounce, showToast, scroll lock/unlock, initReveal (IntersectionObserver), initNavScroll, initMobileNav, initTicker

**Принятые технические решения:**
- Шрифты: Syne 700 (заголовки) + Inter 400/500/600 (body) + JetBrains Mono 700 (цены) — Google Fonts CDN
- Все токены хранятся в `tokens.css`, никаких захардкоженных значений в других файлах
- Анимации: `cubic-bezier(0.4, 0, 0.2, 1)` — плавное торможение без "резинки"
- Mobile menu: slide-in overlay из левого края, 400ms enter

**Quality Gate 1 — Результат:**
- [x] Все CSS custom properties в `tokens.css`
- [x] Нет захардкоженных значений в других файлах  
- [x] Шрифты подключены через Google Fonts в tokens.css
- [x] `utils.js` — localStorage с try/catch на все операции

---

### ЭТАП 2 — Данные и скелеты страниц
**Статус:** ✅ Завершён — 2026-05-23

**Что сделано:**
- Расширен `js/products.js`: 8 товаров с полной схемой (id, name, category, categoryLabel, price, originalPrice, tag, image, images[], sizes[], soldOut[], featured, description, details, shipping, returns, sku, collection) + helpers: getProductById, getProductsByCategory, getFeaturedProducts, getRelatedProducts
- Добавлен `.product-card` блок в `css/components.css` (img-wrap 4:5, overlay on hover, heart button, price badges)
- Написан `css/cart-drawer.css` — slide-in drawer справа, 420px, cart items, footer с subtotal
- Написаны 5 CSS страниц в `css/pages/`: home, catalog, product, wishlist, login

**HTML-страницы созданы:**
- `index.html` — Ticker, Hero (100vh), Categories (4-col), Featured Products, Brand Statement, New Arrivals strip, Newsletter, Footer
- `catalog.html` — Toolbar (filter pills + sort select), Sidebar (category + price + tag фильтры), Grid
- `product.html` — Breadcrumb, Gallery (main img + thumbs), Info panel (category tag, name, price, desc, size selector, qty stepper, CTA, accordion), Related Products
- `wishlist.html` — Header с count, auth prompt bar, Grid, Empty state
- `login.html` — Tab switcher (Sign In / Register), Social buttons, Form validation, Password strength indicator

**JS-модули созданы:**
- `js/app.js` — Cart / Wishlist localStorage state, badge sync, `buildProductCard()`, cart drawer render, homepage injection (featured + arrivals)
- `js/catalog.js` — фильтрация (category + tag + price range), сортировка, URL param init
- `js/product.js` — gallery thumbs, size selection, qty stepper, Add to Cart, Wishlist toggle, Accordion, Related products
- `js/wishlist.js` — рендер сохранённых товаров из localStorage
- `js/login.js` — tab switching, password toggle + strength meter, mock login/register в localStorage

**Quality Gate 2 — Результат:**
- [x] Все 5 HTML страниц открываются через Live Server без ошибок структуры
- [x] Nav инлайн в каждой странице (не fetch), работает на file://
- [x] Cart/Wishlist состояние через localStorage с try/catch оберткой
- [x] Product routing: `product.html?id=1..8`
- [x] picsum.photos seed-based изображения везде

---

---

### ЭТАП 3 — Ядро интерактивности
**Статус:** ✅ Завершён — 2026-05-23 (выполнен в рамках Этапа 2)

Все JS-модули написаны совместно с HTML: `app.js` (Cart + Wishlist state), `catalog.js` (фильтры + сортировка), `product.js` (галерея, size selector, qty, accordion).

---

### ЭТАП 4 — Wishlist, Login и мобильная адаптация
**Статус:** ✅ Завершён — 2026-05-23

**Что сделано:**
- `css/responsive.css` — полная адаптация: 1024px / 768px / 600px / 480px / 375px + `hover: none` + print
- Burger nav (≤768px), hero full-bleed, stacked product layout, sidebar grid on mobile
- `js/wishlist.js` — рендер сохранённых товаров из localStorage
- `js/login.js` — mock-auth, tab switching, password strength meter

---

### ЭТАП 5 — Анимации, polish и QA
**Статус:** ✅ Завершён — 2026-05-23

**Что сделано:**
- `css/animations.css` — fadeIn, fadeInUp, scaleIn, heartPulse, badgePop, shimmer skeleton, spinner, `.card-enter` с CSS var stagger, `.scroll-top-btn`
- `404.html` — branded error page с accent outline title
- `js/app.js` (polish):
  - `.card-enter` + `--card-i` stagger applied to all rendered product cards
  - `initScrollTop()` — scroll-to-top FAB появляется после 400px прокрутки
  - heartPulse анимация при toggle wishlist
  - badgePop анимация при появлении badge
  - Search button → toast "coming soon"
  - Checkout button → toast с total
- `js/utils.js` — `showToast()` теперь использует static `#toast` element, если есть
- Исправлен баг: `showToast()` создавал дублирующий `#mp-toast` элемент
- `animations.css` добавлен во все 5 страниц

**Quality Gate 5:**
- [x] Все изображения имеют alt-теги
- [x] `prefers-reduced-motion` — все анимации отключены
- [x] localStorage очищен → все страницы загружаются
- [x] Нет ошибок в консоли (структурных)
- [x] Cart / Wishlist сохраняются при обновлении страницы
