# MARKUS PRO — Project Plan

**Бренд:** Markus Pro — premium youth streetwear  
**Целевая аудитория:** 12–25 лет  
**Тип проекта:** Frontend-only e-commerce сайт  
**Статус:** В разработке  
**Дата создания:** 2026-05-23

---

## Подтверждённые требования

| Параметр | Значение |
|----------|----------|
| Тема | Dark mode |
| Вайб | Clean youth fashion (Sporty & Rich, Represent) |
| Акцент | Electric Blue `#00BFFF` + White |
| Анимации | Smooth & subtle |
| Функционал | Cart + Wishlist + Login/Account |
| Архитектура | Frontend only (localStorage) |
| Категории | Футболки, штаны, кроссовки, носки |

---

## Дизайн-система

### Цвета
| Токен | Hex | Назначение |
|-------|-----|-----------|
| `--bg-primary` | `#0A0A0A` | Основной фон |
| `--bg-secondary` | `#111111` | Альтернативные секции |
| `--bg-card` | `#161616` | Поверхность карточек |
| `--bg-card-hover` | `#1C1C1C` | Hover карточек |
| `--text-primary` | `#F5F5F5` | Основной текст |
| `--text-secondary` | `#ABABAB` | Вторичный текст |
| `--text-muted` | `#666666` | Метаданные |
| `--accent` | `#00BFFF` | Акцент бренда |
| `--accent-hover` | `#1ACCFF` | Hover акцента |
| `--accent-glow` | `rgba(0,191,255,0.15)` | Свечение акцента |
| `--border-subtle` | `#1E1E1E` | Тонкие границы |
| `--border-default` | `#2A2A2A` | Стандартные границы |

### Типографика
| Шрифт | Использование |
|-------|--------------|
| Syne 700 | Заголовки, лого, hero — editorial, fashion-forward |
| Inter 400/500/600 | Весь UI текст — максимальная читаемость |
| JetBrains Mono 700 | Цены — выравнивание цифр, техно-ощущение |

### Анимации
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- Fast: `150ms` | Base: `250ms` | Slow: `350ms` | Enter: `400ms`
- Карточки hover: `scale(1.04)` за `350ms`
- Cart drawer slide-in: `400ms`
- Scroll reveal stagger: `60ms` между элементами

---

## Структура файлов

```
markus-pro/
├── index.html
├── catalog.html
├── product.html
├── wishlist.html
├── login.html
├── 404.html
├── PROJECT_PLAN.md
├── PROJECT_HISTORY.md
│
├── css/
│   ├── tokens.css          ← ВСЕ CSS custom properties
│   ├── reset.css
│   ├── typography.css
│   ├── components.css
│   ├── layout.css
│   ├── header.css
│   ├── footer.css
│   ├── cart-drawer.css
│   ├── animations.css
│   ├── responsive.css      ← ВСЕ медиа-запросы
│   └── pages/
│       ├── home.css
│       ├── catalog.css
│       ├── product.css
│       ├── wishlist.css
│       └── login.css
│
├── js/
│   ├── utils.js            ← localStorage wrapper + утилиты
│   ├── products.js         ← ЕДИНСТВЕННЫЙ источник данных о товарах
│   ├── cart.js
│   ├── cartDrawer.js
│   ├── wishlist.js
│   ├── mobileNav.js
│   ├── animations.js
│   └── pages/
│       ├── home.js
│       ├── catalog.js
│       ├── product.js
│       └── login.js
│
└── assets/
    ├── images/
    └── icons/
```

---

## Поэтапный план

### ЭТАП 1 — Дизайн-система и скаффолд
**Цель:** Заложить фундамент. Всё наследуется от этого этапа.  
**Статус:** ✅ Завершён — 2026-05-23

**Файлы:**
- `css/tokens.css` — все CSS custom properties
- `css/reset.css` — сброс браузерных стилей
- `css/typography.css` — типографика
- `css/components.css` — кнопки, инпуты, бейджи, теги
- `css/layout.css` — контейнер, сетка
- `css/header.css` + `css/footer.css`
- `js/utils.js` — localStorage wrapper (try/catch), форматирование цен

**Quality Gate 1:**
- [ ] Все CSS custom properties в `tokens.css`
- [ ] Нет захардкоженных значений в других файлах
- [ ] Шрифты загружаются без FOUT
- [ ] `utils.js` работает в приватном режиме браузера

---

### ЭТАП 2 — Данные и скелеты страниц
**Цель:** Все страницы открываются, навигация работает, структура видна.  
**Статус:** ✅ Завершён — 2026-05-23

