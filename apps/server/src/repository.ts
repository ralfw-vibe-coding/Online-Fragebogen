import {
  type SurveyAnswers,
  type SurveyDefinition,
  type SurveyRecord,
  buildSubmissionSummaryMarkdown,
  validateSurveyAnswers
} from "@fragebogen/shared";
import { sql } from "./db";
import { sendSubmissionMail } from "./mail";

type CreateSurveyInput = {
  title: string;
  slug: string;
  recipientEmail: string;
  definition: SurveyDefinition;
};

type UpdateSurveyInput = CreateSurveyInput & {
  id: string;
};

type ResponseRecord = {
  id: string;
  surveyId: string;
  answers: SurveyAnswers;
  submittedAt: string;
};

type SurveyListItem = SurveyRecord & {
  responseCount: number;
};

function toSurveyRecord(row: {
  id: string;
  title: string;
  slug: string;
  recipient_email: string;
  definition: SurveyDefinition;
  created_at: Date | string;
}): SurveyRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    recipientEmail: row.recipient_email,
    definition: row.definition,
    createdAt: new Date(row.created_at).toISOString()
  };
}

export const surveyRepository = {
  async list(): Promise<SurveyListItem[]> {
    const rows = await sql<{
      id: string;
      title: string;
      slug: string;
      recipient_email: string;
      definition: SurveyDefinition;
      created_at: Date | string;
      response_count: number;
    }[]>`
      select
        s.id,
        s.title,
        s.slug,
        s.recipient_email,
        s.definition,
        s.created_at,
        count(r.id)::int as response_count
      from surveys s
      left join responses r on r.survey_id = s.id
      group by s.id
      order by s.created_at desc
    `;

    return rows.map((row) => ({
      ...toSurveyRecord(row),
      responseCount: row.response_count
    }));
  },

  async getBySlug(slug: string): Promise<SurveyRecord | undefined> {
    const rows = await sql<{
      id: string;
      title: string;
      slug: string;
      recipient_email: string;
      definition: SurveyDefinition;
      created_at: Date | string;
    }[]>`
      select id, title, slug, recipient_email, definition, created_at
      from surveys
      where slug = ${slug}
      limit 1
    `;

    const row = rows[0];
    return row ? toSurveyRecord(row) : undefined;
  },

  async getById(id: string): Promise<SurveyRecord | undefined> {
    const rows = await sql<{
      id: string;
      title: string;
      slug: string;
      recipient_email: string;
      definition: SurveyDefinition;
      created_at: Date | string;
    }[]>`
      select id, title, slug, recipient_email, definition, created_at
      from surveys
      where id = ${id}
      limit 1
    `;

    const row = rows[0];
    return row ? toSurveyRecord(row) : undefined;
  },

  async create(input: CreateSurveyInput): Promise<SurveyRecord> {
    const rows = await sql<{
      id: string;
      title: string;
      slug: string;
      recipient_email: string;
      definition: SurveyDefinition;
      created_at: Date | string;
    }[]>`
      insert into surveys (title, slug, recipient_email, definition)
      values (${input.title}, ${input.slug}, ${input.recipientEmail}, ${sql.json(input.definition)})
      returning id, title, slug, recipient_email, definition, created_at
    `;

    return toSurveyRecord(rows[0]);
  },

  async update(input: UpdateSurveyInput): Promise<SurveyRecord | undefined> {
    const rows = await sql<{
      id: string;
      title: string;
      slug: string;
      recipient_email: string;
      definition: SurveyDefinition;
      created_at: Date | string;
    }[]>`
      update surveys
      set
        title = ${input.title},
        slug = ${input.slug},
        recipient_email = ${input.recipientEmail},
        definition = ${sql.json(input.definition)}
      where id = ${input.id}
      returning id, title, slug, recipient_email, definition, created_at
    `;

    const row = rows[0];
    return row ? toSurveyRecord(row) : undefined;
  },

  async submit(slug: string, answers: SurveyAnswers) {
    const survey = await this.getBySlug(slug);
    if (!survey) {
      return { ok: false as const, status: 404, message: "Fragebogen nicht gefunden." };
    }

    const validation = validateSurveyAnswers(survey.definition, answers);
    if (!validation.ok) {
      return { ok: false as const, status: 400, message: validation.message };
    }

    const rows = await sql<{
      id: string;
      survey_id: string;
      answers: SurveyAnswers;
      submitted_at: Date | string;
    }[]>`
      insert into responses (survey_id, answers)
      values (${survey.id}, ${sql.json(answers)})
      returning id, survey_id, answers, submitted_at
    `;

    const response: ResponseRecord = {
      id: rows[0].id,
      surveyId: rows[0].survey_id,
      answers: rows[0].answers,
      submittedAt: new Date(rows[0].submitted_at).toISOString()
    };

    const markdown = buildSubmissionSummaryMarkdown(survey.definition, answers);

    let emailSent = true;
    let emailError: string | undefined;

    try {
      await sendSubmissionMail({
        to: survey.recipientEmail,
        subject: `Neue Antwort für ${survey.title}`,
        markdown,
        json: answers
      });
    } catch (error) {
      emailSent = false;
      emailError = error instanceof Error ? error.message : "Mailversand fehlgeschlagen.";
    }

    return {
      ok: true as const,
      survey,
      response,
      emailPayload: {
        to: survey.recipientEmail,
        subject: `Neue Antwort für ${survey.title}`,
        markdown,
        json: answers,
        emailSent,
        emailError
      }
    };
  }
};
