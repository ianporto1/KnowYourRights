'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Country {
  code: string;
  name: string;
  flag: string;
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
}

const statusConfig = {
  green: { icon: '✓', label: 'Permitido', color: '#22c55e', bg: 'bg-green-100 dark:bg-green-900/30' },
  yellow: { icon: '!', label: 'Restrições', color: '#f59e0b', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  red: { icon: '✕', label: 'Proibido', color: '#ef4444', bg: 'bg-red-100 dark:bg-red-900/30' },
};

export default function ComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparisons, setComparisons] = useState<TopicComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Load initial data
  useEffect(() => {
    Promise.all([
      fetch('/api/countries').then((res) => res.json()),
      fetch('/api/countries/br/cartilha').then((res) => res.json()), // Get categories from any country
    ]).then(([countriesData, cartilhaData]) => {
      setCountries(countriesData);
      setCategories(cartilhaData.categories || []);
    });
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
    }
  }, [selected]);

  const toggleCountry = (code: string) => {
    let newSelected: string[];
    if (selected.includes(code)) {
      newSelected = selected.filter((c) => c !== code);
    } else if (selected.length < 3) {
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
    setLoading(false);
  };

  const selectedCountries = countries.filter(c => selected.includes(c.code));

  // Filter comparisons
  const filteredComparisons = comparisons
    .filter(comp => {
      // Category filter
      if (selectedCategory !== null && comp.category_id !== selectedCategory) {
        return false;
      }
      // Differences filter
      if (showOnlyDifferences) {
        const statuses = comp.entries.map(e => e.entry?.status).filter(Boolean);
        const uniqueStatuses = new Set(statuses);
        return uniqueStatuses.size > 1;
      }
      return true;
    });

  return (
    <main className="min-h-screen p-6 md:p-8 max-w-6xl mx-auto relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Disclaimer */}
      <div className="disclaimer">
        <p className="disclaimer-text">
          ⚠️ Informação educacional. Não é aconselhamento jurídico.
        </p>
      </div>

      <Link href="/" className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-600 mb-6 font-medium">
        ← Voltar para países
      </Link>

      <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
        🔄 Comparar Países
      </h1>

      {/* Country selector */}
      <div className="card p-6 mb-6">
        <label className="block text-sm font-semibold mb-3">
          🌍 Selecione 2 ou 3 países para comparar: 
          <span className="ml-2 px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
            {selected.length}/3
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          {countries.map((c) => (
            <button
              key={c.code}
              onClick={() => toggleCountry(c.code)}
              className={`category-pill ${
                selected.includes(c.code) ? 'category-pill-active' : 'category-pill-inactive'
              }`}
            >
              {c.flag} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {comparisons.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Category filter */}
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                Categoria
              </label>
              <select
                value={selectedCategory ?? ''}
                onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <option value="">Todas</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name_key}
                  </option>
                ))}
              </select>
            </div>

            {/* Differences toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyDifferences}
                onChange={(e) => setShowOnlyDifferences(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm">Mostrar apenas diferenças</span>
            </label>

            {/* Results count */}
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
              {filteredComparisons.length} de {comparisons.length} tópicos
            </span>
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

      {/* Results Table */}
      {!loading && filteredComparisons.length > 0 && (
        <div className="card overflow-hidden overflow-x-auto">
          {/* Header with country flags */}
          <div className="grid border-b bg-gray-50 dark:bg-gray-800/50" style={{ gridTemplateColumns: `200px repeat(${selectedCountries.length}, 1fr)` }}>
            <div className="p-4 font-bold border-r border-gray-200 dark:border-gray-700">Tema</div>
            {selectedCountries.map(c => (
              <div key={c.code} className="p-4 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                <span className="text-3xl block mb-1">{c.flag}</span>
                <span className="font-semibold">{c.name}</span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {filteredComparisons.map((comp) => (
            <div 
              key={comp.topic} 
              className="grid border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
              style={{ gridTemplateColumns: `200px repeat(${selectedCountries.length}, 1fr)` }}
            >
              <div className="p-4 font-medium border-r border-gray-200 dark:border-gray-700 flex items-center">
                {comp.topic}
              </div>
              {comp.entries.map(({ country, entry }) => {
                const config = entry ? statusConfig[entry.status] : null;
                return (
                  <div 
                    key={country?.code} 
                    className={`p-4 border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${config?.bg || ''}`}
                  >
                    {entry ? (
                      <div className="flex flex-col items-center text-center">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold mb-2"
                          style={{ background: config?.color }}
                        >
                          {config?.icon}
                        </div>
                        <span className="font-semibold text-sm mb-1">{config?.label}</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{entry.plain_explanation}</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400">
                        <span className="text-2xl">—</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* No results after filter */}
      {!loading && comparisons.length > 0 && filteredComparisons.length === 0 && (
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
      {filteredComparisons.length > 0 && (
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
    </main>
  );
}
