import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OpenFinanceButtonComponent } from '../open-finance-button/open-finance-button.component';
import type { DashboardComponent } from '../dashboard/dashboard.component';

@Component({
  selector: 'app-cards-tab',
  standalone: true,
  imports: [CommonModule, OpenFinanceButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cards-tab.component.html',
})
export class CardsTabComponent {
  parent = input.required<DashboardComponent>();
}
