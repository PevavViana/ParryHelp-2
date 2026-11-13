FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_DEBUG=False

WORKDIR /app
COPY backend/requirements.txt deploy/requirements-production.txt /app/deploy/
RUN pip install --no-cache-dir -r deploy/requirements.txt -r deploy/requirements-production.txt

COPY backend/ /app/backend/
COPY frontend/ /app/frontend/
RUN mkdir -p /app/backend/instance

CMD ["sh", "-c", "exec gunicorn --chdir backend --bind 0.0.0.0:${PORT:-8080} --workers 1 --threads 4 --timeout 120 --access-logfile - --error-logfile - wsgi:application"]
