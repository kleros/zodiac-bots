import type { Config } from "drizzle-kit";
import { join, normalize } from "node:path";
import { env } from "../../utils/env";

export default {
  schema: join(__dirname, "schema.ts"),
  out: normalize(join(__dirname, "../../../", "migrations")),
  driver: "pg",
  dbCredentials: {
    connectionString: env.DB_URI,
  },
} satisfies Config;
