'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Países</p>
          <p className="text-3xl font-bold">{stats?.countries}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Categorias</p>
          <p className="text-3xl font-bold">{stats?.categories}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Entradas</p>
          <p className="text-3xl font-bold">{stats?.entries}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Por Status</p>
          <div className="flex gap-3">
            <span className="flex items-center gap-1 text-green-600">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              {stats?.byStatus.green}
            </span>
            <span className="flex items-center gap-1 text-yellow-600">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              {stats?.byStatus.yellow}
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              {stats?.byStatus.red}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/countries" className="btn btn-primary">
            ➕ Novo País
          </a>
          <a href="/admin/categories" className="btn btn-primary">
            ➕ Nova Categoria
          </a>
          <a href="/admin/entries" className="btn btn-primary">
            ➕ Nova Entrada
          </a>
        </div>
      </div>
    </div>
  );
}
