import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redireciona permanentemente para /dashboard
  // O AppLayout já está aplicado a /dashboard e seus filhos.
  console.log('[HomePage /] Redirecionando para /dashboard');
  redirect('/dashboard');
  
  // Este retorno não será alcançado devido ao redirect, mas é bom ter um fallback.
  // return null;
}
