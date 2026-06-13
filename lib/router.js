// router.js — αποφασίζει σε ΠΟΙΟ project ανήκει η εντολή και τι ΤΥΠΟΥ είναι.
// Φάση 1: επιστρέφει { projectId, type, title, body }.
// type = "code" (αλλαγή κώδικα/site) ή "task" (απλή καταγραφή/σημείωση).

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

  return `Είσαι ο Router ενός συστήματος ενορχήστρωσης. Λαμβάνεις μια εντολή στα ελληνικά (ή greeklish) από τον ιδιοκτήτη.
Δουλειά σου: να διαλέξεις ΣΕ ΠΟΙΟ project αναφέρεται και τι ΤΥΠΟΥ είναι η εντολή.

Διαθέσιμα projects:
${list}

Κανόνες:
- "type": "code" αν ζητάει αλλαγή στον κώδικα/site/app (π.χ. "άλλαξε το hero", "πρόσθεσε κουμπί", "φτιάξε bug").
- "type": "task" αν είναι απλή καταγραφή/ιδέα/σημείωση/υπενθύμιση χωρίς αλλαγή κώδικα.
- "title": σύντομος, καθαρός τίτλος (max 80 χαρακτήρες), στα ελληνικά.
- "body": δομημένη περιγραφή του τι πρέπει να γίνει, σε bullet μορφή. Καθάρισε το προφορικό ύφος.
- "confidence": 0-1, πόσο σίγουρος είσαι για το projectId.
- Αν δεν είσαι σίγουρος για το project, βάλε το πιο πιθανό και confidence < 0.6.

Απάντησε ΜΟΝΟ με JSON, χωρίς markdown, στη μορφή:
{"projectId": "...", "type": "code|task", "title": "...", "body": "...", "confidence": 0.0}`;
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
  // καθάρισμα τυχόν ```json fences
  const clean = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(clean);

  const project = registry.projects.find((p) => p.id === parsed.projectId);
  return { ...parsed, project };
}

export function getRegistry() {
  return registry;
}
