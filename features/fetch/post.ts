import { notFound } from "next/navigation";
import { serverClient } from "@/features/hono/server";

async function getUserPosts(userId: string) {
  // const { data: posts, included: users } = await fetchApi<PostsResponse>(`/users/${userId}/posts`, {
  //   cache: 'no-store',
  //   next: { tags: [`/users/${userId}/posts`] },
  // });

  // const posts = await api.post.index({
  //   userId,
  // });
  const posts = await serverClient.api.posts
    .$get({
      query: {
        userId,
      },
    })
    .then((res) => res.json());

  if (posts == null) notFound();
  if ("message" in posts) {
    throw Error(posts.message);
  }

  return { posts };
}

async function getSuperLikePosts(userId: string) {
  // const { data: posts, included: users } = await fetchApi<LikePostsResponse>(
  //   `/users/${userId}/like_posts/super_like`,
  //   {
  //     cache: "no-store",
  //     next: { tags: [`/users/${userId}/super-like`] },
  //   },
  // );

  // const posts = await api.like.likePosts({
  // userId,
  // likeType: "super_like",
  // });
  const posts = await serverClient.api.likes.posts
    .$get({
      json: {
        userId,
        likeType: "super_like",
      },
    })
    .then((res) => res.json());

  if (Array.isArray(posts) && posts.length > 0) notFound();
  if (posts == null) notFound();
  if ("message" in posts) {
    throw Error(posts.message);
  }

  return { posts };
}

export { getUserPosts, getSuperLikePosts };
