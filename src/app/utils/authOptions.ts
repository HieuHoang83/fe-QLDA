import CredentialsProvider from "next-auth/providers/credentials";
import { AuthOptions } from "next-auth";
import { login } from "@/services/api/auth";

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    CredentialsProvider({
      name: "Username and Password",

      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials.password) {
          throw new Error("Username and password are required");
        }

        const response = await login({
          username: credentials.username,
          password: credentials.password,
        });

        if (response.statusCode !== 200 || !response.data) {
          throw new Error(response.message || "Invalid username or password");
        }

        return {
          access_token: response.data,
          user: {
            username: credentials.username,
          },
        } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === "signIn" && user) {
        // @ts-ignore
        token.access_token = user.access_token;
        // @ts-ignore
        token.user = user.user;
      } else if (trigger === "update" && session?.name && token.user) {
        // @ts-ignore
        token.user.name = session.name;
      }
      return token;
    },
    async session({ session, user, token, trigger, newSession }) {
      if (token) {
        if ((token as any).access_token) {
          // @ts-ignore
          session.access_token = (token as any).access_token;
        }
        if ((token as any).user) {
          // @ts-ignore
          session.user = (token as any).user;
        }
        return session;
      } else {
        throw new Error("loi k xac dinh");
      }
    },
  },
  // pages: {
  //   signIn: "/auth/login",
  //   signOut: "/auth/signout",
  //   error: "/auth/error", // Error code passed in query string as ?error=
  //   verifyRequest: "/auth/verify-request", // (used for check email message)
  //   newUser: "/auth/new-user", // New users will be directed here on first sign in (leave the property out if not of interest)
  // },
};
