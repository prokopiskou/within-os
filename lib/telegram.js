// telegram.js — στέλνει απαντήσεις πίσω στο Telegram chat.

export async function sendMessage(chatId, text) {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    }
  );
  if (!res.ok) {
    console.error("Telegram send error:", await res.text());
  }
}

// Μόνο εσύ επιτρέπεσαι να δίνεις εντολές.
export function isAuthorized(chatId) {
  const allowed = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(String(chatId));
}
