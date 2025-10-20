TLS test setup for nginx reverse proxy

1. Generate self-signed certs (for testing only):

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/server.key \
  -out nginx/ssl/server.crt \
  -subj "/C=TH/ST=ChiangMai/L=ChiangMai/O=Test/OU=Dev/CN=54.179.183.29"
```

2. Start services:

```bash
docker compose up -d --build
```

3. Visit https://54.179.183.29 (browser will warn for self-signed cert)

Notes:
- For real production TLS use ACM+ALB or a real CA-signed cert.
- This setup is for short-lived testing only.
