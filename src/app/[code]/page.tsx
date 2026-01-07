'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DonutChart } from '@/components/DonutChart';
import { CountryNavigation } from '@/components/CountryNavigation';
import { SkeletonGrid } from '@/components/SkeletonCard';

interface Country {
  code: string;
  name: string;
  flag: string;
  freedom_index: number;
  last_updated: string;
}

interface Category {
  id: number;
  slug: string;
  name_key: string;
  icon: string;
}

interface Entry {
  id: string;
  country_code: string;
  category_id: number;
  topic: string;
  status: 'green' | 'yellow' | 'red';
  legal_basis: string;
  plain_explanation: string;
  cultural_note: string | null;
  last_updated: string;
}

const statusConfig = {
  green: { 
    cardClass: 'card-green', 
    badgeClass: 'status-badge-green',
    icon: '✓',
    label: 'Permitido',
    color: '#22c55e'
  },
  yellow: { 
    cardClass: 'card-yellow', 
    badgeClass: 'status-badge-yellow',
    icon: '!',
    label: 'Restrições',
    color: '#f59e0b'
  },
  red: { 
    cardClass: 'card-red', 
    badgeClass: 'status-badge-red',
    icon: '✕',
    label: 'Proibido',
    color: '#ef4444'
  },
};

export default function CountryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [data, setData] = useState<{
    country: Country;
    categories: Category[];
    entries: Entry[];
  } | null>(null);
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/countries/${code}/cartilha`).then((res) => res.json()),
      fetch('/api/countries').then((res) => res.json()),
    ]).then(([cartilhaData, countriesData]) => {
      setData(cartilhaData);
      setAllCountries(countriesData);
      if (cartilhaData.categories?.length) setActiveCategory(cartilhaData.categories[0].id);
      setLoading(false);
    });
  }, [code]);

  const copyToClipboard = async (entryId: string, topic: string) => {
    const url = `${window.location.origin}/${code}?topic=${encodeURIComponent(topic)}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(entryId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen p-6 md:p-8 max-w-5xl mx-auto">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-6 animate-pulse" />
        <div className="card p-8 mb-8 animate-pulse">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            </div>
          </div>
        </div>
        <SkeletonGrid count={6} variant="topic" />
      </div>
    );
  }

  const { country, categories, entries } = data;
  
  // Filter entries by category and search
  const filteredEntries = entries
    .filter((e) => e.category_id === activeCategory)
    .filter((e) => 
      searchTerm === '' || 
      e.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.plain_explanation.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Calculate status distribution
  const statusCounts = entries.reduce(
    (acc, e) => {
      acc[e.status]++;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 }
  );

  const chartData = [
    { label: 'Permitido', value: statusCounts.green, color: statusConfig.green.color },
    { label: 'Restrições', value: statusCounts.yellow, color: statusConfig.yellow.color },
    { label: 'Proibido', value: statusCounts.red, color: statusConfig.red.color },
  ];

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
          ⚠️ Informação educacional. Não é aconselhamento jurídico.
        </p>
      </div>

      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-600 mb-4 font-medium">
        ← Voltar para países
      </Link>

      {/* Country Navigation */}
      <CountryNavigation currentCode={code} countries={allCountries} />

      {/* Country Header Card */}
      <div className="card p-8 mb-8">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6 flex-1">
            <span className="text-8xl filter drop-shadow-lg">{country.flag}</span>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-bold mb-2">{country.name}</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Atualizado em {new Date(country.last_updated).toLocaleDateString('pt-BR')}
              </p>
              
              {/* Freedom Index */}
              <div className="max-w-xs mx-auto md:mx-0">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Índice de liberdade</span>
                  <span className="font-bold text-lg">{country.freedom_index}/10</span>
                </div>
                <div className="freedom-bar h-3">
                  <div 
                    className="freedom-bar-fill"
                    style={{ 
                      width: `${country.freedom_index * 10}%`,
                      background: getFreedomColor(country.freedom_index)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="flex-shrink-0">
            <DonutChart data={chartData} size={140} />
          </div>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Buscar tópico..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input mb-6"
      />

      {/* Categories */}
      <div className="flex gap-3 mb-8 flex-wrap justify-center">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`category-pill ${
              activeCategory === cat.id ? 'category-pill-active' : 'category-pill-inactive'
            }`}
          >
            {cat.icon} {cat.name_key}
          </button>
        ))}
      </div>

      {/* Topic Cards */}
      <div className="cards-grid">
        {filteredEntries.map((entry, i) => {
          const config = statusConfig[entry.status];
          const isExpanded = expandedCard === entry.id;
          
          return (
            <div
              key={entry.id}
              className={`card topic-card ${config.cardClass} animate-fade-in cursor-pointer transition-all ${isExpanded ? 'col-span-full' : ''}`}
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => setExpandedCard(isExpanded ? null : entry.id)}
            >
              {/* Corner indicators */}
              <div className="topic-card-corner topic-card-corner-top">
                <div className={`status-badge ${config.badgeClass} text-white w-10 h-10 text-lg`}>
                  {config.icon}
                </div>
              </div>
              
              {/* Content */}
              <div className="pt-14 pb-4">
                <h3 className="text-xl font-bold mb-3">{entry.topic}</h3>
                <p className={`text-gray-700 dark:text-gray-300 mb-4 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                  {entry.plain_explanation}
                </p>
                
                {isExpanded && (
                  <>
                    {entry.cultural_note && (
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          💡 <span className="font-medium">Nota cultural:</span> {entry.cultural_note}
                        </p>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      📜 {entry.legal_basis}
                    </p>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/compare?countries=${code}`}
                        className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                      >
                        🔄 Comparar
                      </Link>
                      <button
                        onClick={() => copyToClipboard(entry.id, entry.topic)}
                        className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        {copiedId === entry.id ? '✓ Copiado!' : '🔗 Compartilhar'}
                      </button>
                    </div>
                  </>
                )}

                {!isExpanded && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Clique para expandir
                  </p>
                )}
              </div>

              {/* Bottom corner */}
              <div className="topic-card-corner topic-card-corner-bottom">
                <div className={`status-badge ${config.badgeClass} text-white w-10 h-10 text-lg`}>
                  {config.icon}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No results */}
      {filteredEntries.length === 0 && (
        <div className="text-center py-12 card">
          <span className="text-4xl mb-4 block">🔍</span>
          <p className="text-gray-500 dark:text-gray-400">Nenhum tópico encontrado</p>
        </div>
      )}
    </main>
  );
}
