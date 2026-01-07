import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Listar entradas pendentes de moderação
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data, error } = await supabase
      .from('cartilha_entries')
      .select(`
        *,
        countries(name, flag),
        categories(name_key, icon)
      `)
      .eq('moderation_status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching moderation queue:', error);
      return NextResponse.json({ error: 'Erro ao buscar fila' }, { status: 500 });
    }

    // Contar por status
    const { data: counts } = await supabase
      .from('cartilha_entries')
      .select('moderation_status')
      .in('moderation_status', ['pending', 'approved', 'rejected']);

    const stats = {
      pending: counts?.filter(c => c.moderation_status === 'pending').length || 0,
      approved: counts?.filter(c => c.moderation_status === 'approved').length || 0,
      rejected: counts?.filter(c => c.moderation_status === 'rejected').length || 0,
    };

    return NextResponse.json({ entries: data || [], stats });
  } catch (error) {
    console.error('Moderation list error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Aprovar ou rejeitar entrada
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entry_id, action, note, user_email } = body;

    if (!entry_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'ID e ação (approve/reject) são obrigatórios' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Buscar entrada atual
    const { data: oldEntry } = await supabase
      .from('cartilha_entries')
      .select('*')
      .eq('id', entry_id)
      .single();

    // Atualizar status
    const { data: entry, error } = await supabase
      .from('cartilha_entries')
      .update({
        moderation_status: newStatus,
        moderation_note: note || null,
        moderated_at: new Date().toISOString(),
        moderated_by: user_email,
        confidence_score: action === 'approve' ? 1.0 : 0.0,
      })
      .eq('id', entry_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating moderation:', error);
      return NextResponse.json({ error: 'Erro ao moderar entrada' }, { status: 500 });
    }

    // Registrar no audit log
    await supabase.from('entry_audit_log').insert([{
      entry_id,
      action: action === 'approve' ? 'approve' : 'reject',
      old_data: oldEntry,
      new_data: entry,
      user_email,
    }]);

    return NextResponse.json({ 
      entry, 
      message: action === 'approve' ? 'Entrada aprovada' : 'Entrada rejeitada' 
    });
  } catch (error) {
    console.error('Moderation action error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Aprovar múltiplas entradas
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { entry_ids, action, user_email } = body;

    if (!entry_ids || !Array.isArray(entry_ids) || entry_ids.length === 0) {
      return NextResponse.json({ error: 'IDs obrigatórios' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const { error } = await supabase
      .from('cartilha_entries')
      .update({
        moderation_status: newStatus,
        moderated_at: new Date().toISOString(),
        moderated_by: user_email,
        confidence_score: action === 'approve' ? 1.0 : 0.0,
      })
      .in('id', entry_ids);

    if (error) {
      console.error('Error bulk moderation:', error);
      return NextResponse.json({ error: 'Erro ao moderar entradas' }, { status: 500 });
    }

    // Log em batch
    const logs = entry_ids.map(id => ({
      entry_id: id,
      action: action === 'approve' ? 'approve' : 'reject',
      user_email,
    }));
    await supabase.from('entry_audit_log').insert(logs);

    return NextResponse.json({ 
      message: `${entry_ids.length} entradas ${action === 'approve' ? 'aprovadas' : 'rejeitadas'}` 
    });
  } catch (error) {
    console.error('Bulk moderation error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
