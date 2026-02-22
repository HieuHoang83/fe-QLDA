import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
interface IUser {
  _id: string;
  name: string;
  email: string;
}
declare module "next-auth/jwt" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */

  interface JWT {
    access_token: string;
    refreshToken: string;
    user: IUser;
  }
}
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    access_token: string;
    refreshToken: string;
    user: IUser;
  }
}
