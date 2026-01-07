'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Country {
  code: string;
  name: string;
  flag: string;
  freedom_index: number;
}

export default function Home() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/countries')
      .then((res) => res.json())
      .then(setCountries);
  }, []);

  const filtered = countries.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const getFreedomColor = (index: number) => {
    if (index >= 7) return '#22c55e';
    if (index >= 5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <main className="min-h-screen p-6 md:p-8 max-w-5xl mx-auto">
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
        <p className="text-lg text-gray-500">
          Descubra o que é permitido, tolerado ou proibido em cada país
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Buscar país..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input mb-8"
      />

      {/* Countries Grid */}
      <div className="cards-grid mb-10">
        {filtered.map((country, i) => (
          <Link
            key={country.code}
            href={`/${country.code.toLowerCase()}`}
            className="card country-card animate-fade-in"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <span className="country-flag">{country.flag}</span>
            <h2 className="text-xl font-bold mb-2">{country.name}</h2>
            
            {/* Freedom Index Bar */}
            <div className="w-full">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Índice de liberdade</span>
                <span className="font-semibold">{country.freedom_index}/10</span>
              </div>
              <div className="freedom-bar">
                <div 
                  className="freedom-bar-fill"
                  style={{ 
                    width: `${country.freedom_index * 10}%`,
                    background: getFreedomColor(country.freedom_index)
                  }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>

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
