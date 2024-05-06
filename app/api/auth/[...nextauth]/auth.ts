import NextAuth from "next-auth";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import db from "@/db";
import { getImageUrlFromS3 } from "@/features/s3";

/**
* next-authの型に対するモジュール拡張です。これにより、sessionオブジェクトにカスタムプロパティを
* 追加し、型の安全性を維持することができます。

* @see https://next-auth.js.org/getting-started/typescript#module-augmentation
*/
declare module "next-auth" {
  interface User {
    imageS3Key: string | undefined;
  }
  interface Session extends DefaultSession {
    user: {
      id: string;
      image: string;
      name: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthConfig = {
  adapter: DrizzleAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // console.log({
      //   func: "jwt",
      //   token,
      //   user,
      //   account,
      //   profile,
      // });

      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, user, token }) => {
      // console.log({
      //   func: "session",
      //   session,
      //   user,
      //   token,
      // });

      const imageUrl = await getImageUrlFromS3(user?.imageS3Key ?? "");

      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          image: imageUrl || token.picture,
          name: token.name,
        },
      };
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
  pages: {
    signIn: "/login",
  },
  // session: { strategy: "jwt" },
};

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth(authOptions);
