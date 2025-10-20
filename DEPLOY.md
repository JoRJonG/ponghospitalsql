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

## Local Development

สำหรับ development ในเครื่อง ยังใช้คำสั่งเดิม:
```bash
npm run dev
```