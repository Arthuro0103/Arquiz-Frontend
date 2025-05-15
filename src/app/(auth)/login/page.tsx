'use client'

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { FormEvent, useState } from "react"
import { useRouter } from 'next/navigation'

console.log("[LoginPage] Módulo carregado no cliente.");

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter();
  console.log("[LoginPage] Componente renderizado/instanciado.");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); 
    console.log("[LoginPage handleSubmit] Tentativa de login iniciada com credenciais:", { email });

    if (!email || !password) {
      setError("Por favor, preencha email e senha.");
      console.warn("[LoginPage handleSubmit] Email ou senha não preenchidos no cliente.");
      return;
    }

    try {
      console.log("[LoginPage handleSubmit] PREPARANDO para chamar signIn('credentials')...");
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      console.log("[LoginPage handleSubmit] Resultado DIRETO do signIn:", result);

      if (result?.error) {
        console.error("[LoginPage handleSubmit] Erro retornado pelo signIn (pode ser após tentativa de redirecionamento falha):");
        console.error("[LoginPage handleSubmit] Detalhes do Erro:", result.error);
        console.error("[LoginPage handleSubmit] URL do Erro (se houver):", result.url);
        console.error("[LoginPage handleSubmit] Status do Erro (se houver):", result.status);
        console.error("[LoginPage handleSubmit] OK? (se houver):", result.ok);

        let displayError = "Ocorreu um erro durante o login.";
        if (result.error === "CredentialsSignin") {
          displayError = "Email ou senha inválidos. Verifique seus dados e tente novamente.";
        } else if (result.error.includes("NEXTAUTH_URL")) {
          displayError = "Erro de configuração do servidor de autenticação. Contate o suporte.";
        } else {
          try {
            const errorDetails = JSON.parse(result.error);
            if (errorDetails.message) displayError = errorDetails.message;
          } catch (e) {
            displayError = `Erro: ${result.error.substring(0, 100)}`;
          }
        }
        setError(displayError);
        return;
      }

      if (result?.ok && result.url) {
        console.log("[LoginPage handleSubmit] Login bem-sucedido, redirecionando para /dashboard manualmente.");
        router.push("/dashboard");
        return;
      } else if (result?.ok) {
        console.log("[LoginPage handleSubmit] signIn retornou OK, mas não houve erro nem URL (verificar lógica).");
        console.log("[LoginPage handleSubmit] Login OK, mas sem URL explícita. Redirecionando para /dashboard como fallback.");
        router.push("/dashboard");
        return;
      } else if (!result?.error) {
        console.warn("[LoginPage handleSubmit] signIn não retornou erro, mas o resultado não indica sucesso claro. Resultado:", result);
        setError("Ocorreu um problema inesperado durante o login. Tente novamente.");
      }
    } catch (err: any) {
      console.error("[LoginPage handleSubmit] EXCEÇÃO INESPERADA durante o handleSubmit:", err);
      let exceptionMessage = "Ocorreu um erro inesperado.";
      if (err.message) {
        exceptionMessage = err.message.substring(0,150);
      }
      setError(`Exceção: ${exceptionMessage}. Por favor, tente novamente mais tarde.`);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          Digite seu email e senha para acessar sua conta.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          {error && (
            <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive">
              <p>{error}</p>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="seu@email.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input 
              id="password" 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" type="submit">Entrar</Button>
          <p className="text-xs text-center text-muted-foreground">
            Não tem uma conta?{" "}
            <Link href="/register" className="underline">
              Registre-se
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
} 