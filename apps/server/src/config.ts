import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const rootEnvPath = path.resolve(__dirname, "../../../.env");

dotenv.config({ path: rootEnvPath, override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ADMIN_PIN: z.string().min(4),
  COOKIE_SECRET: z.string().min(12),
  WEB_ORIGIN: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().email()
});

export const env = envSchema.parse(process.env);
