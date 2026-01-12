<?php
// sitemap.php - Serve sitemap.xml with correct headers
// ไม่ส่ง X-Robots-Tag: noindex เพื่อให้ Google Search Console ดึงข้อมูลได้

// ตั้งค่า Content-Type เป็น XML
header('Content-Type: application/xml; charset=UTF-8');

// ตั้งค่า Cache-Control
header('Cache-Control: public, max-age=3600');

// อ่านและส่งไฟล์ sitemap.xml
$sitemapPath = __DIR__ . '/sitemap.xml';

if (file_exists($sitemapPath)) {
    // อ่านและส่งไฟล์ sitemap.xml
    readfile($sitemapPath);
} else {
    // ถ้าไม่มีไฟล์ sitemap.xml ให้แสดง error
    http_response_code(404);
    echo '<?xml version="1.0" encoding="UTF-8"?>';
    echo '<error>Sitemap file not found</error>';
}
