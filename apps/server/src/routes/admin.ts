import { type FastifyInstance } from "fastify";
import { z } from "zod";
import { surveyDefinitionSchema } from "@fragebogen/shared";
import { env } from "../config";
import { surveyRepository } from "../repository";

const loginSchema = z.object({
  pin: z.string().min(1)
});

const createSurveySchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens."),
  recipientEmail: z.string().email(),
  definition: surveyDefinitionSchema
});

const updateSurveySchema = createSurveySchema.extend({
  id: z.string().uuid()
});

function isAdmin(request: { cookies: Record<string, string | undefined> }) {
  return request.cookies.admin_pin_ok === "1";
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.post("/api/admin/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    if (body.pin !== env.ADMIN_PIN) {
      return reply.code(401).send({ ok: false, message: "PIN ist nicht korrekt." });
    }

    reply.setCookie("admin_pin_ok", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12
    });

    return { ok: true };
  });

  app.post("/api/admin/logout", async (_request, reply) => {
    reply.clearCookie("admin_pin_ok", { path: "/" });
    return { ok: true };
  });

  app.get("/api/admin/session", async (request, reply) => {
    if (!isAdmin(request)) {
      return reply.code(401).send({ authenticated: false });
    }

    return { authenticated: true };
  });

  app.get("/api/admin/surveys", async (request, reply) => {
    if (!isAdmin(request)) {
      return reply.code(401).send({ message: "Nicht autorisiert." });
    }

    return surveyRepository.list();
  });

  app.post("/api/admin/surveys", async (request, reply) => {
    if (!isAdmin(request)) {
      return reply.code(401).send({ message: "Nicht autorisiert." });
    }

    const body = createSurveySchema.parse(request.body);

    const existing = await surveyRepository.getBySlug(body.slug);
    if (existing) {
      return reply.code(409).send({ message: "Slug ist bereits vergeben." });
    }

    const survey = await surveyRepository.create(body);
    return reply.code(201).send(survey);
  });

  app.put("/api/admin/surveys/:id", async (request, reply) => {
    if (!isAdmin(request)) {
      return reply.code(401).send({ message: "Nicht autorisiert." });
    }

    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const payload = createSurveySchema.parse(request.body);
    const body = updateSurveySchema.parse({ ...payload, id: params.id });

    const existingById = await surveyRepository.getById(body.id);
    if (!existingById) {
      return reply.code(404).send({ message: "Fragebogen nicht gefunden." });
    }

    const existingBySlug = await surveyRepository.getBySlug(body.slug);
    if (existingBySlug && existingBySlug.id !== body.id) {
      return reply.code(409).send({ message: "Slug ist bereits vergeben." });
    }

    const survey = await surveyRepository.update(body);
    if (!survey) {
      return reply.code(404).send({ message: "Fragebogen nicht gefunden." });
    }

    return survey;
  });
}
