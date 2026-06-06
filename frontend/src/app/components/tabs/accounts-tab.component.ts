import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { AppComponent } from '../../app.component';

@Component({
  selector: 'app-accounts-tab',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounts-tab.component.html',
})
export class AccountsTabComponent {
  parent = input.required<AppComponent>();
}
