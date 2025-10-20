# การเปลี่ยนแปลงจาก MongoDB + Cloudinary → MySQL + BLOB Storage

## สรุปการเปลี่ยนแปลง (Updated: 2025-10-03)

### ✅ สิ่งที่ลบออก
- ❌ MongoDB (ไม่ใช้แล้ว)
- ❌ Cloudinary (ไม่ใช้แล้ว)  
- ❌ SQLite (ไม่ใช้แล้ว)
- ❌ `/api/uploads` route (ไม่ต้องอัปโหลดไป Cloudinary)
- ❌ `server/cloudinary.js`
- ❌ `server/routes/uploads.js`
- ❌ `server/database_sqlite.js`
- ❌ `server/app.js` (ใช้ app_mysql.js แทน)
- ❌ MongoDB models ทั้งหมด (`server/models/*.js`)
- ❌ Dependencies: `cloudinary`, `better-sqlite3`

### ✅ สิ่งที่เพิ่ม/เปลี่ยนแปลง

#### Backend
- ✅ ใช้ MySQL เป็น database หลัก
- ✅ เก็บรูปภาพเป็น BLOB ใน MySQL
- ✅ Models ใหม่:
  - `ActivityBlob.js` - กิจกรรมพร้อมรูป BLOB
  - `SlideBlob.js` - สไลด์พร้อมรูป BLOB  
  - `UnitBlob.js` - หน่วยงานพร้อมรูป BLOB
  - `Announcement.js` - ประกาศพร้อมไฟล์แนบ BLOB
- ✅ Routes รองรับ multipart/form-data
- ✅ Backend ดาวน์โหลดรูปจาก URL ภายนอก (แก้ปัญหา CORS)
- ✅ Serve รูปภาพผ่าน `/api/images/*`

#### Frontend
- ✅ ส่งข้อมูลแบบ FormData แทน JSON
- ✅ รองรับ:
  1. อัปโหลดรูปจากเครื่อง
  2. วาง URL รูปภายนอก (backend จะ download)
  3. ผสมทั้งสองวิธี

#### Database Schema
```sql
-- Activities
CREATE TABLE activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  description TEXT,
  ...
);

CREATE TABLE activity_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  activity_id INT,
  image_data LONGBLOB,  -- เก็บรูปเป็น BLOB
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INT,
  display_order INT,
  FOREIGN KEY (activity_id) REFERENCES activities(id)
);

-- Slides
CREATE TABLE slides (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  caption TEXT,
  alt VARCHAR(255),
  href VARCHAR(500),
  image_data LONGBLOB,  -- เก็บรูปเป็น BLOB
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  ...
);

-- Units
CREATE TABLE units (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  href VARCHAR(500),
  image_data LONGBLOB,  -- เก็บรูปเป็น BLOB
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  ...
);

-- Announcements
CREATE TABLE announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  content TEXT,
  ...
);

CREATE TABLE announcement_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  announcement_id INT,
  file_data LONGBLOB,  -- เก็บไฟล์เป็น BLOB
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  kind ENUM('image', 'pdf', 'file'),
  ...
);
```

### การใช้งาน

#### 1. ติดตั้ง Dependencies
```bash
npm install
```

#### 2. ตั้งค่า .env
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=ponghospital
JWT_SECRET=your-secret-key
ADMIN_USER=admin
ADMIN_PASS=admin123
AUTH_ALLOW_ENV_FALLBACK=false
```

#### 3. สร้างฐานข้อมูล
```bash
# ใช้ไฟล์ database/setup_mysql.sql
mysql -u root -p ponghospital < database/setup_mysql.sql
```

#### 4. รันระบบ
```bash
npm run dev
```

### ข้อดีของระบบใหม่

1. **ไม่ต้องใช้ External Service**
   - ไม่ต้อง config Cloudinary
   - ไม่ต้อง MongoDB
   - ทุกอย่างอยู่ใน MySQL

2. **แก้ปัญหา CORS**
   - Backend ดาวน์โหลดรูปให้
   - Frontend ไม่ต้อง fetch cross-origin

3. **Backup ง่าย**
   - mysqldump ได้ทุกอย่างรวมถึงรูปภาพ
   - ไม่ต้องกังวลเรื่อง external files

4. **ปรับขนาดได้**
   - รองรับรูปใหญ่ถึง 10MB ต่อไฟล์
   - อัปโหลดได้หลายรูปพร้อมกัน (max 20 รูป)

### Limitations

1. **ขนาดฐานข้อมูล**
   - BLOB ทำให้ database ใหญ่ขึ้น
   - แนะนำใช้ InnoDB + compression

2. **Performance**
   - การ query ที่มี BLOB อาจช้ากว่า URL
   - แนะนำใช้ cache และ CDN (ถ้าจำเป็น)

3. **Backup/Restore**
   - ใช้เวลานานกว่าถ้ามีรูปเยอะ
   - แนะนำ incremental backup

### API Endpoints

#### Images
- `GET /api/images/activities/:activityId/:imageId` - ดึงรูปกิจกรรม
- `GET /api/images/slides/:id` - ดึงรูปสไลด์
- `GET /api/images/units/:id` - ดึงรูปหน่วยงาน
- `GET /api/images/announcements/:announcementId/:attachmentId` - ดึงไฟล์แนบประกาศ

#### Content Management
- `POST /api/activities` - สร้างกิจกรรม (FormData)
- `PUT /api/activities/:id` - อัปเดทกิจกรรม (FormData)
- `POST /api/slides` - สร้างสไลด์ (FormData)
- `PUT /api/slides/:id` - อัปเดทสไลด์ (FormData)
- `POST /api/units` - สร้างหน่วยงาน (FormData)
- `PUT /api/units/:id` - อัปเดทหน่วยงาน (FormData)

### ตัวอย่างการใช้งาน

#### Frontend - สร้างกิจกรรมพร้อมรูป
```typescript
const fd = new FormData()
fd.append('title', 'ชื่อกิจกรรม')
fd.append('description', 'รายละเอียด')
fd.append('isPublished', 'true')

// เพิ่มไฟล์รูป
for (const file of files) {
  fd.append('images', file)
}

// หรือเพิ่ม URL รูปภายนอก
fd.append('imageUrls', 'https://example.com/image1.jpg')
fd.append('imageUrls', 'https://example.com/image2.jpg')

const response = await fetch('/api/activities', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: fd
})
```

#### Backend - รับและบันทึกรูป
```javascript
// routes/activities.js
router.post('/', requireAuth, upload.array('images', 20), async (req, res) => {
  const images = []
  
  // จากไฟล์อัปโหลด
  for (const file of req.files) {
    images.push({
      imageData: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size
    })
  }
  
  // จาก URLs
  if (req.body.imageUrls) {
    for (const url of req.body.imageUrls) {
      const response = await fetch(url)
      const buffer = Buffer.from(await response.arrayBuffer())
      images.push({
        imageData: buffer,
        fileName: 'image.jpg',
        mimeType: response.headers.get('content-type'),
        fileSize: buffer.length
      })
    }
  }
  
  await Activity.create({ ...req.body, images })
})
```

---

**หมายเหตุ:** ระบบนี้เหมาะสำหรับ:
- เว็บไซต์ขนาดเล็กถึงกลาง
- จำนวนรูปภาพไม่เกิน 10,000 รูป
- ต้องการความง่ายในการ setup และ backup
- ไม่ต้องการพึ่งพา external service

หากมีรูปภาพจำนวนมาก (> 50,000 รูป) แนะนำใช้ S3 หรือ CDN แทน
