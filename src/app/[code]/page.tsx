'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DonutChart } from '@/components/DonutChart';
import { CountryNavigation } from '@/components/CountryNavigation';
import { SkeletonGrid } from '@/components/SkeletonCard';
import { TravelAdvisoryBanner } from '@/components/TravelAdvisoryBadge';
import { calculateTravelAdvisory, TravelAdvisoryLevel } from '@/lib/travel-advisory';
import { NewsSection } from '@/components/NewsSection';

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

// Official government/law links per country
const officialLawLinks: Record<string, { url: string; label: string }> = {
  BR: { url: 'https://www.planalto.gov.br/ccivil_03/leis/', label: 'Planalto - Legislação' },
  US: { url: 'https://www.usa.gov/laws-and-regulations', label: 'USA.gov - Laws' },
  DE: { url: 'https://www.gesetze-im-internet.de/', label: 'Gesetze im Internet' },
  JP: { url: 'https://elaws.e-gov.go.jp/', label: 'e-Gov Law Search' },
  AE: { url: 'https://uaelegislation.gov.ae/', label: 'UAE Legislation' },
  FR: { url: 'https://www.legifrance.gouv.fr/', label: 'Légifrance' },
  GB: { url: 'https://www.legislation.gov.uk/', label: 'UK Legislation' },
  IT: { url: 'https://www.normattiva.it/', label: 'Normattiva' },
  ES: { url: 'https://www.boe.es/', label: 'BOE - Legislación' },
  PT: { url: 'https://dre.pt/', label: 'Diário da República' },
  CN: { url: 'https://flk.npc.gov.cn/', label: 'NPC Law Database' },
  IN: { url: 'https://legislative.gov.in/', label: 'India Code' },
  AU: { url: 'https://www.legislation.gov.au/', label: 'Federal Register' },
  CA: { url: 'https://laws-lois.justice.gc.ca/', label: 'Justice Laws' },
  MX: { url: 'https://www.diputados.gob.mx/LeyesBiblio/', label: 'Leyes Federales' },
  AR: { url: 'https://www.argentina.gob.ar/normativa', label: 'InfoLEG' },
  CL: { url: 'https://www.bcn.cl/leychile/', label: 'Ley Chile' },
  CO: { url: 'https://www.suin-juriscol.gov.co/', label: 'SUIN-Juriscol' },
  NL: { url: 'https://wetten.overheid.nl/', label: 'Overheid.nl' },
  BE: { url: 'https://www.ejustice.just.fgov.be/', label: 'Belgisch Staatsblad' },
  CH: { url: 'https://www.fedlex.admin.ch/', label: 'Fedlex' },
  AT: { url: 'https://www.ris.bka.gv.at/', label: 'RIS' },
  SE: { url: 'https://www.riksdagen.se/sv/dokument-och-lagar/', label: 'Riksdagen' },
  NO: { url: 'https://lovdata.no/', label: 'Lovdata' },
  DK: { url: 'https://www.retsinformation.dk/', label: 'Retsinformation' },
  FI: { url: 'https://www.finlex.fi/', label: 'Finlex' },
  PL: { url: 'https://isap.sejm.gov.pl/', label: 'ISAP' },
  RU: { url: 'http://pravo.gov.ru/', label: 'Pravo.gov.ru' },
  KR: { url: 'https://www.law.go.kr/', label: 'Korea Law' },
  SG: { url: 'https://sso.agc.gov.sg/', label: 'Singapore Statutes' },
  NZ: { url: 'https://www.legislation.govt.nz/', label: 'NZ Legislation' },
  ZA: { url: 'https://www.gov.za/documents/acts', label: 'SA Government' },
  IE: { url: 'https://www.irishstatutebook.ie/', label: 'Irish Statute Book' },
  IL: { url: 'https://www.nevo.co.il/', label: 'Nevo Legal Database' },
  TR: { url: 'https://www.mevzuat.gov.tr/', label: 'Mevzuat' },
  SA: { url: 'https://laws.boe.gov.sa/', label: 'Saudi Laws' },
  EG: { url: 'https://manshurat.org/', label: 'Manshurat' },
  TH: { url: 'https://www.krisdika.go.th/', label: 'Krisdika' },
  MY: { url: 'https://www.agc.gov.my/', label: 'AGC Malaysia' },
  ID: { url: 'https://peraturan.bpk.go.id/', label: 'JDIH BPK' },
  PH: { url: 'https://www.officialgazette.gov.ph/', label: 'Official Gazette' },
  VN: { url: 'https://vbpl.vn/', label: 'VBPL' },
};

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

  const [showAlerts, setShowAlerts] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const categoriesRef = useRef<HTMLDivElement>(null);


  // Load favorites and read topics from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem(`favorites-${code}`);
    if (savedFavorites) setFavorites(new Set(JSON.parse(savedFavorites)));
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
      <div className="min-h-screen px-4 py-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
        <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50"><ThemeToggle /></div>
        <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 sm:w-32 mb-4 sm:mb-6 animate-pulse" />
        <div className="card p-4 sm:p-6 md:p-8 mb-4 sm:mb-8 animate-pulse">
          <div className="flex flex-col items-center gap-4 sm:gap-6 md:flex-row">
            <div className="w-20 h-14 sm:w-24 sm:h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1 w-full">
              <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-36 sm:w-48 mb-3 sm:mb-4 mx-auto md:mx-0" />
              <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 sm:w-32 mx-auto md:mx-0" />
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
  // Calculate travel advisory
  const travelAdvisory: TravelAdvisoryLevel = calculateTravelAdvisory(
    country.freedom_index,
    { ...statusCounts, total: entries.length },
    entries.map(e => ({ topic: e.topic, status: e.status }))
  );

  return (
    <main className="min-h-screen px-4 py-4 sm:p-6 md:p-8 max-w-6xl mx-auto mobile-safe-bottom">
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50"><ThemeToggle /></div>
      
      <Link href="/" className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-600 mb-4 sm:mb-6 text-sm">
        ← Voltar
      </Link>

      {/* Travel Advisory Banner */}
      <TravelAdvisoryBanner level={travelAdvisory} countryName={country.name} />

      {/* Country Header Card */}
      <div className="card country-header-card p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
        <div className="flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:items-start">
          {/* Flag and basic info */}
          <div className="flex flex-col items-center md:items-start gap-3 w-full md:w-auto">
            <img
              src={`https://flagcdn.com/w160/${code.toLowerCase()}.png`}
              alt={`Bandeira ${country.name}`}
              className="flag-img w-20 h-14 sm:w-24 sm:h-16 md:w-32 md:h-20 object-cover rounded-lg shadow-lg"
            />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center md:text-left">
              {country.flag} {country.name}
            </h1>
          </div>
          
          {/* Meta info and freedom index */}
          <div className="flex-1 w-full">
            {/* Meta pills */}
            <div className="meta-pills flex flex-wrap justify-center md:justify-start gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span>📍 {meta.region}</span>
              <span className="separator hidden sm:inline">•</span>
              <span>🗣️ {meta.language}</span>
              <span className="separator hidden sm:inline">•</span>
              <span>💰 {meta.currency}</span>
              {officialLawLinks[code.toUpperCase()] && (
                <>
                  <span className="separator hidden sm:inline">•</span>
                  <a 
                    href={officialLawLinks[code.toUpperCase()].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    📜 {officialLawLinks[code.toUpperCase()].label}
                    <span className="text-[10px]">↗</span>
                  </a>
                </>
              )}
            </div>
            
            {/* Freedom index */}
            <div className="freedom-bar-container flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-gray-500">Índice de Liberdade:</span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none sm:w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${country.freedom_index * 10}%`,
                      backgroundColor: getFreedomColor(country.freedom_index)
                    }}
                  />
                </div>
                <span className="font-bold text-sm" style={{ color: getFreedomColor(country.freedom_index) }}>
                  {country.freedom_index}/10
                </span>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Critical Alerts */}
      {showAlerts && criticalAlerts.length > 0 && (
        <div className="alert-card mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="font-bold text-red-700 dark:text-red-400 text-sm sm:text-base">⚠️ Alertas Importantes</h3>
            <button onClick={() => setShowAlerts(false)} className="text-red-500 hover:text-red-700 text-xs sm:text-sm">
              Ocultar
            </button>
          </div>
          <ul className="space-y-1 sm:space-y-2">
            {criticalAlerts.map(alert => (
              <li key={alert.id} className="text-xs sm:text-sm text-red-600 dark:text-red-300 leading-relaxed">
                • <strong>{alert.topic}:</strong> {alert.plain_explanation.slice(0, 80)}...
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions Bar */}
      <div className="actions-bar flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
        <button
          onClick={exportToPDF}
          className="btn btn-secondary text-xs sm:text-sm flex items-center justify-center gap-2"
          disabled={favorites.size === 0}
        >
          📄 Exportar Favoritos ({favorites.size})
        </button>
        <button
          onClick={scrollToCategories}
          className="btn btn-secondary text-xs sm:text-sm flex items-center justify-center gap-2"
        >
          📋 Ver Categorias
        </button>
        <div className="flex-1" />
        <div className="flex gap-1 justify-center sm:justify-end">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-lg text-sm ${viewMode === 'grid' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            ▦
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-lg text-sm ${viewMode === 'list' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
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
        className="search-input mb-4 sm:mb-6"
      />

      {/* Categories */}
      <div ref={categoriesRef} className="category-scroll flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {categoryCounts.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`category-pill whitespace-nowrap flex-shrink-0 ${activeCategory === cat.id ? 'active bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
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
        <div className="card p-6 sm:p-8 text-center">
          <span className="text-3xl sm:text-4xl mb-3 sm:mb-4 block">🔍</span>
          <p className="text-gray-500 text-sm sm:text-base">Nenhuma lei encontrada</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4' : 'flex flex-col gap-2 sm:gap-3'}>
          {filteredEntries.map((entry, i) => {
            const config = statusConfig[entry.status];
            const isExpanded = expandedCard === entry.id;
            const isFavorite = favorites.has(entry.id);
            
            return (
              <div
                key={entry.id}
                className={`card topic-card-mobile ${config.cardClass} p-3 sm:p-4 cursor-pointer transition-all animate-fade-in ${isExpanded ? 'ring-2 ring-indigo-500' : ''} ${viewMode === 'list' ? 'w-full hover:transform-none hover:rotate-0' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => setExpandedCard(isExpanded ? null : entry.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex-1 text-sm sm:text-base leading-tight">
                    {entry.topic}
                  </h3>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => toggleFavorite(entry.id, e)}
                      className="text-base sm:text-lg hover:scale-110 transition-transform p-1"
                    >
                      {isFavorite ? '⭐' : '☆'}
                    </button>
                    <span className={`status-badge-mobile ${config.badgeClass} text-[10px] sm:text-xs px-2 py-1 rounded-full whitespace-nowrap`}>
                      {config.icon} {config.label}
                    </span>
                  </div>
                </div>
                
                <p className={`text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                  {entry.plain_explanation}
                </p>
                
                {isExpanded && (
                  <div className="expanded-content mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 sm:space-y-3 animate-fade-in">
                    <div>
                      <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Base Legal</span>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1">{entry.legal_basis}</p>
                    </div>
                    {entry.cultural_note && (
                      <div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Nota Cultural</span>
                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1">{entry.cultural_note}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(entry.id, entry.topic); }}
                        className="btn btn-secondary text-xs w-full sm:w-auto"
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

      {/* News Section */}
      <div className="mt-8">
        <NewsSection 
          countryCodes={[code.toUpperCase()]} 
          countryNames={{ [code.toUpperCase()]: country.name }}
        />
      </div>

      {/* Country Navigation */}
      <CountryNavigation
        countries={allCountries}
        currentCode={code}
      />
    </main>
  );
}
