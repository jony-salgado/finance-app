import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Aguarda a inicialização do Supabase antes de decidir o redirecionamento
  await authService.initialized;

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redireciona o usuário não autenticado para a tela de login
  router.navigate(['/login']);
  return false;
};
