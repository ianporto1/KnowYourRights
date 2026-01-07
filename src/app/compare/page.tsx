'use client';

import { useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TravelAdvisoryBadge } from '@/components/TravelAdvisoryBadge';
import { TravelAdvisoryLevel, getTravelAdvisoryConfig } from '@/lib/travel-advisory';
import { NewsSection } from '@/components/NewsSection';

interface Country {
  code: string;
  name: string;
  flag: string;
  freedom_index?: number;
}

interface Category {
  id: number;
  slug: string;
  name_key: string;
  icon: string;
}

interface Entry {
  topic: string;
  status: 'green' | 'yellow' | 'red';
  plain_explanation: string;
  cultural_note: string | null;
  category_id: number;
}

interface TopicComparison {
  topic: string;
  category_id: number;
  entries: { country: Country; entry: Entry | null }[];
  hasDifferences: boolean;
}

interface GroupedComparison {
  category: Category;
  comparisons: TopicComparison[];
}

interface CountryStats {
  country: Country;
  stats: { green: number; yellow: number; red: number; total: number };
  travelAdvisory: TravelAdvisoryLevel;
}

interface Statistics {
  totalTopics: number;
  topicsWithDifferences: number;
  differencePercentage: number;
  countryStats: CountryStats[];
}

const statusConfig = {
  green: { icon: '✓', label: 'Permitido', color: '#22c55e', bg: 'bg-green-100 dark:bg-green-900/30' },
  yellow: { icon: '!', label: 'Restrições', color: '#f59e0b', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  red: { icon: '✕', label: 'Proibido', color: '#ef4444', bg: 'bg-red-100 dark:bg-red-900/30' },
};

// Region mapping for countries
const regionMap: Record<string, string> = {
  // Europe
  'DE': 'Europa', 'FR': 'Europa', 'IT': 'Europa', 'ES': 'Europa', 'PT': 'Europa', 'GB': 'Europa',
  'NL': 'Europa', 'BE': 'Europa', 'AT': 'Europa', 'CH': 'Europa', 'PL': 'Europa', 'CZ': 'Europa',
  'SE': 'Europa', 'NO': 'Europa', 'DK': 'Europa', 'FI': 'Europa', 'IE': 'Europa', 'GR': 'Europa',
  'HU': 'Europa', 'RO': 'Europa', 'BG': 'Europa', 'HR': 'Europa', 'SK': 'Europa', 'SI': 'Europa',
  'LT': 'Europa', 'LV': 'Europa', 'EE': 'Europa', 'UA': 'Europa', 'BY': 'Europa', 'MD': 'Europa',
  'RS': 'Europa', 'BA': 'Europa', 'AL': 'Europa', 'MK': 'Europa', 'ME': 'Europa', 'XK': 'Europa',
  'IS': 'Europa', 'MT': 'Europa', 'CY': 'Europa', 'LU': 'Europa', 'MC': 'Europa', 'AD': 'Europa',
  'SM': 'Europa', 'VA': 'Europa', 'LI': 'Europa',
  // Americas
  'US': 'Américas', 'CA': 'Américas', 'MX': 'Américas', 'BR': 'Américas', 'AR': 'Américas',
  'CL': 'Américas', 'CO': 'Américas', 'PE': 'Américas', 'VE': 'Américas', 'EC': 'Américas',
  'BO': 'Américas', 'PY': 'Américas', 'UY': 'Américas', 'GY': 'Américas', 'SR': 'Américas',
  'CU': 'Américas', 'DO': 'Américas', 'HT': 'Américas', 'JM': 'Américas', 'TT': 'Américas',
  'BS': 'Américas', 'BB': 'Américas', 'GT': 'Américas', 'HN': 'Américas', 'SV': 'Américas',
  'NI': 'Américas', 'CR': 'Américas', 'PA': 'Américas', 'BZ': 'Américas', 'PR': 'Américas',
  // Asia
  'JP': 'Ásia', 'CN': 'Ásia', 'KR': 'Ásia', 'IN': 'Ásia', 'ID': 'Ásia', 'TH': 'Ásia',
  'VN': 'Ásia', 'PH': 'Ásia', 'MY': 'Ásia', 'SG': 'Ásia', 'TW': 'Ásia', 'HK': 'Ásia',
  'PK': 'Ásia', 'BD': 'Ásia', 'LK': 'Ásia', 'NP': 'Ásia', 'MM': 'Ásia', 'KH': 'Ásia',
  'LA': 'Ásia', 'MN': 'Ásia', 'KZ': 'Ásia', 'UZ': 'Ásia', 'TM': 'Ásia', 'KG': 'Ásia',
  'TJ': 'Ásia', 'AF': 'Ásia', 'KP': 'Ásia',
  // Middle East
  'AE': 'Oriente Médio', 'SA': 'Oriente Médio', 'IL': 'Oriente Médio', 'TR': 'Oriente Médio',
  'IR': 'Oriente Médio', 'IQ': 'Oriente Médio', 'SY': 'Oriente Médio', 'JO': 'Oriente Médio',
  'LB': 'Oriente Médio', 'KW': 'Oriente Médio', 'QA': 'Oriente Médio', 'BH': 'Oriente Médio',
  'OM': 'Oriente Médio', 'YE': 'Oriente Médio', 'PS': 'Oriente Médio',
  // Africa
  'ZA': 'África', 'EG': 'África', 'NG': 'África', 'KE': 'África', 'ET': 'África', 'GH': 'África',
  'TZ': 'África', 'MA': 'África', 'DZ': 'África', 'TN': 'África', 'LY': 'África', 'SD': 'África',
  'UG': 'África', 'RW': 'África', 'SN': 'África', 'CI': 'África', 'CM': 'África', 'AO': 'África',
  'MZ': 'África', 'ZW': 'África', 'BW': 'África', 'NA': 'África', 'MU': 'África', 'MG': 'África',
  // Oceania
  'AU': 'Oceania', 'NZ': 'Oceania', 'FJ': 'Oceania', 'PG': 'Oceania', 'WS': 'Oceania',
  'TO': 'Oceania', 'VU': 'Oceania', 'SB': 'Oceania', 'NC': 'Oceania', 'PF': 'Oceania',
};

const regionOrder = ['Américas', 'Europa', 'Ásia', 'Oriente Médio', 'África', 'Oceania', 'Outros'];

type SortOption = 'name' | 'differences' | 'category';

export default function ComparePage() {
  return (
    <Suspense fallback={<ComparePageSkeleton />}>
      <ComparePageContent />
    </Suspense>
  );
}

function ComparePageSkeleton() {
  return (
    <main className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto">
      <div className="text-center py-12">
        <span className="text-4xl animate-spin inline-block">⏳</span>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Carregando...</p>
      </div>
    </main>
  );
}


function ComparePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [countries, setCountries] = useState<Country[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparisons, setComparisons] = useState<TopicComparison[]>([]);
  const [groupedComparisons, setGroupedComparisons] = useState<GroupedComparison[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('category');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const INITIAL_CATEGORIES_TO_SHOW = 3;

  // Load countries
  useEffect(() => {
    fetch('/api/countries').then(res => res.json()).then(setCountries);
  }, []);

  // Load selection from URL
  useEffect(() => {
    const countriesParam = searchParams.get('countries');
    if (countriesParam) {
      const codes = countriesParam.split(',').filter(Boolean);
      setSelected(codes.map(c => c.toUpperCase()));
    }
  }, [searchParams]);

  // Update URL when selection changes
  const updateURL = useCallback((codes: string[]) => {
    const params = new URLSearchParams();
    if (codes.length > 0) {
      params.set('countries', codes.join(',').toLowerCase());
    }
    router.replace(`/compare?${params.toString()}`, { scroll: false });
  }, [router]);

  // Auto-compare when 2+ countries selected
  useEffect(() => {
    if (selected.length >= 2) {
      compare();
    } else {
      setComparisons([]);
      setGroupedComparisons([]);
      setStatistics(null);
    }
  }, [selected]);

  // Expand all categories by default when data loads
  useEffect(() => {
    if (groupedComparisons.length > 0) {
      setExpandedCategories(new Set(groupedComparisons.map(g => g.category.id)));
    }
  }, [groupedComparisons]);

  const toggleCountry = (code: string) => {
    let newSelected: string[];
    if (selected.includes(code)) {
      newSelected = selected.filter((c) => c !== code);
    } else if (selected.length < 5) {
      newSelected = [...selected, code];
    } else {
      return;
    }
    setSelected(newSelected);
    updateURL(newSelected);
  };

  const compare = async () => {
    setLoading(true);
    const res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countries: selected }),
    });
    const data = await res.json();
    setComparisons(data.comparisons || []);
    setGroupedComparisons(data.groupedByCategory || []);
    setStatistics(data.statistics || null);
    setLoading(false);
  };

  // Group countries by region
  const countriesByRegion = useMemo(() => {
    const grouped: Record<string, Country[]> = {};
    countries.forEach(c => {
      const region = regionMap[c.code] || 'Outros';
      if (!grouped[region]) grouped[region] = [];
      grouped[region].push(c);
    });
    // Sort countries within each region
    Object.keys(grouped).forEach(region => {
      grouped[region].sort((a, b) => a.name.localeCompare(b.name));
    });
    return grouped;
  }, [countries]);

  // Filter countries by search
  const filteredCountriesByRegion = useMemo(() => {
    if (!searchQuery.trim()) return countriesByRegion;
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, Country[]> = {};
    Object.entries(countriesByRegion).forEach(([region, list]) => {
      const matches = list.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.code.toLowerCase().includes(query)
      );
      if (matches.length > 0) filtered[region] = matches;
    });
    return filtered;
  }, [countriesByRegion, searchQuery]);

  const selectedCountries = countries.filter(c => selected.includes(c.code));

  // Filter and sort comparisons
  const filteredGrouped = useMemo(() => {
    let result = groupedComparisons;
    
    // Category filter
    if (selectedCategory !== null) {
      result = result.filter(g => g.category.id === selectedCategory);
    }
    
    // Apply filters to comparisons within groups
    result = result.map(group => ({
      ...group,
      comparisons: group.comparisons.filter(comp => {
        if (showOnlyDifferences && !comp.hasDifferences) return false;
        return true;
      })
    })).filter(g => g.comparisons.length > 0);
    
    return result;
  }, [groupedComparisons, selectedCategory, showOnlyDifferences]);

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Link copiado!');
  };

  const totalFiltered = filteredGrouped.reduce((acc, g) => acc + g.comparisons.length, 0);

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Disclaimer */}
      <div className="disclaimer">
        <p className="disclaimer-text">
          ⚠️ Informação educacional. Não é aconselhamento jurídico.
        </p>
      </div>

      <Link href="/" className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-600 mb-6 font-medium transition-colors">
        ← Voltar para países
      </Link>

      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 lg:mb-8 text-center bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
        🔄 Comparar Países
      </h1>

      {/* Country Selector with Search */}
      <div className="card p-4 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              🌍 Selecione 2 a 5 países para comparar
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selected.length}/5 selecionados
            </span>
          </div>
          <input
            type="text"
            placeholder="🔍 Buscar país..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 w-full lg:w-72 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        {/* Selected countries chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            {selectedCountries.map(c => (
              <button
                key={c.code}
                onClick={() => toggleCountry(c.code)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
              >
                <span className="text-lg">{c.flag}</span> {c.name}
                <span className="text-indigo-400 hover:text-indigo-600 ml-1">✕</span>
              </button>
            ))}
          </div>
        )}

        {/* Countries by region */}
        <div className="max-h-72 lg:max-h-80 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
          {regionOrder.map(region => {
            const regionCountries = filteredCountriesByRegion[region];
            if (!regionCountries || regionCountries.length === 0) return null;
            return (
              <div key={region}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 sticky top-0 bg-white dark:bg-gray-900 py-1">
                  {region} ({regionCountries.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {regionCountries.map(c => (
                    <button
                      key={c.code}
                      onClick={() => toggleCountry(c.code)}
                      disabled={selected.length >= 5 && !selected.includes(c.code)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selected.includes(c.code)
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      {c.flag} {c.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics Summary */}
      {statistics && !loading && (
        <div className="card p-6 mb-6 animate-fade-in">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            📊 Resumo da Comparação
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {statistics.totalTopics}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tópicos comparados</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="text-3xl font-bold text-orange-500">
                {statistics.topicsWithDifferences}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Com diferenças</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {statistics.differencePercentage}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Taxa de diferença</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {statistics.totalTopics - statistics.topicsWithDifferences}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leis similares</div>
            </div>
          </div>

          {/* Country stats bars - Mobile optimized */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Distribuição por país</h3>
            {statistics.countryStats.map(({ country, stats, travelAdvisory }) => (
              <div key={country?.code} className="space-y-2">
                {/* Country header row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">{country?.flag}</span>
                  <span className="text-sm font-medium">{country?.name}</span>
                  <TravelAdvisoryBadge level={travelAdvisory} size="sm" />
                </div>
                {/* Stats bar */}
                <div className="flex h-6 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {stats.total > 0 && (
                    <>
                      <div 
                        className="bg-green-500 flex items-center justify-center text-white text-xs font-medium min-w-[24px]"
                        style={{ width: `${(stats.green / stats.total) * 100}%` }}
                        title={`${stats.green} permitidos`}
                      >
                        {stats.green > 0 && stats.green}
                      </div>
                      <div 
                        className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium min-w-[24px]"
                        style={{ width: `${(stats.yellow / stats.total) * 100}%` }}
                        title={`${stats.yellow} com restrições`}
                      >
                        {stats.yellow > 0 && stats.yellow}
                      </div>
                      <div 
                        className="bg-red-500 flex items-center justify-center text-white text-xs font-medium min-w-[24px]"
                        style={{ width: `${(stats.red / stats.total) * 100}%` }}
                        title={`${stats.red} proibidos`}
                      >
                        {stats.red > 0 && stats.red}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters - Mobile optimized */}
      {comparisons.length > 0 && !loading && (
        <div className="card p-4 mb-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
            {/* View mode toggle */}
            <div className="view-toggle w-full sm:w-auto">
              <button
                onClick={() => setViewMode('grouped')}
                className={`view-toggle-btn flex-1 sm:flex-none ${viewMode === 'grouped' ? 'active' : ''}`}
              >
                📂 Agrupado
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`view-toggle-btn flex-1 sm:flex-none ${viewMode === 'table' ? 'active' : ''}`}
              >
                📋 Tabela
              </button>
            </div>

            {/* Category filter */}
            <select
              value={selectedCategory ?? ''}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm w-full sm:w-auto"
            >
              <option value="">Todas categorias</option>
              {groupedComparisons.map(g => (
                <option key={g.category.id} value={g.category.id}>
                  {g.category.icon} {g.category.name_key}
                </option>
              ))}
            </select>

            {/* Differences toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyDifferences}
                onChange={(e) => setShowOnlyDifferences(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm whitespace-nowrap">Apenas diferenças</span>
            </label>

            {/* Share button and count - row on mobile */}
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:ml-auto w-full sm:w-auto">
              <button
                onClick={copyShareLink}
                className="px-3 py-2 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition flex items-center gap-2"
              >
                🔗 Compartilhar
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {totalFiltered}/{comparisons.length} tópicos
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <span className="text-4xl animate-spin inline-block">⏳</span>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Comparando leis...</p>
        </div>
      )}

      {/* Grouped View - Mobile optimized */}
      {!loading && viewMode === 'grouped' && filteredGrouped.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          {(showAllCategories ? filteredGrouped : filteredGrouped.slice(0, INITIAL_CATEGORIES_TO_SHOW)).map((group, groupIndex) => (
            <div key={group.category.id} className="card overflow-hidden" style={{ animationDelay: `${groupIndex * 0.1}s` }}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(group.category.id)}
                className="w-full p-3 sm:p-4 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 transition"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-xl sm:text-2xl flex-shrink-0">{group.category.icon}</span>
                  <span className="font-semibold text-sm sm:text-lg truncate">{group.category.name_key}</span>
                  <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-xs flex-shrink-0">
                    {group.comparisons.length}
                  </span>
                </div>
                <span className="text-lg sm:text-xl transition-transform flex-shrink-0 ml-2" style={{ transform: expandedCategories.has(group.category.id) ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </button>

              {/* Category Content */}
              {expandedCategories.has(group.category.id) && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {group.comparisons.map((comp) => (
                    <div key={comp.topic} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                      {/* Topic name - full width on mobile */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-medium text-sm flex-1">{comp.topic}</span>
                        {comp.hasDifferences && (
                          <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded text-xs flex-shrink-0">
                            Diferente
                          </span>
                        )}
                      </div>
                      
                      {/* Country entries - stack on mobile, grid on desktop */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3">
                        {comp.entries.map(({ country, entry }) => {
                          const config = entry ? statusConfig[entry.status] : null;
                          return (
                            <div 
                              key={country?.code}
                              className={`p-3 rounded-xl ${config?.bg || 'bg-gray-100 dark:bg-gray-800'}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{country?.flag}</span>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate">{country?.name}</span>
                                {entry && (
                                  <div 
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ml-auto flex-shrink-0"
                                    style={{ background: config?.color }}
                                  >
                                    {config?.icon}
                                  </div>
                                )}
                              </div>
                              {entry && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {entry.plain_explanation}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* Show more/less button */}
          {filteredGrouped.length > INITIAL_CATEGORIES_TO_SHOW && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="w-full py-4 text-center text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {showAllCategories ? (
                <>
                  <span>Ver menos</span>
                  <span className="text-lg">↑</span>
                </>
              ) : (
                <>
                  <span>Ver mais {filteredGrouped.length - INITIAL_CATEGORIES_TO_SHOW} categorias</span>
                  <span className="text-lg">↓</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Table View - Mobile optimized with horizontal scroll */}
      {!loading && viewMode === 'table' && filteredGrouped.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${180 + selectedCountries.length * 120}px` }}>
                {/* Header with country flags */}
                <div 
                  className="grid border-b bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10" 
                  style={{ gridTemplateColumns: `140px repeat(${selectedCountries.length}, minmax(100px, 1fr))` }}
                >
                  <div className="p-3 font-bold border-r border-gray-200 dark:border-gray-700 text-sm">Tema</div>
                  {selectedCountries.map(c => (
                    <div key={c.code} className="p-2 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                      <span className="text-xl block">{c.flag}</span>
                      <span className="font-medium text-xs truncate block">{c.name}</span>
                    </div>
                  ))}
                </div>

                {/* Grouped rows */}
                {(showAllCategories ? filteredGrouped : filteredGrouped.slice(0, INITIAL_CATEGORIES_TO_SHOW)).map((group) => (
                  <div key={group.category.id}>
                    {/* Category header row */}
                    <div className="p-2 sm:p-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-base sm:text-lg mr-2">{group.category.icon}</span>
                      <span className="font-semibold text-sm">{group.category.name_key}</span>
                      <span className="ml-2 text-xs text-gray-500">({group.comparisons.length})</span>
                    </div>
                    
                    {/* Topic rows */}
                    {group.comparisons.map((comp) => (
                      <div 
                        key={comp.topic} 
                        className="grid border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
                        style={{ gridTemplateColumns: `140px repeat(${selectedCountries.length}, minmax(100px, 1fr))` }}
                      >
                        <div className="p-2 sm:p-3 font-medium text-xs sm:text-sm border-r border-gray-200 dark:border-gray-700 flex items-center">
                          <span className="line-clamp-2">{comp.topic}</span>
                          {comp.hasDifferences && (
                            <span className="ml-1 w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" title="Diferente"></span>
                          )}
                        </div>
                        {comp.entries.map(({ country, entry }) => {
                          const config = entry ? statusConfig[entry.status] : null;
                          return (
                            <div 
                              key={country?.code} 
                              className={`p-2 border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${config?.bg || ''}`}
                            >
                              {entry ? (
                                <div className="flex flex-col items-center text-center">
                                  <div 
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1"
                                    style={{ background: config?.color }}
                                  >
                                    {config?.icon}
                                  </div>
                                  <span className="font-medium text-[10px] sm:text-xs">{config?.label}</span>
                                </div>
                              ) : (
                                <div className="text-center text-gray-400">—</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Show more/less button for table view */}
          {filteredGrouped.length > INITIAL_CATEGORIES_TO_SHOW && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="w-full py-4 text-center text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {showAllCategories ? (
                <>
                  <span>Ver menos</span>
                  <span className="text-lg">↑</span>
                </>
              ) : (
                <>
                  <span>Ver mais {filteredGrouped.length - INITIAL_CATEGORIES_TO_SHOW} categorias</span>
                  <span className="text-lg">↓</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* No results after filter */}
      {!loading && comparisons.length > 0 && totalFiltered === 0 && (
        <div className="text-center py-12 card">
          <span className="text-4xl mb-4 block">🔍</span>
          <p className="text-gray-500 dark:text-gray-400">Nenhum tópico encontrado com esses filtros</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && selected.length < 2 && (
        <div className="text-center py-16 card">
          <span className="text-6xl mb-4 block">🌍</span>
          <h2 className="text-xl font-semibold mb-2">Selecione pelo menos 2 países</h2>
          <p className="text-gray-500 dark:text-gray-400">A comparação será exibida automaticamente</p>
        </div>
      )}

      {/* Legend */}
      {totalFiltered > 0 && !loading && (
        <div className="mt-8 flex flex-wrap justify-center gap-6">
          {Object.entries(statusConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                style={{ background: config.color }}
              >
                {config.icon}
              </div>
              <span className="text-sm">{config.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* News Section */}
      {selected.length >= 2 && !loading && (
        <div className="mt-8">
          <NewsSection 
            countryCodes={selected} 
            countryNames={Object.fromEntries(selectedCountries.map(c => [c.code, c.name]))}
          />
        </div>
      )}
    </main>
  );
}
