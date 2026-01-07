import { NextResponse } from 'next/server';
import { performRAG } from '@/lib/rag';

// Rate limiting - simple in-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    // Simple rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Aguarde um momento.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { message, context } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      );
    }

    // Perform RAG to get context
    const { prompt, ragResults } = await performRAG(message, context);

    // Check if AgentRouter API key is configured
    const apiKey = process.env.AGENTROUTER_API_KEY;
    
    if (!apiKey) {
      // Fallback: return a simple response based on RAG results
      if (ragResults.entries.length === 0) {
        return NextResponse.json({
          message: `Não encontrei informações específicas sobre "${message}". Tente explorar os países diretamente no app para encontrar o que procura.`,
          sources: [],
        });
      }

      // Build a simple response from RAG results
      const entry = ragResults.entries[0];
      const statusText = entry.status === 'green' ? 'permitido' : entry.status === 'yellow' ? 'tem restrições' : 'é proibido';
      
      return NextResponse.json({
        message: `Com base nos dados disponíveis:\n\n**${entry.topic}** em **${entry.country_name}**: ${statusText}.\n\n${entry.plain_explanation}\n\n📜 *Base legal: ${entry.legal_basis}*\n\n⚠️ *Esta é uma informação educacional e não constitui aconselhamento jurídico.*`,
        sources: ragResults.entries.map((e) => ({
          countryCode: e.country_code,
          topic: e.topic,
          status: e.status,
        })),
      });
    }

    // Call AgentRouter API (OpenAI-compatible)
    const response = await fetch('https://agentrouter.org/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4.5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AgentRouter error:', response.status, errorText);
      
      // Return debug info
      return NextResponse.json({
        message: `Debug: API error ${response.status} - ${errorText.substring(0, 300)}`,
      });
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta.';

    return NextResponse.json({
      message: assistantMessage,
      sources: ragResults.entries.map((e) => ({
        countryCode: e.country_code,
        topic: e.topic,
        status: e.status,
      })),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { message: 'Ocorreu um erro. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}
