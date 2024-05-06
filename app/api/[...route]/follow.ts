import { Hono } from "hono";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import * as schema from "@/db/schema";
import { InferSelectModel, and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { usersTable, followsTable, notificationsTable } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getImageUrlFromS3 } from "@/features/s3";

const app = new Hono()
  .post("/", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const data = await c.req.json<{ userId: string }>();

    const existingFollow = await db.query.followsTable.findFirst({
      where: and(
        eq(followsTable.followerId, userId),
        eq(followsTable.followeeId, data.userId)
      ),
    });

    if (existingFollow) {
      return c.json({ message: "Follow already exists" }, 409);
    }

    const follow = await db
      .insert(followsTable)
      .values({ followerId: userId, followeeId: data.userId });

    if (!follow) {
      return c.json({ message: "Failed to follow" }, 500);
    }

    await db.insert(notificationsTable).values({
      userId: data.userId,
      notifierUserId: userId,
      notificationType: "follow",
    });

    return c.json({ message: "Follow created" });
  })
  .delete("/:userId", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;
    const targetUserId = c.req.param("userId");

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const follow = await db.query.followsTable.findFirst({
      where: and(
        eq(followsTable.followerId, userId),
        eq(followsTable.followeeId, targetUserId)
      ),
    });

    if (!follow) {
      return c.json({ message: "Follow not found" }, 404);
    }

    await db.delete(followsTable).where(eq(followsTable.id, follow.id));

    return c.json({ message: "Successfully unfollowed" });
  })
  .get("/followers/:userId", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;
    const targetUserId = c.req.param("userId");

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const [user, currentUser] = await Promise.all([
      db.query.usersTable.findFirst({
        where: eq(usersTable.id, targetUserId),
      }),
      db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
        with: {
          followers: {
            with: {
              follower: true,
            },
          },
          followees: true,
        },
      }),
    ]);

    if (!user || !currentUser) {
      return c.json({ message: "User not found" }, 404);
    }

    const followers = await Promise.all(
      currentUser.followers.map(({ follower }) =>
        serializeFollowerUser(follower, currentUser)
      )
    );

    return c.json(followers);
  })
  .get("/followings/:userId", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;
    const targetUserId = c.req.param("userId");

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const [user, currentUser] = await Promise.all([
      db.query.usersTable.findFirst({
        where: eq(usersTable.id, targetUserId),
      }),
      db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
        with: {
          followees: {
            with: {
              followee: true,
            },
          },
          followers: true,
        },
      }),
    ]);

    if (!user || !currentUser) {
      return c.json({ message: "User not found" }, 404);
    }

    const followings = await Promise.all(
      currentUser.followees.map(({ followee }) =>
        serializeFollowingUser(followee, currentUser)
      )
    );

    return c.json(followings);
  });

async function serializeFollowerUser(
  user: InferSelectModel<typeof usersTable>,
  currentUser: InferSelectModel<typeof usersTable> & {
    followers: {
      follower: InferSelectModel<typeof usersTable>;
    }[];
    followees: InferSelectModel<typeof followsTable>[];
  }
) {
  const imageUrl = await getImageUrlFromS3(user.imageS3Key);
  return {
    id: user.id,
    name: user.name,
    imageUrl: imageUrl || user.image,
    isFollowee: currentUser.followees.some(
      ({ followeeId }) => followeeId === user.id
    ),
    isFollower: currentUser.followers.some(
      ({ follower: { id } }) => id === user.id
    ),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function serializeFollowingUser(
  user: InferSelectModel<typeof usersTable>,
  currentUser: InferSelectModel<typeof usersTable> & {
    followers: InferSelectModel<typeof followsTable>[];
    followees: {
      followee: InferSelectModel<typeof usersTable>;
    }[];
  }
) {
  const imageUrl = await getImageUrlFromS3(user.imageS3Key);
  return {
    id: user.id,
    name: user.name,
    imageUrl: imageUrl || user.image,
    isFollowee: currentUser.followees.some(
      ({ followee: { id } }) => id === user.id
    ),
    isFollower: currentUser.followers.some(
      ({ followerId }) => followerId === user.id
    ),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export default app;
