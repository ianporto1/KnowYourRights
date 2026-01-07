import { supabase } from './supabase';

// Portuguese stopwords to filter out
const STOPWORDS = new Set([
  'a', 'o', 'e', 'é', 'de', 'da', 'do', 'em', 'um', 'uma', 'para', 'com', 'não', 'uma',
  'os', 'as', 'dos', 'das', 'no', 'na', 'por', 'mais', 'como', 'mas', 'ao', 'ele', 'ela',
  'entre', 'depois', 'sem', 'mesmo', 'aos', 'seus', 'quem', 'nas', 'me', 'esse', 'eles',
  'você', 'essa', 'num', 'nem', 'suas', 'meu', 'minha', 'numa', 'pelos', 'elas', 'qual',
  'lhe', 'deles', 'essas', 'esses', 'pelas', 'este', 'dele', 'tu', 'te', 'vocês', 'vos',
  'lhes', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas', 'nosso', 'nossa', 'nossos',
  'nossas', 'dela', 'delas', 'esta', 'estes', 'estas', 'aquele', 'aquela', 'aqueles',
  'aquelas', 'isto', 'aquilo', 'estou', 'está', 'estamos', 'estão', 'estive', 'esteve',
  'estivemos', 'estiveram', 'estava', 'estávamos', 'estavam', 'estivera', 'estivéramos',
  'esteja', 'estejamos', 'estejam', 'estivesse', 'estivéssemos', 'estivessem', 'estiver',
  'estivermos', 'estiverem', 'hei', 'há', 'havemos', 'hão', 'houve', 'houvemos', 'houveram',
  'havia', 'havíamos', 'haviam', 'houvera', 'houvéramos', 'haja', 'hajamos', 'hajam',
  'houvesse', 'houvéssemos', 'houvessem', 'houver', 'houvermos', 'houverem', 'houverei',
  'houverá', 'houveremos', 'houverão', 'houveria', 'houveríamos', 'houveriam', 'sou', 'somos',
  'são', 'era', 'éramos', 'eram', 'fui', 'foi', 'fomos', 'foram', 'fora', 'fôramos', 'seja',
  'sejamos', 'sejam', 'fosse', 'fôssemos', 'fossem', 'for', 'formos', 'forem', 'serei', 'será',
  'seremos', 'serão', 'seria', 'seríamos', 'seriam', 'tenho', 'tem', 'temos', 'tém', 'tinha',
  'tínhamos', 'tinham', 'tive', 'teve', 'tivemos', 'tiveram', 'tivera', 'tivéramos', 'tenha',
  'tenhamos', 'tenham', 'tivesse', 'tivéssemos', 'tivessem', 'tiver', 'tivermos', 'tiverem',
  'terei', 'terá', 'teremos', 'terão', 'teria', 'teríamos', 'teriam', 'que', 'se', 'quando',
  'muito', 'há', 'nos', 'já', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela',
  'entre', 'era', 'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'quem', 'nas', 'me',
  'posso', 'pode', 'podem', 'podemos', 'quais', 'qual', 'onde', 'porque', 'sobre',
]);

// Country name mappings
const COUNTRY_MAPPINGS: Record<string, string> = {
  'brasil': 'BR',
  'brazil': 'BR',
  'brasileiro': 'BR',
  'estados unidos': 'US',
  'eua': 'US',
  'usa': 'US',
  'americano': 'US',
  'alemanha': 'DE',
  'germany': 'DE',
  'alemão': 'DE',
  'japão': 'JP',
  'japan': 'JP',
  'japonês': 'JP',
  'emirados': 'AE',
  'dubai': 'AE',
  'árabe': 'AE',
};

export interface RAGResult {
  entries: Array<{
    country_code: string;
    country_name: string;
    topic: string;
    status: string;
    plain_explanation: string;
    legal_basis: string;
    cultural_note: string | null;
  }>;
  keywords: string[];
  detectedCountries: string[];
}

/**
 * Extract keywords from a user message
 */
export function extractKeywords(message: string): string[] {
  const normalized = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  // Remove duplicates
  return [...new Set(normalized)];
}

/**
 * Detect country codes mentioned in the message
 */
