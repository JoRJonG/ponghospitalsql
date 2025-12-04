# ModSecurity Geo-blocking Setup Guide (Thailand Only)

## วิธีตั้งค่า Geo-blocking ใน ModSecurity

### สิ่งที่ต้อง

1. **Apache** with **ModSecurity (WAF)**
2. **mod_geoip2** หรือ **mod_geoip** (สำหรับ IP geolocation)
3. **GeoIP Database** (MaxMind GeoLite2 หรือ Legacy)

---

## ขั้นตอนการติดตั้ง

### 1. ติดตั้ง mod_geoip2 (ถ้ายังไม่มี)

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y libapache2-mod-geoip2 libmaxminddb0 libmaxminddb-dev mmdb-bin

# Enable module
sudo a2enmod geoip2
```

#### CentOS/RHEL:
```bash
sudo yum install -y mod_geoip2 GeoIP GeoIP-devel GeoIP-data
```

### 2. ดาวน์โหลด GeoIP Database

#### ตัวเลือก A: GeoIP2 (MaxMind - แนะนำ)
```bash
# สร้างโฟลเดอร์
sudo mkdir -p /usr/share/GeoIP

# ลงทะเบียนที่ MaxMind: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
# ดาวน์โหลด GeoLite2-Country

cd /usr/share/GeoIP
sudo wget -O GeoLite2-Country.tar.gz "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key=YOUR_LICENSE_KEY&suffix=tar.gz"
sudo tar -xzf GeoLite2-Country.tar.gz
sudo mv GeoLite2-Country_*/GeoLite2-Country.mmdb .
sudo rm -rf GeoLite2-Country_* *.tar.gz

# ตั้งสิทธิ์
sudo chmod 644 /usr/share/GeoIP/GeoLite2-Country.mmdb
```

#### ตัวเลือก B: GeoIP Legacy (ง่ายกว่า)
```bash
sudo apt-get install -y geoip-database

# หรือดาวน์โหลดตัวเอง
cd /usr/share/GeoIP
sudo wget https://dl.miyuru.lk/geoip/maxmind/country/maxmind.dat.gz
sudo gunzip maxmind.dat.gz
sudo mv maxmind.dat GeoIP.dat
```

### 3. ตั้งค่า Apache เพื่อใช้ GeoIP

แก้ไข `/etc/apache2/mods-available/geoip2.conf`:

```apache
<IfModule mod_geoip2.c>
    # ใช้ GeoIP2 database
    GeoIP2Enable On
    GeoIP2DBFile /usr/share/GeoIP/GeoLite2-Country.mmdb
    
    # หรือใช้ GeoIP Legacy
    # GeoIPEnable On
    # GeoIPDBFile /usr/share/GeoIP/GeoIP.dat
</IfModule>
```

### 4. ติดตั้ง ModSecurity Rules

#### วิธี A: ใช้ไฟล์ config ที่ให้ไว้

```bash
# คัดลอก rule file
sudo cp geo-blocking-rules.conf /etc/modsecurity/rules/

# Include ใน ModSecurity config
# แก้ไข /etc/modsecurity/modsecurity.conf หรือ /etc/apache2/mods-enabled/security.conf
```

เพิ่มบรรทัดนี้:
```apache
Include /etc/modsecurity/rules/geo-blocking-rules.conf
```

#### วิธี B: ใช้ Apache .htaccess (ง่ายกว่า)

สร้าง/แก้ไข `/var/www/ponghospital/.htaccess`:

```apache
# Enable GeoIP lookup (ต้องให้ mod_geoip2 เปิด)
<IfModule mod_geoip2.c>
    # บล็อก non-Thailand countries
    SetEnvIf GEOIP2_COUNTRY_CODE !^TH$ non_thailand_access
    
    # Allow all คนไทย, ปฏิเสธคนต่างประเทศ
    Order Allow,Deny
    Allow from all
    Deny from env=non_thailand_access
    
    # Custom error message
    ErrorDocument 403 "Access Denied: This service is only available in Thailand"
</IfModule>
```

### 5. ตั้งค่า WordPress/wp-admin

สร้าง `/var/www/ponghospital/wp-admin/.htaccess`:

```apache
<IfModule mod_geoip2.c>
    SetEnvIf GEOIP2_COUNTRY_CODE !^TH$ foreign_access
    
    Order Allow,Deny
    Allow from all
    Deny from env=foreign_access
</IfModule>

# WordPress standard rules (ถ้าไม่มี)
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    RewriteRule ^([_0-9a-zA-Z-]+/)?(wp-admin|wp-login\.php) $0 [L]
</IfModule>
```

### 6. ทดสอบและ Restart

```bash
# ทดสอบ Apache syntax
sudo apache2ctl configtest
# ผลลัพธ์ควรเป็น: Syntax OK

# Restart Apache
sudo systemctl restart apache2

