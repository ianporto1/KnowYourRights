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
const countrySearchTerms: Record<string, string> = {
  BR: 'Brazil',
  US: 'United States',
  DE: 'Germany',
  FR: 'France',
  GB: 'United Kingdom',
  JP: 'Japan',
  CN: 'China',
  IN: 'India',
  IT: 'Italy',
  ES: 'Spain',
  CA: 'Canada',
  AU: 'Australia',
  MX: 'Mexico',
  KR: 'South Korea',
  RU: 'Russia',
  SA: 'Saudi Arabia',
  AE: 'UAE Emirates',
  IL: 'Israel',
  TR: 'Turkey',
  EG: 'Egypt',
  ZA: 'South Africa',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  TH: 'Thailand',
  VN: 'Vietnam',
  ID: 'Indonesia',
  MY: 'Malaysia',
  SG: 'Singapore',
  PH: 'Philippines',
  NL: 'Netherlands',
  BE: 'Belgium',
  PT: 'Portugal',
  PL: 'Poland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  AT: 'Austria',
  CH: 'Switzerland',
  GR: 'Greece',
  CZ: 'Czech Republic',
  IE: 'Ireland',
  NZ: 'New Zealand',
};

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
      const searchTerm = countrySearchTerms[upperCode] || code;
      
      // Using GNews API (free tier: 100 requests/day)
      // You can also use NewsAPI, Currents API, or other news APIs
      const apiKey = process.env.GNEWS_API_KEY;
      
      let articles: NewsArticle[] = [];
      
      if (apiKey) {
        const response = await fetch(
          `https://gnews.io/api/v4/search?q=${encodeURIComponent(searchTerm)}&lang=en&country=any&max=5&apikey=${apiKey}`,
          { next: { revalidate: 3600 } } // Cache for 1 hour
        );
        
        if (response.ok) {
          const data = await response.json();
          articles = (data.articles || []).map((article: any) => ({
            title: article.title,
            description: article.description,
            url: article.url,
            source: article.source?.name || 'Unknown',
            publishedAt: article.publishedAt,
            image: article.image,
          }));
        }
      }
      
      // Fallback: Generate placeholder news if no API key or API fails
      if (articles.length === 0) {
        articles = generatePlaceholderNews(searchTerm, upperCode);
      }
      
      allNews.push({
        country: searchTerm,
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

function generatePlaceholderNews(country: string, code: string): NewsArticle[] {
  const now = new Date();
  const topics = [
    { title: `${country} announces new economic policies`, desc: `Government officials in ${country} have unveiled new economic measures aimed at boosting growth and employment.` },
    { title: `Tourism in ${country} reaches new heights`, desc: `The tourism sector in ${country} has seen significant growth this year, with visitors from around the world.` },
    { title: `${country} strengthens international relations`, desc: `Diplomatic efforts continue as ${country} works to strengthen ties with neighboring countries and global partners.` },
    { title: `Technology sector booms in ${country}`, desc: `The tech industry in ${country} continues to expand, attracting investment and talent from across the globe.` },
    { title: `Cultural events highlight ${country}'s heritage`, desc: `A series of cultural events and festivals celebrate the rich heritage and traditions of ${country}.` },
  ];
  
  return topics.map((topic, i) => ({
    title: topic.title,
    description: topic.desc,
    url: `https://news.google.com/search?q=${encodeURIComponent(country)}`,
    source: 'News Aggregator',
    publishedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
    image: undefined,
  }));
}
