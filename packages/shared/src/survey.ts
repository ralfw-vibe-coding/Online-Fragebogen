import { z } from "zod";

export const surveyQuestionTypeValues = [
  "text",
  "textarea",
  "email",
  "number",
  "date",
  "singleChoice",
  "multiChoice"
] as const;

export const surveyQuestionTypeSchema = z.enum(surveyQuestionTypeValues);

export const surveyOptionSchema = z.object({
  value: z.string().min(1, "Option value is required."),
  label: z.string().min(1, "Option label is required.")
});

const baseQuestionSchema = z.object({
  id: z
    .string()
    .min(1, "Question id is required.")
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "Use letters, numbers, _ and - for question ids."),
  label: z.string().min(1, "Question label is required."),
  helpTextMd: z.string().optional(),
  required: z.boolean().default(false)
});

const textQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("text"),
  placeholder: z.string().optional()
});

const textareaQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("textarea"),
  placeholder: z.string().optional(),
  rows: z.number().int().min(2).max(20).default(4)
});

const emailQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("email"),
  placeholder: z.string().optional()
});

const numberQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("number"),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional()
});

const dateQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("date"),
  min: z.string().optional(),
  max: z.string().optional()
});

const singleChoiceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("singleChoice"),
  options: z.array(surveyOptionSchema).min(1, "At least one option is required.")
});

const multiChoiceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("multiChoice"),
  options: z.array(surveyOptionSchema).min(1, "At least one option is required.")
});

export const surveyQuestionSchema = z.discriminatedUnion("type", [
  textQuestionSchema,
  textareaQuestionSchema,
  emailQuestionSchema,
  numberQuestionSchema,
  dateQuestionSchema,
  singleChoiceQuestionSchema,
  multiChoiceQuestionSchema
]);

export const surveyDefinitionSchema = z.object({
  title: z.string().min(1, "Survey title is required."),
  descriptionMd: z.string().default(""),
  thankYouMd: z.string().default("Vielen Dank."),
  questions: z.array(surveyQuestionSchema).min(1, "At least one question is required.")
}).superRefine((definition, ctx) => {
  const ids = new Set<string>();

  for (const question of definition.questions) {
    if (ids.has(question.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Question id "${question.id}" is duplicated.`,
        path: ["questions"]
      });
    }

    ids.add(question.id);
  }
});

export const surveyAnswersSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.array(z.string()), z.null()])
);

export type SurveyOption = z.infer<typeof surveyOptionSchema>;
export type SurveyQuestion = z.infer<typeof surveyQuestionSchema>;
export type SurveyDefinition = z.infer<typeof surveyDefinitionSchema>;
export type SurveyAnswers = z.infer<typeof surveyAnswersSchema>;

export type SurveyRecord = {
  id: string;
  title: string;
  slug: string;
  recipientEmail: string;
  definition: SurveyDefinition;
  createdAt: string;
};

export const sampleSurveyDefinition: SurveyDefinition = {
  title: "Kundenfeedback April 2026",
  descriptionMd:
    "Bitte beantworten Sie die Fragen kurz. Die Antworten werden direkt an die angegebene E-Mail-Adresse gesendet.",
  thankYouMd:
    "Vielen Dank. Unten sehen Sie Ihre Antworten noch einmal in strukturierter Form.",
  questions: [
    {
      id: "name",
      type: "text",
      label: "Ihr Name",
      required: true,
      placeholder: "Max Mustermann"
    },
    {
      id: "email",
      type: "email",
      label: "Ihre E-Mail-Adresse",
      required: true,
      placeholder: "max@example.com"
    },
    {
      id: "satisfaction",
      type: "singleChoice",
      label: "Wie zufrieden sind Sie insgesamt?",
      required: true,
      options: [
        { value: "very-happy", label: "Sehr zufrieden" },
        { value: "happy", label: "Zufrieden" },
        { value: "neutral", label: "Neutral" },
        { value: "unhappy", label: "Unzufrieden" }
      ]
    },
    {
      id: "topics",
      type: "multiChoice",
      label: "Welche Themen interessieren Sie besonders?",
      required: false,
      options: [
        { value: "price", label: "Preis" },
        { value: "quality", label: "Qualität" },
        { value: "support", label: "Support" }
      ]
    },
    {
      id: "comment",
      type: "textarea",
      label: "Gibt es noch etwas, das wir wissen sollten?",
      required: false,
      rows: 5
    }
  ]
};

export function buildSubmissionSummaryMarkdown(
  survey: SurveyDefinition,
  answers: SurveyAnswers
): string {
  const lines = [`# ${survey.title}`, ""];

  for (const question of survey.questions) {
    const answer = answers[question.id];
    let printable: string;

    if (Array.isArray(answer)) {
      printable = answer.length > 0 ? answer.join(", ") : "-";
    } else if (answer === null || answer === undefined || answer === "") {
      printable = "-";
    } else {
      printable = String(answer);
    }

    lines.push(`## ${question.label}`);
    lines.push(printable);
    lines.push("");
  }

  return lines.join("\n");
}

export function validateSurveyAnswers(
  survey: SurveyDefinition,
  answers: SurveyAnswers
): { ok: true } | { ok: false; message: string } {
  for (const question of survey.questions) {
    const answer = answers[question.id];
    const empty =
      answer === undefined ||
      answer === null ||
      answer === "" ||
      (Array.isArray(answer) && answer.length === 0);

    if (question.required && empty) {
      return {
        ok: false,
        message: `Bitte beantworten Sie das Pflichtfeld "${question.label}".`
      };
    }

    if (empty) {
      continue;
    }

    switch (question.type) {
      case "text":
      case "textarea":
      case "date":
        if (typeof answer !== "string") {
          return { ok: false, message: `Ungültige Antwort für "${question.label}".` };
        }
        break;

      case "email":
        if (typeof answer !== "string" || !z.string().email().safeParse(answer).success) {
          return { ok: false, message: `Bitte geben Sie eine gültige E-Mail für "${question.label}" an.` };
        }
        break;

      case "number":
        if (typeof answer !== "number" || Number.isNaN(answer)) {
          return { ok: false, message: `Bitte geben Sie eine Zahl für "${question.label}" an.` };
        }
        break;

      case "singleChoice":
        if (
          typeof answer !== "string" ||
          !question.options.some((option) => option.value === answer)
        ) {
          return { ok: false, message: `Bitte wählen Sie eine gültige Option für "${question.label}".` };
        }
        break;

      case "multiChoice":
        if (
          !Array.isArray(answer) ||
          !answer.every(
            (value) =>
              typeof value === "string" &&
              question.options.some((option) => option.value === value)
          )
        ) {
          return { ok: false, message: `Bitte wählen Sie gültige Optionen für "${question.label}".` };
        }
        break;
    }
  }

  return { ok: true };
}
