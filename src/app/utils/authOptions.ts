import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  exchangeHaravanTicket,
  login,
  refreshAccessToken,
} from "@/services/api/auth";
import { TOKEN_REFRESH_WINDOW_MS } from "@/lib/token-refresh";

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
    /**
     * Dang nhap bang tai khoan Haravan.
     *
     * Provider nay khong hoi mat khau: nguoi dung da duoc Haravan xac thuc roi quay lai
     * frontend voi mot `code` (ticket) dung mot lan. Viec doi code lay token nam o server cua
     * NextAuth chu khong chay o trinh duyet, nen frontend khong phai xu ly token cua Haravan.
     *
     * Ket qua tra ve dung hinh dang voi provider so dien thoai nen phan con lai cua app
     * (session, tu dong gia han token, middleware) khong can biet nguoi dung vao bang cach nao.
     */
    CredentialsProvider({
      id: "haravan",
      name: "Haravan",
      credentials: {
        ticket: { label: "Ticket", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.ticket) {
          throw new Error("Thieu ma dang nhap Haravan");
        }

        const session = await exchangeHaravanTicket(credentials.ticket);

        return {
          id: session.user.id,
          name: session.user.name,
          // User tao tu Haravan co so dien thoai gia (`haravan-<sub>`) hoac rong.
          phone: session.user.phone ?? "",
          role: session.user.role,
          access_token: session.token.access_token,
          refresh_token: session.token.refresh_token,
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

      if (
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires - TOKEN_REFRESH_WINDOW_MS
      ) {
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
      session.accessTokenExpires = token.accessTokenExpires;
      session.user = token.user;
      session.error = token.error;
      return session;
    },
  },
};