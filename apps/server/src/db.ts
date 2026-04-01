import postgres from "postgres";
import { env } from "./config";

export const sql = postgres(env.DATABASE_URL, {
  ssl: "require",
  max: 5
});
