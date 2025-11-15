# Nginx Geo-blocking Setup Guide

## การติดตั้ง GeoIP2 Module สำหรับ nginx

### 1. ติดตั้ง nginx module และ GeoIP2 dependencies

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y nginx-module-geoip2 libmaxminddb0 libmaxminddb-dev mmdb-bin

# หรือถ้า module ไม่มีใน repo ให้ compile nginx ใหม่พร้อม module
# (ดูวิธีการที่: https://github.com/leev/ngx_http_geoip2_module)
```

### 2. ดาวน์โหลด GeoLite2 Database

```bash
# สร้างโฟลเดอร์สำหรับ GeoIP database
sudo mkdir -p /usr/share/GeoIP

# ดาวน์โหลด GeoLite2-Country database (ต้องลงทะเบียนที่ MaxMind ก่อน)
# ไปที่: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
# หรือใช้ script auto-update:

cd /usr/share/GeoIP
sudo wget -O GeoLite2-Country.tar.gz "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key=YOUR_LICENSE_KEY&suffix=tar.gz"
sudo tar -xzf GeoLite2-Country.tar.gz --strip-components=1
sudo mv GeoLite2-Country.mmdb .
sudo rm -rf GeoLite2-Country_*
```

### 3. แก้ไข nginx.conf เพื่อ load module

แก้ไขไฟล์ `/etc/nginx/nginx.conf` เพิ่มบรรทัดนี้ที่ด้านบนสุด (ก่อน `http {`):

```nginx
load_module modules/ngx_http_geoip2_module.so;

http {
    # ...existing config...
}
```

### 4. คัดลอกไฟล์ geo-blocking config

```bash
# คัดลอก geo-blocking.conf ไปที่ nginx config directory
sudo cp geo-blocking.conf /etc/nginx/geo-blocking.conf

# แทนที่ default.conf ด้วย config ที่มี geo-blocking
sudo cp default-with-geoblocking.conf /etc/nginx/conf.d/default.conf
# หรือ
sudo cp default-with-geoblocking.conf /etc/nginx/sites-available/default
sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
```

### 5. ทดสอบและ restart nginx

```bash
# ทดสอบ config
sudo nginx -t

# ถ้าผ่านให้ restart
sudo systemctl restart nginx

# ตรวจสอบ status
sudo systemctl status nginx
```

### 6. ทดสอบ geo-blocking

```bash
# ทดสอบจาก localhost (ควรผ่าน)
curl http://localhost/api/health

# ทดสอบจาก IP ต่างประเทศด้วย proxy หรือ VPN (ควรถูกบล็อก)
curl http://your-domain.com/api/health
# Expected: {"error":"Access denied",...}
```

## การ Auto-update GeoIP Database

สร้าง cron job สำหรับ update database อัตโนมัติ:

```bash
# สร้างไฟล์ /etc/cron.weekly/update-geoip
sudo nano /etc/cron.weekly/update-geoip
```

เพิ่มเนื้อหา:

```bash
#!/bin/bash
cd /usr/share/GeoIP
wget -O GeoLite2-Country.tar.gz "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key=YOUR_LICENSE_KEY&suffix=tar.gz"
tar -xzf GeoLite2-Country.tar.gz --strip-components=1
mv GeoLite2-Country.mmdb .
rm -rf GeoLite2-Country_* GeoLite2-Country.tar.gz
nginx -s reload
```

```bash
# ให้สิทธิ์ execute
sudo chmod +x /etc/cron.weekly/update-geoip
```

## ทางเลือกอื่น: ใช้ GeoIP Legacy (ถ้า GeoIP2 ใช้ไม่ได้)

หากไม่สามารถติดตั้ง GeoIP2 ได้ สามารถใช้ GeoIP Legacy แทน:

```nginx
# ใน nginx.conf (http block)
geoip_country /usr/share/GeoIP/GeoIP.dat;

# ใน server block
map $geoip_country_code $allowed_country {
    default no;
    TH yes;
}

if ($allowed_country = no) {
    return 403;
}
```

ติดตั้ง GeoIP Legacy:

```bash
sudo apt-get install nginx-module-geoip geoip-database
sudo mkdir -p /usr/share/GeoIP
cd /usr/share/GeoIP
sudo wget https://dl.miyuru.lk/geoip/maxmind/country/maxmind.dat.gz
sudo gunzip maxmind.dat.gz
sudo mv maxmind.dat GeoIP.dat
```

## Troubleshooting

### ถ้า nginx ไม่ start

```bash
# ดู error log
sudo tail -f /var/log/nginx/error.log

# ตรวจสอบ syntax
sudo nginx -t
```

### ถ้าไม่มี module geoip2

- Compile nginx ใหม่พร้อม module: https://github.com/leev/ngx_http_geoip2_module
- หรือใช้ GeoIP Legacy แทน (วิธีด้านบน)
- หรือใช้แค่ Node.js geo-blocking (จะบล็อกเฉพาะ API route เท่านั้น)

### ถ้า localhost ถูกบล็อก

เพิ่ม IP ใน whitelist ในไฟล์ `geo-blocking.conf`:

```nginx
geo $whitelist_ip {
    default 0;
    127.0.0.1 1;
    ::1 1;
    YOUR_SERVER_IP 1;  # เพิ่มบรรทัดนี้
}
```

## หมายเหตุ

- **GeoIP2 แม่นยำกว่า** และรองรับ IPv6 ได้ดี แนะนำให้ใช้
- **Database ต้อง update สม่ำเสมอ** เพราะ IP range เปลี่ยนแปลงอยู่เสมอ
- **Fail-open approach**: ถ้า detect ไม่ได้จะให้ผ่าน (สามารถเปลี่ยนเป็น fail-close ได้)
- **Node.js geo-blocking ยังทำงานอยู่**: เป็น backup layer ถ้า nginx ไม่บล็อก
