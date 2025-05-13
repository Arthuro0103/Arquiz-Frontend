export { default } from "next-auth/middleware"

// Aplica o middleware NextAuth.js a rotas específicas
export const config = {
  matcher: [
    /*
     * Corresponde a todas as rotas exceto:
     * - /api routes
     * - /_next (arquivos estáticos)
     * - /_vercel (arquivos estáticos Vercel)
     * - Arquivos estáticos (png, jpg, svg, ico, etc.)
     * - /login, /register (páginas de autenticação públicas)
     */
    "/((?!api|_next|_vercel|login|register|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}; 