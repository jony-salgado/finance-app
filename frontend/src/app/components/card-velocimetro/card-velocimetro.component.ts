import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-velocimetro',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-between min-h-[320px]"
    >
      <div class="w-full flex justify-between items-center mb-4">
        <span class="text-slate-500 font-bold text-sm tracking-wide uppercase"
          >Weekly Spending Goal</span
        >
        <span
          class="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border"
          [class]="statusClass()"
        >
          {{ statusLabel() }}
        </span>
      </div>

      <div class="relative w-full flex flex-col items-center justify-center py-2">
        <svg viewBox="0 0 240 140" class="w-full max-w-[260px]">
          <!-- Background arc -->
          <path
            d="M 20 130 A 100 100 0 0 1 220 130"
            fill="none"
            stroke="#f1f5f9"
            stroke-width="18"
            stroke-linecap="round"
          />

          <!-- Colored track (Green/Amber/Red based on status) -->
          <path
            d="M 20 130 A 100 100 0 0 1 220 130"
            fill="none"
            [attr.stroke]="gaugeColor()"
            stroke-width="18"
            stroke-linecap="round"
            stroke-dasharray="314.16"
            [attr.stroke-dashoffset]="dashOffset()"
            style="transition: stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease;"
          />

          <!-- Needle -->
          <line
            x1="120"
            y1="130"
            x2="120"
            y2="45"
            [attr.stroke]="needleColor()"
            stroke-width="5"
            stroke-linecap="round"
            [style.transform]="'rotate(' + needleAngle() + 'deg)'"
            style="transform-origin: 120px 130px; transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);"
          />

          <!-- Center cap -->
          <circle cx="120" cy="130" r="10" [attr.fill]="needleColor()" />
          <circle cx="120" cy="130" r="5" fill="#ffffff" />
        </svg>

        <!-- Under-gauge details -->
        <div class="text-center mt-2">
          <p class="text-3xl font-black text-slate-800">{{ percentLabel() }}</p>
          <p class="text-slate-400 text-xs mt-1 font-medium">of weekly budget used</p>
        </div>
      </div>

      <div
        class="w-full border-t border-slate-100 pt-4 mt-2 flex justify-between text-xs text-slate-500"
      >
        <div class="flex flex-col">
          <span class="text-slate-400 font-medium">Spent so far</span>
          <span class="text-sm font-bold text-slate-700">{{ format(current()) }}</span>
        </div>
        <div class="flex flex-col items-end">
          <span class="text-slate-400 font-medium">Weekly Goal</span>
          <span class="text-sm font-bold text-slate-700">{{ format(goal()) }}</span>
        </div>
      </div>
    </div>
  `,
})
export class CardVelocimetroComponent {
  goal = input<number>(500);
  current = input<number>(0);

  percentage = computed(() => {
    const g = this.goal() || 1;
    return this.current() / g;
  });

  percentLabel = computed(() => {
    return `${Math.round(this.percentage() * 100)}%`;
  });

  needleAngle = computed(() => {
    // 0% -> -90 deg
    // 100% -> +90 deg
    // Cap at 115% so needle doesn't spin too far
    const pct = Math.min(this.percentage(), 1.15);
    return -90 + pct * 180;
  });

  dashOffset = computed(() => {
    // Arc length is 314.16 (PI * radius, where radius is 100)
    const arcLength = 314.16;
    const pct = Math.min(this.percentage(), 1.0); // progress bar caps at 100%
    return arcLength * (1 - pct);
  });

  status = computed(() => {
    const pct = this.percentage();
    if (pct <= 0.7) return 'under';
    if (pct <= 1.0) return 'warning';
    return 'over';
  });

  statusLabel = computed(() => {
    const s = this.status();
    if (s === 'under') return 'On Target';
    if (s === 'warning') return 'Warning';
    return 'Budget Exceeded';
  });

  statusClass = computed(() => {
    const s = this.status();
    if (s === 'under') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (s === 'warning') return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-rose-50 text-rose-700 border-rose-100';
  });

  gaugeColor = computed(() => {
    const s = this.status();
    if (s === 'under') return '#10b981'; // Emerald 500
    if (s === 'warning') return '#f59e0b'; // Amber 500
    return '#f43f5e'; // Rose 500
  });

  needleColor = computed(() => {
    const s = this.status();
    if (s === 'under') return '#0f766e'; // Teal 700
    if (s === 'warning') return '#b45309'; // Amber 700
    return '#be123c'; // Rose 700
  });

  format(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      value || 0,
    );
  }
}
