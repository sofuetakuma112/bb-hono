import { Hono } from "hono";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import * as schema from "@/db/schema";
import {
  eq,
  desc,
  and,
  or,
  inArray,
  not,
  isNull,
  InferSelectModel,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { usersTable, postsTable, likesTable, followsTable } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { z } from "zod";
import { getImageUrlFromS3 } from "@/features/s3";
import { SerializedPost, SerializedUser } from "@/features/types/hono/post";

const CreatePostSchema = z.object({
  imageS3Key: z.string(),
  imageName: z.string(),
  imageAge: z.string(),
  prompt: z.string(),
  hashTags: z.array(z.string()).optional(),
});

const app = new Hono()
  .get("/", async (c) => {
    const { DB } = getRequestContext().env;

    const db = drizzle(DB, { schema });

    const userId = c.req.query("userId") as string;
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user[0]) {
      return c.json({ message: "User not found" }, 404);
    }

    const posts = await db.query.postsTable.findMany({
      where: (postsTable, { eq, and, or }) =>
        and(
          eq(postsTable.userId, userId),
          or(
            isNull(postsTable.analysisResult),
            eq(postsTable.analysisResult, true)
          )
        ),
      with: {
        user: true,
        likes: {
          where: (likesTable, { eq }) => eq(likesTable.likeType, "super_like"),
          limit: 1,
          with: {
            user: true,
          },
        },
      },
    });

    return c.json(posts);
  })
  .post("/", async (c) => {
    const { imageS3Key, imageName, imageAge, prompt, hashTags } =
      await c.req.json<z.infer<typeof CreatePostSchema>>();

    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const post = await db.insert(postsTable).values({
      imageS3Key,
      imageName,
      imageAge,
      prompt,
      hashTags,
      userId,
      analysisResult: true,
    });

    return c.json({ post });
  })
  .delete("/:id", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const postId = c.req.param("id");
    const post = await db.query.postsTable.findFirst({
      where: and(eq(postsTable.id, postId), eq(postsTable.userId, userId)),
    });

    if (!post) {
      return c.json({ message: "Post not found" }, 404);
    }

    await db.delete(postsTable).where(eq(postsTable.id, post.id));

    return c.json({ message: "Post deleted successfully" });
  })
  .get("/recommended", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const likePostIds = (
      await db.query.likesTable.findMany({
        where: eq(likesTable.userId, userId),
        columns: { postId: true },
      })
    ).map((like) => like.postId);

    const recommendedPosts = await db.query.postsTable.findMany({
      where: and(
        eq(postsTable.analysisResult, true),
        or(
          not(eq(postsTable.userId, userId)),
          not(inArray(postsTable.id, likePostIds))
        )
      ),
      orderBy: desc(postsTable.id),
      limit: 50,
      with: {
        user: true,
        likes: {
          where: (likesTable, { eq }) => eq(likesTable.likeType, "super_like"),
          orderBy: desc(likesTable.createdAt),
          limit: 1,
          with: {
            user: true,
          },
        },
      },
    });

    const serializedRecommendedPosts = await Promise.all(
      recommendedPosts.map(serializePost)
    );
    return c.json({ posts: serializedRecommendedPosts });
  })
  .get("/followings", async (c) => {
    const { DB } = getRequestContext().env;
    const db = drizzle(DB, { schema });

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    // フォローしているユーザーIDの配列を取得
    const followingUserIds = (
      await db.query.followsTable.findMany({
        where: eq(followsTable.followerId, userId),
        columns: { followeeId: true },
      })
    ).map((follow) => follow.followeeId);

    // フォローしているユーザーがスーパーライクしたPostのIDの配列を取得
    const superLikePostIds = (
      await db.query.likesTable.findMany({
        where: and(
          inArray(likesTable.userId, followingUserIds),
          eq(likesTable.likeType, "super_like")
        ),
        columns: { postId: true },
        // distinctOn: likesTable.postId,
      })
    ).map((like) => like.postId);

    // 自身がいいね/スーパーいいねしたPostのIDの配列を取得
    const myLikesPostIds = (
      await db.query.likesTable.findMany({
        where: eq(likesTable.userId, userId),
        columns: { postId: true },
      })
    ).map((like) => like.postId);

    // フォロー中ユーザーが投稿した、スーパーライク/自身がいいねしていないPost一覧
    const followingPosts = await db.query.postsTable.findMany({
      where: and(
        eq(postsTable.analysisResult, true),
        inArray(postsTable.userId, followingUserIds),
        or(
          not(inArray(postsTable.id, superLikePostIds)),
          not(eq(postsTable.userId, userId)),
          not(inArray(postsTable.id, myLikesPostIds))
        )
      ),
      orderBy: desc(postsTable.id),
      limit: 25,
      with: {
        user: true,
        likes: {
          where: eq(likesTable.likeType, "super_like"),
          orderBy: desc(likesTable.createdAt),
          limit: 1,
          with: {
            user: true,
          },
        },
      },
    });

    // フォロー中ユーザーがスーパーライクした、自身がいいねしていないPost一覧
    const superLikedPosts = await db.query.postsTable.findMany({
      where: and(
        eq(postsTable.analysisResult, true),
        inArray(postsTable.id, superLikePostIds),
        or(
          not(eq(postsTable.userId, userId)),
          not(inArray(postsTable.id, myLikesPostIds))
        )
      ),
      orderBy: desc(postsTable.id),
      limit: 25,
      with: {
        user: true,
        likes: {
          where: eq(likesTable.likeType, "super_like"),
          orderBy: desc(likesTable.createdAt),
          limit: 1,
          with: {
            user: true,
          },
        },
      },
    });

    const serializedFollowingPosts = await Promise.all(
      [...superLikedPosts, ...followingPosts].map(serializePost)
    );

    return c.json({
      posts: serializedFollowingPosts,
    });
  });

async function serializePost(
  post: InferSelectModel<typeof postsTable> & {
    user: InferSelectModel<typeof usersTable>;
    likes: InferSelectModel<typeof likesTable>[];
  }
): Promise<SerializedPost> {
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
