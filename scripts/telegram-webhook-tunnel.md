# Вебхук Telegram: обход DNS и временные URL

## 1) Параметр `ip_address` в `setWebhook` (официально в Bot API)

В [setWebhook](https://core.telegram.org/bots/api#setwebhook) есть необязательное поле **`ip_address`**: *«фиксированный IP, на который слать вебхук вместо адреса из DNS»*. Его и имеют в виду в поддержке, если у них резолв домена временно ломается.

Подставьте **IPv4 из A-записи вашего домена** (у `click-lab.online` это обычно `91.201.52.163` — проверьте: `dig +short click-lab.online A`).

```bash
curl -sS -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  --data-urlencode "url=https://click-lab.online/api/telegram/webhook" \
  --data-urlencode "ip_address=91.201.52.163"
```

Если в `.env` задан **`TELEGRAM_WEBHOOK_SECRET`**, добавьте тот же секрет:

```bash
curl -sS -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  --data-urlencode "url=https://click-lab.online/api/telegram/webhook" \
  --data-urlencode "ip_address=91.201.52.163" \
  --data-urlencode "secret_token=<как в TELEGRAM_WEBHOOK_SECRET>"
```

Проверка:

```bash
curl -sS "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

В ответе смотрите **`ip_address`** — должен совпадать с указанным.

Условия те же: в **`url`** — ваш реальный HTTPS-хост, сертификат валиден для этого имени (SNI), порт из [допустимых](https://core.telegram.org/bots/webhooks) (443, 80, 88, 8443).

---

## 2) Временный HTTPS через туннель (если без `ip_address` не заводится)

### Cloudflare Quick Tunnel (`cloudflared`)

```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

В логе возьмите `https://….trycloudflare.com` и подставьте в `url` в `setWebhook` (путь **`/api/telegram/webhook`**). URL при каждом новом запуске quick tunnel меняется.

### ngrok

```bash
ngrok http http://127.0.0.1:3000
```

Используйте выданный `https://….ngrok-free.app` (на бесплатном плане иногда мешает промежуточная страница).

---

## После тестов

`deleteWebhook` или снова `setWebhook` на боевой URL (с тем же `ip_address`, если DNS у Telegram всё ещё капризничает).
