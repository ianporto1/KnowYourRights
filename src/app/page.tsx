'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import dynamic from 'next/dynamic';

const InteractiveGlobe = dynamic(() => import('@/components/InteractiveGlobe'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Carregando globo...</p>
      </div>
    </div>
  ),
});

interface Country {
  code: string;
  name: string;
  flag: string;
  freedom_index: number;
}

interface CountryStats {
  [code: string]: { green: number; yellow: number; red: number };
}

type SortOption = 'name' | 'freedom_asc' | 'freedom_desc';
type ViewMode = 'globe' | 'grid';

export default function Home() {
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [stats, setStats] = useState<CountryStats>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [freedomRange, setFreedomRange] = useState<[number, number]>([0, 10]);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('globe');

  useEffect(() => {
    Promise.all([
      fetch('/api/countries').then((res) => res.json()),
      fetch('/api/countries/stats').then((res) => res.json()),
    ]).then(([countriesData, statsData]) => {
      setCountries(Array.isArray(countriesData) ? countriesData : []);
      setStats(statsData && !statsData.error ? statsData : {});
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load data:', err);
      setCountries([]);
      setStats({});
      setLoading(false);
    });
  }, []);

  const filtered = countries
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => c.freedom_index >= freedomRange[0] && c.freedom_index <= freedomRange[1])
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'freedom_asc') return a.freedom_index - b.freedom_index;
      return b.freedom_index - a.freedom_index;
    });

  const getFreedomColor = (index: number) => {
    if (index >= 7) return '#22c55e';
    if (index >= 5) return '#f59e0b';
    return '#ef4444';
  };

  const handleCountryClick = (countryCode: string) => {
    router.push(`/${countryCode}`);
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto relative">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="disclaimer">
        <p className="disclaimer-text">
          ⚠️ Informação educacional. Leis variam por região e mudam com o tempo.
          Este app não oferece aconselhamento jurídico.
        </p>
      </div>

      <div className="text-center mb-8 lg:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
          🌍 Global Rights Guide
        </h1>
        <p className="text-base lg:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Descubra o que é permitido, tolerado ou proibido em cada país
        </p>
      </div>

      <div className="flex justify-center mb-6 lg:mb-8">
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === 'globe' ? 'active' : ''}`}
            onClick={() => setViewMode('globe')}
          >
            🌐 Globo
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            📋 Lista
          </button>
        </div>
      </div>

      {viewMode === 'globe' && !loading && (
        <div className="mb-8 lg:mb-12">
          <InteractiveGlobe
            countries={countries}
            stats={stats}
            onCountryClick={handleCountryClick}
          />
        </div>
      )}

      {viewMode === 'grid' && (
        <>
          <div className="space-y-4 mb-8 lg:mb-10">
            <input
              type="text"
              placeholder="🔍 Buscar país..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input search-input-lg"
            />

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 min-w-[200px] w-full sm:w-auto">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Índice de liberdade: {freedomRange[0]} - {freedomRange[1]}
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={freedomRange[0]}
                    onChange={(e) => setFreedomRange([Number(e.target.value), freedomRange[1]])}
                    className="flex-1 accent-indigo-500"
                  />
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={freedomRange[1]}
                    onChange={(e) => setFreedomRange([freedomRange[0], Number(e.target.value)])}
                    className="flex-1 accent-indigo-500"
                  />
                </div>
              </div>

              <div className="w-full sm:w-auto">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Ordenar por
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium cursor-pointer hover:border-indigo-500 transition-colors"
                >
                  <option value="name">Nome</option>
                  <option value="freedom_desc">Mais livre</option>
                  <option value="freedom_asc">Mais restritivo</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 lg:gap-4 mb-10">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 lg:gap-4 mb-10 stagger-children">
              {filtered.map((country) => {
                const countryStats = stats[country.code] || { green: 0, yellow: 0, red: 0 };
                return (
                  <Link
                    key={country.code}
                    href={`/${country.code.toLowerCase()}`}
                    className="group relative flex flex-col items-center p-3 lg:p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:shadow-lg transition-all card-interactive"
                    title={`${country.name} - Índice: ${country.freedom_index}/10`}
                  >
                    <img
                      src={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png`}
                      alt={`Bandeira ${country.name}`}
                      className="w-12 h-8 lg:w-14 lg:h-10 object-cover rounded mb-2 group-hover:scale-110 transition-transform shadow-sm"
                    />
                    
                    <span className="text-xs lg:text-sm font-medium text-center text-gray-700 dark:text-gray-300 max-w-[80px] lg:max-w-[100px] truncate">
                      {country.name}
                    </span>
                    
                    <div className="flex gap-1 mt-1.5">
                      {countryStats.green > 0 && (
                        <span className="w-2 h-2 rounded-full bg-green-500" title={`${countryStats.green} permitidos`} />
                      )}
                      {countryStats.yellow > 0 && (
                        <span className="w-2 h-2 rounded-full bg-yellow-500" title={`${countryStats.yellow} restrições`} />
                      )}
                      {countryStats.red > 0 && (
                        <span className="w-2 h-2 rounded-full bg-red-500" title={`${countryStats.red} proibidos`} />
                      )}
                    </div>

                    <div 
                      className="absolute -bottom-1 -right-1 w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center text-[10px] lg:text-xs font-bold text-white shadow-md"
                      style={{ background: getFreedomColor(country.freedom_index) }}
                      title={`Índice de liberdade: ${country.freedom_index}/10`}
                    >
                      {country.freedom_index}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 lg:py-16 card">
              <span className="text-4xl lg:text-5xl mb-4 block">🔍</span>
              <p className="text-gray-500 dark:text-gray-400 text-base lg:text-lg">Nenhum país encontrado com esses filtros</p>
            </div>
          )}
        </>
      )}

      <div className="text-center mt-8 lg:mt-12">
        <Link href="/compare" className="btn btn-primary inline-flex text-base lg:text-lg px-8 py-3">
          🔄 Comparar países
        </Link>
      </div>

    </main>
  );
}
