import { surveyDefinitionSchema } from "@fragebogen/shared";
import { env } from "./config";

const systemPrompt = `
You create JSON survey definitions for a questionnaire app.
Return JSON only. Do not use markdown fences. Do not explain anything.

Required top-level shape:
{
  "title": "string",
  "descriptionMd": "string",
  "thankYouMd": "string",
  "questions": []
}

Each question must include:
- id: unique string using only letters, numbers, underscore, hyphen
- type: one of text, textarea, email, number, date, singleChoice, multiChoice
- label: string
- required: boolean

Optional common fields:
- helpTextMd

Additional fields:
- text: placeholder optional
- textarea: placeholder optional, rows optional
- email: placeholder optional
- number: min optional, max optional, step optional
- date: min optional, max optional
- singleChoice: options required
- multiChoice: options required

For singleChoice and multiChoice, options must be:
[{ "value": "string", "label": "string" }]

Always include descriptionMd and thankYouMd as strings, even if empty.
Always include required on every question.
The JSON must validate against the schema above.
`;

export async function generateSurveyDefinitionFromPrompt(prompt: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`OpenAI request failed: ${payload}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned no content.");
  }

  const parsed = JSON.parse(stripCodeFences(content));
  return surveyDefinitionSchema.parse(parsed);
}

function stripCodeFences(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
}
