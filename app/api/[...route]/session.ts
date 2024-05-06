import { Hono } from "hono";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import {
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
  deleteCookie,
} from "hono/cookie";
import { sessionsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const app = new Hono().get("/", async (c) => {
  const { DB } = getRequestContext().env;
  const db = drizzle(DB, { schema });

  const cookies = getCookie(c);

  const sessionToken = getCookie(c, "authjs.session-token");
  if (!sessionToken) {
    return c.json({ message: "session token not found" }, 404);
  }

  const session = await db.query.sessionsTable.findFirst({
    where: eq(sessionsTable.sessionToken, sessionToken),
    with: {
      user: true,
    },
  });
  if (!session) {
    return c.json({ message: "session not found" }, 404);
  }

  return c.json(session, 200);
});

export default app;
