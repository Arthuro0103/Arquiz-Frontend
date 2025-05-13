'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils'; // Assumindo que você tem um utilitário cn para classnames
import { useSession } from 'next-auth/react'; // Importar useSession
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // Importar Avatar

// Ícones placeholder - substitua por ícones reais (ex: lucide-react)
// import { User, FileText, LayoutDashboard, ListChecks, Presentation, Users, BarChart3, Settings } from 'lucide-react';

// interface NavItem {
//   href: string;
//   label: string;
//   icon?: React.ElementType; // Tipo para componentes de ícone
//   roles?: string[]; // Papéis que podem ver este item. Se undefined, visível para todos.
// }

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession(); // Obter a sessão
  const user = session?.user;
  const userRole = user?.role;
  const userName = user?.name;
  const userImage = user?.image;

  console.log("[Sidebar] Renderizando Sidebar. Pathname:", pathname, "Role:", userRole);

  const navItems = [
    // { href: '/profile', label: 'Meu Perfil' }, // Removido daqui
    { href: '/', label: 'Dashboard', /* icon: LayoutDashboard */ },
    { href: '/transcriptions', label: 'Transcrições', /* icon: FileText */ roles: ['teacher'] }, // Adicionado Transcrições
    { href: '/quizzes', label: 'Quizzes', /* icon: ListChecks */ roles: ['teacher'] },
    { href: '/rooms', label: 'Salas', /* icon: Presentation */ },
    { href: '/compete', label: 'Competir', /* icon: Users */ },
    { href: '/reports', label: 'Relatórios', /* icon: BarChart3 */ roles: ['teacher'] }, // Assumindo que relatórios também são para teacher
    { href: '/monitoring', label: 'Monitoramento', /* icon: Settings */ roles: ['teacher'] }, // Assumindo que monitoramento também é para teacher
  ];
  
  // TODO: Implementar lógica para sidebar expansível/colapsável
  const isExpanded = true; // Mantenha expandido por enquanto

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true; // Visível para todos se não houver roles definidas
    return item.roles.includes(userRole as string);
  });

  return (
    <aside
      className={cn(
        'bg-muted/40 border-r flex flex-col transition-all duration-300 ease-in-out h-screen',
        isExpanded ? 'w-64' : 'w-20' // Largura para expandido e colapsado
      )}
    >
      {/* Seção do Perfil no Topo */}
      {user && isExpanded && (
        <Link href="/profile">
          <div className="flex flex-col items-center p-4 border-b cursor-pointer hover:bg-accent">
            <Avatar className="h-16 w-16 mb-2">
              <AvatarImage src={userImage || undefined} alt={userName || 'Usuário'} />
              <AvatarFallback className="text-xl">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-sm truncate max-w-full">{userName || 'Usuário'}</p>
            <p className="text-xs text-muted-foreground capitalize truncate max-w-full">{userRole || 'Papel não definido'}</p>
          </div>
        </Link>
      )}
      {/* Ícone de Perfil quando colapsado (se necessário) */}
      {user && !isExpanded && (
        <Link href="/profile" className="flex justify-center items-center p-4 border-b cursor-pointer hover:bg-accent">
           <Avatar className="h-10 w-10">
              <AvatarImage src={userImage || undefined} alt={userName || 'Usuário'} />
              <AvatarFallback>
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
        </Link>
      )}

      <nav className="flex flex-col gap-2 px-2 sm:py-4 flex-grow">
        {filteredNavItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
              pathname === item.href && 'bg-primary/10 text-primary font-semibold',
              !isExpanded && 'justify-center' // Centraliza ícone quando colapsado
            )}
          >
            {/* {item.icon && <item.icon className="h-5 w-5" />} */}
            <span className={cn('truncate', !isExpanded && 'sr-only')} >{/* sr-only para esconder texto quando colapsado */} 
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
      {/* TODO: Botão para expandir/colapsar a sidebar */}
      {/* <div className="mt-auto p-4">
        <Button variant="ghost" size="icon" className="rounded-full w-full">
          {isExpanded ? <ChevronLeft /> : <ChevronRight />}
        </Button>
      </div> */}
    </aside>
  );
} 