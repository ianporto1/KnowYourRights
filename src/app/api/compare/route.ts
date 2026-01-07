import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { countries } = body;

  if (!countries || !Array.isArray(countries) || countries.length < 2) {
    return NextResponse.json({ error: 'At least 2 countries required' }, { status: 400 });
  }

  if (countries.length > 3) {
    return NextResponse.json({ error: 'Maximum 3 countries allowed' }, { status: 400 });
  }

  const upperCodes = countries.map((c: string) => c.toUpperCase());

  // Get countries info
  const { data: countriesData } = await supabase
    .from('countries')
    .select('*')
    .in('code', upperCodes);

  // Get ALL entries for selected countries
  const { data: entries } = await supabase
    .from('cartilha_entries')
    .select('*')
    .in('country_code', upperCodes)
    .order('topic');

  // Get unique topics
  const topics = [...new Set(entries?.map(e => e.topic) || [])];

  // Group by topic
  const comparisons = topics.map(topic => {
    const firstEntry = entries?.find(e => e.topic === topic);
    const topicEntries = upperCodes.map(code => {
      const country = countriesData?.find(c => c.code === code);
      const entry = entries?.find(e => e.country_code === code && e.topic === topic);
      return { country, entry: entry || null };
    });
    return { topic, category_id: firstEntry?.category_id || null, entries: topicEntries };
  });

  return NextResponse.json({ comparisons });
}
