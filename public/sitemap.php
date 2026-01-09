<?php
/**
 * Sitemap Generator for Pong Hospital
 * ส่ง sitemap.xml พร้อม Content-Type ที่ถูกต้อง
 */

// ตั้งค่า Content-Type header ให้ถูกต้อง
header('Content-Type: application/xml; charset=UTF-8');
header('X-Robots-Tag: noindex, follow');

// อ่านไฟล์ sitemap.xml
$sitemapPath = __DIR__ . '/sitemap.xml';

if (file_exists($sitemapPath)) {
    // อ่านไฟล์และส่งออก
    readfile($sitemapPath);
} else {
    // ถ้าไม่มีไฟล์ ให้สร้าง sitemap แบบ dynamic
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' . "\n";
    echo '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' . "\n";
    echo '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9' . "\n";
    echo '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">' . "\n\n";
    
    $baseUrl = 'https://ponghospital.moph.go.th';
    $lastmod = date('Y-m-d\TH:i:sP');
    
    $urls = [
        ['loc' => '/', 'changefreq' => 'daily', 'priority' => '1.00'],
        ['loc' => '/announcements', 'changefreq' => 'daily', 'priority' => '0.90'],
        ['loc' => '/announcements/jobs', 'changefreq' => 'daily', 'priority' => '0.85'],
        ['loc' => '/announcements/news', 'changefreq' => 'daily', 'priority' => '0.85'],
        ['loc' => '/announcements/notices', 'changefreq' => 'daily', 'priority' => '0.85'],
        ['loc' => '/announcements/procurement', 'changefreq' => 'daily', 'priority' => '0.85'],
        ['loc' => '/management', 'changefreq' => 'monthly', 'priority' => '0.80'],
        ['loc' => '/executives', 'changefreq' => 'monthly', 'priority' => '0.80'],
        ['loc' => '/ita', 'changefreq' => 'monthly', 'priority' => '0.80'],
        ['loc' => '/about', 'changefreq' => 'monthly', 'priority' => '0.80'],
        ['loc' => '/about/infographic', 'changefreq' => 'monthly', 'priority' => '0.75'],
        ['loc' => '/contact', 'changefreq' => 'monthly', 'priority' => '0.80'],
        ['loc' => '/activities', 'changefreq' => 'weekly', 'priority' => '0.70'],
    ];
    
    foreach ($urls as $url) {
        echo "  <url>\n";
        echo "    <loc>{$baseUrl}{$url['loc']}</loc>\n";
        echo "    <lastmod>{$lastmod}</lastmod>\n";
        echo "    <changefreq>{$url['changefreq']}</changefreq>\n";
        echo "    <priority>{$url['priority']}</priority>\n";
        echo "  </url>\n\n";
    }
    
    echo "</urlset>";
}
