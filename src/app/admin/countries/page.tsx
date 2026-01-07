'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Country {
  code: string;
  name: string;
  flag: string;
  freedom_index: number;
}

export default function AdminCountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Country | null>(null);
  const [form, setForm] = useState({ name: '', flag: '', freedom_index: 5 });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    const { data } = await supabase.from('countries').select('*').order('name');
    setCountries(data || []);
    setLoading(false);
  };

  const startEdit = (country: Country) => {
    setEditing(country);
    setForm({ name: country.name, flag: country.flag, freedom_index: country.freedom_index });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    
    await supabase
      .from('countries')
      .update({ name: form.name, flag: form.flag, freedom_index: form.freedom_index })
      .eq('code', editing.code);
    
    setEditing(null);
    loadCountries();
    setSaving(false);
  };

  const filtered = countries.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="animate-pulse">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Países ({countries.length})</h2>
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input max-w-xs"
        />
      </div>

      {editing && (
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Editando: {editing.code}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="search-input"
              placeholder="Nome"
            />
            <input
              type="text"
              value={form.flag}
              onChange={(e) => setForm({ ...form, flag: e.target.value })}
              className="search-input"
              placeholder="Bandeira"
            />
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={form.freedom_index}
                onChange={(e) => setForm({ ...form, freedom_index: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm w-8">{form.freedom_index}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setEditing(null)} className="btn bg-gray-200 dark:bg-gray-700 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left">País</th>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Índice</th>
                <th className="px-3 py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((country) => (
                <tr key={country.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2">{country.flag} {country.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{country.code}</td>
                  <td className="px-3 py-2">{country.freedom_index}/10</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => startEdit(country)} className="text-indigo-600 hover:underline">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
