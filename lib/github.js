// github.js — ανοίγει GitHub issue στο σωστό repo.
// Φάση 1: μόνο issue. Στη Φάση 3 αυτό γίνεται "ανοίγει branch + PR με coding agent".

export async function createIssue({ repo, title, body, labels = [] }) {
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "within-os",
    },
    body: JSON.stringify({ title, body, labels }),
  });

  if (!res.ok) {
    throw new Error(`GitHub error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return { url: data.html_url, number: data.number };
}
