import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { login, refreshAccessToken } from "@/services/api/auth";

function getTokenExpiry(accessToken: string): number {
  const payload = accessToken.split(".")[1];
  if (!payload) {
    throw new Error("Login response contains an invalid access token");
  }

  const decoded = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8")
  ) as { exp?: number };
  if (typeof decoded.exp !== "number") {
    throw new Error("Access token has no expiry");
  }

  return decoded.exp * 1000;
}

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Phone and password",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials.password) {
          throw new Error("Phone and password are required");
        }

        const response = await login({
          phone: credentials.phone,
          password: credentials.password,
        });

        if (!response.data?.token.access_token) {
          throw new Error(response.message || "Unable to sign in");
        }

        return {
          id: response.data.user.id,
          name: response.data.user.name,
          phone: response.data.user.phone,
          role: response.data.user.role,
          access_token: response.data.token.access_token,
          refresh_token: response.data.token.refresh_token,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.access_token = user.access_token;
        token.refresh_token = user.refresh_token;
        token.accessTokenExpires = getTokenExpiry(user.access_token);
        token.user = {
          id: user.id,
          name: user.name || user.phone,
          phone: user.phone,
          role: user.role,
        };
        return token;
      }

      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 30_000) {
        return token;
      }

      if (!token.refresh_token) {
        return { ...token, error: "RefreshAccessTokenError" };
      }

      try {
        const response = await refreshAccessToken(token.refresh_token);
        const accessToken = response.data?.access_token;
        if (!accessToken) {
          return { ...token, error: "RefreshAccessTokenError" };
        }

        return {
          ...token,
          access_token: accessToken,
          accessTokenExpires: getTokenExpiry(accessToken),
          error: undefined,
        };
      } catch {
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      if (!token.access_token) {
        throw new Error("Authenticated session has no access token");
      }
      session.access_token = token.access_token;
      session.refresh_token = token.refresh_token;
      session.user = token.user;
      session.error = token.error;
      return session;
    },
  },
};