# ตรวจสอบ status
sudo systemctl status apache2
```

### 7. ตรวจสอบ Logs

```bash
# ดู Apache error log
sudo tail -f /var/log/apache2/error.log

# ดู ModSecurity audit log
sudo tail -f /var/log/modsecurity/modsecurity_audit.log

# ดู GeoIP logs
sudo grep -i geoip /var/log/apache2/error.log
```

---

## ทดสอบ Geo-blocking

### ทดสอบจาก Localhost (ควรผ่าน)
```bash
curl http://localhost/wordpress/wp-admin/setup-config.php
# Expected: 200 OK
```

### ทดสอบด้วย VPN (ควรถูกบล็อก)
```bash
# เปิด VPN ไป US/Europe
curl http://ponghospital.moph.go.th/wordpress/wp-admin/setup-config.php
# Expected: 403 Forbidden
```

### ทดสอบด้วย curl + custom country header
```bash
# ถ้า ModSecurity ดูจาก header (อาจใช้ได้ในการ test)
curl -H "X-Country-Code: US" http://ponghospital.moph.go.th/api/activities
```

---

## Troubleshooting

### ปัญหา: Apache ไม่ start
```bash
# ตรวจสอบ error
sudo apache2ctl configtest

# ดู error log
sudo tail -100 /var/log/apache2/error.log
```

### ปัญหา: GeoIP module ไม่โหลด
```bash
# ตรวจสอบ module โหลดรึป
apache2ctl -M | grep geoip
# ควรเห็น: geoip2_module (shared)

# ถ้าไม่มี ให้ enable
sudo a2enmod geoip2
sudo systemctl restart apache2
```

### ปัญหา: Localhost ถูกบล็อก
```apache
# แก้ .htaccess เพิ่มข้อยกเว้น
SetEnvIf REMOTE_ADDR "^127\.0\.0\.1$" local_access
SetEnvIf GEOIP2_COUNTRY_CODE !^TH$ non_thailand_access

Order Allow,Deny
Allow from all
Allow from env=local_access
Deny from env=non_thailand_access
```

### ปัญหา: GeoIP Database ไม่หา IP
- Database อาจเก่า → update ใหม่
- IP range อาจเปลี่ยน → download database ใหม่ทุกสัปดาห์

```bash
# Auto-update cron job
sudo crontab -e

# เพิ่มบรรทัด:
0 2 * * 0 cd /usr/share/GeoIP && wget -q https://dl.miyuru.lk/geoip/maxmind/country/maxmind.dat.gz && gunzip -f maxmind.dat.gz
```

---

## ทางเลือกอื่น

### 1. ใช้ mod_authz_geoip (ถ้ามี)
```apache
<Location />
    AuthzGeoIPEnable On
    AuthzGeoIPDBFile /usr/share/GeoIP/GeoIP.dat
    Require geoip th
</Location>
```

### 2. ใช้ fail2ban + GeoIP
```bash
sudo apt-get install fail2ban geoip-bin

# Config: /etc/fail2ban/jail.local
# ตั้ง filter ด้วย geo-blocking rules
```

### 3. ใช้ HTTP 403 Custom Page

สร้าง `/var/www/ponghospital/403.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Access Denied</title>
    <style>
        body { font-family: Arial; text-align: center; margin-top: 50px; }
        .error { color: red; font-size: 24px; }
    </style>
</head>
<body>
    <div class="error">❌ Access Denied</div>
    <p>This service is only available in Thailand.</p>
    <p>If you are in Thailand and see this message, please contact support.</p>
</body>
</html>
```

เพิ่มใน `.htaccess`:
```apache
ErrorDocument 403 /403.html
```

---

## หมายเหตุสำคัญ

✅ **ข้อดี ModSecurity:**
- ทำงานที่ Apache level (ก่อน request ถึง application)
- ไม่ต้องแก้ code
- บล็อกได้ทุก path รวม WordPress, static files
- ตั้งค่าใน .htaccess ง่าย

❌ **ข้อเสีย:**
- ต้อง mod_geoip2 สำหรับแม่นยำ
- Database ต้อง update สม่ำเสมอ
- อาจช้าเล็กน้อยถ้า database ใหญ่ (แต่ไม่มากนัก)

---

## ปรึกษาทีม Hosting

ถ้าไม่แน่ใจ ขอถาม hosting:

> "สวัสดีครับ ผมอยากตั้งค่า geo-blocking ให้บล็อก IP ต่างประเทศทั้งหมด ดำเนินการได้ไหมครับ?"
>
> "หรือถ้าไม่ได้ ผมต้องให้ mod_geoip2 กับ GeoIP database ติดตั้งไหมครับ?"
>
> "และถ้าติดตั้งแล้ว ผมสามารถใช้ .htaccess สำหรับ geo-blocking ได้ไหมครับ?"
