# แก้ไข 413 Content Too Large บน Production

## ปัญหา
- **Localhost**: อัพโหลด PDF ใหญ่ได้ปกติ
- **Production** (ponghospital.moph.go.th): ได้ 413 และ HTML response แทน JSON
- **สาเหตุ**: nginx/web server บน production มี `client_max_body_size` ต่ำเกินไป ตัดคำขอก่อนถึง Node.js

## วิธีแก้ (ต้องทำบน server จริง)

### 1. แก้ nginx configuration

SSH เข้า server แล้วรันคำสั่ง:

```bash
# 1. ค้นหาไฟล์ config ที่ใช้
sudo nginx -T | grep -i "client_max_body_size"

# 2. แก้ไฟล์ nginx config (เช่น /etc/nginx/sites-available/default หรือ /etc/nginx/nginx.conf)
sudo nano /etc/nginx/sites-available/ponghospital
# หรือ
sudo nano /etc/nginx/nginx.conf
```

เพิ่มหรือแก้บรรทัดนี้ใน `server {}` block:

```nginx
server {
    listen 80;
    server_name ponghospital.moph.go.th;
    
    # เพิ่มบรรทัดนี้
    client_max_body_size 512M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # เพิ่มสำหรับ proxy ด้วย
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
```

ทดสอบและ reload nginx:

```bash
# ทดสอบ config
sudo nginx -t

# ถ้าผ่าน ให้ reload
sudo systemctl reload nginx
# หรือ
sudo service nginx reload
```

### 2. ถ้าใช้ Apache (แทน nginx)

แก้ไฟล์ `.htaccess` หรือ `httpd.conf`:

```apache
# เพิ่มใน VirtualHost
LimitRequestBody 536870912
# 512MB = 512 * 1024 * 1024 = 536870912 bytes
```

Restart Apache:
```bash
sudo systemctl restart apache2
# หรือ
sudo systemctl restart httpd
```

### 3. ถ้าใช้ cPanel/Plesk

1. เข้า **cPanel → Software → MultiPHP INI Editor**
2. เพิ่ม:
   ```
   upload_max_filesize = 512M
   post_max_size = 512M
   ```
3. เข้า **cPanel → Software → Apache & nginx Settings** (ถ้ามี)
4. เพิ่ม nginx directive:
   ```
   client_max_body_size 512M;
   ```

### 4. ตรวจสอบหลังแก้

ใช้ curl ทดสอบจาก local:

```bash
# Windows PowerShell
curl.exe -v -X POST "https://ponghospital.moph.go.th/api/announcements" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -F "payload={\"title\":\"test\",\"category\":\"ประชาสัมพันธ์\"}" `
  -F "file=@large-file.pdf"
```

ถ้ายังเจอ 413 ให้:
1. ตรวจสอบว่ามี reverse proxy หลายชั้น (CDN/Load Balancer)
2. ติดต่อผู้ดูแล server/hosting เพื่อเพิ่ม limit

## อ้างอิง

- [nginx client_max_body_size](http://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size)
- Code changes: `src/components/admin/AnnouncementForm.tsx` แสดง error message ที่ชัดเจนขึ้น
