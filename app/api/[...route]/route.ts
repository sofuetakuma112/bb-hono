import { Hono } from "hono";
import { handle } from "hono/vercel";
import { Bindings } from "@/features/types/hono";

import posts from "./post";
import likes from "./like";
import users from "./user";
import notifications from "./notification";
import follows from "./follow";
import sessions from "./session";
import { auth } from "@/app/api/auth/[...nextauth]/auth";

export const runtime = "edge";

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

const routes = app
  .route("/posts", posts)
  .route("/likes", likes)
  .route("/users", users)
  .route("/notifications", notifications)
  .route("/follows", follows)
  .route("/sessions", sessions)
  .get("/hello", async (c) => {
    const session = await auth();
    console.log("session => %o", session);
    const name = session?.user?.name ?? "John Doe";

    return c.json({
      name,
    });
  });

export const GET = handle(app);
export type AppType = typeof routes;
