import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-resumo',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden" [class.ring-1]="destaque()" [class.ring-indigo-50]="destaque()" [title]="tooltip()">
      <div class="flex justify-between items-center z-10">
        <span class="text-slate-500 font-medium">{{ titulo() }}</span>
        @if (destaque()) {
          <i [class]="iconeClass() + ' text-indigo-500 text-xl'"></i>
        } @else {
          <div class="w-8 h-8 rounded-full flex items-center justify-center" [class]="bgIcon()">
            <i [class]="iconeClass()"></i>
          </div>
        }
      </div>
      <div class="z-10"><span class="text-2xl md:text-3xl font-bold text-slate-800">{{ formata(valor()) }}</span></div>
      @if (destaque()) {
        <div class="absolute -bottom-4 -right-4 w-24 h-24 bg-indigo-50 rounded-full opacity-50"></div>
      }
    </div>
  `
})
export class CardResumoComponent {
  titulo = input<string>('');
  valor = input<number>(0);
  iconeClass = input<string>('');
  bgIcon = input<string>('');
  destaque = input<boolean>(false);
  tooltip = input<string>('');
  
  formata(valor: number) { 
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0); 
  }
}
