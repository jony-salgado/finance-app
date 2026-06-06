import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrivacyService } from '../../services/privacy.service';

@Component({
  selector: 'app-privacy-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy-button.component.html',
})
export class PrivacyButtonComponent {
  privacyService = inject(PrivacyService);
}
