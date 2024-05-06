import path from "path";
import "dotenv/config";
import type { Config } from "drizzle-kit";

const wranglerConfigPath = path.resolve(__dirname, "wrangler.toml");

export default process.env.LOCAL_DB_PATH
  ? ({
      schema: "./db/schema.ts",
      driver: "better-sqlite",
      dbCredentials: {
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        url: process.env.LOCAL_DB_PATH!,
      },
    } satisfies Config)
  : ({
      schema: "./db/schema.ts",
      out: "./drizzle",
      driver: "d1",
      dbCredentials: {
        wranglerConfigPath,
        dbName: "bb_dev",
      },
      verbose: true,
      strict: true,
    } satisfies Config);
