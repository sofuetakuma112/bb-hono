"use server";

import { revalidateTag } from "next/cache";
import { serverClient } from "@/features/hono/server";

async function follow(userId: string) {
  // await fetchApi(`/users/${userId}/follows`, {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     user_id: userId,
  //   }),
  // });
  // await api.follow.create({
  //   userId,
  // });
  await serverClient.api.follows.$post({
    json: {
      userId,
    },
  });
  revalidateTag(`/users/${userId}`);
}

async function unFollow(userId: string) {
  // await fetchApi(`/users/${userId}/follows`, {
  //   method: "DELETE",
  //   body: JSON.stringify({
  //     user_id: userId,
  //   }),
  // });
  // await api.follow.destroy({
  //   userId,
  // });
  await serverClient.api.follows[":userId"].$delete({
    param: {
      userId,
    },
  });
  revalidateTag(`/users/${userId}`);
}

export { follow, unFollow };
