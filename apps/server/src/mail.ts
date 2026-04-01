import { env } from "./config";

type SendSubmissionMailInput = {
  to: string;
  subject: string;
  markdown: string;
  json: unknown;
};

export async function sendSubmissionMail(input: SendSubmissionMailInput) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [input.to],
      subject: input.subject,
      text: `${input.markdown}\n\n---\n\nJSON\n${JSON.stringify(input.json, null, 2)}`,
      html: `<pre>${escapeHtml(input.markdown)}</pre><hr /><pre>${escapeHtml(
        JSON.stringify(input.json, null, 2)
      )}</pre>`
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Resend mail failed: ${payload}`);
  }

  return response.json();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
