import { Hono } from "hono";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import * as schema from "@/db/schema";
import { InferSelectModel, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  usersTable,
  postsTable,
  likesTable,
  followsTable,
  notificationsTable,
} from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { z } from "zod";
import { getImageUrlFromS3 } from "@/features/s3";

const UserCreateInputSchema = z.object({
  name: z.string().optional(),
  imageS3Key: z.string().optional(),
});

const UserUpdateInputSchema = UserCreateInputSchema.extend({
  id: z.string(),
});

const app = new Hono()
  .get("/me", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
      with: {
        posts: true,
        notifications: true,
        likes: true,
        followers: true,
        followees: true,
      },
    });

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    return c.json(await serializeUser(user, user));
  })
  .get("/:id", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;
    const targetUserId = c.req.param("id");

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const [user, currentUser] = await Promise.all([
      db.query.usersTable.findFirst({
        where: eq(usersTable.id, targetUserId),
        with: {
          posts: true,
          likes: true,
          followers: true,
          followees: true,
        },
      }),
      db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
        with: {
          notifications: true,
          followers: true,
          followees: true,
        },
      }),
    ]);

    if (!user || !currentUser) {
      return c.json({ message: "User not found" }, 404);
    }

    return c.json(await serializeUser(user, currentUser));
  })
  .put("/", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const data = await c.req.json<z.infer<typeof UserUpdateInputSchema>>();

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, data.id),
    });

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    await db
      .update(usersTable)
      .set({
        name: data.name ?? user.name,
        imageS3Key: data.imageS3Key,
      })
      .where(eq(usersTable.id, user.id));

    return c.json({ message: "User updated" });
  });

async function serializeUser(
  user: InferSelectModel<typeof usersTable> & {
    posts: InferSelectModel<typeof postsTable>[];
    likes: InferSelectModel<typeof likesTable>[];
    followers: InferSelectModel<typeof followsTable>[];
    followees: InferSelectModel<typeof followsTable>[];
  },
  currentUser: InferSelectModel<typeof usersTable> & {
    followers: InferSelectModel<typeof followsTable>[];
    followees: InferSelectModel<typeof followsTable>[];
    notifications: InferSelectModel<typeof notificationsTable>[];
  }
) {
  const imageUrl = await getImageUrlFromS3(user.imageS3Key);
  return {
    id: user.id,
    name: user.name,
    imageUrl: imageUrl || user.image,
    isFollowee: currentUser.followees.some(
      (followee) => followee.followeeId === user.id
    ),
    isFollower: currentUser.followers.some(
      (follower) => follower.followerId === user.id
    ),
    unreadNotificationCount:
      user.id === currentUser.id
        ? currentUser.notifications.filter((n) => !n.read).length
        : undefined,
    postCount: user.posts.filter(
      (p) => p.analysisResult === true || p.analysisResult === null
    ).length,
    likeCount: user.likes.filter((l) => l.likeType === "like").length,
    superLikeCount: user.likes.filter((l) => l.likeType === "super_like")
      .length,
    followerCount: user.followers.length,
    followingCount: user.followees.length,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export default app;
