import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Criar entrada com moderação
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      country_code,
      category_id,
      topic,
      status,
      legal_basis,
      plain_explanation,
      cultural_note,
      user_email,
      auto_approve = false,
    } = body;

    // Validação básica
    if (!country_code || !category_id || !topic || !status || !legal_basis || !plain_explanation) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Determinar status de moderação
    const moderationStatus = auto_approve ? 'approved' : 'pending';

    // Inserir entrada
    const { data: entry, error } = await supabase
      .from('cartilha_entries')
      .insert([{
        country_code,
        category_id,
        topic: topic.trim(),
        status,
        legal_basis: legal_basis.trim(),
        plain_explanation: plain_explanation.trim(),
        cultural_note: cultural_note?.trim() || null,
        moderation_status: moderationStatus,
        source: 'admin',
        confidence_score: auto_approve ? 1.0 : 0.8,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating entry:', error);
      return NextResponse.json({ error: 'Erro ao criar entrada' }, { status: 500 });
    }

    // Registrar no audit log
    await supabase.from('entry_audit_log').insert([{
      entry_id: entry.id,
      action: 'create',
      new_data: entry,
      user_email,
    }]);

    return NextResponse.json({ 
      entry, 
      message: moderationStatus === 'pending' 
        ? 'Entrada criada e aguardando moderação' 
        : 'Entrada criada e aprovada'
    });
  } catch (error) {
    console.error('Create entry error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Atualizar entrada
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      country_code,
      category_id,
      topic,
      status,
      legal_basis,
      plain_explanation,
      cultural_note,
      user_email,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    // Buscar entrada atual para o log
    const { data: oldEntry } = await supabase
      .from('cartilha_entries')
      .select('*')
      .eq('id', id)
      .single();

    // Atualizar
    const { data: entry, error } = await supabase
      .from('cartilha_entries')
      .update({
        country_code,
        category_id,
        topic: topic?.trim(),
        status,
        legal_basis: legal_basis?.trim(),
        plain_explanation: plain_explanation?.trim(),
        cultural_note: cultural_note?.trim() || null,
        last_updated: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating entry:', error);
      return NextResponse.json({ error: 'Erro ao atualizar entrada' }, { status: 500 });
    }

    // Registrar no audit log
    await supabase.from('entry_audit_log').insert([{
      entry_id: id,
      action: 'update',
      old_data: oldEntry,
      new_data: entry,
      user_email,
    }]);

    return NextResponse.json({ entry, message: 'Entrada atualizada' });
  } catch (error) {
    console.error('Update entry error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
