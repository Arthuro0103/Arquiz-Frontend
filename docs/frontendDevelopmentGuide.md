# Guia de Desenvolvimento Frontend - Aplicativo de Avaliação por Competição (Next.js + Shadcn/UI)

Este documento detalha as diretrizes e a estrutura para o desenvolvimento do frontend do aplicativo usando Next.js e Shadcn/UI, conforme definido no [MasterPlan](mdc:docs/masterPlan.md).

## 1. Stack Tecnológico

- **Framework:** Next.js (v14+ - App Router)
- **Linguagem:** TypeScript
- **UI:** Shadcn/UI & Tailwind CSS
  - *Justificativa:* Shadcn/UI oferece componentes acessíveis e customizáveis construídos sobre Radix UI e Tailwind CSS, permitindo controle total sobre o estilo e a composição. Tailwind CSS facilita a criação de interfaces consistentes e responsivas.
- **Gerenciamento de Estado:**
  - **Server State:** React Server Components (RSC) e `fetch` API (ou SWR/React Query para cenários complexos).
  - **Client State:** Zustand ou Jotai (para estado global/compartilhado em Client Components) e `useState`/`useReducer` (para estado local).
  - *Justificativa:* Aproveitar o modelo de componentes do Next.js, usando RSC para buscar dados e gerenciar estado no servidor sempre que possível. Zustand/Jotai são leves e eficazes para estado complexo no cliente.
- **Roteamento:** Next.js App Router (file-based)
- **Requisições API (Client-side):** `fetch` API, SWR ou React Query.
- **WebSockets:** Socket.IO Client
- **Build Tool:** Next.js CLI (`next build`)
- **Testes:** Jest + React Testing Library
  - *Justificativa:* Combinação padrão e robusta para testar aplicações React/Next.js, focando no comportamento do usuário.

## 2. Estrutura do Projeto (Next.js App Router)

```
/public             # Arquivos estáticos públicos
/src
  /app              # Rotas principais da aplicação (App Router)
    /(auth)         # Grupo de rotas para autenticação (layout próprio)
      /login/page.tsx
      layout.tsx
    /(app)          # Grupo de rotas protegidas (layout principal)
      /professor    # Rotas específicas do professor
        /dashboard/page.tsx
        /transcricoes/page.tsx
        # ... etc
      /aluno        # Rotas específicas do aluno
        /sala/[codigo]/page.tsx # Rota dinâmica para sala
        # ... etc
      layout.tsx    # Layout principal da aplicação (com Header, Sidebar, etc.)
    /api            # Route Handlers (Backend API endpoints)
      /auth/login/route.ts
      /salas/route.ts
      # ... etc
    globals.css     # Estilos globais (Tailwind)
    layout.tsx      # Layout raiz da aplicação (<html>, <body>)
  /components       # Componentes da UI (Shadcn/UI e customizados)
    /ui             # Componentes gerados pelo Shadcn CLI (Button, Input, etc.) - NÃO EDITAR DIRETAMENTE
    /common         # Componentes genéricos reutilizáveis (ex: LoadingSpinner, PageHeader)
    /features       # Componentes específicos por funcionalidade
      /auth
      /professor
      /aluno
    /layout         # Componentes de estrutura (ex: Header, Sidebar, UserNav)
  /lib              # Funções utilitárias, configurações, hooks
    /auth.ts        # Funções/configuração de autenticação (ex: next-auth)
    /hooks.ts       # Hooks customizados
    /store.ts       # Configuração do Zustand/Jotai (se usado)
    /utils.ts       # Funções utilitárias gerais
    /validators.ts  # Esquemas de validação (Zod)
  /types            # Definições de tipos TypeScript globais
/tests              # Testes unitários e de integração
  /components
  /app
  # ... espelhando a estrutura de /src
.env.local          # Variáveis de ambiente locais (NÃO COMMITAR)
.env.example        # Exemplo de variáveis de ambiente
next.config.mjs     # Configuração do Next.js
postcss.config.js   # Configuração do PostCSS (para Tailwind)
tailwind.config.ts  # Configuração do Tailwind CSS
tsconfig.json       # Configuração do TypeScript
```

## 3. Componentes e UI (Shadcn/UI + Tailwind)

- **Biblioteca:** Utilizar `Shadcn/UI` como base. Adicionar componentes via CLI (`npx shadcn-ui@latest add <component>`).
- **Customização:**
  - **Shadcn:** Customizar componentes modificando os arquivos dentro de `src/components/ui` *após* adicioná-los.
  - **Tailwind:** Configurar o tema (cores, fontes, espaçamentos) em `tailwind.config.ts`.
