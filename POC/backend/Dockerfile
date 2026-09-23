FROM python:3.10-slim

WORKDIR /app

# Cài đặt curl để hỗ trợ healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Tạo sẵn các thư mục data và static
RUN mkdir -p /app/data /app/static/audio /app/static/qr /app/static/images

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
