import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService } from '../../services/finance.service';

declare var PluggyConnect: any; // Assuming Pluggy script is loaded in index.html

@Component({
  selector: 'app-open-finance-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      (click)="connectAccount()" 
      [disabled]="loading()"
      class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
    >
      <i class="ph-bold ph-plus-circle text-xl" *ngIf="!loading()"></i>
      <i class="ph-bold ph-spinner animate-spin text-xl" *ngIf="loading()"></i>
      <span>{{ loading() ? 'Iniciando...' : 'Conectar Banco (Open Finance)' }}</span>
    </button>
  `,
  styles: []
})
export class OpenFinanceButtonComponent {
  private financeService = inject(FinanceService);
  loading = signal(false);

  async connectAccount() {
    this.loading.set(true);
    try {
      // 1. Get the Link Token from our backend
      const response = await this.financeService.getOpenFinanceLinkToken();
      
      // 2. Initialize the Widget
      // Checking both global and window object for better compatibility
      const Pluggy = (window as any).PluggyConnect || (globalThis as any).PluggyConnect;

      if (Pluggy) {
        const pluggyConnect = new Pluggy({
          connectToken: response.linkToken,
          includeSandbox: true,
          onSuccess: async (itemData: any) => {
            console.log('Success connecting!', itemData);
            if (itemData.item && itemData.item.id) {
              try {
                const res = await this.financeService.syncPluggyAccount(itemData.item.id);
                if (res && res.is_new) {
                  alert(`Conexão realizada com sucesso!\n\nForam adicionadas ${res.transactions_added} transações dos últimos 30 dias. Por favor, revise e classifique as novas transações na página de Transações.`);
                } else if (res) {
                  alert(`Sincronização concluída!\n\nForam adicionadas ${res.transactions_added} novas transações.`);
                }
              } catch (err) {
                console.error(err);
                alert('Erro ao sincronizar transações. Certifique-se de executar a alteração no banco para adicionar a coluna provider_item_id.');
              }
            }
            this.financeService.loadData();
          },
          onError: (error: any) => {
            console.error('Widget error', error);
            this.loading.set(false);
          },
          onClose: () => {
            this.loading.set(false);
          }
        });
        pluggyConnect.init();
      } else {
        console.error('PluggyConnect script not loaded. Check index.html or network logs.');
        alert('Erro: O widget da Pluggy não foi detectado. Tente recarregar a página (F5). Se o erro persistir, verifique se o script https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js está acessível no seu navegador.');
        this.loading.set(false);
      }
    } catch (err) {
      console.error('Failed to start Open Finance flow', err);
      this.loading.set(false);
    }
  }
}
