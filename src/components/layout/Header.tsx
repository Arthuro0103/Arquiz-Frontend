'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-background border-b px-4 lg:px-6 h-16 flex items-center justify-between sticky top-0 z-50">
      <Link href="/" className="flex items-center justify-center">
        {/* Substitua por um SVG ou Ícone se tiver */}
        <span className="text-xl font-semibold">Arquiz</span>
      </Link>
      <nav className="flex items-center gap-4 sm:gap-6">
        {session?.user ? (
          <>
            <span className="text-sm text-muted-foreground hidden sm:inline-block">
              Olá, {session.user.name || session.user.email}
            </span>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
              Sair
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Login</Link>
          </Button>
        )}
      </nav>
    </header>
  );
} 