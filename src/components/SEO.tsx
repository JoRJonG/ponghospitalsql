import { Helmet } from 'react-helmet-async'

export interface BreadcrumbItem {
    name: string
    item: string
}

export interface ArticleSchemaData {
    headline: string
    description?: string
    image?: string
    datePublished?: string
    dateModified?: string
    author?: string
    category?: string
}

export interface JobSchemaData {
    title: string
    description?: string
    datePosted?: string
    validThrough?: string
    employmentType?: string
}

export interface EventSchemaData {
    name: string
    description?: string
    startDate?: string
    endDate?: string
    image?: string
    location?: string
}

interface SEOProps {
    title?: string
    description?: string
    image?: string
    url?: string
    type?: 'website' | 'article'
    schemaType?: 'article' | 'job' | 'event' | 'none'
    articleData?: ArticleSchemaData
    jobData?: JobSchemaData
    eventData?: EventSchemaData
    breadcrumbs?: BreadcrumbItem[]
}

export default function SEO({
    title,
    description,
    image,
    url,
    type = 'website',
    schemaType = 'none',
    articleData,
    jobData,
    eventData,
    breadcrumbs
}: SEOProps) {
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
    const metaDescription = description ? description.replace(/<[^>]*>/g, '').trim().substring(0, 200) : defaultDescription

    const defaultImage = `${siteUrl}/assets/logo-150x150-BEBbXnQy.png`
    const metaImage = image || defaultImage

    // สร้าง Dynamic Structured Data (JSON-LD)
    const jsonLdSchemas: object[] = []

    // 1. BreadcrumbList Schema
    if (breadcrumbs && breadcrumbs.length > 0) {
        jsonLdSchemas.push({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            'itemListElement': breadcrumbs.map((item, index) => ({
                '@type': 'ListItem',
                'position': index + 1,
                'name': item.name,
                'item': item.item.startsWith('http') ? item.item : `${siteUrl}${item.item.startsWith('/') ? '' : '/'}${item.item}`
            }))
        })
    }

    // 2. Article / NewsArticle Schema
    if (schemaType === 'article' && articleData) {
        jsonLdSchemas.push({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            'headline': articleData.headline || fullTitle,
            'description': articleData.description ? articleData.description.replace(/<[^>]*>/g, '').trim().substring(0, 200) : metaDescription,
            'image': [articleData.image || metaImage],
            'datePublished': articleData.datePublished || new Date().toISOString(),
            'dateModified': articleData.dateModified || articleData.datePublished || new Date().toISOString(),
            'mainEntityOfPage': {
                '@type': 'WebPage',
                '@id': currentUrl
            },
            'author': {
                '@type': 'Organization',
                'name': articleData.author || siteTitle,
                'url': siteUrl
            },
            'publisher': {
                '@type': 'Organization',
                'name': siteTitle,
                'url': siteUrl,
                'logo': {
                    '@type': 'ImageObject',
                    'url': defaultImage
                }
            }
        })
    }

    // 3. JobPosting Schema
    if (schemaType === 'job' && jobData) {
        jsonLdSchemas.push({
            '@context': 'https://schema.org',
            '@type': 'JobPosting',
            'title': jobData.title || fullTitle,
            'description': jobData.description ? jobData.description.replace(/<[^>]*>/g, '').trim() : metaDescription,
            'datePosted': jobData.datePosted || new Date().toISOString(),
            'validThrough': jobData.validThrough,
            'employmentType': jobData.employmentType || 'FULL_TIME',
            'hiringOrganization': {
                '@type': 'Organization',
                'name': siteTitle,
                'sameAs': siteUrl,
                'logo': defaultImage
            },
            'jobLocation': {
                '@type': 'Place',
                'address': {
                    '@type': 'PostalAddress',
                    'streetAddress': '395 หมู่ 9 ตำบลนาปรัง',
                    'addressLocality': 'อำเภอปง',
                    'addressRegion': 'จังหวัดพะเยา',
                    'postalCode': '56140',
                    'addressCountry': 'TH'
                }
            }
        })
    }

    // 4. Event Schema
    if (schemaType === 'event' && eventData) {
        jsonLdSchemas.push({
            '@context': 'https://schema.org',
            '@type': 'Event',
            'name': eventData.name || fullTitle,
            'description': eventData.description ? eventData.description.replace(/<[^>]*>/g, '').trim().substring(0, 200) : metaDescription,
            'startDate': eventData.startDate || new Date().toISOString(),
            'endDate': eventData.endDate || eventData.startDate || new Date().toISOString(),
            'eventStatus': 'https://schema.org/EventScheduled',
            'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
            'image': [eventData.image || metaImage],
            'location': {
                '@type': 'Place',
                'name': eventData.location || siteTitle,
                'address': {
                    '@type': 'PostalAddress',
                    'streetAddress': '395 หมู่ 9 ตำบลนาปรัง',
                    'addressLocality': 'อำเภอปง',
                    'addressRegion': 'จังหวัดพะเยา',
                    'postalCode': '56140',
                    'addressCountry': 'TH'
                }
            },
            'organizer': {
                '@type': 'Organization',
                'name': siteTitle,
                'url': siteUrl
            }
        })
    }

    return (
        <Helmet>
            {/* Title */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={metaDescription} />

            {/* Canonical */}
            <link rel="canonical" href={currentUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:image" content={metaImage} />
            <meta property="og:site_name" content={siteTitle} />
            <meta property="og:locale" content="th_TH" />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={currentUrl} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={metaDescription} />
            <meta property="twitter:image" content={metaImage} />

            {/* Dynamic Structured Data JSON-LD */}
            {jsonLdSchemas.map((schema, idx) => (
                <script key={idx} type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            ))}
        </Helmet>
    )
}

