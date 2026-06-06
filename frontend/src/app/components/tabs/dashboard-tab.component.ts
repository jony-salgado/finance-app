import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardResumoComponent } from '../card-resumo/card-resumo.component';
import { CardPizzaComponent } from '../card-pizza/card-pizza.component';
import { OpenFinanceButtonComponent } from '../open-finance-button/open-finance-button.component';
import type { AppComponent } from '../../app.component';

@Component({
  selector: 'app-dashboard-tab',
  standalone: true,
  imports: [CommonModule, CardResumoComponent, CardPizzaComponent, OpenFinanceButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-tab.component.html',
})
export class DashboardTabComponent {
  parent = input.required<AppComponent>();
}
