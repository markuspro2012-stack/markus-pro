# Markus Pro — Инструкция по деплою

## Что уже готово в коде
- `netlify.toml` — конфиг деплоя
- `supabase/migration.sql` — схема БД
- `netlify/functions/admin.js` — backend для admin panel
- `scripts/inject-config.js` — inject env vars при билде
- `js/config.example.js` — шаблон конфига

---

## Шаг 1 — Установить Git (если не установлен)

Скачай и установи: https://git-scm.com/download/win  
После установки перезапусти VS Code / терминал.

---

## Шаг 2 — Создать Supabase проект

1. Зайди на https://supabase.com → Sign Up (бесплатно)
2. New Project → введи название `markus-pro`, придумай пароль БД
3. Жди ~2 мин пока проект создаётся
4. Зайди в **SQL Editor** → New Query
5. Скопируй содержимое `supabase/migration.sql` → вставь → Run
6. Зайди в **Settings → API**:
   - Скопируй **Project URL** → это `SUPABASE_URL`
   - Скопируй **anon / public** key → это `SUPABASE_ANON_KEY`
   - Скопируй **service_role** key → это `SUPABASE_SERVICE_KEY`

---

## Шаг 3 — Локальный config для разработки

Скопируй файл:
```
js/config.example.js  →  js/config.js
```

Открой `js/config.js` и вставь реальные значения:
```javascript
window.__MP_CONFIG = {
  supabaseUrl:  'https://ТВОЙ_ID.supabase.co',
  supabaseKey:  'ТВОЙ_ANON_KEY',
  adminSecret:  'markuspro2026'
};
```

---

## Шаг 4 — Настроить Google OAuth в Supabase (для кнопки Google)

1. Supabase Dashboard → **Authentication → Providers → Google**
2. Включи Google Provider
3. Зайди на https://console.cloud.google.com
4. Создай OAuth 2.0 credentials (тип: Web Application)
5. Authorized redirect URIs: `https://ТВОЙ_ID.supabase.co/auth/v1/callback`
6. Скопируй Client ID + Client Secret → вставь в Supabase

---

## Шаг 5 — Создать GitHub репозиторий

1. Зайди на https://github.com → New repository
2. Название: `markus-pro`
3. Private (рекомендую) → Create

---

## Шаг 6 — Загрузить код на GitHub

Открой терминал в папке `g:\VS CODE\markus-pro\`:

```bash
git init
git add .
git commit -m "feat: initial release — full site + admin panel + Supabase"
git branch -M main
git remote add origin https://github.com/ТВО_ИМЯ/markus-pro.git
git push -u origin main
```

---

## Шаг 7 — Подключить Netlify

1. Зайди на https://netlify.com → Sign Up (бесплатно, через GitHub)
2. **Add new site → Import an existing project → GitHub**
3. Выбери репозиторий `markus-pro`
4. Настройки билда заполнятся автоматически из `netlify.toml`:
   - Build command: `node scripts/inject-config.js`
   - Publish directory: `.`
5. Нажми **Deploy site**

---

## Шаг 8 — Добавить переменные окружения в Netlify

1. Netlify → твой сайт → **Site settings → Environment variables**
2. Добавь следующие переменные:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | https://ТВОЙ_ID.supabase.co |
| `SUPABASE_ANON_KEY` | ТВОЙ_ANON_KEY |
| `SUPABASE_SERVICE_KEY` | ТВОЙ_SERVICE_KEY |
| `MP_ADMIN_SECRET` | придумай сложный пароль для admin |

3. **Trigger deploy** → Deploy site

---

## Шаг 9 — Добавить домен (опционально)

- Бесплатный домен Netlify: `markus-pro.netlify.app` (работает сразу)
- Свой домен: Site settings → Domain management → Add custom domain

---

## Рабочий процесс после деплоя

```
Редактируешь код локально
       ↓
git add . && git commit -m "описание"
       ↓
git push
       ↓
Netlify автоматически деплоит (~30 сек)
       ↓
Изменения на сайте
```

---

## Admin panel на хостинге

URL: `https://твой-сайт.netlify.app/admin.html`  
Пароль: значение `MP_ADMIN_SECRET` из Netlify env vars

Все действия в admin панели (добавить/удалить товар, изменить статус заказа)  
идут через `/.netlify/functions/admin` — это серверный код с service key.

---

## Структура данных в Supabase

| Таблица | Что хранит |
|---|---|
| `products` | Все товары (управляет admin panel) |
| `profiles` | Профили клиентов (привязаны к auth.users) |
| `orders` | Заказы клиентов |
| `settings` | Настройки сайта (ticker, etc.) |
| `admin_log` | Лог действий в admin panel |
