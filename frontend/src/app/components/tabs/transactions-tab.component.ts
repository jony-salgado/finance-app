import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { DashboardComponent } from '../dashboard/dashboard.component';

@Component({
  selector: 'app-transactions-tab',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transactions-tab.component.html',
})
export class TransactionsTabComponent {
  parent = input.required<DashboardComponent>();
}
