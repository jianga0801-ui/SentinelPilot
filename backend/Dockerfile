FROM python:3.11-slim

WORKDIR /app

# Install backend dependencies
COPY backend/pyproject.toml backend/
RUN pip install --no-cache-dir ./backend

# Copy the backend code
COPY backend/ ./backend/

# Copy the sample data, knowledge base, and evals datasets required by the MockAlertSource
COPY examples/ ./examples/
COPY knowledge_base/ ./knowledge_base/
COPY evals/ ./evals/

# Set working directory to backend so uvicorn runs correctly
WORKDIR /app/backend

ENV PYTHONPATH=/app/backend
EXPOSE 8000

CMD ["uvicorn", "sentinel_pilot.main:app", "--host", "0.0.0.0", "--port", "8000"]
