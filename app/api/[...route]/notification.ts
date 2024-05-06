import { Hono } from "hono";
import * as schema from "@/db/schema";
import { InferSelectModel, eq, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { usersTable, notificationsTable } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getImageUrlFromS3 } from "@/features/s3";
import { auth } from "@/app/api/auth/[...nextauth]/auth";

const app = new Hono().get("/", async (c) => {
  const { DB } = getRequestContext().env;
  const db = drizzle(DB, { schema });

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const [notifications, currentUser] = await Promise.all([
    db.query.notificationsTable.findMany({
      where: eq(notificationsTable.userId, userId),
      orderBy: desc(notificationsTable.createdAt),
      with: {
        notifierUser: true,
      },
    }),
    db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    }),
  ]);

  if (!currentUser) {
    return c.json({ message: "User not found" }, 404);
  }

  const unreadNotifications = notifications.filter((n) => !n.read);

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(
      inArray(
        notificationsTable.id,
        unreadNotifications.map((n) => n.id)
      )
    );

  return c.json(
    await Promise.all(notifications.map((n) => serializeNotification(n)))
  );
});

async function serializeNotification(
  notification: InferSelectModel<typeof notificationsTable> & {
    notifierUser: InferSelectModel<typeof usersTable>;
  }
) {
  return {
    id: notification.id,
    notificationType: notification.notificationType,
    read: notification.read,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
    notifierUser: await serializeUser(notification.notifierUser),
  };
}

async function serializeUser(user: InferSelectModel<typeof usersTable>) {
  const imageUrl = await getImageUrlFromS3(user.imageS3Key);
  return {
    id: user.id,
    name: user.name,
    imageUrl: imageUrl || user.image,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export default app;
