// api/telegram.js — το Telegram webhook. Vercel serverless function.
// Flow Φάσης 1:  μήνυμα -> auth check -> router -> GitHub issue -> απάντηση.

import { route } from "../lib/router.js";
import { createIssue } from "../lib/github.js";
import { sendMessage, isAuthorized } from "../lib/telegram.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("ok");
  }

  const update = req.body;
  const msg = update?.message;
  const chatId = msg?.chat?.id;

  // Δεν είναι text μήνυμα (π.χ. voice) -> Φάση 1 δέχεται μόνο text.
  if (!chatId) return res.status(200).send("ok");
  if (!isAuthorized(chatId)) {
    await sendMessage(chatId, "⛔ Δεν έχεις πρόσβαση σε αυτό το σύστημα.");
    return res.status(200).send("ok");
  }

  const text = msg.text;
  if (!text) {
    await sendMessage(
      chatId,
      "🎙️ Voice έρχεται στη Φάση 2. Προς το παρόν στείλε *κείμενο*."
    );
    return res.status(200).send("ok");
  }

  try {
    await sendMessage(chatId, "🧭 Το επεξεργάζομαι...");

    const r = await route(text);

    if (!r.project) {
      await sendMessage(
        chatId,
        `🤔 Δεν βρήκα project. Πες ξεκάθαρα: Wosio / WS Site / Within Path / Within App.`
      );
      return res.status(200).send("ok");
    }

    if (r.confidence < 0.6) {
      await sendMessage(
        chatId,
        `⚠️ Δεν είμαι σίγουρος, το πάω στο *${r.project.name}*. Αν λάθος, πες μου ξανά με το όνομα του project.`
      );
    }

    const pathNote = r.project.pathHint
      ? `\n\n📁 Path scope: \`${r.project.pathHint}\``
      : "";

    const issue = await createIssue({
      repo: r.project.repo,
      title: `[${r.project.name}] ${r.title}`,
      body: `${r.body}${pathNote}\n\n---\n_Από Within OS via Telegram. Project: ${r.project.id} · Τύπος: ${r.type}_`,
      labels: [`project:${r.project.id}`, r.type === "code" ? "code" : "task"],
    });

    await sendMessage(
      chatId,
      `✅ *${r.project.name}*\n${r.title}\n\n📌 Issue #${issue.number}\n${issue.url}`
    );
  } catch (err) {
    console.error(err);
    await sendMessage(chatId, `❌ Σφάλμα: ${err.message}`);
  }

  return res.status(200).send("ok");
}
