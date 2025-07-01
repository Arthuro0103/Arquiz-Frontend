import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthOptions, User, Session } from "next-auth";
import { JWT } from "next-auth/jwt";

// Extend the NextAuth types to include accessToken
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    role?: string;
  }
}

// Define a interface para o objeto de usuário que NextAuth espera
// e que nossa função authorize deve retornar.
interface AppUser extends User {
  id: string;
  name: string;
  email: string;
  role?: string; // Adicionando role, pode ser útil
  image?: string | null; // Adicionado image
  accessToken?: string; // Adicionado para carregar o token do backend
  // Outros campos que você queira na sessão podem ser adicionados aqui
  // e mapeados a partir da resposta do backend.
}

const authorize = async (credentials: Record<string, string> | undefined): Promise<AppUser | null> => {
  if (!credentials?.email || !credentials?.password) {
    throw new Error("CREDENTIALS_MISSING: Por favor, forneça email e senha."); 
  }
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  if (!backendUrl) {
    console.error("--- [Authorize] ERRO CRÍTICO: NEXT_PUBLIC_BACKEND_API_URL não está definida! ---");
    throw new Error("CONFIG_ERROR: URL do backend não definida.");
  }

  try {
    const res = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const responseBody = await res.text(); 

    if (!res.ok) {
      let errorMessage = `BACKEND_AUTH_ERROR: Erro de autenticação do backend (Status: ${res.status}). `;
      try {
        const errorData = JSON.parse(responseBody);
        errorMessage += errorData.message || `Detalhes: ${responseBody.substring(0,150)}`;
      } catch {
        errorMessage += responseBody ? `Detalhe (não JSON): ${responseBody.substring(0,150)}` : "Sem corpo de resposta detalhado.";
      }
      console.error("--- [Authorize] Auth failed:", errorMessage);
      throw new Error(errorMessage);
    }

    const userResponse = JSON.parse(responseBody);
    const userData = userResponse.user || userResponse.data?.user;
    const accessToken = userResponse.access_token || userResponse.data?.token;

    if (userData && accessToken && userData.id) {
      const finalUser: AppUser = {
        id: userData.id.toString(),
        name: userData.name || "Nome não fornecido pelo backend",
        email: userData.email,
        role: userData.role || "student", 
        image: userData.profileImageUrl || null, 
        accessToken: accessToken,
      };
      return finalUser;
    } else {
      console.error("--- [Authorize] FALHA: userData, accessToken ou userData.id ausente");
      throw new Error("AUTH_PROCESSING_ERROR: Resposta do backend não continha os dados de usuário ou token esperados após login bem-sucedido.");
    }
  } catch (error) {
    console.error("--- [Authorize] EXCEÇÃO:", error instanceof Error ? error.message : 'Unknown error');
    throw new Error(error instanceof Error ? error.message : "AUTH_UNKNOWN_ERROR: Erro interno desconhecido na função authorize."); 
  }
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "seu@email.com" },
        password: { label: "Senha", type: "password" }
      },
      authorize: authorize // A função que acabamos de detalhar
    })
    // TODO: Adicionar outros provedores se necessário (Google, GitHub, etc.)
  ],
  session: {
    strategy: "jwt", // Usar JWT para sessões
  },
  pages: {
    signIn: '/login',
    signOut: 'http://localhost:8888/login', // Corrigido anteriormente
    // error: '/auth/error', 
    // verifyRequest: '/auth/verify-request', 
    // newUser: '/auth/new-user' 
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.role = (user as AppUser).role;
        token.accessToken = (user as AppUser).accessToken;
        }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
          session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
            session.user.image = token.picture as string;
        session.user.role = token.role as string;
        session.accessToken = token.accessToken;
      }

      return session;
    },
    async signIn() {
      // Allow sign in - return true to proceed
      return true;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
}; 