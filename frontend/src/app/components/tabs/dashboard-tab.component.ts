import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardResumoComponent } from '../card-resumo/card-resumo.component';
import { CardPizzaComponent } from '../card-pizza/card-pizza.component';
import { OpenFinanceButtonComponent } from '../open-finance-button/open-finance-button.component';
import { PrivacyService } from '../../services/privacy.service';
import type { DashboardComponent } from '../dashboard/dashboard.component';

@Component({
  selector: 'app-dashboard-tab',
  standalone: true,
  imports: [CommonModule, CardResumoComponent, CardPizzaComponent, OpenFinanceButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-tab.component.html',
})
export class DashboardTabComponent {
  parent = input.required<DashboardComponent>();
  privacyService = inject(PrivacyService);
}
