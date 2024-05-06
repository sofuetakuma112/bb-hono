import { serverClient } from "@/features/hono/server";

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { name } = await serverClient.api.hello
    .$get({
      query: {
        text: searchParams.text,
      },
    })
    .then((res) => res.json());

  const data = await fetch(`${process.env.NEXT_SERVER_URL}/auth`).then((res) => res.json());
  console.log("data => %o", data);

  return <p>{typeof name !== "undefined" ? `Hello ${name}!` : "Loading..."}</p>;
}
