import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { AppComponent } from '../../app.component';

@Component({
  selector: 'app-categories-tab',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categories-tab.component.html',
})
export class CategoriesTabComponent {
  parent = input.required<AppComponent>();
}