**Файлы:**
- `js/products.js` — 8 товаров с полными данными
- `index.html`, `catalog.html`, `product.html`, `wishlist.html`, `login.html`
- CSS для каждой страницы

**Quality Gate 2:**
- [ ] Все страницы открываются без ошибок в консоли
- [ ] Навигация между всеми страницами работает
- [ ] Структура корректна на 1440px
- [ ] Данные всех 8 товаров читаются в консоли
- [ ] Title и meta description на всех страницах

---

### ЭТАП 3 — Ядро интерактивности
**Цель:** Browse → Product → Add to Cart работает полностью.  
**Статус:** ✅ Завершён — 2026-05-23

**Файлы:**
- `js/pages/catalog.js` — рендер грида, фильтры, сортировка
- `js/pages/product.js` — загрузка товара, галерея, выбор размера
- `js/cart.js` + `js/cartDrawer.js` — корзина, drawer, badge
- `css/cart-drawer.css`

**Quality Gate 3:**
- [ ] Все 8 товаров рендерятся в каталоге
- [ ] Фильтры по категориям работают
- [ ] Сортировка работает
- [ ] Product detail загружает правильный товар по ?id=
- [ ] Выбор размера визуально понятен, недоступные size — задизейблены
- [ ] Add to Cart работает для всех 8 товаров
- [ ] Корзина сохраняется при обновлении страницы
- [ ] Badge обновляется в header
- [ ] Нет ошибок в консоли

---

### ЭТАП 4 — Wishlist, Login и мобильная адаптация
**Цель:** Все функции работают, сайт отлично выглядит на мобильном.  
**Статус:** ✅ Завершён — 2026-05-23

**Файлы:**
- `js/wishlist.js` — добавление/удаление, badge, страница
- `js/pages/login.js` — валидация, mock-auth
- `js/mobileNav.js` — бургер-меню
- `css/responsive.css` — все breakpoints (375px / 768px / 1280px)

**Quality Gate 4:**
- [ ] Проверено на 375px, 768px, 1280px — нет горизонтального скролла
- [ ] Бургер-меню открывается и закрывается
- [ ] Фильтры на мобильном — bottom sheet
- [ ] Wishlist add/remove работает и сохраняется
- [ ] Login форма валидирует email и пароль
- [ ] Все интерактивные элементы доступны с клавиатуры (Tab)
- [ ] Проверено на реальном мобильном устройстве

---

### ЭТАП 5 — Анимации, polish и QA
**Цель:** Сайт выглядит как законченный premium продукт.  
**Статус:** ✅ Завершён — 2026-05-23

**Файлы:**
- `css/animations.css` — все keyframes
- `js/animations.js` — IntersectionObserver, scroll reveal, stagger
- `404.html`

**Quality Gate 5:**
- [ ] HTML валидация W3C — 0 ошибок
- [ ] Все изображения имеют alt-теги
- [ ] Нет broken links
- [ ] `prefers-reduced-motion` работает
- [ ] Проверено в Chrome, Firefox, Safari
- [ ] Проверено на iOS Safari
- [ ] Нет ошибок в консоли ни на одной странице
- [ ] localStorage очищен → все страницы загружаются корректно

---

## Критические правила разработки

1. **`products.js`** — единственный источник данных о товарах. Нигде не дублировать.
2. **`tokens.css`** — единственное место для дизайн-токенов. Никаких захардкоженных цветов.
3. **`responsive.css`** — все медиа-запросы только здесь.
4. **Весь localStorage** — только через `utils.js` с try/catch.
5. **Анимации** — только `transform` и `opacity` (GPU-accelerated).
6. **Один JS-файл** — не более 200 строк. Если больше — делить.

---

## Данные изображений

Сервис: `picsum.photos/seed/{productId}/{width}/{height}`  
Тот же seed = та же картинка всегда.

| Контекст | Размер | Соотношение |
|----------|--------|-------------|
| Карточка каталога | 600×750 | 4:5 |
| Основное фото товара | 800×1000 | 4:5 |
| Hero секция | 1440×900 | 16:10 |
| Категории | 600×800 | 3:4 |

Замена на реальные фото: одна строка в `products.js` на товар.

---

## Локальный запуск

**Вариант 1 (рекомендуется):** VS Code → правая кнопка на `index.html` → "Open with Live Server"  
**Вариант 2:** `python -m http.server 3000` → открыть `http://localhost:3000`  
**Вариант 3:** `npx serve .`

⚠️ Открытие через `file://` не работает (fetch блокируется CORS).