- **Componentização:**
  - `src/components/ui`: Componentes base do Shadcn (gerados).
  - `src/components/common`: Componentes reutilizáveis construídos sobre os componentes `ui` ou HTML puro (ex: `ConfirmDialog`, `DataTable`).
  - `src/components/layout`: Componentes estruturais (ex: `Header`, `Sidebar`, `AppShell`).
  - `src/components/features/**`: Componentes específicos de uma funcionalidade, combinando `common` e `ui` (ex: `LoginForm`, `RankingTable`, `QuestionEditor`).
- **Estilo:** Usar classes do `Tailwind CSS` diretamente nos componentes. Utilizar `@apply` em `globals.css` com moderação para estilos base ou padrões repetitivos.
- **Server vs Client Components:** Usar Server Components por padrão. Optar por Client Components (`'use client'`) apenas quando necessário (interatividade, hooks como `useState`, `useEffect`, acesso a APIs do browser).

## 4. Gerenciamento de Estado

- **Server Components:** Buscar dados diretamente no servidor usando `fetch` (ou ORM/DB client). O estado é gerenciado pelo ciclo de vida da requisição/renderização do Next.js. Passar dados para Client Components via props.
- **URL State:** Usar parâmetros de busca (`useSearchParams`) ou rotas dinâmicas para gerenciar estado que deve ser compartilhável e refletido na URL (filtros, paginação, etc.).
- **Client Components (Estado Local):** Usar `useState`, `useReducer`.
- **Client Components (Estado Global/Compartilhado):** Usar `Zustand` ou `Jotai` para estados que precisam ser acessados por múltiplos Client Components não relacionados diretamente (ex: dados do usuário autenticado, estado da sala de competição). Configurar em `src/lib/store.ts`.
- **Server Actions:** Usar Server Actions para mutações de dados originadas no cliente (submissão de formulários), permitindo que a lógica de mutação execute no servidor sem criar endpoints de API explícitos.

## 5. Roteamento (Next.js App Router)

- **Baseado em Arquivos:** Rotas são definidas pela estrutura de pastas dentro de `/src/app`. `page.tsx` define a UI da rota. `layout.tsx` define a UI compartilhada.
- **Layouts Aninhados:** Layouts envolvem seus segmentos filhos, permitindo estruturas complexas e preservando estado na navegação.
- **Grupos de Rotas:** Usar parênteses `(nome)` para organizar rotas sem afetar a URL (ex: `(auth)`, `(app)`), útil para aplicar layouts diferentes a seções distintas.
- **Rotas Dinâmicas:** Usar colchetes `[param]` para segmentos de URL dinâmicos (ex: `/sala/[codigo]/page.tsx`). Acessar parâmetros com `useParams`.
- **Loading UI:** Criar `loading.tsx` para mostrar um estado de carregamento (via React Suspense) enquanto os dados de uma rota são carregados.
- **Error UI:** Criar `error.tsx` para tratar erros durante a renderização de uma rota.

## 6. Integração com API

- **Backend (API Routes):** Criar endpoints API usando **Route Handlers** em `/src/app/api/**/route.ts`. Usar para lógica que precisa ser executada no servidor (ex: comunicação segura com DB, serviços externos).
- **Data Fetching (Server Components):** Usar `fetch` diretamente dentro de Server Components. O Next.js automaticamente deduz e otimiza o cache.
```typescript
// Exemplo: /src/app/professor/salas/page.tsx (Server Component)
import { fetchSalas } from '@/lib/api/salas'; // Função que usa fetch ou ORM

async function SalasPage() {
  const salas = await fetchSalas(); // Executa no servidor

  return (
    <div>
      <h1>Minhas Salas</h1>
      {/* Renderizar lista de salas */}
    </div>
  );
}
export default SalasPage;
```
- **Data Fetching (Client Components):** Usar `useEffect` com `fetch`, ou bibliotecas como `SWR` ou `React Query` para caching, revalidação, etc. Chamar Route Handlers ou APIs externas.
- **Mutações (Client Components):** Usar **Server Actions** para submissões de formulário ou outras mutações. Define-se a ação no servidor e chama-se diretamente do formulário no cliente. Alternativamente, chamar Route Handlers via `fetch`.

## 7. Autenticação (JWT / NextAuth.js)

