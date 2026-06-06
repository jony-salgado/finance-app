# ========================================================
# Stage 1: Build the Angular Frontend
# ========================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy dependency configuration files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the frontend source code
COPY frontend/ ./

# Build the Angular application and guarantee a 'browser' subfolder exists in output
RUN npm run build && \
    if [ ! -d "dist/finance-app/browser" ]; then \
      mkdir -p dist/finance-app/browser_temp && \
      mv dist/finance-app/* dist/finance-app/browser_temp/ || true && \
      mv dist/finance-app/browser_temp dist/finance-app/browser; \
    fi

# ========================================================
# Stage 2: Build the FastAPI Backend & Serve Frontend
# ========================================================
FROM python:3.11-slim AS final-runner

WORKDIR /app

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend application files
COPY backend/ ./backend/

# Explicitly create target static files directory in container
RUN mkdir -p /app/backend/static

# Copy built Angular files from Stage 1 into the backend's static directory
COPY --from=frontend-builder /app/frontend/dist/finance-app/browser/ /app/backend/static/

ENV PYTHONPATH=/app/backend

# Set working directory to the backend folder to run uvicorn directly
WORKDIR /app/backend

# Expose default port (Uvicorn)
EXPOSE 10000

# Run uvicorn server, binding to the PORT environment variable provided by Render (defaulting to 10000)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
