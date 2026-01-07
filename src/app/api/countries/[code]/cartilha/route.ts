import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // Get country
  const { data: country, error: countryError } = await supabase
    .from('countries')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (countryError || !country) {
    return NextResponse.json({ error: 'Country not found' }, { status: 404 });
  }

  // Get categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('id');

  // Get entries
  const { data: entries, error: entriesError } = await supabase
    .from('cartilha_entries')
    .select('*')
    .eq('country_code', code.toUpperCase())
    .order('category_id');

  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 });
  }

  return NextResponse.json({
    country,
    categories,
    entries,
  });
}
