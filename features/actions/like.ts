"use server";
import { revalidateTag } from "next/cache";
import { serverClient } from "@/features/hono/server";

async function unLike(userId: string, postId: string) {
  // await fetchApi(`/posts/likes`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(
  //     toSnakeCase({
  //       postId: postId,
  //       likeType: 'unlike',
  //     })
  //   ),
  // });
  // await api.post.like({
  // postId,
  // likeType: "unlike",
  // });
  await serverClient.api.likes.$post({
    json: {
      postId,
      likeType: "unlike",
    },
  });
  revalidateTag(`/users/${userId}/like_posts/like`);
}

export { unLike };
