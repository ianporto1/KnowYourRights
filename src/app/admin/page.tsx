'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Stats {
  countries: number;
  categories: number;
  entries: number;
  byStatus: { green: number; yellow: number; red: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [countriesRes, categoriesRes, entriesRes] = await Promise.all([
        supabase.from('countries').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('cartilha_entries').select('status'),
      ]);

      const entries = entriesRes.data || [];
      const byStatus = entries.reduce(
        (acc, e) => {
          acc[e.status as keyof typeof acc]++;
          return acc;
        },
        { green: 0, yellow: 0, red: 0 }
      );

      setStats({
        countries: countriesRes.count || 0,
        categories: categoriesRes.count || 0,
        entries: entries.length,
        byStatus,
      });
      setLoading(false);
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Países', value: stats?.countries, href: '/admin/countries', icon: '🌍' },
    { label: 'Categorias', value: stats?.categories, href: '/admin/categories', icon: '📁' },
    { label: 'Entradas', value: stats?.entries, href: '/admin/entries', icon: '📝' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="card p-4 hover:shadow-lg transition-shadow">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.icon} {card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </Link>
        ))}
        
        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Por Status</p>
          <div className="flex gap-2 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {stats?.byStatus.green}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              {stats?.byStatus.yellow}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {stats?.byStatus.red}
            </span>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/entries" className="btn btn-primary text-sm">
            ➕ Nova Entrada
          </Link>
          <Link href="/" className="btn bg-gray-200 dark:bg-gray-700 text-sm">
            🌍 Ver Site
          </Link>
        </div>
      </div>
    </div>
  );
}
