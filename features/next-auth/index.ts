"server-only";

import { redirect } from "next/navigation";
import { serverClient } from "../hono/server";
// import { Session } from "@/features/types/hono/session";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import { Session } from "next-auth";

export const getServerAuthSession = async (): Promise<Session> => {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return session;
};
