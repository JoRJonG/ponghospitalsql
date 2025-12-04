# ตั้งค่า Geo-blocking ด้วย ModSecurity (cPanel)
# ใช้ .htaccess ใน root directory หรือ wp-admin directory

## วิธีที่ 1: ใช้ .htaccess ที่ /public_html/

สร้างหรือแก้ไข `.htaccess` ใน `/public_html/`:

```apache
# Geo-blocking: Block all non-Thailand countries
<IfModule mod_geoip2.c>
    # บล็อก IP ที่ไม่ใช่ไทย
    SetEnvIf GEOIP2_COUNTRY_CODE !^TH$ BlockedCountry
    
    # ให้ผ่านคนไทย ปฏิเสธคนต่างประเทศ
    Order Allow,Deny
    Allow from all
    Deny from env=BlockedCountry
</IfModule>

# Keep existing WordPress rules below:
# ... your existing .htaccess content ...
```

---

## วิธีที่ 2: ตั้งค่า wp-admin เท่านั้น

สร้างหรือแก้ไข `/public_html/wp-admin/.htaccess`:

```apache
# Geo-blocking for wp-admin only
<IfModule mod_geoip2.c>
    SetEnvIf GEOIP2_COUNTRY_CODE !^TH$ BlockedCountry
    
    Order Allow,Deny
    Allow from all
    Deny from env=BlockedCountry
    
    ErrorDocument 403 "Access Denied: wp-admin is only available in Thailand"
</IfModule>

# WordPress standard rules
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    RewriteRule ^index\.php$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.php [L]
</IfModule>
```

---

## วิธีที่ 3: Block WordPress + API

```apache
# Block non-Thailand for /wordpress, /wp-admin, and /api
<IfModule mod_geoip2.c>
    # สำหรับ WordPress
    <Location ~ "^/(wordpress|wp-admin|wp-login\.php)">
        SetEnvIf GEOIP2_COUNTRY_CODE !^TH$ BlockedCountry
        Order Allow,Deny
        Allow from all
        Deny from env=BlockedCountry
    </Location>
    
    # สำหรับ API
    <Location ~ "^/api">
        SetEnvIf GEOIP2_COUNTRY_CODE !^TH$ BlockedCountry
        Order Allow,Deny
        Allow from all
        Deny from env=BlockedCountry
    </Location>
</IfModule>
```

---

## ตรวจสอบว่า mod_geoip2 เปิดใช้แล้ว

### วิธี 1: ผ่าน cPanel

1. เข้า **cPanel** → **Home**
2. ไปที่ **Software** → **EasyApache 4**
3. หรือ **Apache Modules**
4. ค้นหา **geoip2** หรือ **mod_geoip**
5. ถ้ายังไม่มี ขอให้ hosting ติดตั้ง

### วิธี 2: ผ่าน SSH

```bash
# ตรวจสอบว่า module เปิด
apache2ctl -M | grep geoip

# ถ้าไม่มี ให้ enable (ถ้ามีสิทธิ์)
sudo a2enmod geoip2
sudo systemctl restart apache2
```

---

## ถ้า mod_geoip2 ไม่สามารถใช้ได้

ถ้า hosting ไม่มี mod_geoip2 หรือ GeoIP database ให้ใช้ Node.js geo-blocking แทน

ลำดับการทำงาน:
1. **ถ้า hosting มี mod_geoip2** → ใช้ .htaccess (วิธีนี้)
2. **ถ้าไม่มี** → ใช้ Node.js + geoip-lite (middleware ที่สร้างไว้แล้ว)
3. **ถ้าต้องการบล็อกทุก path** → ใช้ Cloudflare (บล็อกที่ CDN level)

---

## คำถามบ่อย ๆ

**Q: ทำไมยังเข้า /wordpress ได้?**  
A: Hosting ยังไม่มี mod_geoip2 หรือ GeoIP database ติดตั้ง ต้องขอ hosting ติดตั้ง

**Q: ทดสอบ .htaccess ที่ไหน?**  
A: ใช้ VPN/Proxy ต่างประเทศ และลอง `curl https://ponghospital.moph.go.th/wordpress/wp-admin/`

**Q: localhost ถูกบล็อกตรงไหน?**  
A: ไม่ควรโดยปกติ ถ้าถูก ให้เพิ่ม:
```apache
SetEnvIf REMOTE_ADDR "^127\.0\.0\.1$" LocalhostAccess
```

**Q: ต้องแจ้ง hosting ไหนบ้าง?**  
A: ขอให้ติดตั้ง:
- mod_geoip2 (Apache module)
- GeoIP Database (MaxMind GeoLite2 หรือ legacy)
- หรืออนุญาตให้ใช้ .htaccess กับ GEOIP2_COUNTRY_CODE

---

## ไฟล์ที่จำเป็น

- **geo-blocking-rules.conf** - ModSecurity rules (ถ้าใช้ custom rules)
- **.htaccess** - ตั้งค่าใน /public_html และ /public_html/wp-admin
- **MODSECURITY_SETUP.md** - คู่มือติดตั้งเต็ม

---

## การตรวจสอบว่าทำงาน

```bash
# ถ้า hosting ให้ SSH access:

# ตรวจสอบ mod_geoip2
apache2ctl -M | grep geoip

# ตรวจสอบ GeoIP database
ls -lh /usr/share/GeoIP/

# ทดสอบจาก local machine ด้วย curl
curl -I https://ponghospital.moph.go.th/wordpress/wp-admin/

# ดู Apache error log
tail -f /var/log/apache2/error.log
```
