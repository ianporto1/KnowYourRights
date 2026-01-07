import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search');

    let query = supabase
      .from('standard_topics')
      .select('id, topic_name, category_id, description, keywords')
      .order('topic_name');

    if (categoryId) {
      query = query.eq('category_id', parseInt(categoryId));
    }

    if (search) {
      query = query.ilike('topic_name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching standard topics:', error);
      return NextResponse.json({ error: 'Erro ao buscar tópicos' }, { status: 500 });
    }

    return NextResponse.json({ topics: data || [] });
  } catch (error) {
    console.error('Standard topics error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Adicionar novo tópico padrão
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic_name, category_id, description, keywords } = body;

    if (!topic_name || !category_id) {
      return NextResponse.json(
        { error: 'Nome do tópico e categoria são obrigatórios' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('standard_topics')
      .insert([{ topic_name, category_id, description, keywords }])
      .select()
      .single();

    if (error) {
      console.error('Error creating standard topic:', error);
      return NextResponse.json({ error: 'Erro ao criar tópico' }, { status: 500 });
    }

    return NextResponse.json({ topic: data });
  } catch (error) {
    console.error('Create standard topic error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
