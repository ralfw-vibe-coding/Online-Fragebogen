import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { env } from "./config";
import { sql } from "./db";
import { registerAdminRoutes } from "./routes/admin";
import { registerPublicRoutes } from "./routes/public";

const app = Fastify({ logger: true });

app.get("/api/health", async () => {
  await sql`select 1`;

  return {
    ok: true,
    storage: "postgres",
    databaseConfigured: Boolean(env.DATABASE_URL),
    resendConfigured: Boolean(env.RESEND_API_KEY)
  };
});

async function bootstrap() {
  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true
  });

  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: "onRequest"
  });

  await registerAdminRoutes(app);
  await registerPublicRoutes(app);

  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
}

bootstrap().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
