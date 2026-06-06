import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardVelocimetroComponent } from '../card-velocimetro/card-velocimetro.component';
import type { DashboardComponent } from '../dashboard/dashboard.component';

@Component({
  selector: 'app-meta-tab',
  standalone: true,
  imports: [CommonModule, CardVelocimetroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meta-tab.component.html',
})
export class MetaTabComponent {
  parent = input.required<DashboardComponent>();
}
