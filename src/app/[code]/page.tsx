'use client';

import { useEffect, useState, useRef } from 'react';
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

// Country metadata
const countryMeta: Record<string, { region: string; language: string; currency: string; timezone: string; capital: string }> = {
  BR: { region: 'América do Sul', language: 'Português', currency: 'BRL (R$)', timezone: 'UTC-3', capital: 'Brasília' },
  US: { region: 'América do Norte', language: 'Inglês', currency: 'USD ($)', timezone: 'UTC-5 a UTC-10', capital: 'Washington D.C.' },
  DE: { region: 'Europa', language: 'Alemão', currency: 'EUR (€)', timezone: 'UTC+1', capital: 'Berlim' },
  JP: { region: 'Ásia', language: 'Japonês', currency: 'JPY (¥)', timezone: 'UTC+9', capital: 'Tóquio' },
  AE: { region: 'Oriente Médio', language: 'Árabe', currency: 'AED', timezone: 'UTC+4', capital: 'Abu Dhabi' },
  FR: { region: 'Europa', language: 'Francês', currency: 'EUR (€)', timezone: 'UTC+1', capital: 'Paris' },
  GB: { region: 'Europa', language: 'Inglês', currency: 'GBP (£)', timezone: 'UTC+0', capital: 'Londres' },
  IT: { region: 'Europa', language: 'Italiano', currency: 'EUR (€)', timezone: 'UTC+1', capital: 'Roma' },
  ES: { region: 'Europa', language: 'Espanhol', currency: 'EUR (€)', timezone: 'UTC+1', capital: 'Madri' },
  PT: { region: 'Europa', language: 'Português', currency: 'EUR (€)', timezone: 'UTC+0', capital: 'Lisboa' },
  CN: { region: 'Ásia', language: 'Mandarim', currency: 'CNY (¥)', timezone: 'UTC+8', capital: 'Pequim' },
  IN: { region: 'Ásia', language: 'Hindi/Inglês', currency: 'INR (₹)', timezone: 'UTC+5:30', capital: 'Nova Delhi' },
  AU: { region: 'Oceania', language: 'Inglês', currency: 'AUD ($)', timezone: 'UTC+10', capital: 'Camberra' },
  CA: { region: 'América do Norte', language: 'Inglês/Francês', currency: 'CAD ($)', timezone: 'UTC-5 a UTC-8', capital: 'Ottawa' },
  MX: { region: 'América do Norte', language: 'Espanhol', currency: 'MXN ($)', timezone: 'UTC-6', capital: 'Cidade do México' },
};

const defaultMeta = { region: 'Internacional', language: '-', currency: '-', timezone: '-', capital: '-' };

