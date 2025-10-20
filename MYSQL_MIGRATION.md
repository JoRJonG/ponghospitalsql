# การเปลี่ยนจาก MongoDB เป็น MySQL

## สรุปการเปลี่ยนแปลง

โปรเจค Pong Hospital ได้ถูกออกแบบใหม่เพื่อใช้ MySQL แทน MongoDB เพื่อความเสถียรและการจัดการข้อมูลที่ดีขึ้น

## โครงสร้างฐานข้อมูล MySQL

### ตารางหลัก (Main Tables)

1. **users** - ตารางผู้ใช้งาน
   - `id` (Primary Key)
   - `username` (Unique)
   - `password_hash`
   - `roles` (JSON array)
   - `created_at`, `updated_at`

2. **announcement_categories** - หมวดหมู่ประกาศ
   - `id` (Primary Key)
   - `name` (Code name)
   - `display_name` (Thai name)

3. **announcements** - ตารางประกาศ
   - `id` (Primary Key)
   - `title`
   - `category_id` (Foreign Key)
   - `content`
   - `published_at`
   - `is_published`
   - `created_by`, `updated_by`
   - `created_at`, `updated_at`

4. **announcement_attachments** - ไฟล์แนบประกาศ
   - `id` (Primary Key)
   - `announcement_id` (Foreign Key)
   - `url`, `public_id`
   - `kind` (image/pdf/file)
   - `name`, `bytes`
   - `display_order`

5. **activities** - ตารางกิจกรรม
   - `id` (Primary Key)
   - `title`, `description`
   - `date`
   - `published_at`, `is_published`
   - `created_by`, `updated_by`
   - `created_at`, `updated_at`

6. **activity_images** - รูปภาพกิจกรรม
   - `id` (Primary Key)
   - `activity_id` (Foreign Key)
   - `url`, `public_id`
   - `display_order`

7. **slides** - ตารางสไลด์
   - `id` (Primary Key)
   - `title`, `caption`, `alt`
   - `href`
   - `image_url`, `image_public_id`
   - `display_order`, `is_published`
   - `created_at`, `updated_at`

8. **units** - ตารางหน่วยงาน
   - `id` (Primary Key)
   - `name`, `href`
   - `image_url`, `image_public_id`
   - `display_order`, `is_published`
   - `created_at`, `updated_at`

### Views (มุมมองข้อมูล)

- **announcement_details** - รวมข้อมูลประกาศกับหมวดหมู่
- **activity_summary** - รวมข้อมูลกิจกรรมกับจำนวนรูปภาพ

## ไฟล์ที่สร้างใหม่

### Database Layer
- `server/database.js` - MySQL connection และ helper functions
- `database/mysql_schema.sql` - Database schema และ initial data

### Models (MySQL version)
- `server/models/mysql/User.js`
- `server/models/mysql/Announcement.js`
- `server/models/mysql/Activity.js`
- `server/models/mysql/Slide.js`
- `server/models/mysql/Unit.js`

### Scripts
- `server/scripts/setupDatabase.js` - สร้างฐานข้อมูลและตาราง
- `server/app_mysql.js` - App configuration สำหรับ MySQL

### Configuration
- `.env.example` - ตัวอย่างการตั้งค่า environment variables

## ขั้นตอนการติดตั้งและใช้งาน

### 1. ติดตั้ง MySQL
```bash
# Windows (ใช้ MySQL Installer)
# หรือใช้ XAMPP/WAMP/MAMP

# macOS
brew install mysql

# Ubuntu/Debian
sudo apt install mysql-server
```

### 2. ติดตั้ง Dependencies
```bash
npm install mysql2
```

### 3. ตั้งค่า Environment Variables
```bash
# คัดลอกไฟล์ตัวอย่าง
copy .env.example .env

# แก้ไขไฟล์ .env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=ponghospital
```

### 4. สร้างฐานข้อมูล
```bash
# รันสคริปต์สร้างฐานข้อมูล
npm run db:setup
```

### 5. เปลี่ยน App ไปใช้ MySQL
```bash
# แก้ไขไฟล์ server/index.js
# เปลี่ยนจาก './app.js' เป็น './app_mysql.js'
```

### 6. รันโปรเจค
```bash
npm run dev
```

## การใช้งาน Models

### ตัวอย่างการใช้งาน User Model
```javascript
import User from './models/mysql/User.js'

// สร้างผู้ใช้ใหม่
const user = await User.create({
  username: 'admin',
  passwordHash: hashedPassword,
  roles: ['admin']
})

// ค้นหาผู้ใช้
const user = await User.findByUsername('admin')

// อัพเดทข้อมูล
await User.updateOne(
  { username: 'admin' },
  { $set: { passwordHash: newHash, roles: ['admin'] } },
  { upsert: true }
)
```

### ตัวอย่างการใช้งาน Announcement Model
```javascript
import Announcement from './models/mysql/Announcement.js'

// สร้างประกาศใหม่
const announcement = await Announcement.create({
  title: 'ประกาศใหม่',
  category: 'announce',
  content: 'เนื้อหาประกาศ',
  attachments: [
    { url: 'https://...', kind: 'image' }
  ]
})

// ค้นหาประกาศ
const announcements = await Announcement.find(
  { isPublished: true },
  { limit: 10, sort: { publishedAt: -1 } }
)
```

## ข้อดีของ MySQL เทียบกับ MongoDB

1. **ACID Compliance** - รับประกันความสอดคล้องของข้อมูล
2. **Relational Data** - จัดการ relationships ระหว่างตารางได้ดี
3. **SQL Standard** - ใช้ SQL มาตรฐานที่คุ้นเคย
4. **Better Performance** - สำหรับ complex queries
5. **Easier Backup/Restore** - เครื่องมือที่หลากหลาย
6. **Better Hosting Support** - รองรับในบริการ hosting ส่วนใหญ่

## ข้อควรพิจารณา

1. **Schema Changes** - ต้องมีการ migrate schema เมื่อมีการเปลี่ยนแปลง
2. **Complex Queries** - อาจต้องเขียน SQL ที่ซับซ้อนสำหรับ relationships
3. **JSON Support** - ใช้ JSON data type สำหรับข้อมูลที่ไม่มี structure แน่นอน

## การ Migrate ข้อมูลจาก MongoDB

หากต้องการย้ายข้อมูลจาก MongoDB มายัง MySQL สามารถใช้สคริปต์:

```bash
npm run db:migrate
```

*หมายเหตุ: สคริปต์นี้จะถูกพัฒนาในอนาคต*

## การทดสอบ

```bash
# ทดสอบการเชื่อมต่อฐานข้อมูล
npm run diagnose

# ตรวจสอบ health check
curl http://localhost:5000/api/health
```

## Troubleshooting

### ปัญหาการเชื่อมต่อ MySQL
1. ตรวจสอบว่า MySQL service ทำงานอยู่
2. ตรวจสอบ username/password ใน .env
3. ตรวจสอบ firewall และ port 3306

### ปัญหา Performance
1. สร้าง indexes ที่เหมาะสม
2. ปรับแต่ง MySQL configuration
3. ใช้ connection pooling

## สรุป

การเปลี่ยนจาก MongoDB เป็น MySQL ทำให้โปรเจคมีความเสถียรและการจัดการข้อมูลที่ดีขึ้น พร้อมกับการรองรับ complex queriesและ relationships ที่ดีกว่า