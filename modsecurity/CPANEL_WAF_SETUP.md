# ModSecurity Geo-blocking Setup for cPanel WAF (ภาษาไทย)

## ขั้นตอนการตั้งค่า Geo-blocking ใน cPanel ModSecurity WAF

### ที่ 1: ตรวจสอบว่า ModSecurity มีแล้ว

จากรูป: **Web application firewall mode = On** ✅

---

### ที่ 2: ใช้ Custom Rules ใน cPanel

#### วิธีที่ 1: ผ่าน cPanel UI (ง่ายที่สุด)

1. เข้า cPanel → **Home**
2. ไปที่ **Websites & Domains** → **phayaohub.com**
3. ไปที่ **Web Application Firewall**
4. ในส่วน **Switch off security rules** → **Regular expressions in rule messages**

   เพิ่ม rule นี้:
   ```
   GEO:COUNTRY_CODE != "TH" action:deny status:403 msg:'Access Denied - Thailand Only'
   ```

5. Click **OK** และ **Apply**

#### วิธีที่ 2: Upload Rules File (ถ้า hosting อนุญาต)

```bash
# SSH เข้า server (ถ้ามีสิทธิ์)
scp geo-blocking-thailand.conf user@server:/tmp/

# คัดลอกไป modsecurity rules directory
sudo cp /tmp/geo-blocking-thailand.conf /etc/modsecurity/rules/

# Edit ModSecurity config เพื่อ include
sudo nano /etc/modsecurity/modsecurity.conf
# เพิ่มบรรทัด:
# Include /etc/modsecurity/rules/geo-blocking-thailand.conf

# Restart Apache
sudo systemctl restart apache2
```

#### วิธีที่ 3: Edit via .htaccess (ถ้า AllowOverride สูง)

สร้าง `/public_html/.htaccess`:

```apache
# ModSecurity Custom Rules
<IfModule mod_security.c>
    # Block non-Thailand
    SecRule GEO:COUNTRY_CODE "!^(TH|)$" \
        "id:1001,deny,status:403,msg:'Access denied - Thailand only'"
</IfModule>
```

---

### ที่ 3: วิธีที่ง่ายที่สุด - ใช้ cPanel UI ตรง ๆ

1. **Log in to cPanel**
2. **Websites & Domains** → เลือก **phayaohub.com**
3. **Web Application Firewall (WAF)** → **Detection only** หรือ **On**
4. ในส่วน **Custom rule set running on Apache (ModSecurity 2.9)**
5. ใส่ Security rule IDs:
   ```
   1001
   ```

6. Apply

---

### ที่ 4: Test Geo-blocking

```bash
# ทดสอบจาก localhost (ควรผ่าน)
curl -I http://localhost/

# ทดสอบจาก foreign IP ด้วย VPN
# (ควรเห็น 403 Forbidden หรือ Access Denied)
curl -I https://phayaohub.com/
```

---

## ทางเลือก: ใช้ IP Whitelist/Blacklist

ถ้า geo-blocking ใช้ไม่ได้ ใช้ IP blocking โดยตรง:

### Block Specific Countries ด้วย IP List

1. cPanel → **Websites & Domains** → **phayaohub.com**
2. **IP Whitelist** หรือ **Firewall Rules**
3. Add IPs ที่ต้องการบล็อก (เช่น 37.159.25.38)

---

## ถ้ายังเข้ามาได้

### ปัญหา 1: ModSecurity rules ไม่ activate

**แก้ไข:**
- ตรวจสอบว่า Web Application Firewall mode = **On** (ไม่ใช่ Off)
- ถ้า Off ให้เปลี่ยนเป็น **On** หรือ **Detection only**

### ปัญหา 2: GEO:COUNTRY_CODE ไม่ทำงาน

**แก้ไข:**
- ขอให้ hosting ติดตั้ง **MaxMind GeoIP library** ให้ ModSecurity
- หรือใช้ `mod_geoip2` ตรงกับ Apache

### ปัญหา 3: ไม่รู้ว่าควร Set ID อะไร

**แก้ไข:**
- ใช้ Rule ID: `1001` (geo-blocking rule)
- หรือ Upload file `geo-blocking-thailand.conf` เสียดายว่า:
  ```
  id:1001 = Geo-blocking main rule
  id:1002 = Private IP exception
  ```

---

## ตรวจสอบว่าทำงานหรือไม่

1. ดู **Error Log File** ใน cPanel WAF
2. ลองเข้าจาก VPN ต่างประเทศ ดูว่าเห็น **403** หรือ **Access Denied**
3. ดู ModSecurity audit log:
   ```
   /var/log/modsecurity/modsecurity_audit.log
   ```

---

## ไฟล์ที่ใช้ได้

- **geo-blocking-thailand.conf** - ModSecurity rule ready to use
- **CPANEL_QUICK_START.md** - คู่มือ .htaccess
- **MODSECURITY_SETUP.md** - คู่มือเต็ม (Linux server)

---

## สรุปขั้นตอนด่วน

1. ✅ ModSecurity WAF = On
2. ⬜ เพิ่ม Custom Rule ใน cPanel:
   ```
   GEO:COUNTRY_CODE != "TH"
   ```
3. ⬜ Test ด้วย VPN/Proxy ต่างประเทศ
4. ⬜ ถ้ายังเข้าได้ → ขอ hosting ติดตั้ง GeoIP library

---

## ถ้ายังไม่ได้ ให้ลองทางเลือกอื่น

### Plan B: ใช้ Cloudflare
- ไม่ต้องแก้ cPanel
- ตั้งค่าที่ Cloudflare Firewall Rules
- บล็อกได้ก่อนถึง server

### Plan C: ใช้ Node.js geo-blocking
- Express middleware ที่สร้างไว้แล้ว
- บล็อกเฉพาะ API route เท่านั้น
- ต้องให้ทุก request ผ่าน Node.js

---

## ต้องการความช่วยเหลือเพิ่มเติม?

ถามให้ชัด:
1. cPanel WAF mode ปัจจุบัน = On หรือ Detection only?
2. Custom rule ตั้งไว้ไหม?
3. ยังเห็น IP ต่างประเทศเข้า /assets และ / ไหม?
4. ModSecurity error log แสดงอะไร?
