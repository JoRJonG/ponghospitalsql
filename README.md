# ระบบจัดการโรงพยาบาลปง

## Quick Start (แนะนำ)

บน Windows ให้ทำตามนี้เพื่อรันทั้ง Frontend + Backend ด้วยคำสั่งเดียว:

```cmd
npm install
npm run dev
```

จากนั้นเปิดเว็บที่: http://localhost:5173

หมายเหตุเรื่องพอร์ต API: ไฟล์ `vite.config.ts` ตั้ง proxy ไปที่ `http://localhost:5000` ดังนั้นฝั่ง Backend ควรฟังที่พอร์ต 5000 (ดีฟอลต์ของโปรเจกต์)


ระบบจัดการข้อมูลและประชาสัมพันธ์สำหรับโรงพยาบาลปง พัฒนาด้วย React + Express

## ฟีเจอร์หลัก

- 🏥 **หน้าแรก**: แสดงข้อมูลโรงพยาบาล, ประกาศล่าสุด, กิจกรรม
- 📢 **ประกาศ**: ระบบประกาศแบ่งตามหมวดหมู่ (สมัครงาน, ประชาสัมพันธ์, ประกาศ)
- 📁 **ไฟล์แนบ**: รองรับรูปภาพและ PDF แสดงผลในหน้าเว็บ
- 🎯 **กิจกรรม**: แสดงกิจกรรมต่างๆ ของโรงพยาบาล
- 🖼️ **สไลด์**: จัดการสไลด์หน้าแรก
- 👥 **ผู้บริหาร**: แสดงข้อมูลคณะผู้บริหาร
- 🔐 **ระบบจัดการ**: สำหรับ admin จัดการเนื้อหา

## เทคโนโลยี

### Frontend
- React 19 + TypeScript
- Vite (Build tool)
- Tailwind CSS (Styling)
- React Router (Navigation)
- React PDF (PDF Viewer)

### Backend
- Node.js + Express
- MySQL (Database)
- JWT (Authentication)
- Multer (File handling)
- BLOB Storage (รูปภาพเก็บใน MySQL)

## การติดตั้งและใช้งาน

### Development
```bash
# Install dependencies
npm install

# Start development server (both frontend & backend)
npm run dev

# Start only frontend
npm run dev:client

# Start only backend
npm run dev:server
```

### Production Build
```bash
npm run build
npm start
```

## Environment Variables

สร้างไฟล์ `.env` และตั้งค่า:

```env
# MySQL Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=ponghospital

# Authentication
JWT_SECRET=your-secret-key

# Admin Account
ADMIN_USER=admin
ADMIN_PASS=admin123

# Control whether login can fall back to ENV when DB is unavailable
AUTH_ALLOW_ENV_FALLBACK=false

# Server micro-cache:
#  - TTL: 15–60s on common GETs (activities/announcements)
#  - Cap size via MICROCACHE_MAX_ENTRIES (default 500)
#  - Cache is in-memory per instance and purged automatically on writes
```

## การ Deploy

### Vercel (แนะนำ)
1. Push โค้ดไป GitHub
2. เชื่อม Vercel กับ GitHub repository
3. ตั้งค่า Environment Variables ใน Vercel Dashboard
4. Deploy อัตโนมัติ

ดูรายละเอียดใน [DEPLOY.md](./DEPLOY.md)

### Manual Deploy
```bash
npm run build
# Upload dist/ folder และ server/ folder ไปยัง hosting
```

## โครงสร้างโปรเจค

```
ponghospital/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── pages/             # Page components
│   └── assets/            # Static assets
├── server/                # Backend Express app
│   ├── routes/            # API routes
│   ├── models/            # Database models
│   ├── middleware/        # Express middleware
│   └── scripts/           # Utility scripts
├── public/                # Public static files
└── dist/                  # Build output (auto-generated)
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/announcements` - ดึงประกาศ
- `GET /api/activities` - ดึงกิจกรรม
- `GET /api/slides` - ดึงสไลด์
- `POST /api/auth/login` - Login
- `POST /api/uploads/image` - Upload รูปภาพ
- `POST /api/uploads/file` - Upload ไฟล์

## ใบอนุญาต

Private Project - โรงพยาบาลปง
---

## การใช้งาน

1. **สำหรับผู้ใช้ทั่วไป**: เข้าดูประกาศ กิจกรรม และข้อมูลโรงพยาบาล
2. **สำหรับ Admin**: เข้าสู่ระบบจัดการหลังบ้าน เพิ่ม/แก้ไข/ลบข้อมูล

## การพัฒนาต่อ

### เพิ่มฟีเจอร์ใหม่
1. สร้างไฟล์ component ใน `src/components/`
2. เพิ่ม route ใน `src/App.tsx`
3. เพิ่ม API endpoint ใน `server/routes/`

### แก้ไขการออกแบบ
- แก้ไข CSS ใน `src/index.css` หรือ component
- ปรับแต่ง Tailwind ใน `tailwind.config.js`

## การแก้ไขปัญหา

### MongoDB Connection Error
```bash
# ตรวจสอบ MongoDB URI ใน .env
MONGODB_URI=mongodb://localhost:27017/ponghospital

# หรือใช้ MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ponghospital
```

### Build Error
```bash
# ลบ node_modules และติดตั้งใหม่
rm -rf node_modules package-lock.json
npm install
```

### PDF ไม่แสดง
- ตรวจสอบ CORS settings
- ตรวจสอบ file URL format
- ดู console error ใน browser
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
