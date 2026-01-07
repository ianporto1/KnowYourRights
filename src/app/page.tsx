'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

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

export default function Home() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [stats, setStats] = useState<CountryStats>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [freedomRange, setFreedomRange] = useState<[number, number]>([0, 10]);
  const [sortBy, setSortBy] = useState<SortOption>('name');

  useEffect(() => {
    Promise.all([
      fetch('/api/countries').then((res) => res.json()),
      fetch('/api/countries/stats').then((res) => res.json()),
    ]).then(([countriesData, statsData]) => {
      // Handle error responses - ensure we always have arrays/objects
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

  return (
    <main className="min-h-screen p-6 md:p-8 max-w-5xl mx-auto relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Disclaimer */}
      <div className="disclaimer">
        <p className="disclaimer-text">
          ⚠️ Informação educacional. Leis variam por região e mudam com o tempo.
          Este app não oferece aconselhamento jurídico.
        </p>
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          🌍 Global Rights Guide
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">
          Descubra o que é permitido, tolerado ou proibido em cada país
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        <input
          type="text"
          placeholder="🔍 Buscar país..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <div className="flex flex-wrap gap-4 items-center">
          {/* Freedom Index Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
              Índice de liberdade: {freedomRange[0]} - {freedomRange[1]}
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max="10"
                value={freedomRange[0]}
                onChange={(e) => setFreedomRange([Number(e.target.value), freedomRange[1]])}
                className="flex-1"
              />
              <input
                type="range"
                min="0"
                max="10"
                value={freedomRange[1]}
                onChange={(e) => setFreedomRange([freedomRange[0], Number(e.target.value)])}
                className="flex-1"
              />
            </div>
          </div>

          {/* Sort Dropdown */}
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
              Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <option value="name">Nome</option>
              <option value="freedom_desc">Mais livre</option>
              <option value="freedom_asc">Mais restritivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Countries Grid - Compact Flag Icons */}
      {loading ? (
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-20 h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {filtered.map((country, i) => {
            const countryStats = stats[country.code] || { green: 0, yellow: 0, red: 0 };
            return (
              <Link
                key={country.code}
                href={`/${country.code.toLowerCase()}`}
                className="group relative flex flex-col items-center p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:shadow-lg transition-all animate-fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
                title={`${country.name} - Índice: ${country.freedom_index}/10`}
              >
                {/* Flag - usando imagem do flagcdn */}
                <img
                  src={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png`}
                  alt={`Bandeira ${country.name}`}
                  className="w-12 h-8 object-cover rounded mb-1 group-hover:scale-110 transition-transform"
                />
                
                {/* Country Name */}
                <span className="text-xs font-medium text-center text-gray-700 dark:text-gray-300 max-w-[80px] truncate">
                  {country.name}
                </span>
                
                {/* Mini Status Dots */}
                <div className="flex gap-0.5 mt-1">
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

                {/* Freedom Index Ring */}
                <div 
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
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

      {/* No results */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 card">
          <span className="text-4xl mb-4 block">🔍</span>
          <p className="text-gray-500 dark:text-gray-400">Nenhum país encontrado com esses filtros</p>
        </div>
      )}

      {/* Compare Link */}
      <div className="text-center">
        <Link href="/compare" className="btn btn-primary inline-block">
          🔄 Comparar países
        </Link>
      </div>

      {/* Legend */}
      <div className="mt-12 p-6 card">
        <h3 className="font-bold mb-4 text-center">Legenda dos Status</h3>
        <div className="flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="status-badge status-badge-green text-white">🟢</span>
            <span>Permitido</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-badge status-badge-yellow text-white">🟡</span>
            <span>Restrições</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-badge status-badge-red text-white">🔴</span>
            <span>Proibido</span>
          </div>
        </div>
      </div>
    </main>
  );
}
