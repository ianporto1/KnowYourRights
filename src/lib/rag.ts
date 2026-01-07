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
 * Query Supabase for relevant entries using hybrid search
 */
export async function queryRAG(
  keywords: string[],
  countryCode?: string,
  detectedCountries?: string[]
): Promise<RAGResult['entries']> {
  try {
    // Determine target country
    const targetCountry = detectedCountries?.length
      ? detectedCountries[0]
      : countryCode?.toUpperCase() || null;

    // Build search query from keywords
    const searchQuery = keywords.slice(0, 5).join(' ');

    // Use hybrid search function for better results
    const { data, error } = await supabase.rpc('search_entries_hybrid', {
      search_query: searchQuery || null,
      filter_country: targetCountry,
      filter_category_id: null,
      result_limit: 10,
    });

    if (error) {
      console.error('RAG hybrid search error:', error);
      // Fallback to simple query
      return queryRAGFallback(keywords, targetCountry);
    }

    if (!data || data.length === 0) {
      // Try fallback if no results
      return queryRAGFallback(keywords, targetCountry);
    }

    return data.map((entry: {
      country_code: string;
      country_name: string;
      topic: string;
      status: string;
      plain_explanation: string;
      legal_basis: string;
      cultural_note: string | null;
    }) => ({
      country_code: entry.country_code,
      country_name: entry.country_name,
      topic: entry.topic,
      status: entry.status,
      plain_explanation: entry.plain_explanation,
      legal_basis: entry.legal_basis,
      cultural_note: entry.cultural_note,
    }));
  } catch (err) {
    console.error('RAG query exception:', err);
    return [];
  }
}

/**
 * Fallback query when hybrid search fails
 */
async function queryRAGFallback(
  keywords: string[],
  targetCountry: string | null
): Promise<RAGResult['entries']> {
  try {
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
      .eq('moderation_status', 'approved')
      .limit(10);

    if (targetCountry) {
      query = query.eq('country_code', targetCountry);
    }

    if (keywords.length > 0) {
      query = query.or(`topic.ilike.%${keywords[0]}%,plain_explanation.ilike.%${keywords[0]}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('RAG fallback error:', error);
      return [];
    }

    return (data || []).map((entry) => {
      const countries = entry.countries as { name: string } | { name: string }[] | null;
      const countryName = Array.isArray(countries) ? countries[0]?.name : countries?.name;
      
      return {
        country_code: entry.country_code,
        country_name: countryName || entry.country_code,
        topic: entry.topic,
        status: entry.status,
        plain_explanation: entry.plain_explanation,
        legal_basis: entry.legal_basis,
        cultural_note: entry.cultural_note,
      };
    });
  } catch (err) {
    console.error('RAG fallback exception:', err);
    return [];
  }
}

/**
 * Build the prompt for the LLM
 */
export function buildPrompt(
  userMessage: string,
  ragResults: RAGResult['entries'],
  context?: { countryCode?: string; countryName?: string }
): string {
  let contextSection = '';
  
  if (ragResults.length > 0) {
    contextSection = 'Dados do app:\n';
    for (const entry of ragResults) {
      contextSection += `- ${entry.topic} (${entry.country_name}): ${entry.status === 'green' ? 'Permitido' : entry.status === 'yellow' ? 'Restrições' : 'Proibido'}. ${entry.plain_explanation}\n`;
    }
  }

  const countryContext = context?.countryName ? ` O usuário está navegando em ${context.countryName}.` : '';

  const systemInstructions = `Você é o assistente do Global Rights Guide, um app que informa sobre leis e direitos em diferentes países.

PERSONALIDADE:
- Seja simpático, educado e acolhedor
- Para saudações (oi, olá, tudo bem, etc), responda de forma amigável e pergunte como pode ajudar
- Use emojis com moderação para ser mais expressivo

SUAS CAPACIDADES:
- Explicar o que é permitido, restrito ou proibido em cada país
- Comparar leis entre países diferentes  
- Esclarecer dúvidas sobre liberdade de expressão, comportamento em público, consumo de substâncias e direitos digitais
- Usar dados do nosso banco quando disponíveis

REGRAS:
- Responda SEMPRE em português brasileiro
- Seja conciso: máximo 2-3 parágrafos
- Se tiver dados do app, use-os como base
- Se não souber ou não tiver dados, sugira explorar o app
- Nunca invente leis ou informações

FORMATO DE STATUS:
- ✅ Permitido
- ⚠️ Restrições
- 🚫 Proibido`;

  return `${systemInstructions}

${contextSection}${countryContext}

Pergunta do usuário: ${userMessage}`;
}

/**
 * Main RAG function that combines all steps
 */
export async function performRAG(
  message: string,
  context?: { countryCode?: string; countryName?: string }
): Promise<{ prompt: string; ragResults: RAGResult }> {
  try {
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
  } catch (err) {
    console.error('performRAG error:', err);
    // Return empty results on error
    const keywords = extractKeywords(message);
    const detectedCountries = detectCountries(message);
    return {
      prompt: buildPrompt(message, [], context),
      ragResults: {
        entries: [],
        keywords,
        detectedCountries,
      },
    };
  }
}
