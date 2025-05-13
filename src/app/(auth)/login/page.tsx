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

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); // Limpa erros anteriores
    console.log("[LoginPage handleSubmit] Tentativa de login iniciada.");
    console.log("[LoginPage handleSubmit] Email:", email, "Senha fornecida:", !!password);

    // Validação básica no cliente
    if (!email || !password) {
      setError("Por favor, preencha email e senha.");
      console.warn("[LoginPage handleSubmit] Email ou senha não preenchidos no cliente.");
      return;
    }

    try {
      console.log("[LoginPage handleSubmit] Chamando signIn('credentials')...");
      const result = await signIn("credentials", {
        redirect: false, 
        email,
        password,
      });

      console.log("[LoginPage handleSubmit] Resultado do signIn:", result);

      if (result?.error) {
        console.error("[LoginPage handleSubmit] Erro no login do NextAuth:", result.error);
        if (result.error === "CredentialsSignin") {
          setError("Email ou senha inválidos. Verifique seus dados e tente novamente.");
        } else {
          setError(`Erro de login: ${result.error}. Tente novamente.`);
        }
        return;
      }

      if (result?.ok && result.url) { // result.url não é null em caso de sucesso com redirect:false
        console.log("[LoginPage handleSubmit] Login bem-sucedido. Redirecionando para / (ou result.url se aplicável).");
        router.push("/"); 
      } else {
        // Este caso não deveria acontecer se result.error foi tratado e result.ok é true
        // Mas é um fallback.
        console.warn("[LoginPage handleSubmit] signIn retornou ok:true mas sem URL, ou ok:false sem erro explícito. Resultado:", result);
        setError("Ocorreu um problema durante o login. Tente novamente.");
      }
    } catch (err) {
      console.error("[LoginPage handleSubmit] Exceção inesperada durante o handleSubmit:", err);
      setError("Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.");
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