- **Biblioteca Recomendada:** `NextAuth.js` (v5/Auth.js) simplifica muito a autenticação.
- **Fluxo (NextAuth.js):**
  1. Configurar `NextAuth.js` em `src/lib/auth.ts` e um Route Handler (ex: `/src/app/api/auth/[...nextauth]/route.ts`).
  2. Usar o provider `Credentials` para login com email/senha (ou outros providers como Google, GitHub).
  3. `NextAuth.js` gerencia a sessão (geralmente via cookies seguros HttpOnly).
  4. Usar hooks (`useSession` em Client Components) ou helpers (`auth()` em Server Components/Route Handlers/Server Actions) para acessar dados da sessão.
  5. Proteger rotas/páginas usando middleware (`src/middleware.ts`) ou verificações manuais com `auth()`.
- **Alternativa (JWT Manual):**
  1. Criar Route Handlers para login/registro que retornam JWT.
  2. Armazenar o token em cookies HttpOnly (definidos pelo servidor).
  3. Criar middleware para verificar o token em requisições.
  4. Passar dados do usuário via props ou contexto seguro.

## 8. Funcionalidades em Tempo Real (WebSockets)

- **Biblioteca:** `socket.io-client`.
- **Conexão:** Gerenciar a conexão WebSocket a partir de **Client Components**, pois requer APIs do browser.
  - Usar `useEffect` para conectar/desconectar quando o componente montar/desmontar.
  - Idealmente, encapsular a lógica em um hook customizado (`useSalaSocket`) ou usar um store Zustand/Jotai para gerenciar o estado da conexão e os dados recebidos.
- **Eventos:**
  - *Ouvir:* Registrar listeners para eventos do servidor (`ranking_update`, `nova_resposta`, etc.) dentro do `useEffect`. Atualizar o estado local ou global (Zustand/Jotai).
  - *Emitir:* Chamar `socket.emit()` a partir de handlers de eventos no Client Component.
- **Gerenciamento de Estado:** Atualizar o estado gerenciado por Zustand/Jotai ou estado local do componente com os dados recebidos via WebSocket.

## 9. Testes (Jest + React Testing Library)

- **Configuração:** Configurar Jest para trabalhar com Next.js e TypeScript (geralmente via `jest.config.js` e `jest.setup.js`).
- **Tipos de Testes:**
  - *Unitários:* Para funções utilitárias, hooks, lógica de store, Server Actions simples.
  - *Integração:* Para componentes (Server e Client), testando interações, renderização baseada em props/estado, chamadas a Server Actions.
- **Localização:** `/tests` espelhando a estrutura de `/src`.
- **Mocks:** Usar mocks do Jest para simular módulos, funções, Server Actions e chamadas `fetch`. `msw` pode ser usado para mockar Route Handlers a nível de rede, se necessário.
- **Testando Server Components:** Renderizar e testar a saída HTML esperada. Mockar funções de busca de dados.
- **Testando Client Components:** Usar `@testing-library/react` para montar componentes e simular interações do usuário.

## 10. Deployment

- **Plataforma Recomendada:** Vercel (otimizada para Next.js). Alternativas: Netlify, AWS Amplify, Docker.
- **Build:** `npm run build` (ou `yarn build`).
- **Variáveis de Ambiente:** Configurar variáveis de ambiente (ex: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `SOCKET_SERVER_URL`) nas configurações do serviço de hospedagem. Usar `.env.local` para desenvolvimento.
- **Infraestrutura:** Vercel gerencia automaticamente a infraestrutura (Serverless Functions para RSC/Route Handlers/Server Actions, CDN para assets estáticos).

## 11. Considerações Adicionais

- **Performance:** Aproveitar o modelo do App Router (RSC, Streaming, Suspense). Otimizar Client Components (`React.memo`). Analisar bundles com `@next/bundle-analyzer`.
- **Acessibilidade (a11y):** Shadcn/UI é construído sobre Radix UI, que é focado em acessibilidade. Seguir as melhores práticas (semântica HTML, ARIA).
- **Internacionalização (i18n):** O App Router tem suporte integrado para i18n. Usar bibliotecas como `next-intl`.
- **Tratamento de Erros:** Usar `error.tsx` para erros de renderização. Implementar tratamento de erros robusto em Server Actions e Route Handlers. Usar bibliotecas como `react-hot-toast` para feedback no cliente.
- **Validação:** Usar `Zod` para validação de dados em formulários (Client Components) e em Server Actions/Route Handlers.
