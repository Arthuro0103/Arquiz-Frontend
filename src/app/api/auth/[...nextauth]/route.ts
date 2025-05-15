console.log(">>> DEBUG: NEXTAUTH_URL no topo de [...nextauth]/route.ts:", process.env.NEXTAUTH_URL);
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
  console.log("--- [Authorize] FUNÇÃO CHAMADA (LÓGICA ORIGINAL ATUALIZADA COM MAIS LOGS) ---");
  console.log("[Authorize] Credentials recebidas:", JSON.stringify(credentials || {}));

  if (!credentials?.email || !credentials?.password) {
    console.warn("--- [Authorize] Credenciais ausentes (email ou senha). Lançando erro. ---");
    throw new Error("CREDENTIALS_MISSING: Por favor, forneça email e senha."); 
  }
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  console.log(`--- [Authorize] Verificando NEXT_PUBLIC_BACKEND_API_URL: ${backendUrl} ---`);

  if (!backendUrl) {
    console.error("--- [Authorize] ERRO CRÍTICO: NEXT_PUBLIC_BACKEND_API_URL não está definida! Lançando erro. ---");
    throw new Error("CONFIG_ERROR: URL do backend não definida.");
  }

  try {
    console.log(`--- [Authorize] Tentando POST para ${backendUrl}/auth/login ---`);
    const res = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
      headers: { "Content-Type": "application/json" },
    });

    console.log("--- [Authorize] Resposta do Backend Status:", res.status, "StatusText:", res.statusText);
    const responseBody = await res.text(); 
    console.log("--- [Authorize] Resposta do Backend Body (texto bruto):", responseBody);

    if (!res.ok) {
      let errorMessage = `BACKEND_AUTH_ERROR: Erro de autenticação do backend (Status: ${res.status}). `;
      try {
        const errorData = JSON.parse(responseBody);
        errorMessage += errorData.message || `Detalhes: ${responseBody.substring(0,150)}`;
        console.warn("--- [Authorize] Erro (JSON parseado da resposta do backend):", errorData);
      } catch (e) {
        errorMessage += responseBody ? `Detalhe (não JSON): ${responseBody.substring(0,150)}` : "Sem corpo de resposta detalhado.";
        console.warn("--- [Authorize] Erro (resposta não JSON ou falha no parse do erro do backend):", responseBody);
      }
      console.error("--- [Authorize] Lançando erro após resposta não OK do backend:", errorMessage);
      throw new Error(errorMessage);
    }

    console.log("--- [Authorize] Resposta OK do backend. Tentando parsear JSON do corpo...");
    const userResponse = JSON.parse(responseBody);
    console.log("--- [Authorize] Usuário (JSON parseado) recebido do backend:", JSON.stringify(userResponse));
    
    const userData = userResponse.user || userResponse.data?.user; // Ajustado para cobrir { user: ... } ou { data: { user: ... } }
    const accessToken = userResponse.access_token || userResponse.data?.token; // Ajustado para cobrir access_token ou data.token

    console.log("--- [Authorize] Tentando extrair userData:", JSON.stringify(userData));
    console.log("--- [Authorize] Tentando extrair accessToken:", accessToken ? "TOKEN_PRESENTE" : "TOKEN_AUSENTE");

    if (userData && accessToken && userData.id) {
      console.log("--- [Authorize] Usuário, token e ID OK. Dados do usuário (userData):", JSON.stringify(userData));
      console.log("--- [Authorize] Role recebida do backend (de userData.role):", userData.role);
      console.log("--- [Authorize] Imagem recebida do backend (de userData.profileImageUrl):", userData.profileImageUrl);
      
      const finalUser: AppUser = {
        id: userData.id.toString(),
        name: userData.name || "Nome não fornecido pelo backend",
        email: userData.email,
        role: userData.role || "student", 
        image: userData.profileImageUrl || null, 
        accessToken: accessToken,
      };
      console.log("--- [Authorize] Retornando AppUser mapeado para NextAuth:", JSON.stringify(finalUser));
      return finalUser;
    } else {
      console.error("--- [Authorize] CONDIÇÃO FALHOU: userData, accessToken ou userData.id ausente. Detalhes:");
      console.error("--- [Authorize] userData existe?", !!userData, "Valor:", JSON.stringify(userData));
      console.error("--- [Authorize] accessToken existe?", !!accessToken);
      console.error("--- [Authorize] userData.id existe?", !!(userData && userData.id), "Valor de ID:", userData?.id );
      console.error("--- [Authorize] Resposta completa do backend que levou a esta falha:", JSON.stringify(userResponse));
      throw new Error("AUTH_PROCESSING_ERROR: Resposta do backend não continha os dados de usuário ou token esperados após login bem-sucedido.");
    }
  } catch (error: any) {
    console.error("--- [Authorize] EXCEÇÃO GERAL na função authorize:", error.message, error.stack);
    // Re-lançar o erro para que NextAuth o capture e envie para o cliente de forma padronizada.
    // O cliente verá o `result.error` com esta mensagem, ou NextAuth pode ter mensagens padrão para certos erros.
    throw new Error(error.message || "AUTH_UNKNOWN_ERROR: Erro interno desconhecido na função authorize."); 
  }
};

