import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthOptions } from "next-auth";

// Define a interface para o objeto de usuário que NextAuth espera
// e que nossa função authorize deve retornar.
interface AppUser {
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
  console.log("[Authorize] Iniciando processo de autorização.");

  if (!credentials) {
    console.warn("[Authorize] Credentials não definidas.");
    return null;
  }

  const { email, password } = credentials;
  console.log("[Authorize] Credenciais recebidas:", { email, password_present: !!password });

  if (!email || !password) {
    console.warn("[Authorize] Email ou senha ausentes nas credenciais.");
    return null;
  }

  // const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const backendApiUrl = "http://localhost:3000"; // TEMPORARY HARDCODED VALUE
  console.log("[Authorize] URL do Backend (TEMPORARY HARDCODED VALUE):", backendApiUrl);

  if (!backendApiUrl) { // Esta verificação se torna redundante com o valor hardcoded, mas mantida por segurança
    console.error("[Authorize] Erro Crítico: backendApiUrl não está definida (mesmo hardcoded, algo muito errado).");
    // Isso é um erro de configuração e deve ser tratado.
    // Retornar null aqui fará o login falhar, o que é o comportamento esperado.
    return null; 
  }

  const requestBody = { email, password };
  console.log("[Authorize] Payload para API de login:", JSON.stringify(requestBody));

  try {
    console.log(`[Authorize] Tentando POST para ${backendApiUrl}/auth/login`);
    const response = await fetch(`${backendApiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log("[Authorize] Resposta da API recebida. Status:", response.status, "StatusText:", response.statusText);

    let responseBodyText: string | null = null;
    try {
      responseBodyText = await response.text();
      console.log("[Authorize] Corpo da resposta da API (texto bruto):", responseBodyText);
    } catch (textError) {
      console.error("[Authorize] Erro ao ler corpo da resposta como texto:", textError);
      // Mesmo com erro aqui, a resposta pode ser OK ou não OK, então continuamos para checar o status.
    }

    if (!response.ok) {
      let errorMessage = `Falha na autenticação. Status: ${response.status}.`;
      if (responseBodyText) {
        try {
          const errorData = JSON.parse(responseBodyText);
          errorMessage = errorData.message || errorMessage;
          console.warn("[Authorize] Erro da API (JSON parseado):", errorData);
        } catch (e) {
          // Se não for JSON, usamos o texto bruto como parte da mensagem se disponível
          errorMessage = `${errorMessage} Resposta: ${responseBodyText}`;
          console.warn("[Authorize] Erro da API (não JSON):", responseBodyText);
        }
      } else {
          console.warn("[Authorize] Erro da API sem corpo de resposta legível.");
      }
      console.error(`[Authorize] Falha no login. ${errorMessage}`);
      return null;
    }

    // Se a resposta está OK (2xx), tentamos parsear o corpo como JSON.
    if (!responseBodyText) {
        console.error("[Authorize] Resposta OK, mas corpo da resposta está vazio ou não pôde ser lido como texto.");
        return null;
    }

    let data;
    try {
      data = JSON.parse(responseBodyText);
      console.log("[Authorize] Corpo da resposta OK (JSON parseado):", data);
    } catch (jsonParseError) {
      console.error("[Authorize] Erro ao parsear JSON da resposta OK. Texto bruto era:", responseBodyText, "Erro:", jsonParseError);
      return null; // Se a resposta era OK mas não era JSON válido, algo está errado.
    }
    
    // Estrutura esperada da resposta do backend: { accessToken: "...", user: { id, name, email, role } } 
    // OU { accessToken: "...", id, name, email, role }
    if (data && data.accessToken && (data.user || data.id)) {
      const userData = data.user || data; // Pega o objeto de usuário, esteja ele aninhado ou não
      if (!userData.id) {
        console.error("[Authorize] Resposta da API OK, mas data.user.id ou data.id ausente. Resposta:", data);
        return null;
      }
      console.log("[Authorize] Login bem-sucedido para usuário:", userData.email, "ID:", userData.id);
      
      const appUser: AppUser = {
        id: userData.id.toString(),
        name: userData.name || userData.email,
        email: userData.email,
        role: userData.role,
        image: userData.image || null, // Mapeie a imagem se vier do backend
        accessToken: data.accessToken, // Adiciona o accessToken ao objeto AppUser
      };
      console.log("[Authorize] Objeto AppUser mapeado:", appUser);
      return appUser;
    } else {
      console.error("[Authorize] Resposta da API de login OK, mas não contém accessToken ou dados do usuário esperados. Resposta:", data);
      return null;
    }
  } catch (error) {
    console.error("[Authorize] Exceção durante a chamada de API de login ou processamento. Erro:", error);
    // Verifica se é uma instância de Error para acessar a message property de forma segura
    if (error instanceof Error) {
        console.error("[Authorize] Detalhes da exceção:", error.message, error.stack);
    }
    return null; 
  }
};

// Alterado de 'const' para 'export const' para permitir importação em getServerSession
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "seu@email.com" },
        password: { label: "Senha", type: "password" }
      },
      authorize: authorize
    })
    // TODO: Adicionar outros provedores se necessário (Google, GitHub, etc.)
  ],
  session: {
    strategy: "jwt", // Usar JWT para sessões
  },
  pages: {
    signIn: '/login', // Página de login personalizada
    // signOut: '/auth/signout', // Página de logout personalizada (opcional)
    // error: '/auth/error', // Página de erro de autenticação (opcional)
    // verifyRequest: '/auth/verify-request', // Página para verificar e-mail (opcional)
    // newUser: '/auth/new-user' // Página para novos usuários (opcional)
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      console.log("[JWT Callback] Trigger:", trigger);
      if (user) { // Login inicial
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as AppUser).role;
        token.image = (user as AppUser).image; // Adicionar imagem no login inicial
        token.accessToken = (user as AppUser).accessToken;
        console.log("[JWT Callback] Login inicial. Token populado:", token);
      }

      // Se o trigger for "update" e a sessão (newSessionData) estiver presente
      if (trigger === "update" && session) {
        console.log("[JWT Callback] Trigger é UPDATE. Session (new data) recebida:", session);
        // Atualizar o token com os novos dados da sessão
        // Verifique se `session.user` existe, pois é o que passamos em `updateSession({ user: { ... }})`
        if (session.user) {
            if (session.user.role !== undefined) {
                token.role = session.user.role;
                console.log("[JWT Callback] Role atualizado no token para:", token.role);
            }
            if (session.user.image !== undefined) { // Permite definir image como null
                token.image = session.user.image;
                console.log("[JWT Callback] Image atualizada no token para:", token.image);
            }
            // Adicione outros campos que você quer que sejam atualizáveis da mesma forma
            // Ex: if (session.user.name) token.name = session.user.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Popula session.user com os dados do token JWT
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.name = token.name as string; // Garantir que name esteja na sessão
        session.user.email = token.email as string; // Garantir que email esteja na sessão
        session.user.image = token.image as string | null; // Adicionar imagem à sessão do cliente
      }
      if (token.accessToken) {
        (session as any).accessToken = token.accessToken as string;
      }
      console.log("[Session Callback] Sessão final a ser retornada:", session);
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // Variável de ambiente para secret
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 