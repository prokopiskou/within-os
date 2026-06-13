// transcribe.js — κατεβάζει το Telegram voice note και το μετατρέπει σε κείμενο με Whisper.

export async function transcribeTelegramVoice(fileId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  // 1. Πάρε το path του αρχείου από το Telegram
  const fileRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
  );
  const fileData = await fileRes.json();
  if (!fileData.ok) {
    throw new Error(`getFile failed: ${JSON.stringify(fileData)}`);
  }
  const filePath = fileData.result.file_path;

  // 2. Κατέβασε το ηχητικό (Telegram voice = .oga / ogg-opus)
  const audioRes = await fetch(
    `https://api.telegram.org/file/bot${token}/${filePath}`
  );
  const audioBuf = await audioRes.arrayBuffer();

  // 3. Στείλ' το στο Whisper
  const form = new FormData();
  form.append("file", new Blob([audioBuf]), "voice.oga");
  form.append("model", "whisper-1");
  // Greek hint — βοηθάει την ακρίβεια. Σβήσε αν μιλάς και greeklish/αγγλικά.
  form.append("language", "el");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Whisper error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.text?.trim() ?? "";
}