console.log(">>> DEBUG: Processando authOptions...");
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
    async jwt({ token, user, account, profile, trigger, session: sessionDataFromUpdate }) {
      console.log("--- [JWT Callback] ---");
      console.log("[JWT Callback] Trigger:", trigger);
      console.log("[JWT Callback] User (de authorize ou outro fluxo):", JSON.stringify(user || {}));
      console.log("[JWT Callback] Account:", JSON.stringify(account || {}));
      // console.log("[JWT Callback] Profile:", JSON.stringify(profile || {})); // Pode ser verboso
      console.log("[JWT Callback] Session DATA FROM UPDATE (dados passados para a função update()):", JSON.stringify(sessionDataFromUpdate || {}));
      console.log("[JWT Callback] Token ANTES da modificação:", JSON.stringify(token));

      if (trigger === "update" && sessionDataFromUpdate?.user) {
        console.log("[JWT Callback] Atualizando token via trigger 'update' com dados de sessionDataFromUpdate.user");
        // Atualiza a role se fornecida nos dados de atualização
        if (sessionDataFromUpdate.user.role) {
          token.role = sessionDataFromUpdate.user.role;
          console.log("[JWT Callback] Role do token atualizada para:", token.role);
        }
        // Atualiza a imagem se fornecida nos dados de atualização
        if (sessionDataFromUpdate.user.image) {
          token.picture = sessionDataFromUpdate.user.image;
          console.log("[JWT Callback] Imagem do token atualizada para:", token.picture);
        }
        // Adicione aqui outras propriedades do usuário que podem ser atualizadas e devem refletir no token
      }
      
      if (user) { // User object SÓ EXISTE no login inicial (após authorize)
        console.log("[JWT Callback] User existe (login inicial), atualizando token com dados de 'user'.");
        token.id = (user as any).id;
        token.role = (user as any).role || token.role || "student"; // Prioriza user.role, depois token.role existente, depois fallback
        token.picture = (user as any).image || token.picture; // Usa imagem do user se existir, senão mantém a do token
        token.accessToken = (user as AppUser).accessToken; // CORRIGIDO AQUI de (user as any).token
        token.name = (user as any).name || token.name;
        token.email = (user as any).email || token.email;

      } else if (trigger !== "update") { // Se não for login inicial E não for update, pode ser refresh de token
        console.log("[JWT Callback] User NÃO existe e trigger NÃO é 'update' (fluxo normal ou falha no authorize).");
        // Para garantir que a role não seja perdida em JWTs subsequentes se não vier do user
        if (!token.role) {
          console.warn("[JWT Callback] ATENÇÃO: token.role estava vazio (não login, não update), definindo para 'student' como fallback.");
          token.role = "student"; 
        }
      }
      
      console.log("[JWT Callback] Token DEPOIS da modificação:", JSON.stringify(token));
      return token;
    },
    async session({ session, token, user }) {
      console.log("--- [Session Callback] ---");
      // console.log("[Session Callback] User (da session, NÃO é o user do authorize):", JSON.stringify(user || {}));
      console.log("[Session Callback] Token recebido:", JSON.stringify(token));
      console.log("[Session Callback] Session ANTES da modificação:", JSON.stringify(session));

      if (token) { // Checar se o token existe
        if (session.user) { // Checar se session.user existe
          session.user.role = token.role as string || "student";
          session.user.id = token.id as string;
          if (token.picture) { 
            session.user.image = token.picture as string;
          }
        } else {
          // Se session.user não existe, talvez criar um objeto default?
          // Ou logar um aviso. Por agora, vamos focar em popular o accessToken na session principal.
          console.warn("[Session Callback] session.user não estava definido. Criando session.user básico.");
          session.user = { 
            // id: token.id as string, // Pode ser redundante se já estiver no token.sub
            // name: token.name as string, // Idem
            // email: token.email as string, // Idem
          };
        }
        // Adicionar accessToken à raiz do objeto session se existir no token
        if (token.accessToken) {
          (session as any).accessToken = token.accessToken;
          console.log("[Session Callback] accessToken adicionado à session.");
        } else {
          console.warn("[Session Callback] token.accessToken NÃO encontrado no token JWT.");
        }
      } else {
        console.warn("[Session Callback] ATENÇÃO: Token não recebido no callback session.");
      }
      
      console.log("[Session Callback] Session DEPOIS da modificação:", JSON.stringify(session));
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, 
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 