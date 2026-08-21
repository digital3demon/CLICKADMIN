---
name: Adaptive page unfold
overview: "Не сжимать столбцы, а разворачивать структуру страниц по ширине контейнера. Волны A–D сделаны. Вне скоупа первой поставки — не смешивать с ними."
todos:
  - id: backup
    content: Ветка backup/pre-adaptive-unfold — снимок до развёртки
    status: completed
  - id: foundation-tiers
    content: Тиры 0–3 + container на main + laptop-сайдбар
    status: completed
  - id: lists-unfold
    content: Карточки / короткая таблица+Ещё / полная таблица
    status: completed
  - id: order-form
    content: Форма наряда 1→2→3 от crm-shell
    status: completed
  - id: kanban
    content: Канбан тулбар Ещё + модалка по тиру
    status: completed
  - id: out-of-scope-rule
    content: Правило .cursor/rules/crm-layout-tiers.mdc — Harmony, sm/md/lg, аналитика/почта/склад
    status: completed
isProject: true
---

# Адаптивная развёртка CRM (не сжатие)

## Бекап и откат

Ветка `backup/pre-adaptive-unfold` (в origin). Откат:

```
git switch backup/pre-adaptive-unfold
```

## Вне скоупа первой поставки

Не смешивать с волнами A–D в одном коммите/PR:

- Тема Harmony vs classic — не унифицировать палитры, только общие тиры раскладки.
- Новые брейкпоинты Tailwind «вместо» 640/768 — не ломать `sm`/`md`/`lg` по всему репо; тиры живут как `@custom-variant` (`shell-laptop`, `@container crm-shell`).
- Переписывание аналитики / почты / склада в том же PR — нет. Те же токены тира подхватят позже.
- Отдельные экраны не блокируют волны A–D: список и оболочка идут первыми, остальные модули подключаются по мере касания.

Закреплено в `.cursor/rules/crm-layout-tiers.mdc`.
