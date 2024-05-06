import { Hono } from "hono";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import * as schema from "@/db/schema";
import { eq, and, inArray, InferSelectModel, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { z } from "zod";
import {
  usersTable,
  postsTable,
  likesTable,
  notificationsTable,
} from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getImageUrlFromS3 } from "@/features/s3";
import {
  SerializedLikedPost,
  SerializedUser,
} from "@/features/types/hono/like";

const LikeSchema = z.object({
  postId: z.string(),
  likeType: z.enum(["unlike", "like", "super_like"]),
});

const LikePostsInputSchema = z.object({
  userId: z.string(),
  likeType: z.enum(["like", "super_like", "unlike"]),
  searchString: z.string().optional(),
});

const LikeUsersSchema = z.object({
  postId: z.string(),
  likeType: z.enum(["like", "super_like"]),
  searchString: z.string().optional(),
});

const app = new Hono()
  .get("/posts", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const { userId, likeType, searchString } = c.req.query() as z.infer<
      typeof LikePostsInputSchema
    >;

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    });

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    let posts = await db.query.postsTable.findMany({
      where: eq(postsTable.analysisResult, true),
      with: {
        user: true,
        likes: {
          where: and(
            eq(likesTable.userId, currentUserId),
            eq(likesTable.likeType, likeType)
          ),
          orderBy: desc(likesTable.createdAt),
          limit: 1,
          with: {
            user: true,
          },
        },
      },
    });

    if (searchString) {
      posts = posts.filter(
        (post) =>
          post.hashTags &&
          Array.isArray(post.hashTags) &&
          post.hashTags.includes(searchString)
      );
    }

    return c.json(await Promise.all(posts.map((post) => serializePost(post))));
  })
  .post("/", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const { postId, likeType } = await c.req.json<z.infer<typeof LikeSchema>>();

    const existingLike = await db.query.likesTable.findFirst({
      where: and(eq(likesTable.postId, postId), eq(likesTable.userId, userId)),
    });

    if (existingLike) {
      await db
        .update(likesTable)
        .set({ likeType })
        .where(eq(likesTable.id, existingLike.id));
    } else {
      await db.insert(likesTable).values({
        postId,
        userId,
        likeType,
      });
    }

    const post = await db.query.postsTable.findFirst({
      where: eq(postsTable.id, postId),
    });
    if (post && post.userId !== userId && likeType !== "unlike") {
      await db.insert(notificationsTable).values({
        userId: post.userId,
        postId,
        notifierUserId: userId,
        notificationType: likeType,
      });
    }

    return c.json({ message: "Like updated successfully" });
  })
  .get("/users", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const { postId, likeType } = c.req.query() as z.infer<
      typeof LikeUsersSchema
    >;

    const userIds = (
      await db.query.likesTable.findMany({
        where: and(
          eq(likesTable.postId, postId),
          eq(likesTable.likeType, likeType)
        ),
        columns: { userId: true },
      })
    ).map((like) => like.userId);

    if (userIds.length === 0) {
      return c.json({ users: [] });
    }

    const users = await db.query.usersTable.findMany({
      where: inArray(usersTable.id, userIds),
    });

    return c.json({ users });
  })
  .delete("/:likeId", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const likeId = c.req.param("likeId");
    const like = await db.query.likesTable.findFirst({
      where: eq(likesTable.id, likeId),
    });

    if (!like) {
      return c.json({ message: "Like not found" }, 404);
    }

    await db.delete(likesTable).where(eq(likesTable.id, like.id));

    return c.json({ message: "Like deleted successfully" });
  });

async function serializePost(
  post: InferSelectModel<typeof postsTable> & {
    user: InferSelectModel<typeof usersTable>;
    likes: (InferSelectModel<typeof likesTable> & {
      user: InferSelectModel<typeof usersTable>;
    })[];
  }
): Promise<SerializedLikedPost> {
  const imageUrl = await getImageUrlFromS3(post.imageS3Key);

  return {
    id: post.id,
    prompt: post.prompt,
    imageUrl,
    analysisResult: post.analysisResult,
    likeCount: post.likes.filter((l) => l.likeType === "like").length,
    superLikeCount: post.likes.filter((l) => l.likeType === "super_like")
      .length,
    userId: post.userId,
    hashTags: post.hashTags,
    imageName: post.imageName,
    imageAge: post.imageAge,
    imageBirthplace: post.imageBirthplace,
    user: await serializeUser(post.user),
    superLikeUser: post.likes[0]?.user ?? null,
  };
}

async function serializeUser(
  user: InferSelectModel<typeof usersTable>
): Promise<SerializedUser> {
  const imageUrl = await getImageUrlFromS3(user.imageS3Key);

  return {
    id: user.id,
    name: user.name,
    imageUrl: imageUrl || user.image,
  };
}

export default app;
