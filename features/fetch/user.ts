import { notFound } from "next/navigation";
import { serverClient } from "@/features/hono/server";

async function getUser(userId: string) {
  // const { data: user } = await fetchApi<UserResponse>(`/users/${userId}`, {
  //   cache: 'no-store',
  //   next: { tags: [`/users/${userId}`] },
  // });

  const user = await serverClient.api.users[":id"]
    .$get({
      param: {
        id: userId,
      },
    })
    .then((res) => res.json());

  if (user == null) notFound();
  if ("message" in user) {
    throw Error(user.message);
  }

  return { user };
}

// async function getCurrentUser() {
//   const { data: user } = await fetchApi<UserResponse>(`/current_user`, {
//     cache: "no-store",
//     next: { tags: [`/current_user`] },
//   });

//   if (user == null) notFound();

//   return { user };
// }

export { getUser };
