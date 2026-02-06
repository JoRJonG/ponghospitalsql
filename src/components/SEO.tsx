import { Helmet } from 'react-helmet-async'

interface SEOProps {
    title?: string
    description?: string
    image?: string
    url?: string
}

export default function SEO({ title, description, image, url }: SEOProps) {
    const siteTitle = 'โรงพยาบาลปง'
    const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle

    const siteUrl = 'https://ponghospital.moph.go.th'

    // สร้าง canonical URL ที่สะอาดและสอดคล้องกับ sitemap
    let currentUrl = url || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : siteUrl)

    // ลบ trailing slash ออก (ยกเว้นหน้าแรก)
    if (currentUrl !== siteUrl && currentUrl.endsWith('/')) {
        currentUrl = currentUrl.slice(0, -1)
    }

    // แปลง /executives เป็น /management เพื่อให้ canonical ตรงกับ sitemap
    if (currentUrl.includes('/executives')) {
        currentUrl = currentUrl.replace('/executives', '/management')
    }

    const defaultDescription = 'โรงพยาบาลปง จังหวัดพะเยา ให้บริการด้านสุขภาพครบวงจรเพื่อประชาชน บริการตรวจรักษา ฉุกเฉิน 24 ชั่วโมง ข้อมูลข่าวสาร และประกาศจัดซื้อจัดจ้างอย่างเป็นทางการ'
    const metaDescription = description || defaultDescription

    const defaultImage = `${siteUrl}/assets/logo-150x150-BEBbXnQy.png` // ใช้รูปโลโก้เป็น default
    const metaImage = image || defaultImage

    return (
        <Helmet>
            {/* Title */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={metaDescription} />

            {/* Canonical */}
            <link rel="canonical" href={currentUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:image" content={metaImage} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={currentUrl} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={metaDescription} />
            <meta property="twitter:image" content={metaImage} />
        </Helmet>
    )
}
