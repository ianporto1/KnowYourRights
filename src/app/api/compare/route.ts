import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();
  const { countries } = body;

  if (!countries || !Array.isArray(countries) || countries.length < 2) {
    return NextResponse.json({ error: 'At least 2 countries required' }, { status: 400 });
  }

  if (countries.length > 5) {
    return NextResponse.json({ error: 'Maximum 5 countries allowed' }, { status: 400 });
  }

  const upperCodes = countries.map((c: string) => c.toUpperCase());
  const numCountries = upperCodes.length;

  // Get countries info
  const { data: countriesData } = await supabase
    .from('countries')
    .select('*')
    .in('code', upperCodes);

  // Get categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name_key');

  // Get ALL entries for selected countries
  const { data: entries } = await supabase
    .from('cartilha_entries')
    .select('*')
    .in('country_code', upperCodes)
    .order('topic');

  // Get topics that exist in ALL selected countries (no gaps)
  const topicCounts = new Map<string, number>();
  entries?.forEach(e => {
    topicCounts.set(e.topic, (topicCounts.get(e.topic) || 0) + 1);
  });
  
  // Only include topics that have entries for ALL selected countries
  const completeTopics = [...topicCounts.entries()]
    .filter(([_, count]) => count >= numCountries)
    .map(([topic]) => topic);

  // Group by topic (only complete topics)
  const comparisons = completeTopics.map(topic => {
    const firstEntry = entries?.find(e => e.topic === topic);
    const topicEntries = upperCodes.map(code => {
      const country = countriesData?.find(c => c.code === code);
      const entry = entries?.find(e => e.country_code === code && e.topic === topic);
      return { country, entry: entry || null };
    });
    
    // Calculate if there are differences
    const statuses = topicEntries.map(e => e.entry?.status).filter(Boolean);
    const hasDifferences = new Set(statuses).size > 1;
    
    return { 
      topic, 
      category_id: firstEntry?.category_id || null, 
      entries: topicEntries,
      hasDifferences 
    };
  });

  // Group comparisons by category
  const groupedByCategory = categories?.map(cat => ({
    category: cat,
    comparisons: comparisons.filter(c => c.category_id === cat.id)
  })).filter(g => g.comparisons.length > 0) || [];

  // Calculate statistics (only for complete topics)
  const totalTopics = comparisons.length;
  const topicsWithDifferences = comparisons.filter(c => c.hasDifferences).length;
  const differencePercentage = totalTopics > 0 ? Math.round((topicsWithDifferences / totalTopics) * 100) : 0;

  // Status distribution per country (only for complete topics)
  const countryStats = upperCodes.map(code => {
    const country = countriesData?.find(c => c.code === code);
    const countryEntries = entries?.filter(e => e.country_code === code && completeTopics.includes(e.topic)) || [];
    const green = countryEntries.filter(e => e.status === 'green').length;
    const yellow = countryEntries.filter(e => e.status === 'yellow').length;
    const red = countryEntries.filter(e => e.status === 'red').length;
    return { country, stats: { green, yellow, red, total: countryEntries.length } };
  });

  return NextResponse.json({ 
    comparisons,
    groupedByCategory,
    categories,
    statistics: {
      totalTopics,
      topicsWithDifferences,
      differencePercentage,
      countryStats
    }
  });
}
