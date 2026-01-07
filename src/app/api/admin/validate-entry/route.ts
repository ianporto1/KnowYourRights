import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: {
    topic?: string;
    category?: number;
  };
}

// Palavras proibidas/spam
const BLOCKED_WORDS = ['spam', 'test123', 'asdf', 'xxx', 'fake'];

// Validação de campos
function validateFields(data: {
  country_code: string;
  category_id: number;
  topic: string;
  status: string;
  legal_basis: string;
  plain_explanation: string;
}): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Campos obrigatórios
  if (!data.country_code || data.country_code.length !== 2) {
    errors.push('País inválido');
  }
  if (!data.category_id || data.category_id < 1) {
    errors.push('Categoria obrigatória');
  }
  if (!data.topic || data.topic.trim().length < 3) {
    errors.push('Tópico deve ter pelo menos 3 caracteres');
  }
  if (!['green', 'yellow', 'red'].includes(data.status)) {
    errors.push('Status inválido');
  }
  if (!data.legal_basis || data.legal_basis.trim().length < 5) {
    errors.push('Base legal deve ter pelo menos 5 caracteres');
  }
  if (!data.plain_explanation || data.plain_explanation.trim().length < 20) {
    errors.push('Explicação deve ter pelo menos 20 caracteres');
  }

  // Validações de qualidade
  if (data.topic && data.topic.length > 100) {
    warnings.push('Tópico muito longo, considere resumir');
  }
  if (data.plain_explanation && data.plain_explanation.length > 1000) {
    warnings.push('Explicação muito longa, considere resumir');
  }

  // Verificar palavras bloqueadas
  const allText = `${data.topic} ${data.legal_basis} ${data.plain_explanation}`.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (allText.includes(word)) {
      errors.push(`Conteúdo contém palavra bloqueada: ${word}`);
    }
  }

  // Verificar se parece com texto genérico/placeholder
  if (/^(test|teste|exemplo|sample|lorem)/i.test(data.topic)) {
    warnings.push('Tópico parece ser um placeholder');
  }

  return { errors, warnings };
}

// Buscar sugestão de tópico padronizado
async function findSuggestedTopic(
  topic: string,
  categoryId?: number
): Promise<{ topic?: string; category?: number }> {
  const normalized = topic.toLowerCase().trim();
  
  let query = supabase
    .from('standard_topics')
    .select('topic_name, category_id, keywords');
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data } = await query;
  
  if (!data || data.length === 0) return {};

  // Encontrar melhor match por keywords
  let bestMatch: { topic_name: string; category_id: number } | null = null;
  let bestScore = 0;

  for (const std of data) {
    let score = 0;
    
    // Match exato no nome
    if (std.topic_name.toLowerCase() === normalized) {
      return { topic: std.topic_name, category: std.category_id };
    }
    
    // Match parcial no nome
    if (std.topic_name.toLowerCase().includes(normalized) || 
        normalized.includes(std.topic_name.toLowerCase())) {
      score += 5;
    }
    
    // Match por keywords
    if (std.keywords) {
      for (const kw of std.keywords) {
        if (normalized.includes(kw)) score += 2;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = std;
    }
  }

  if (bestMatch && bestScore >= 3) {
    return { topic: bestMatch.topic_name, category: bestMatch.category_id };
  }

  return {};
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { country_code, category_id, topic, status, legal_basis, plain_explanation } = body;

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: {},
    };

    // Validar campos
    const { errors, warnings } = validateFields({
      country_code,
      category_id,
      topic,
      status,
      legal_basis,
      plain_explanation,
    });

    result.errors = errors;
    result.warnings = warnings;
    result.valid = errors.length === 0;

    // Buscar sugestão de tópico padronizado
    if (topic && topic.length >= 3) {
      result.suggestions = await findSuggestedTopic(topic, category_id);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { valid: false, errors: ['Erro interno de validação'], warnings: [], suggestions: {} },
      { status: 500 }
    );
  }
}
