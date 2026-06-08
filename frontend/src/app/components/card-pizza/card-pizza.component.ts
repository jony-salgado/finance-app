import { Component, ChangeDetectionStrategy, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrivacyService } from '../../services/privacy.service';

@Component({
  selector: 'app-card-pizza',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[250px]"
    >
      <h3 class="text-slate-700 font-bold mb-6">{{ title() }}</h3>
      @if (data().length === 0) {
        <div class="flex flex-col items-center justify-center flex-1">
          <i class="ph ph-chart-pie-slice text-5xl text-slate-200 mb-4"></i>
          <p class="text-slate-400 font-medium text-center">No expenses this month.</p>
        </div>
      } @else {
        <div class="flex flex-col sm:flex-row md:flex-col items-center gap-6 flex-1 w-full">
          <div
            class="relative w-36 h-36 shrink-0 rounded-full shadow-inner cursor-pointer select-none hover:scale-[1.02] transition-transform duration-200"
            [style.background]="'conic-gradient(' + gradientStops() + ')'"
            (click)="onChartClick($event)"
          >
            <div
              (click)="$event.stopPropagation(); toggleSelect(null)"
              class="absolute inset-0 m-auto w-20 h-20 bg-white rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] flex items-center justify-center cursor-pointer hover:scale-105 transition-all duration-200"
            >
              @if (selectedId()) {
                <span
                  class="text-indigo-600 text-xs font-bold uppercase tracking-wider flex items-center gap-0.5"
                  ><i class="ph ph-x text-sm"></i> Clear</span
                >
              } @else {
                <span class="text-slate-400 text-xs font-semibold">Total</span>
              }
            </div>
          </div>
          <div class="flex-1 w-full space-y-1">
            @for (d of data(); track d.id) {
              <div
                (click)="toggleSelect(d.id)"
                class="flex items-center justify-between text-sm w-full gap-4 cursor-pointer hover:bg-slate-50/80 p-1.5 rounded-xl transition-all duration-200"
                [class.opacity-40]="selectedId() && selectedId() !== d.id"
                [class.bg-slate-50]="selectedId() === d.id"
              >
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    class="w-3 h-3 rounded-full shadow-sm shrink-0 transition-transform duration-200"
                    [class.scale-125]="selectedId() === d.id"
                    [style.backgroundColor]="d.hexColor"
                  ></span>
                  <span
                    class="font-medium truncate transition-colors duration-200"
                    [class.text-indigo-600]="selectedId() === d.id"
                    [class.text-slate-600]="selectedId() !== d.id"
                    [title]="d.name"
                    >{{ d.name }}</span
                  >
                </div>
                <div class="flex items-center gap-3 shrink-0">
                  <span class="text-slate-400 text-xs w-10 text-right">
                    @if (privacyService.isPrivateMode()) {
                      ...%
                    } @else {
                      {{ d.percentage.toFixed(1) }}%
                    }
                  </span>
                  <span
                    class="font-semibold transition-colors duration-200"
                    [class.text-indigo-700]="selectedId() === d.id"
                    [class.text-slate-800]="selectedId() !== d.id"
                  >
                    @if (privacyService.isPrivateMode()) {
                      R$ .....
                    } @else {
                      {{ format(d.amount) }}
                    }
                  </span>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CardPizzaComponent {
  privacyService = inject(PrivacyService);

  title = input<string>('');
  data = input<any[]>([]);
  selectedId = input<string | null>(null);
  selectItem = input<(id: string | null) => void>();

  format(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      value || 0,
    );
  }

  onChartClick(event: MouseEvent) {
    if (this.data().length === 0) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    // Calculate distance to center to check if clicking inner circle (Total button)
    const distance = Math.sqrt(x * x + y * y);
    if (distance < 40) {
      this.toggleSelect(null);
      return;
    }

    // Calculate angle in degrees [0, 360]
    let angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (angle < 0) {
      angle += 360;
    }

    // Find clicked slice based on cumulative percentages
    let cumulativePercentage = 0;
    for (const d of this.data()) {
      const sliceStartAngle = (cumulativePercentage / 100) * 360;
      cumulativePercentage += d.percentage;
      const sliceEndAngle = (cumulativePercentage / 100) * 360;

      if (angle >= sliceStartAngle && angle <= sliceEndAngle) {
        this.toggleSelect(d.id);
        break;
      }
    }
  }

  toggleSelect(id: string | null) {
    const fn = this.selectItem();
    if (fn) {
      if (this.selectedId() === id) {
        fn(null);
      } else {
        fn(id);
      }
    }
  }

  gradientStops = computed(() => {
    let cumulative = 0;
    const selId = this.selectedId();
    return this.data()
      .map((d) => {
        const start = cumulative;
        cumulative += d.percentage;
        const isSelected = !selId || selId === d.id;
        const color = isSelected ? d.hexColor : `${d.hexColor}20`; // 20 is ~12% opacity in hex
        return `${color} ${start}% ${cumulative}%`;
      })
      .join(', ');
  });
}
