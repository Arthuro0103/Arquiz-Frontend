import { DefaultSession, User as NextAuthUser } from 'next-auth';
import { JWT as NextAuthJWT } from "next-auth/jwt"

declare module 'next-auth' {
  /**
   * Retornado por `useSession`, `getSession` e recebido como prop para o provedor `SessionProvider`
   */
  interface Session {
    accessToken?: string; // Token do nosso backend
    user?: {
      id?: string | null;
      role?: string | null;
    } & DefaultSession['user'];
  }

  /** O objeto User como retornado pela função `authorize` e usado no callback `jwt`. */
  interface User extends NextAuthUser {
    role?: string;
    accessToken?: string; // Token do nosso backend
    image?: string | null; // Para consistência com AppUser
  }
}

declare module "next-auth/jwt" {
  /** Retornado pelo callback `jwt` e usado pelo callback `session`. */
  interface JWT extends NextAuthJWT {
    id?: string;
    role?: string;
    accessToken?: string; // Token do nosso backend
    image?: string | null; // Para consistência
  }
} 