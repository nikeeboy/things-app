# GTD

Полнофункциональный таск-менеджер для браузера. Задачи хранятся на вашем Google Drive в виде Markdown-файлов; без подключения Google приложение работает локально (данные в браузере).

## Запуск

Нужен любой статический сервер (для Google-авторизации `file://` не подходит):

```bash
cd "Things app"
python3 -m http.server 8000
# или: npx serve -l 8000
```

Откройте http://localhost:8000 в Chrome. Приложение сразу работает в локальном режиме.

## Подключение Google Drive

1. Откройте [Google Cloud Console](https://console.cloud.google.com/) → создайте проект (или используйте существующий).
2. **APIs & Services → Library** → найдите **Google Drive API** → Enable.
3. **APIs & Services → OAuth consent screen** → тип External → заполните название и email → добавьте себя в Test users.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:8000` (и другие адреса, с которых будете открывать приложение)
5. Скопируйте **Client ID** (`…apps.googleusercontent.com`).
6. В приложении: шестерёнка внизу слева → вставьте Client ID → **Connect Google Drive** → разрешите доступ.

Используется scope `drive.file` — приложение видит только созданные им файлы. При первом подключении локальные данные автоматически выгружаются на Drive.

## Хранение данных на Drive

```
GTD/
├── Inbox/                    ← задачи без области/проекта
├── <Область>/
│   ├── _area.md              ← метаданные области
│   ├── задача--t_xxx.md      ← задачи уровня области
│   └── <Проект>/
│       ├── _project.md       ← метаданные проекта (заголовки, дедлайн…)
│       └── задача--t_xxx.md  ← одна задача = один md-файл
└── _service/                 ← служебная папка
    ├── state.json            ← теги, настройки, состояние приложения
    └── Trash/                ← корзина
```

Файл задачи — YAML-frontmatter (статус, даты, теги, повторение) + заметки + чек-лист:

```markdown
---
id: "t_abc123"
title: "Купить билеты"
status: "open"
when: "2026-07-10"
deadline: "2026-07-15"
tags: ["travel"]
---
Заметки к задаче…

## Checklist
- [x] выбрать даты
- [ ] оплатить
```

## Функциональность

- Разделы **Inbox, Today (+ This Evening), Upcoming, Anytime, Someday, Logbook, Trash**
- **Areas и Projects** (с заголовками-секциями внутри проектов), заметки, чек-листы
- **Теги** с фильтрацией, **дедлайны**, **даты начала**, **повторяющиеся задачи** (по расписанию / после завершения)
- **Quick Entry** (Ctrl+Space), **Quick Find** (⌘K или `/`), drag & drop, экспорт/импорт JSON

## Горячие клавиши

| Клавиша | Действие |
|---|---|
| `N` / `⌘N` | Новая задача |
| `⌘⇧N` | Новый проект |
| `Ctrl+Space` | Quick Entry |
| `⌘K`, `/`, `⌘F` | Quick Find |
| `↑` `↓`, `Enter` | Навигация по списку, открыть задачу |
| `Space`, `⌘.` | Завершить выбранную задачу |
| `Delete` | В корзину |
| `⌘1…7` | Переключение разделов |
| `⌘Enter` / `Esc` | Закрыть редактор |
| `⌘S` | Синхронизировать |

## Технически

Vanilla JS без сборки: `js/store.js` — модель данных и GTD-логика, `js/drive.js` — OAuth и синхронизация с Drive, `js/ui.js` — интерфейс. Все изменения сохраняются локально мгновенно и отправляются на Drive с дебаунсом.
