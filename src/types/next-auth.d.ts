import "next-auth";
import "next-auth/jwt";

interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role?: string;
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token: string;
    refresh_token: string;
    accessTokenExpires: number;
    user: AuthUser;
    error?: string;
  }
}

declare module "next-auth" {
  interface User extends AuthUser {
    access_token: string;
    refresh_token: string;
  }

  interface Session {
    access_token: string;
    refresh_token: string;
    user: AuthUser;
    error?: string;
  }
}
