import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-pizza',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[250px]">
      <h3 class="text-slate-700 font-bold mb-6">{{ titulo() }}</h3>
      @if (dados().length === 0) {
        <div class="flex flex-col items-center justify-center flex-1">
           <i class="ph ph-chart-pie-slice text-5xl text-slate-200 mb-4"></i>
           <p class="text-slate-400 font-medium text-center">Nenhum gasto neste mês.</p>
        </div>
      } @else {
        <div class="flex flex-col xl:flex-row items-center gap-6 xl:gap-8 flex-1">
          <div class="relative w-36 h-36 shrink-0 rounded-full shadow-inner" [style.background]="'conic-gradient(' + gradientStops() + ')'">
            <div class="absolute inset-0 m-auto w-20 h-20 bg-white rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] flex items-center justify-center">
              <span class="text-slate-400 text-xs font-semibold">Total</span>
            </div>
          </div>
          <div class="flex-1 w-full space-y-3">
            @for (d of dados(); track d.id) {
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full shadow-sm" [style.backgroundColor]="d.corHex"></span>
                  <span class="text-slate-600 font-medium truncate max-w-[120px]" [title]="d.nome">{{ d.nome }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-slate-400 text-xs w-10 text-right">{{ d.percentual.toFixed(1) }}%</span>
                  <span class="text-slate-800 font-semibold">{{ formata(d.valor) }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class CardPizzaComponent {
  titulo = input<string>('');
  dados = input<any[]>([]);
  
  formata(valor: number) { 
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0); 
  }
  
  gradientStops = computed(() => {
    let cumulative = 0;
    return this.dados().map(d => {
      const start = cumulative;
      cumulative += d.percentual;
      return `${d.corHex} ${start}% ${cumulative}%`;
    }).join(', ');
  });
}
