import { NextResponse } from 'next/server';
import { performRAG } from '@/lib/rag';

// Force dynamic rendering - don't prerender this route
export const dynamic = 'force-dynamic';

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

    // Check if OpenRouter API key is configured
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      // Fallback: return a simple response based on RAG results
      if (ragResults.entries.length === 0) {
        // If we detected countries but found no entries, give a helpful message
        if (ragResults.detectedCountries.length > 0) {
          return NextResponse.json({
            message: `Encontrei o país ${ragResults.detectedCountries.join(', ')} na sua pergunta, mas não consegui buscar os dados. Tente explorar o país diretamente no app.`,
            sources: [],
          });
        }
        return NextResponse.json({
          message: `Não encontrei informações específicas sobre "${message}". Tente explorar os países diretamente no app para encontrar o que procura.`,
          sources: [],
        });
      }

      // Build a response listing multiple entries if available
      let responseText = 'Com base nos dados disponíveis:\n\n';
      
      for (const entry of ragResults.entries.slice(0, 3)) {
        const statusText = entry.status === 'green' ? '✅ Permitido' : entry.status === 'yellow' ? '⚠️ Restrições' : '🚫 Proibido';
        responseText += `**${entry.topic}** (${entry.country_name}): ${statusText}\n${entry.plain_explanation}\n\n`;
      }
      
      responseText += '⚠️ *Esta é uma informação educacional e não constitui aconselhamento jurídico.*';
      
      return NextResponse.json({
        message: responseText,
        sources: ragResults.entries.map((e) => ({
          countryCode: e.country_code,
          topic: e.topic,
          status: e.status,
        })),
      });
    }

    // Call OpenRouter API
    console.log('Calling OpenRouter with key:', apiKey?.substring(0, 10) + '...');
    
    const requestBody = {
      model: 'mistralai/mistral-7b-instruct:free',
      max_tokens: 512,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('OpenRouter response status:', response.status);
    console.log('OpenRouter response:', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('OpenRouter error:', response.status, responseText);
      
      // Fallback to RAG-only response on API error
      if (ragResults.entries.length > 0) {
        const entry = ragResults.entries[0];
        const statusText = entry.status === 'green' ? 'permitido' : entry.status === 'yellow' ? 'tem restrições' : 'é proibido';
        return NextResponse.json({
          message: `**${entry.topic}** em **${entry.country_name}**: ${statusText}.\n\n${entry.plain_explanation}\n\n⚠️ *Informação educacional.*`,
          sources: ragResults.entries.map((e) => ({
            countryCode: e.country_code,
            topic: e.topic,
            status: e.status,
          })),
        });
      }
      
      return NextResponse.json({
        message: `Erro ao conectar: ${response.status}. Explore os países diretamente no app.`,
        sources: [],
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse OpenRouter response:', responseText);
      return NextResponse.json({
        message: ragResults.entries.length > 0 
          ? `**${ragResults.entries[0].topic}**: ${ragResults.entries[0].plain_explanation}`
          : 'Erro ao processar resposta. Explore os países no app.',
        sources: ragResults.entries.map((e) => ({
          countryCode: e.country_code,
          topic: e.topic,
          status: e.status,
        })),
      });
    }
    
    if (!data.choices || data.choices.length === 0) {
      console.error('OpenRouter empty response:', data);
      return NextResponse.json({
        message: ragResults.entries.length > 0 
          ? `**${ragResults.entries[0].topic}**: ${ragResults.entries[0].plain_explanation}`
          : 'Não encontrei informações específicas. Explore os países no app.',
        sources: ragResults.entries.map((e) => ({
          countryCode: e.country_code,
          topic: e.topic,
          status: e.status,
        })),
      });
    }
    
    let assistantMessage = data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta.';
    
    // Clean up model artifacts and leaked context
    assistantMessage = assistantMessage
      .replace(/\[\/INST\]/g, '')
      .replace(/\[INST\]/g, '')
      .replace(/<<SYS>>[\s\S]*?<<\/SYS>>/g, '')
      .replace(/Pergunta do usuário:[\s\S]*/g, '')
      .replace(/⚠️.*?(jurídico|legal)\.?\s*$/gi, '')
      .trim();
    
    // Only remove greeting prefix if there's substantial content after it
    const greetingMatch = assistantMessage.match(/^(Olá!?|Oi!?|Tudo ótimo|Tudo bem).*?[!😊]\s*/i);
    if (greetingMatch && assistantMessage.length > greetingMatch[0].length + 50) {
      // There's more content after greeting, check if it's leaked context
      const afterGreeting = assistantMessage.substring(greetingMatch[0].length);
      if (afterGreeting.includes('Pergunta:') || afterGreeting.includes('[INST]')) {
        assistantMessage = greetingMatch[0].trim();
      }
    }
    
    // If response still contains leaked prompts, extract only the first part
    if (assistantMessage.includes('Pergunta:')) {
      assistantMessage = assistantMessage.split('Pergunta:')[0].trim();
    }
    
    // If response is empty or too short after cleanup, provide a friendly default
    if (!assistantMessage || assistantMessage.length < 5) {
      assistantMessage = 'Olá! 😊 Tudo bem sim! Como posso ajudar você hoje? Pergunte sobre leis e direitos em qualquer país!';
    }

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
