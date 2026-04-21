import { SITE } from "@/shared/constants/site"

/**
 * 검색엔진용 JSON-LD 구조화 데이터.
 * AnimalShelter schema (https://schema.org/AnimalShelter) 로 보호소 정체성 선언.
 * 홈 페이지 한 번만 삽입하면 전체 도메인 범주로 인식됨.
 */
export function OrganizationJsonLd() {
  const phones = SITE.contact.phones
    .filter((p) => p.number)
    .map((p) => p.number)

  const sameAs = [SITE.sns.naverCafe, SITE.sns.instagram, SITE.sns.youtube]
    .filter(Boolean)

  const data = {
    "@context": "https://schema.org",
    "@type": "AnimalShelter",
    name: SITE.name,
    alternateName: SITE.nameEn,
    description: SITE.description,
    url: SITE.url,
    logo: `${SITE.url}${SITE.logo}`,
    image: `${SITE.url}${SITE.ogImage}`,
    slogan: SITE.tagline,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.contact.addressShort,
      addressLocality: "인천 중구",
      addressRegion: "인천광역시",
      addressCountry: "KR",
    },
    telephone: phones,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    knowsAbout: ["유기견 입양", "유기묘 입양", "동물 봉사", "동물 후원"],
    areaServed: {
      "@type": "Country",
      name: "대한민국",
    },
  }

  return (
    <script
      type="application/ld+json"
      // JSON.stringify 로 XSS 방지 (< 등은 이스케이프됨)
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
