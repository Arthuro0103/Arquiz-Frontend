import { DefaultSession, User as NextAuthUser } from 'next-auth';
import { JWT as NextAuthJWT } from "next-auth/jwt";
import type { UserRole, UserProfile, JwtPayload } from '@fullarquiz/shared-types';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    accessToken?: string; // Token from our backend
    user?: {
      id?: string | null;
      role?: UserRole | null;
      profile?: Partial<UserProfile> | null;
    } & DefaultSession['user'];
  }

  /** The user object as returned by the `authorize` function and used in the `jwt` callback. */
  interface User extends NextAuthUser {
    role?: UserRole;
    accessToken?: string; // Token from our backend
    image?: string | null; // For consistency with shared types
    profile?: Partial<UserProfile>;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and used by the `session` callback. */
  interface JWT extends NextAuthJWT {
    id?: string;
    role?: UserRole;
    accessToken?: string; // Token from our backend
    image?: string | null; // For consistency
    jwtPayload?: JwtPayload; // Our backend JWT payload
  }
} 