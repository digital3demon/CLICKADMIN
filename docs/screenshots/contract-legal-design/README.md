# Скриншоты: Legal Design договор

| Файл | Описание |
|------|----------|
| [preview-mock.html](./preview-mock.html) | HTML-макет стиля (открыть в браузере) |
| [sample-filled-20260529.pdf](./sample-filled-20260529.pdf) | Тестовый заполненный PDF с **редактируемыми** полями |

Сгенерировать заново:

```powershell
Set-Location "c:\Users\sevas\Documents\Курсор проекты\dental-lab-crm"
node scripts/build-contract-pdf-template.cjs
node --env-file=.env scripts/generate-test-contract.cjs
```

Скрин CRM: `/directory/contracts` и карточка клиники → «Скачать PDF» / «Скачать DOCX».
