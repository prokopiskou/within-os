// router.js — Router + Spec agent.
// Διαλέγει project + τύπο, φτιάχνει καθαρό spec, και κρίνει αν η εντολή είναι ξεκάθαρη.

import fs from "fs";
import path from "path";

const registry = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "registry.json"), "utf8")
);

const MODEL = "claude-sonnet-4-6";

function buildSystemPrompt() {
  const list = registry.projects
    .map(
      (p) =>
        `- id: "${p.id}" | name: ${p.name} | περιγραφή: ${p.description} | keywords: ${p.keywords.join(", ")}`
    )
    .join("\n");

  return `Είσαι ο Router + Spec agent ενός συστήματος ενορχήστρωσης. Λαμβάνεις μια εντολή στα ελληνικά (ή greeklish) από τον ιδιοκτήτη — γραπτή ή από μεταγραφή φωνής.
Δουλειά σου: (α) να διαλέξεις ΣΕ ΠΟΙΟ project αναφέρεται, (β) τον ΤΥΠΟ, (γ) να φτιάξεις καθαρό spec, (δ) να κρίνεις αν είναι αρκετά ΞΕΚΑΘΑΡΗ για να υλοποιηθεί.

Διαθέσιμα projects:
${list}

Κανόνες:
- "type": "code" αν ζητάει αλλαγή στον κώδικα/site/app. "task" αν είναι καταγραφή/ιδέα/σημείωση.
- "title": σύντομος, καθαρός τίτλος (max 80 χαρακτήρες), στα ελληνικά.
- "body": δομημένο spec σε bullets — τι ακριβώς πρέπει να γίνει. Καθάρισε το προφορικό ύφος, κράτα την ουσία.
- "confidence": 0-1, πόσο σίγουρος είσαι για το projectId. <0.6 αν αμφιβάλλεις.
- "openQuestions": λίστα (0-3) με τυχόν ασάφειες που θα ήθελε να ξεκαθαρίσει ένας developer πριν υλοποιήσει (π.χ. ποιο ακριβώς στοιχείο, ποια τιμή). ΜΗΝ τις ρωτάς τον χρήστη — απλώς σημείωσέ τες. Αν όλα είναι ξεκάθαρα, βάλε άδεια λίστα [].
- ΠΟΤΕ μην βάζεις στα openQuestions το project ή οτιδήποτε έχει ήδη πει ο χρήστης. Κάθε ερώτηση να αφορά μόνο μια πραγματική ασάφεια υλοποίησης.
- Πάντα δημιούργησε ένα χρήσιμο title/body, ακόμα κι αν η εντολή είναι σύντομη. Μην μπλοκάρεις.

Απάντησε ΜΟΝΟ με JSON, χωρίς markdown:
{"projectId": "...", "type": "code|task", "title": "...", "body": "...", "confidence": 0.0, "openQuestions": []}`;
}

export async function route(userText) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text?.trim() ?? "{}";
  const clean = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(clean);

  const project = registry.projects.find((p) => p.id === parsed.projectId);
  return { ...parsed, project };
}

export function getRegistry() {
  return registry;
}
