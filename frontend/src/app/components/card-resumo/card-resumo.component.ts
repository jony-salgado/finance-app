import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-resumo',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden" [class.ring-1]="isHighlighted()" [class.ring-indigo-50]="isHighlighted()" [title]="tooltip()">
      <div class="flex justify-between items-center z-10">
        <span class="text-slate-500 font-medium">{{ title() }}</span>
        @if (isHighlighted()) {
          <i [class]="iconClass() + ' text-indigo-500 text-xl'"></i>
        } @else {
          <div class="w-8 h-8 rounded-full flex items-center justify-center" [class]="iconBg()">
            <i [class]="iconClass()"></i>
          </div>
        }
      </div>
      <div class="z-10"><span class="text-2xl md:text-3xl font-bold text-slate-800">{{ format(amount()) }}</span></div>
      @if (isHighlighted()) {
        <div class="absolute -bottom-4 -right-4 w-24 h-24 bg-indigo-50 rounded-full opacity-50"></div>
      }
    </div>
  `
})
export class CardResumoComponent {
  title = input<string>('');
  amount = input<number>(0);
  iconClass = input<string>('');
  iconBg = input<string>('');
  isHighlighted = input<boolean>(false);
  tooltip = input<string>('');
  
  format(value: number) { 
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0); 
  }
}
