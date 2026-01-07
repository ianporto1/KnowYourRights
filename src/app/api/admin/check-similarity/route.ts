import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface SimilarEntry {
  id: string;
  topic: string;
  status: string;
  legal_basis: string;
  plain_explanation: string;
  cultural_note: string | null;
  similarity_score: number;
  similarity_reason: string;
}

/**
 * Calcula similaridade entre duas strings usando coeficiente de Jaccard
 */
function jaccardSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => 
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  
  const set1 = new Set(normalize(str1));
  const set2 = new Set(normalize(str2));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Calcula similaridade de Levenshtein normalizada
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - matrix[s1.length][s2.length] / maxLen;
}

/**
 * Verifica se dois tópicos são semanticamente similares
 */
function checkTopicSimilarity(topic1: string, topic2: string): { score: number; reason: string } {
  // Normaliza os tópicos
  const t1 = topic1.toLowerCase().trim();
  const t2 = topic2.toLowerCase().trim();
  
  // Exato match
  if (t1 === t2) {
    return { score: 1.0, reason: 'Tópico idêntico' };
  }
  
  // Um contém o outro
  if (t1.includes(t2) || t2.includes(t1)) {
    return { score: 0.9, reason: 'Tópico contido no outro' };
  }
  
  // Similaridade de Levenshtein para tópicos curtos
  const levenshtein = levenshteinSimilarity(t1, t2);
  if (levenshtein > 0.8) {
    return { score: levenshtein, reason: 'Tópicos muito similares (escrita)' };
  }
  
  // Jaccard para comparar palavras
  const jaccard = jaccardSimilarity(t1, t2);
  if (jaccard > 0.5) {
    return { score: jaccard, reason: 'Tópicos com palavras em comum' };
  }
  
  return { score: Math.max(levenshtein, jaccard), reason: '' };
}

/**
 * Verifica similaridade do conteúdo (explicação + base legal)
 */
function checkContentSimilarity(
  content1: { explanation: string; legal_basis: string },
  content2: { explanation: string; legal_basis: string }
): number {
  const text1 = `${content1.explanation} ${content1.legal_basis}`;
  const text2 = `${content2.explanation} ${content2.legal_basis}`;
  
  return jaccardSimilarity(text1, text2);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { country_code, category_id, topic, plain_explanation, legal_basis } = body;

    if (!country_code || !topic) {
      return NextResponse.json(
        { error: 'País e tópico são obrigatórios' },
        { status: 400 }
      );
    }

    // Busca entradas existentes do mesmo país e categoria
    let query = supabase
      .from('cartilha_entries')
      .select('id, topic, status, legal_basis, plain_explanation, cultural_note')
      .eq('country_code', country_code);
    
    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    const { data: existingEntries, error } = await query;

    if (error) {
      console.error('Error fetching entries:', error);
      return NextResponse.json({ error: 'Erro ao buscar entradas' }, { status: 500 });
    }

    if (!existingEntries || existingEntries.length === 0) {
      return NextResponse.json({ similar: [], hasSimilar: false });
    }

    // Analisa similaridade com cada entrada existente
    const similarEntries: SimilarEntry[] = [];

    for (const entry of existingEntries) {
      const topicSim = checkTopicSimilarity(topic, entry.topic);
      
      // Se o tópico é similar, verifica o conteúdo também
      if (topicSim.score >= 0.4) {
        const contentSim = checkContentSimilarity(
          { explanation: plain_explanation || '', legal_basis: legal_basis || '' },
          { explanation: entry.plain_explanation || '', legal_basis: entry.legal_basis || '' }
        );
        
        // Score combinado: 60% tópico, 40% conteúdo
        const combinedScore = topicSim.score * 0.6 + contentSim * 0.4;
        
        if (combinedScore >= 0.35) {
          similarEntries.push({
            id: entry.id,
            topic: entry.topic,
            status: entry.status,
            legal_basis: entry.legal_basis,
            plain_explanation: entry.plain_explanation,
            cultural_note: entry.cultural_note,
            similarity_score: Math.round(combinedScore * 100),
            similarity_reason: topicSim.reason || `${Math.round(combinedScore * 100)}% similar`,
          });
        }
      }
    }

    // Ordena por score de similaridade
    similarEntries.sort((a, b) => b.similarity_score - a.similarity_score);

    return NextResponse.json({
      similar: similarEntries.slice(0, 5), // Top 5 mais similares
      hasSimilar: similarEntries.length > 0,
    });
  } catch (error) {
    console.error('Similarity check error:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar similaridade' },
      { status: 500 }
    );
  }
}
