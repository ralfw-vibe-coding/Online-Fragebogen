import { type FastifyInstance } from "fastify";
import { z } from "zod";
import { surveyAnswersSchema } from "@fragebogen/shared";
import { surveyRepository } from "../repository";

const submitSchema = z.object({
  answers: surveyAnswersSchema
});

export async function registerPublicRoutes(app: FastifyInstance) {
  app.get("/api/public/:slug", async (request, reply) => {
    const params = z.object({ slug: z.string() }).parse(request.params);
    const survey = await surveyRepository.getBySlug(params.slug);

    if (!survey) {
      return reply.code(404).send({ message: "Fragebogen nicht gefunden." });
    }

    return survey;
  });

  app.post("/api/public/:slug/responses", async (request, reply) => {
    const params = z.object({ slug: z.string() }).parse(request.params);
    const body = submitSchema.parse(request.body);
    const result = await surveyRepository.submit(params.slug, body.answers);

    if (!result.ok) {
      return reply.code(result.status).send({ message: result.message });
    }

    return {
      ok: true,
      responseId: result.response.id,
      submittedAt: result.response.submittedAt,
      answers: result.response.answers,
      emailPreview: result.emailPayload
    };
  });
}
