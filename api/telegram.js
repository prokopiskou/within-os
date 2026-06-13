// api/telegram.js — Telegram webhook. Vercel serverless function.
// Φάση 2: δέχεται κείμενο ΚΑΙ φωνή. Voice -> Whisper -> κείμενο.
// Spec agent: αν η εντολή δεν είναι ξεκάθαρη, ρωτάει αντί να ανοίξει issue.

import { route } from "../lib/router.js";
import { createIssue } from "../lib/github.js";
import { sendMessage, isAuthorized } from "../lib/telegram.js";
import { transcribeTelegramVoice } from "../lib/transcribe.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("ok");
  }

  const update = req.body;
  const msg = update?.message;
  const chatId = msg?.chat?.id;

  if (!chatId) return res.status(200).send("ok");
  if (!isAuthorized(chatId)) {
    await sendMessage(chatId, "⛔ Δεν έχεις πρόσβαση σε αυτό το σύστημα.");
    return res.status(200).send("ok");
  }

  try {
    // --- 1. Πάρε το κείμενο: είτε γραπτό, είτε από φωνή ---
    let text = msg.text;
    let viaVoice = false;

    if (!text && (msg.voice || msg.audio)) {
      const fileId = (msg.voice || msg.audio).file_id;
      await sendMessage(chatId, "🎙️ Ακούω...");
      text = await transcribeTelegramVoice(fileId);
      viaVoice = true;
      if (!text) {
        await sendMessage(chatId, "🤷 Δεν κατάλαβα το ηχητικό. Ξαναπροσπάθησε.");
        return res.status(200).send("ok");
      }
      await sendMessage(chatId, `📝 Κατάλαβα: _${text}_`);
    }

    if (!text) {
      await sendMessage(chatId, "Στείλε μου *κείμενο* ή *ηχητικό* με την εντολή σου.");
      return res.status(200).send("ok");
    }

    // --- 2. Router + Spec ---
    await sendMessage(chatId, "🧭 Το επεξεργάζομαι...");
    const r = await route(text);

    if (!r.project) {
      await sendMessage(
        chatId,
        "🤔 Δεν βρήκα project. Πες ξεκάθαρα: Wosio / WS Site / Within Path / Within App."
      );
      return res.status(200).send("ok");
    }

    // --- 3. Πάντα καταγράφει. Καμία ερώτηση, μηδέν τριβή. ---
    if (r.confidence < 0.6) {
      await sendMessage(
        chatId,
        `⚠️ Δεν είμαι 100% σίγουρος, το πάω στο *${r.project.name}*.`
      );
    }

    // --- 4. Άνοιξε issue (τυχόν ασάφειες μπαίνουν ΜΕΣΑ στο ticket) ---
    const pathNote = r.project.pathHint
      ? `\n\n📁 Path scope: \`${r.project.pathHint}\``
      : "";
    const voiceNote = viaVoice ? `\n\n🎙️ _Από φωνή: "${text}"_` : "";
    const questions =
      Array.isArray(r.openQuestions) && r.openQuestions.length
        ? `\n\n❓ *Ανοιχτά σημεία:*\n${r.openQuestions.map((q) => `- ${q}`).join("\n")}`
        : "";

    const issue = await createIssue({
      repo: r.project.repo,
      title: `[${r.project.name}] ${r.title}`,
      body: `${r.body}${questions}${pathNote}${voiceNote}\n\n---\n_Από Within OS via Telegram. Project: ${r.project.id} · Τύπος: ${r.type}_`,
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
