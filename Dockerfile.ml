# ML prediction service (Flask RF+LSTM ensemble) — production image
FROM python:3.11-slim

WORKDIR /app

# Install Python deps first so layer caching survives source edits
COPY ml-model/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ml-model/ .

EXPOSE 5001

# gunicorn (pinned in requirements.txt for production/Docker) — stream_data.py
# is started separately via the docker-compose simulator service override.
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "1", "--timeout", "120", "app:app"]
