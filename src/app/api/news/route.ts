import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  image?: string;
}

// Country name mapping for search queries
const countrySearchTerms: Record<string, { en: string; pt: string }> = {
  BR: { en: 'Brazil', pt: 'Brasil' },
  US: { en: 'United States', pt: 'Estados Unidos' },
  DE: { en: 'Germany', pt: 'Alemanha' },
  FR: { en: 'France', pt: 'França' },
  GB: { en: 'United Kingdom', pt: 'Reino Unido' },
  JP: { en: 'Japan', pt: 'Japão' },
  CN: { en: 'China', pt: 'China' },
  IN: { en: 'India', pt: 'Índia' },
  IT: { en: 'Italy', pt: 'Itália' },
  ES: { en: 'Spain', pt: 'Espanha' },
  CA: { en: 'Canada', pt: 'Canadá' },
  AU: { en: 'Australia', pt: 'Austrália' },
  MX: { en: 'Mexico', pt: 'México' },
  KR: { en: 'South Korea', pt: 'Coreia do Sul' },
  RU: { en: 'Russia', pt: 'Rússia' },
  SA: { en: 'Saudi Arabia', pt: 'Arábia Saudita' },
  AE: { en: 'UAE', pt: 'Emirados Árabes' },
  IL: { en: 'Israel', pt: 'Israel' },
  TR: { en: 'Turkey', pt: 'Turquia' },
  EG: { en: 'Egypt', pt: 'Egito' },
  ZA: { en: 'South Africa', pt: 'África do Sul' },
  AR: { en: 'Argentina', pt: 'Argentina' },
  CL: { en: 'Chile', pt: 'Chile' },
  CO: { en: 'Colombia', pt: 'Colômbia' },
  PE: { en: 'Peru', pt: 'Peru' },
  TH: { en: 'Thailand', pt: 'Tailândia' },
  VN: { en: 'Vietnam', pt: 'Vietnã' },
  ID: { en: 'Indonesia', pt: 'Indonésia' },
  MY: { en: 'Malaysia', pt: 'Malásia' },
  SG: { en: 'Singapore', pt: 'Singapura' },
  PH: { en: 'Philippines', pt: 'Filipinas' },
  NL: { en: 'Netherlands', pt: 'Holanda' },
  BE: { en: 'Belgium', pt: 'Bélgica' },
  PT: { en: 'Portugal', pt: 'Portugal' },
  PL: { en: 'Poland', pt: 'Polônia' },
  SE: { en: 'Sweden', pt: 'Suécia' },
  NO: { en: 'Norway', pt: 'Noruega' },
  DK: { en: 'Denmark', pt: 'Dinamarca' },
  FI: { en: 'Finland', pt: 'Finlândia' },
  AT: { en: 'Austria', pt: 'Áustria' },
  CH: { en: 'Switzerland', pt: 'Suíça' },
  GR: { en: 'Greece', pt: 'Grécia' },
  CZ: { en: 'Czech Republic', pt: 'República Tcheca' },
  IE: { en: 'Ireland', pt: 'Irlanda' },
  NZ: { en: 'New Zealand', pt: 'Nova Zelândia' },
  UA: { en: 'Ukraine', pt: 'Ucrânia' },
  IR: { en: 'Iran', pt: 'Irã' },
  IQ: { en: 'Iraq', pt: 'Iraque' },
  AF: { en: 'Afghanistan', pt: 'Afeganistão' },
  PK: { en: 'Pakistan', pt: 'Paquistão' },
  NG: { en: 'Nigeria', pt: 'Nigéria' },
  KE: { en: 'Kenya', pt: 'Quênia' },
};

// Parse RSS XML to extract articles
function parseRSS(xml: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  
  // Simple regex-based XML parsing for RSS items
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
  const sourceRegex = /<source[^>]*>(.*?)<\/source>/;
  const descRegex = /<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/;
  
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    
    const titleMatch = titleRegex.exec(item);
    const linkMatch = linkRegex.exec(item);
    const pubDateMatch = pubDateRegex.exec(item);
    const sourceMatch = sourceRegex.exec(item);
    const descMatch = descRegex.exec(item);
    
    const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
    const url = linkMatch ? linkMatch[1].trim() : '';
    const publishedAt = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
    const source = sourceMatch ? sourceMatch[1].trim() : 'Google News';
    const description = descMatch ? (descMatch[1] || descMatch[2] || '').replace(/<[^>]*>/g, '').trim() : '';
    
    if (title && url) {
      articles.push({
        title: decodeHTMLEntities(title),
        description: decodeHTMLEntities(description).slice(0, 200),
        url,
        source: decodeHTMLEntities(source),
        publishedAt: new Date(publishedAt).toISOString(),
      });
    }
  }
  
  return articles.slice(0, 5);
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countryCodes = searchParams.get('countries')?.split(',') || [];
  
  if (countryCodes.length === 0) {
    return NextResponse.json({ error: 'No countries specified' }, { status: 400 });
  }

  try {
    const allNews: { country: string; code: string; articles: NewsArticle[] }[] = [];
    
    for (const code of countryCodes.slice(0, 5)) {
      const upperCode = code.toUpperCase();
      const countryInfo = countrySearchTerms[upperCode] || { en: code, pt: code };
      
      let articles: NewsArticle[] = [];
      
      try {
        // Use Google News RSS feed (free, no API key needed)
        const searchQuery = encodeURIComponent(`${countryInfo.en} news`);
        const rssUrl = `https://news.google.com/rss/search?q=${searchQuery}&hl=en-US&gl=US&ceid=US:en`;
        
        const response = await fetch(rssUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
          },
          next: { revalidate: 1800 } // Cache for 30 minutes
        });
        
        if (response.ok) {
          const xml = await response.text();
          articles = parseRSS(xml);
        }
      } catch (fetchError) {
        console.error(`Failed to fetch news for ${upperCode}:`, fetchError);
      }
      
      // Fallback if RSS fails
      if (articles.length === 0) {
        articles = generateFallbackNews(countryInfo.pt, upperCode);
      }
      
      allNews.push({
        country: countryInfo.pt,
        code: upperCode,
        articles,
      });
    }
    
    return NextResponse.json({ news: allNews });
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}

function generateFallbackNews(country: string, code: string): NewsArticle[] {
  const now = new Date();
  const topics = [
    { title: `Últimas notícias de ${country}`, desc: `Acompanhe as principais notícias e acontecimentos de ${country}.` },
    { title: `${country}: economia e política`, desc: `Análises sobre a situação econômica e política atual de ${country}.` },
    { title: `Turismo em ${country}`, desc: `Descubra os principais destinos e dicas para visitar ${country}.` },
    { title: `${country} no cenário internacional`, desc: `Como ${country} se posiciona nas relações internacionais.` },
    { title: `Cultura e sociedade em ${country}`, desc: `Conheça mais sobre a cultura e costumes de ${country}.` },
  ];
  
  return topics.map((topic, i) => ({
    title: topic.title,
    description: topic.desc,
    url: `https://news.google.com/search?q=${encodeURIComponent(country)}`,
    source: 'Google News',
    publishedAt: new Date(now.getTime() - i * 6 * 60 * 60 * 1000).toISOString(),
  }));
}