export default function CountryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [data, setData] = useState<{ country: Country; categories: Category[]; entries: Entry[] } | null>(null);
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [readTopics, setReadTopics] = useState<Set<string>>(new Set());
  const [showAlerts, setShowAlerts] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const categoriesRef = useRef<HTMLDivElement>(null);


  // Load favorites and read topics from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem(`favorites-${code}`);
    const savedRead = localStorage.getItem(`read-${code}`);
    if (savedFavorites) setFavorites(new Set(JSON.parse(savedFavorites)));
    if (savedRead) setReadTopics(new Set(JSON.parse(savedRead)));
  }, [code]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavs = new Set(prev);
      if (newFavs.has(id)) newFavs.delete(id);
      else newFavs.add(id);
      localStorage.setItem(`favorites-${code}`, JSON.stringify([...newFavs]));
      return newFavs;
    });
  };

  const markAsRead = (id: string) => {
    setReadTopics(prev => {
      const newRead = new Set(prev);
      newRead.add(id);
      localStorage.setItem(`read-${code}`, JSON.stringify([...newRead]));
      return newRead;
    });
  };

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

  const exportToPDF = () => {
    const selectedEntries = data?.entries.filter(e => favorites.has(e.id)) || [];
    if (selectedEntries.length === 0) {
      alert('Selecione tópicos favoritos para exportar');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Leis - ${data?.country.name}</title>
        <style>body{font-family:sans-serif;padding:40px;} h1{color:#4f46e5;} .entry{margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #e5e7eb;}</style>
        </head><body>
        <h1>${data?.country.flag} ${data?.country.name}</h1>
        <p>Exportado em ${new Date().toLocaleDateString('pt-BR')}</p>
        <hr/>
        ${selectedEntries.map(e => `
          <div class="entry">
            <h3>${e.topic}</h3>
            <p><strong>Status:</strong> ${statusConfig[e.status].label}</p>
            <p>${e.plain_explanation}</p>
            <p><small>${e.legal_basis}</small></p>
          </div>
        `).join('')}
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const scrollToCategories = () => {
    categoriesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen p-6 md:p-8 max-w-6xl mx-auto">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
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
  const meta = countryMeta[code.toUpperCase()] || defaultMeta;
  const criticalAlerts = entries.filter(e => e.status === 'red').slice(0, 5);
  const categoryCounts = categories.map(cat => ({
    ...cat,
    count: entries.filter(e => e.category_id === cat.id).length,
    redCount: entries.filter(e => e.category_id === cat.id && e.status === 'red').length
  }));
  
  const filteredEntries = entries
    .filter((e) => e.category_id === activeCategory)
    .filter((e) => searchTerm === '' || 
      e.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.plain_explanation.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const statusCounts = entries.reduce((acc, e) => { acc[e.status]++; return acc; }, { green: 0, yellow: 0, red: 0 });
  const chartData = [
    { label: 'Permitido', value: statusCounts.green, color: statusConfig.green.color },
    { label: 'Restrições', value: statusCounts.yellow, color: statusConfig.yellow.color },
    { label: 'Proibido', value: statusCounts.red, color: statusConfig.red.color },
  ];
  const getFreedomColor = (index: number) => index >= 7 ? '#22c55e' : index >= 5 ? '#f59e0b' : '#ef4444';
  const readProgress = Math.round((readTopics.size / entries.length) * 100);

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      
      <Link href="/" className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-600 mb-6 text-sm">
        ← Voltar
      </Link>

      {/* Country Header Card */}
      <div className="card p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <img
            src={`https://flagcdn.com/w160/${code.toLowerCase()}.png`}
            alt={`Bandeira ${country.name}`}
            className="w-24 h-16 md:w-32 md:h-20 object-cover rounded-lg shadow-lg"
          />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {country.flag} {country.name}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>📍 {meta.region}</span>
              <span>•</span>
              <span>🗣️ {meta.language}</span>
              <span>•</span>
              <span>💰 {meta.currency}</span>
            </div>
            <div className="mt-3 flex items-center justify-center md:justify-start gap-2">
              <span className="text-sm text-gray-500">Índice de Liberdade:</span>
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${country.freedom_index * 10}%`,
                    backgroundColor: getFreedomColor(country.freedom_index)
                  }}
                />
              </div>
              <span className="font-bold" style={{ color: getFreedomColor(country.freedom_index) }}>
                {country.freedom_index}/10
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <DonutChart data={chartData} size={100} />
            <span className="text-xs text-gray-500">{entries.length} leis</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Progresso de leitura</span>
            <span className="font-medium">{readProgress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${readProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {showAlerts && criticalAlerts.length > 0 && (
        <div className="card card-red p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-red-700 dark:text-red-400">⚠️ Alertas Importantes</h3>
            <button onClick={() => setShowAlerts(false)} className="text-red-500 hover:text-red-700 text-sm">
              Ocultar
            </button>
          </div>
          <ul className="space-y-2">
            {criticalAlerts.map(alert => (
              <li key={alert.id} className="text-sm text-red-600 dark:text-red-300">
                • {alert.topic}: {alert.plain_explanation.slice(0, 100)}...
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={exportToPDF}
          className="btn btn-secondary text-sm"
          disabled={favorites.size === 0}
        >
          📄 Exportar Favoritos ({favorites.size})
        </button>
        <button
          onClick={scrollToCategories}
          className="btn btn-secondary text-sm"
        >
          📋 Ver Categorias
        </button>
        <div className="flex-1" />
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded-lg text-sm ${viewMode === 'grid' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            ▦
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-lg text-sm ${viewMode === 'list' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Buscar leis..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input mb-6"
      />

      {/* Categories */}
      <div ref={categoriesRef} className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
        {categoryCounts.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`category-pill whitespace-nowrap ${activeCategory === cat.id ? 'active' : ''}`}
          >
            {cat.icon} {cat.name_key}
            <span className="ml-1 text-xs opacity-70">({cat.count})</span>
            {cat.redCount > 0 && (
              <span className="ml-1 w-2 h-2 bg-red-500 rounded-full inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Entries Grid/List */}
      {filteredEntries.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="text-4xl mb-4 block">🔍</span>
          <p className="text-gray-500">Nenhuma lei encontrada</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {filteredEntries.map((entry, i) => {
            const config = statusConfig[entry.status];
            const isExpanded = expandedCard === entry.id;
            const isFavorite = favorites.has(entry.id);
            const isRead = readTopics.has(entry.id);
            
            return (
              <div
                key={entry.id}
                className={`card ${config.cardClass} p-4 cursor-pointer transition-all animate-fade-in ${isExpanded ? 'ring-2 ring-indigo-500' : ''} ${isRead ? 'opacity-75' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => {
                  setExpandedCard(isExpanded ? null : entry.id);
                  markAsRead(entry.id);
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex-1">
                    {entry.topic}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => toggleFavorite(entry.id, e)}
                      className="text-lg hover:scale-110 transition-transform"
                    >
                      {isFavorite ? '⭐' : '☆'}
                    </button>
                    <span className={`${config.badgeClass} text-xs px-2 py-1 rounded-full`}>
                      {config.icon} {config.label}
                    </span>
                  </div>
                </div>
                
                <p className={`text-sm text-gray-600 dark:text-gray-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
                  {entry.plain_explanation}
                </p>
                
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 animate-fade-in">
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">Base Legal</span>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{entry.legal_basis}</p>
                    </div>
                    {entry.cultural_note && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">Nota Cultural</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{entry.cultural_note}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(entry.id, entry.topic); }}
                        className="btn btn-secondary text-xs"
                      >
                        {copiedId === entry.id ? '✓ Copiado!' : '🔗 Compartilhar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Country Navigation */}
      <CountryNavigation
        countries={allCountries}
        currentCode={code}
      />
    </main>
  );
}
  return (
    <main className="min-h-screen">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>

      {/* Hero Section */}
      <div className="hero-section relative overflow-hidden">
        <div className="hero-pattern absolute inset-0 opacity-10" />
        <div className="relative max-w-6xl mx-auto px-6 py-12">
          {/* Back & Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white font-medium">
              ← Voltar
            </Link>
            <CountryNavigation currentCode={code} countries={allCountries} />
          </div>

          {/* Country Info */}
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="text-center lg:text-left flex-1">
              <span className="text-9xl filter drop-shadow-2xl mb-4 block">{country.flag}</span>
              <h1 className="text-5xl font-bold text-white mb-2">{country.name}</h1>
              <p className="text-white/70 mb-4">{meta.capital} • {meta.region}</p>
              
              {/* Quick Info Pills */}
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-6">
                <span className="hero-pill">🗣️ {meta.language}</span>
                <span className="hero-pill">💰 {meta.currency}</span>
                <span className="hero-pill">🕐 {meta.timezone}</span>
              </div>

              {/* Freedom Index */}
              <div className="max-w-sm mx-auto lg:mx-0">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/70">Índice de liberdade</span>
                  <span className="font-bold text-white text-xl">{country.freedom_index}/10</span>
                </div>
                <div className="freedom-bar h-4 bg-white/20">
                  <div className="freedom-bar-fill" style={{ width: `${country.freedom_index * 10}%`, background: getFreedomColor(country.freedom_index) }} />
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="hero-stats-card">
              <DonutChart data={chartData} size={160} />
              <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                <div>
                  <span className="text-2xl font-bold text-green-500">{statusCounts.green}</span>
                  <p className="text-xs text-gray-500">Permitido</p>
                </div>
                <div>
                  <span className="text-2xl font-bold text-yellow-500">{statusCounts.yellow}</span>
                  <p className="text-xs text-gray-500">Restrições</p>
                </div>
                <div>
                  <span className="text-2xl font-bold text-red-500">{statusCounts.red}</span>
                  <p className="text-xs text-gray-500">Proibido</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">Total: {entries.length} leis</p>
                {favorites.size > 0 && (
                  <p className="text-sm text-indigo-500">⭐ {favorites.size} favoritos</p>
                )}
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <button onClick={scrollToCategories} className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 hover:text-white animate-bounce">
            ↓ Ver leis
          </button>
        </div>
      </div>

      {/* Critical Alerts Section */}
      {criticalAlerts.length > 0 && showAlerts && (
        <div className="bg-red-50 dark:bg-red-900/20 border-y border-red-200 dark:border-red-800">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                🚨 Atenção - Leis Proibidas
              </h2>
              <button onClick={() => setShowAlerts(false)} className="text-red-400 hover:text-red-600 text-sm">
                Ocultar
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {criticalAlerts.map(alert => (
                <div key={alert.id} className="alert-card flex-shrink-0 w-72">
                  <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">{alert.topic}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{alert.plain_explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Disclaimer */}
        <div className="disclaimer mb-6">
          <p className="disclaimer-text">⚠️ Informação educacional. Não é aconselhamento jurídico.</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Search */}
          <input
            type="text"
            placeholder="🔍 Buscar tópico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input flex-1 min-w-[200px]"
          />
          
          {/* View Toggle */}
          <div className="view-toggle">
            <button onClick={() => setViewMode('grid')} className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}>
              ▦ Grid
            </button>
            <button onClick={() => setViewMode('list')} className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}>
              ☰ Lista
            </button>
          </div>

          {/* Export */}
          <button onClick={exportToPDF} className="btn btn-primary text-sm">
            📄 Exportar ({favorites.size})
          </button>
        </div>

        {/* Reading Progress */}
        {readTopics.size > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Progresso de leitura</span>
              <span className="font-medium">{readProgress}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${readProgress}%` }} />
            </div>
          </div>
        )}

        {/* Sticky Categories Sidebar + Content */}
        <div className="flex gap-6" ref={categoriesRef}>
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-2">
              <h3 className="font-semibold text-gray-500 text-sm mb-3">CATEGORIAS</h3>
              {categoryCounts.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`sidebar-category ${activeCategory === cat.id ? 'active' : ''}`}
                >
                  <span>{cat.icon} {cat.name_key}</span>
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">{cat.count}</span>
                    {cat.redCount > 0 && <span className="text-red-500 text-xs">({cat.redCount}🚫)</span>}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* Mobile Categories */}
          <div className="lg:hidden flex gap-3 mb-6 flex-wrap justify-center w-full">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`category-pill ${activeCategory === cat.id ? 'category-pill-active' : 'category-pill-inactive'}`}
              >
                {cat.icon} {cat.name_key}
              </button>
            ))}
          </div>

          {/* Topic Cards */}
          <div className="flex-1">
            <div className={viewMode === 'grid' ? 'cards-grid' : 'space-y-4'}>
              {filteredEntries.map((entry, i) => {
                const config = statusConfig[entry.status];
                const isExpanded = expandedCard === entry.id;
                const isFavorite = favorites.has(entry.id);
                const isRead = readTopics.has(entry.id);
                
                return (
                  <div
                    key={entry.id}
                    className={`card topic-card ${config.cardClass} animate-fade-in cursor-pointer transition-all ${isExpanded ? 'col-span-full' : ''} ${isRead ? 'opacity-75' : ''}`}
                    style={{ animationDelay: `${i * 0.03}s` }}
                    onClick={() => { setExpandedCard(isExpanded ? null : entry.id); markAsRead(entry.id); }}
                  >
                    {/* Favorite button */}
                    <button
                      onClick={(e) => toggleFavorite(entry.id, e)}
                      className="absolute top-3 right-3 text-xl z-10 hover:scale-125 transition-transform"
                    >
                      {isFavorite ? '⭐' : '☆'}
                    </button>

                    {/* Corner indicators */}
                    <div className="topic-card-corner topic-card-corner-top">
                      <div className={`status-badge ${config.badgeClass} text-white w-10 h-10 text-lg`}>
                        {config.icon}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="pt-14 pb-4 pr-8">
                      <h3 className="text-xl font-bold mb-2">{entry.topic}</h3>
                      {entry.cultural_note && !isExpanded && (
                        <p className="text-xs text-gray-500 mb-2">💡 Tem nota cultural</p>
                      )}
                      <p className={`text-gray-700 dark:text-gray-300 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                        {entry.plain_explanation}
                      </p>
                      
                      {isExpanded && (
                        <>
                          {entry.cultural_note && (
                            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 my-4">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                💡 <span className="font-medium">Nota cultural:</span> {entry.cultural_note}
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">📜 {entry.legal_basis}</p>
                          <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/compare?countries=${code}`} className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
                              🔄 Comparar
                            </Link>
                            <button onClick={() => copyToClipboard(entry.id, entry.topic)} className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                              {copiedId === entry.id ? '✓ Copiado!' : '🔗 Compartilhar'}
                            </button>
                          </div>
                        </>
                      )}
                      {!isExpanded && <p className="text-xs text-gray-400 mt-3">Clique para expandir</p>}
                    </div>

                    {/* Bottom corner */}
                    <div className="topic-card-corner topic-card-corner-bottom">
                      <div className={`status-badge ${config.badgeClass} text-white w-10 h-10 text-lg`}>{config.icon}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredEntries.length === 0 && (
              <div className="text-center py-12 card">
                <span className="text-4xl mb-4 block">🔍</span>
                <p className="text-gray-500 dark:text-gray-400">Nenhum tópico encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
