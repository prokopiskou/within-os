# Within OS — Φάση 1

Στέλνεις μήνυμα στο Telegram → ο Router καταλαβαίνει σε ποιο project ανήκει → ανοίγει GitHub issue στο σωστό repo → σου απαντά με το link.

Αυτό αποδεικνύει το **routing**. Voice, coding agents, PRs, preview, approve έρχονται στις επόμενες φάσεις.

```
Telegram ──> api/telegram.js ──> router.js (LLM) ──> github.js (issue) ──> απάντηση στο Telegram
```

## Δομή

```
within-os/
├── registry.json        # τα projects σου (συμπλήρωσέ το!)
├── api/telegram.js       # το webhook
├── lib/router.js         # ποιο project + τι τύπος
├── lib/github.js         # ανοίγει issue
├── lib/telegram.js       # απαντήσεις + auth
├── .env.example
└── package.json
```

## Setup (≈30')

### 1. Telegram bot
- Άνοιξε το **@BotFather** → `/newbot` → πάρε το `TELEGRAM_BOT_TOKEN`.
- Στείλε ένα μήνυμα στον **@userinfobot** → πάρε το δικό σου `chat id` → `TELEGRAM_ALLOWED_CHAT_IDS`.

### 2. GitHub token
- GitHub → Settings → Developer settings → **Fine-grained token**.
- Πρόσβαση στα 4 repos, permission **Issues: Read & Write**.

### 3. Anthropic key
- console.anthropic.com → API key → `ANTHROPIC_API_KEY`.

### 4. Συμπλήρωσε το `registry.json`
- Βάλε τα σωστά `repo` (μορφή `user/repo`), `stack`, `description`. Τα keywords βοηθούν τον router.

### 5. Deploy σε Vercel
```bash
npm i -g vercel
cd within-os
vercel        # πρώτο deploy
```
- Στο Vercel dashboard → Project → **Settings → Environment Variables** βάλε όλα από το `.env.example`.
- Ξανα-deploy: `vercel --prod`.

### 6. Σύνδεσε το webhook στο Telegram
Αντικατέστησε `<BOT_TOKEN>` και `<VERCEL_URL>`:
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<VERCEL_URL>/api/telegram"
```

### 7. Τεστ
Στείλε στο bot: *"Στο Within App πρόσθεσε κουμπί login στο header"*
→ Θα ανοίξει issue στο `within-app` repo και θα σου στείλει το link.

## Roadmap
- **Φάση 2:** Voice (Whisper) + Spec agent (κάνει 1 διευκριντική ερώτηση).
- **Φάση 3:** Build agent (Claude Code/Cursor) → branch + PR + Vercel preview.
- **Φάση 4:** Verify agent + one-tap approve → merge → deploy.
