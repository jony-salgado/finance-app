# FinanceApp

A modern finance management application with a focus on ease of use and visual clarity.

## Project Structure

- `frontend/`: Angular 17 application with Tailwind CSS.
- `backend/`: FastAPI application (Python).
- `scripts/`: Helper scripts for local development.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### Installation

1.  **Frontend:**
    ```bash
    cd frontend
    npm install
    ```

2.  **Backend:**
    ```bash
    cd backend
    pip install -r requirements.txt
    ```

### Running Locally

You can use the provided script:
```bash
./scripts/run_local.sh
```

## Testing

### Backend (Python FastAPI)
To run the Python backend test suite, navigate to the `backend/` directory and run:
```bash
cd backend
PYTHONPATH=. pytest
```

### Frontend (Angular 17 / Jest)
To run the TypeScript frontend unit tests, navigate to the `frontend/` directory and run:
```bash
cd frontend
npm run test
```

## Code Formatting

Standard code formatters have been set up for both backend and frontend.

### Backend (Black)
To automatically format the Python files:
```bash
cd backend
black .
```

### Frontend (Prettier)
To automatically format the TypeScript files:
```bash
cd frontend
npm run format
```

## Technologies Used

- **Frontend:** Angular 17, Tailwind CSS, Phosphor Icons, Jest (testing).
- **Backend:** FastAPI, Pydantic, Pytest (testing), Black (formatting).
