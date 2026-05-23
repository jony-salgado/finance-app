# App Core

This directory contains the main application component and its core parts.

## Structure
- `components/`: Reusable presentational components.
- `models/`: TypeScript interfaces for data structures.
- `services/`: Core application services.
- `app.component.ts/html`: Main layout and orchestration.

## Guidelines
- Keep `app.component.ts` focused on orchestration.
- Move complex business logic to `FinanceService`.
- Use `computed` for all derived view state.
