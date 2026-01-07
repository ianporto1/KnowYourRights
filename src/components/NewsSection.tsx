'use client';

import { useState, useEffect } from 'react';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  image?: string;
}

interface CountryNews {
  country: string;
  code: string;
  articles: NewsArticle[];
}

interface NewsSectionProps {
  countryCodes: string[];
  countryNames?: Record<string, string>;
}

export function NewsSection({ countryCodes, countryNames = {} }: NewsSectionProps) {
  const [news, setNews] = useState<CountryNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(countryCodes[0] || '');

  useEffect(() => {
    if (countryCodes.length === 0) return;
    
    setLoading(true);
    setError(null);
    setActiveTab(countryCodes[0]);
    
    fetch(`/api/news?countries=${countryCodes.join(',')}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setNews(data.news || []);
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Falha ao carregar notícias');
        setLoading(false);
      });
  }, [countryCodes.join(',')]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Agora há pouco';
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  };

  const activeNews = news.find(n => n.code === activeTab);

  if (loading) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📰 Notícias Recentes
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📰 Notícias Recentes
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="card p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        📰 Notícias Recentes
      </h3>
      
      {/* Country tabs */}
      {countryCodes.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {news.map(({ code, country }) => (
            <button
              key={code}
              onClick={() => setActiveTab(code)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === code
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {countryNames[code] || country}
            </button>
          ))}
        </div>
      )}
      
      {/* News list */}
      <div className="space-y-4">
        {activeNews?.articles.map((article, i) => (
          <a
            key={i}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className="flex gap-3">
              {article.image && (
                <img
                  src={article.image}
                  alt=""
                  className="w-20 h-16 object-cover rounded-lg flex-shrink-0"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 transition-colors">
                  {article.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                  {article.description}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <span>{article.source}</span>
                  <span>•</span>
                  <span>{formatDate(article.publishedAt)}</span>
                </div>
              </div>
            </div>
          </a>
        ))}
        
        {activeNews?.articles.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
            Nenhuma notícia encontrada
          </p>
        )}
      </div>
      
      {/* View more link */}
      {activeNews && activeNews.articles.length > 0 && (
        <a
          href={`https://news.google.com/search?q=${encodeURIComponent(activeNews.country)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm text-indigo-500 hover:text-indigo-600 mt-4 font-medium"
        >
          Ver mais notícias sobre {activeNews.country} →
        </a>
      )}
    </div>
  );
}
