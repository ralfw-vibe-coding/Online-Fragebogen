import { surveyDefinitionSchema } from "@fragebogen/shared";
import { ZodError } from "zod";
import { env } from "./config";

const systemPrompt = `
You create JSON survey definitions for a questionnaire app.
Return JSON only. Do not use markdown fences. Do not explain anything.
Return exactly one JSON object and nothing else.

Required top-level shape:
{
  "title": "string",
  "descriptionMd": "string",
  "thankYouMd": "string",
  "sections": []
}

Each section must include:
- id: unique string using only letters, numbers, underscore, hyphen
- title: string
- descriptionMd: optional string
- items: array

Each item inside a section is either:

1. A question:
- id: unique string using only letters, numbers, underscore, hyphen
- kind: "question"
- type: one of text, textarea, email, number, date, singleChoice, multiChoice
- label: string
- required: boolean

Optional common question fields:
- helpTextMd

Additional question fields:
- text: placeholder optional
- textarea: placeholder optional, rows optional
- email: placeholder optional
- number: min optional, max optional, step optional
- date: min optional, max optional
- singleChoice: options required
- multiChoice: options required

For singleChoice and multiChoice, options must be:
[{ "value": "string", "label": "string" }]

2. A content block:
- kind: "content"
- id: unique string using only letters, numbers, underscore, hyphen
- textMd: string

Always include descriptionMd and thankYouMd as strings, even if empty.
Always include required on every question item.
Every item in sections[].items must be a full object with all required fields.
Do not return prose, bullet lists, section headings, or drafts. Return only schema-valid JSON.
If the user asks for sections, groups, chapters, thematic blocks, or wants explanatory text between questions, use sections and content items.
If the user explicitly says there should be no explanatory texts, hints, or intro texts inside sections, do not create any content items.
When the user lists questions in plain language, convert them into full question objects with generated ids, types, labels, and required flags.
The JSON must validate against the schema above.
`;

export async function generateSurveyDefinitionFromPrompt(prompt: string) {
  let lastContent = "";
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const messages =
      attempt === 0
        ? [
            { role: "system" as const, content: systemPrompt },
            { role: "user" as const, content: prompt }
          ]
        : [
            { role: "system" as const, content: systemPrompt },
            {
              role: "user" as const,
              content: [
                "Create a survey definition for this request:",
                prompt,
                "",
                "Your previous output was invalid.",
                "Validation or parsing error:",
                formatGenerationError(lastError),
                "",
                "Correct the JSON.",
                "Return only one valid JSON object.",
                "Do not return prose.",
                "Do not return question labels as plain strings in items.",
                "Each section item must be either a full question object or a full content object."
              ].join("\n")
            },
            ...(lastContent ? [{ role: "assistant" as const, content: lastContent }] : [])
          ];

    const content = await requestSurveyDefinition(messages);
    lastContent = content;

    try {
      return parseSurveyDefinition(content);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(formatGenerationError(lastError));
}

async function requestSurveyDefinition(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages
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

  return content;
}

function parseSurveyDefinition(content: string) {
  const parsed = JSON.parse(stripCodeFences(content));
  return surveyDefinitionSchema.parse(parsed);
}

function stripCodeFences(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
}

function formatGenerationError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("\n");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown validation error.";
}
