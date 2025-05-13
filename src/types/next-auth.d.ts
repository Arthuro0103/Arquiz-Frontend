import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Retornado por `useSession`, `getSession` e recebido como prop para o provedor `SessionProvider`
   */
  interface Session {
    user: {
      id: string;
      role?: string;
      // Adicione outros campos que você colocou no token JWT e quer na sessão
    } & DefaultSession['user']; // Mantém os campos padrão como name, email, image
    accessToken?: string; // Para disponibilizar o token do backend na sessão do cliente, se necessário
  }

  /** O objeto User como retornado pela função `authorize` e usado no callback `jwt`. */
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    accessToken?: string | null; // Token do nosso backend
  }
}

declare module 'next-auth/jwt' {
  /** Retornado pelo callback `jwt` e usado pelo callback `session`. */
  interface JWT {
    id: string;
    role?: string;
    accessToken?: string; // Token do nosso backend
    // Adicione outros campos que você quer no token
  }
} 