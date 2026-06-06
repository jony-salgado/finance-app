import { isDevMode } from '@angular/core';

let dev = true;
try {
  dev = isDevMode();
} catch (e) {
  // Fallback if isDevMode is not defined or mocked in testing environments
}

export const environment = {
  production: !dev,
  redirectUrl: !dev
    ? 'https://salgado-finance-app.com.br/login'
    : 'http://localhost:4200/login',
};
