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
import { FormEvent, useState } from "react"
import { useRouter } from 'next/navigation'

// Enum para UserRole, espelhando o backend
// Idealmente, isso viria de um pacote compartilhado
enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    console.log("[ handleSubmit ] INICIADO. Evento:", event);

    setError("");
    setSuccess("");

    console.log("[ handleSubmit ] Valores dos campos:", { name, email, password_length: password.length, confirmPassword_length: confirmPassword.length });

    // Validação básica no frontend
    if (!name || !email || !password) {
      const missingFields = [];
      if (!name) missingFields.push("Nome Completo");
      if (!email) missingFields.push("Email");
      if (!password) missingFields.push("Senha");
      const errorMessage = `Por favor, preencha os campos obrigatórios: ${missingFields.join(', ')}.`;
      setError(errorMessage);
      console.warn("[ handleSubmit ] Validação falhou no frontend:", errorMessage);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      console.warn("[ handleSubmit ] Senhas não coincidem.");
      return;
    }
    
    const backendApiUrl = "http://localhost:3000"; // Hardcoded para depuração
    console.log("[ handleSubmit ] URL do Backend (hardcoded):", backendApiUrl);

    const payload = { 
      name, 
      email, 
      password, 
      role: UserRole.STUDENT 
    };
    console.log("[ handleSubmit ] Payload para API:", payload);

    try {
      console.log(`[ handleSubmit ] Tentando POST para ${backendApiUrl}/auth/register`);
      const response = await fetch(`${backendApiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log("[ handleSubmit ] Resposta recebida. Status:", response.status, "StatusText:", response.statusText);

      // Tentar ler o corpo da resposta como texto bruto primeiro para depuração
      let responseBodyText: string | null = null;
      try {
        responseBodyText = await response.text();
        console.log("[ handleSubmit ] Corpo da resposta (texto bruto):", responseBodyText);
      } catch (textError) {
        console.error("[ handleSubmit ] Erro ao ler corpo da resposta como texto:", textError);
      }

      // Tentar parsear como JSON
      let data;
      if (responseBodyText) {
        try {
          data = JSON.parse(responseBodyText);
          console.log("[ handleSubmit ] Corpo da resposta (JSON parseado):", data);
        } catch (jsonError) {
          console.error("[ handleSubmit ] Erro ao parsear corpo da resposta como JSON. Texto bruto era:", responseBodyText, "Erro de parsing:", jsonError);
          // Se não for JSON válido, usar o texto bruto como mensagem de erro se a resposta não for OK.
          if (!response.ok) {
            setError(responseBodyText || "Erro ao processar resposta do servidor.");
            return;
          }
          // Se for OK mas não JSON, pode ser um problema.
          data = { message: "Resposta do servidor não era JSON válido, mas status OK." };
        }
      } else if (!response.ok) {
         // Se não conseguiu ler o texto e a resposta não foi OK
        setError(`Erro ${response.status}: ${response.statusText || "Falha na comunicação com o servidor."}`);
        console.error("[ handleSubmit ] Falha na comunicação, sem corpo de resposta legível.");
        return;
      }


      if (!response.ok) {
        let apiErrorMessage = "Falha ao registrar.";
        if (data && data.message) {
          apiErrorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
        } else if (responseBodyText) {
          apiErrorMessage = responseBodyText;
        }

        if (response.status === 409) { // HTTP 409 Conflict
          apiErrorMessage = data?.message || "Este email já está registrado. Tente fazer login.";
          console.warn(`[ handleSubmit ] Conflito (409) da API: ${apiErrorMessage}`);
        } else {
          console.error(`[ handleSubmit ] Erro da API (${response.status}):`, data || responseBodyText);
        }
        setError(apiErrorMessage);
        return;
      }
      
      setSuccess("Registro bem-sucedido! Você será redirecionado para o login em 3 segundos.");
      console.log("[ handleSubmit ] Registro bem-sucedido. Redirecionando...");
      setTimeout(() => router.push('/login'), 3000);

    } catch (err: unknown) {
      console.error("[ handleSubmit ] Erro inesperado durante o fetch ou processamento:", err);
      let errorMessage = "Ocorreu um erro inesperado ao tentar registrar.";
      if (err instanceof Error) {
        // Se for um erro de rede (ex: servidor offline), pode não ter 'message' ou ser genérico
        if (err.message.includes('Failed to fetch')) {
            errorMessage = "Não foi possível conectar ao servidor. Verifique sua conexão e se o backend está rodando.";
        } else {
            errorMessage = err.message;
        }
      }
      setError(errorMessage);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Registrar</CardTitle>
        <CardDescription>
          Crie sua conta para começar a usar o ArQuiz.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          {error && (
            <div className="bg-destructive/15 p-3 rounded-md text-sm text-destructive">
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-500/15 p-3 rounded-md text-sm text-green-600">
              <p>{success}</p>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input id="name" placeholder="Seu nome" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirmar Senha</Label>
            <Input id="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" type="submit">Criar Conta</Button>
          <p className="text-xs text-center text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href="/login" className="underline">
              Fazer Login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
} 