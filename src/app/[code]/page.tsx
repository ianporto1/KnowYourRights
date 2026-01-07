'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';

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
    label: 'Permitido'
  },
  yellow: { 
    cardClass: 'card-yellow', 
    badgeClass: 'status-badge-yellow',
    icon: '!',
    label: 'Restrições'
  },
  red: { 
    cardClass: 'card-red', 
    badgeClass: 'status-badge-red',
    icon: '✕',
    label: 'Proibido'
  },
};

export default function CountryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [data, setData] = useState<{
    country: Country;
    categories: Category[];
    entries: Entry[];
  } | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/countries/${code}/cartilha`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        if (d.categories?.length) setActiveCategory(d.categories[0].id);
      });
  }, [code]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Carregando...</div>
      </div>
    );
  }

  const { country, categories, entries } = data;
  const filteredEntries = entries.filter((e) => e.category_id === activeCategory);

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
          ⚠️ Informação educacional. Não é aconselhamento jurídico.
        </p>
      </div>

      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-600 mb-6 font-medium">
        ← Voltar para países
      </Link>

      {/* Country Header Card */}
      <div className="card p-8 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <span className="text-8xl filter drop-shadow-lg">{country.flag}</span>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-bold mb-2">{country.name}</h1>
            <p className="text-gray-500 mb-4">
              Atualizado em {new Date(country.last_updated).toLocaleDateString('pt-BR')}
            </p>
            
            {/* Freedom Index */}
            <div className="max-w-xs mx-auto md:mx-0">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Índice de liberdade</span>
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
      </div>

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

      {/* Topic Cards - Playing Card Style */}
      <div className="cards-grid">
        {filteredEntries.map((entry, i) => {
          const config = statusConfig[entry.status];
          return (
            <div
              key={entry.id}
              className={`card topic-card ${config.cardClass} animate-fade-in`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Corner indicators like playing cards */}
              <div className="topic-card-corner topic-card-corner-top">
                <div className={`status-badge ${config.badgeClass} text-white w-10 h-10 text-lg`}>
                  {config.icon}
                </div>
              </div>
              
              {/* Content */}
              <div className="pt-14 pb-4">
                <h3 className="text-xl font-bold mb-3">{entry.topic}</h3>
                <p className="text-gray-700 mb-4 leading-relaxed">{entry.plain_explanation}</p>
                
                {entry.cultural_note && (
                  <div className="bg-white/50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-600">
                      💡 <span className="font-medium">Nota cultural:</span> {entry.cultural_note}
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-auto">
                  📜 {entry.legal_basis}
                </p>
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
    </main>
  );
}
