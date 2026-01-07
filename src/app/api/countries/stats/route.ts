import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: entries, error } = await supabase
      .from('cartilha_entries')
      .select('country_code, status');

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by country and count statuses
    const stats: Record<string, { green: number; yellow: number; red: number }> = {};

    (entries || []).forEach((entry) => {
      if (!stats[entry.country_code]) {
        stats[entry.country_code] = { green: 0, yellow: 0, red: 0 };
      }
      if (entry.status === 'green') stats[entry.country_code].green++;
      else if (entry.status === 'yellow') stats[entry.country_code].yellow++;
      else if (entry.status === 'red') stats[entry.country_code].red++;
    });

    return NextResponse.json(stats);
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
