# Vercel Deployment Guide

## Environment Variables ที่ต้องตั้งค่าใน Vercel Dashboard

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ponghospital
MONGODB_DBNAME=ponghospital
JWT_SECRET=your-super-secret-key-here
ADMIN_USER=admin
ADMIN_PASS=your-admin-password
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

## ขั้นตอนการ Deploy

1. **Push โค้ดไป GitHub**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **ไปที่ vercel.com**
   - Login ด้วย GitHub account
   - คลิก "Import Git Repository"
   - เลือก repository นี้

3. **ตั้งค่า Environment Variables**
   - ไปที่ Settings → Environment Variables
   - เพิ่มตัวแปรข้างบนทั้งหมด
   - ใส่ค่าจริงแทนตัวอย่าง

4. **Deploy**
   - คลิก Deploy
   - รอประมาณ 2-3 นาที

## หมายเหตุสำคัญ

- **MongoDB**: ใช้ MongoDB Atlas (cloud) เท่านั้น
- **Cloudinary**: ตั้งค่า account สำหรับ upload ไฟล์
- **Domain**: Vercel จะให้ domain ฟรี (*.vercel.app)
- **Custom Domain**: สามารถเชื่อม domain ของตัวเองได้

## Troubleshooting

หากมีปัญหา:
1. ดู Logs ใน Vercel Dashboard
2. ตรวจสอบ Environment Variables
3. ตรวจสอบ MongoDB connection string

## Plesk Node.js Hosting Deployment Guide

### สำหรับการ Deploy บน Plesk (เช่น Hostatom)

#### ขั้นตอนการตั้งค่า

1. **อัปโหลดไฟล์ไป Server**
   - Upload โฟลเดอร์ทั้งหมดไปยัง Document Root ของ domain
   - หรือใช้ Git deployment หาก Plesk รองรับ

2. **ติดตั้ง Dependencies**
   ```bash
   npm install --production
   ```

3. **Build Frontend**
   ```bash
   npm run build
   ```

4. **ตั้งค่า Environment Variables ใน Plesk**
   - เข้า Plesk Control Panel
   - ไปที่ Websites & Domains → [domain] → Node.js
   - ตั้งค่า Environment Variables:
     ```
     NODE_ENV=plesk
     PORT=<port ที่ Plesk กำหนด>
     DB_HOST=<MySQL host>
     DB_USER=<MySQL username>
     DB_PASS=<MySQL password>
     DB_NAME=<database name>
     JWT_SECRET=<your-jwt-secret>
     CLOUDINARY_URL=<cloudinary-url>
     ```

5. **ตั้งค่า Node.js Application**
   - Application Root: `/server`
   - Application Startup File: `index.js`
   - Node.js Version: เลือก version ล่าสุดที่รองรับ ES modules

6. **ตั้งค่า Database**
   - สร้าง MySQL database ใน Plesk
   - Import schema จาก `database/setup_mysql.sql`
   - รัน migration scripts หากจำเป็น

7. **ตั้งค่า SSL Certificate**
   - ใน Plesk: Websites & Domains → [domain] → SSL/TLS Certificates
   - Issue Let's Encrypt certificate สำหรับ domain

8. **Restart Application**
   - ใน Plesk Node.js settings คลิก Restart App

#### หมายเหตุสำหรับ Plesk

- **HTTPS**: Plesk จะจัดการ SSL/TLS ให้อัตโนมัติ ไม่ต้องตั้งค่าในโค้ด
- **Port**: ใช้ port ที่ Plesk กำหนด (ปกติจะเป็น environment variable `PORT`)
- **Proxy**: Plesk จะ proxy requests ไปยัง Node.js app อัตโนมัติ
- **Static Files**: ไฟล์ static จะถูก serve โดย Plesk web server

#### Troubleshooting Plesk

- ตรวจสอบ Node.js logs ใน Plesk dashboard
- ตรวจสอบว่า environment variables ถูกตั้งค่าถูกต้อง
- ตรวจสอบ database connection
- ตรวจสอบว่า build files อยู่ใน `dist/` folder

## Local Development

สำหรับ development ในเครื่อง ยังใช้คำสั่งเดิม:
```bash
npm run dev
```