export function detectCountries(message: string): string[] {
  const normalized = message.toLowerCase();
  const detected: string[] = [];

  for (const [name, code] of Object.entries(COUNTRY_MAPPINGS)) {
    if (normalized.includes(name)) {
      detected.push(code);
    }
  }

  // Also check for direct country codes
  const codeMatches = message.match(/\b[A-Z]{2}\b/g);
  if (codeMatches) {
    detected.push(...codeMatches);
  }

  return [...new Set(detected)];
}

/**
 * Query Supabase for relevant entries based on keywords
 */
export async function queryRAG(
  keywords: string[],
  countryCode?: string,
  detectedCountries?: string[]
): Promise<RAGResult['entries']> {
  // Build the query
  let query = supabase
    .from('cartilha_entries')
    .select(`
      country_code,
      topic,
      status,
      plain_explanation,
      legal_basis,
      cultural_note,
      countries!inner(name)
    `)
    .limit(10);

  // Filter by country if specified
  const targetCountries = detectedCountries?.length
    ? detectedCountries
    : countryCode
    ? [countryCode.toUpperCase()]
    : null;

  if (targetCountries) {
    query = query.in('country_code', targetCountries);
  }

  // Search in topic and explanation using OR conditions
  if (keywords.length > 0) {
    const searchPattern = keywords.join(' | ');
    query = query.or(`topic.ilike.%${keywords[0]}%,plain_explanation.ilike.%${keywords[0]}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('RAG query error:', error);
    return [];
  }

  // Transform and score results
  const results = (data || []).map((entry) => ({
    country_code: entry.country_code,
    country_name: (entry.countries as { name: string })?.name || entry.country_code,
    topic: entry.topic,
    status: entry.status,
    plain_explanation: entry.plain_explanation,
    legal_basis: entry.legal_basis,
    cultural_note: entry.cultural_note,
  }));

  // Score by keyword matches
  const scored = results.map((entry) => {
    let score = 0;
    const text = `${entry.topic} ${entry.plain_explanation}`.toLowerCase();
    for (const keyword of keywords) {
      if (text.includes(keyword)) score++;
    }
    return { ...entry, score };
  });

  // Sort by score and return top results
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score, ...entry }) => entry);
}

/**
 * Build the prompt for the LLM
 */
export function buildPrompt(
  userMessage: string,
  ragResults: RAGResult['entries'],
  context?: { countryCode?: string; countryName?: string }
): string {
  const systemPrompt = `Você é um assistente especializado em informações sobre leis e direitos em diferentes países. 
Responda de forma clara, concisa e educativa. 
Use os dados fornecidos como base para suas respostas.
Se não tiver informações suficientes, sugira que o usuário explore o app manualmente.
Sempre mencione que as informações são educacionais e não constituem aconselhamento jurídico.`;

  let contextSection = '';
  
  if (ragResults.length > 0) {
    contextSection = `\n\nDados relevantes encontrados:\n`;
    for (const entry of ragResults) {
      contextSection += `\n---\nPaís: ${entry.country_name} (${entry.country_code})
Tópico: ${entry.topic}
Status: ${entry.status === 'green' ? 'Permitido' : entry.status === 'yellow' ? 'Restrições' : 'Proibido'}
Explicação: ${entry.plain_explanation}
Base legal: ${entry.legal_basis}`;
      if (entry.cultural_note) {
        contextSection += `\nNota cultural: ${entry.cultural_note}`;
      }
    }
  } else {
    contextSection = '\n\nNão foram encontrados dados específicos para esta pergunta.';
  }

  if (context?.countryName) {
    contextSection += `\n\nContexto: O usuário está visualizando informações sobre ${context.countryName}.`;
  }

  return `${systemPrompt}${contextSection}\n\nPergunta do usuário: ${userMessage}`;
}

/**
 * Main RAG function that combines all steps
 */
export async function performRAG(
  message: string,
  context?: { countryCode?: string; countryName?: string }
): Promise<{ prompt: string; ragResults: RAGResult }> {
  const keywords = extractKeywords(message);
  const detectedCountries = detectCountries(message);
  
  const entries = await queryRAG(keywords, context?.countryCode, detectedCountries);
  
  const prompt = buildPrompt(message, entries, context);

  return {
    prompt,
    ragResults: {
      entries,
      keywords,
      detectedCountries,
    },
  };
}
