import { drizzle } from "drizzle-orm/d1";

const db = drizzle(process.env.DB as unknown as D1Database);

export default db;
