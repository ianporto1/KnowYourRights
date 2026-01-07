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
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', flag: '', freedom_index: 5 });
  const [saving, setSaving] = useState(false);

  const loadCountries = async () => {
    const { data } = await supabase.from('countries').select('*').order('name');
    setCountries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCountries();
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    const { error } = await supabase.from('countries').insert([{
      code: formData.code.toUpperCase(),
      name: formData.name,
      flag: formData.flag,
      freedom_index: formData.freedom_index,
    }]);
    
    if (!error) {
      setIsCreating(false);
      setFormData({ code: '', name: '', flag: '', freedom_index: 5 });
      loadCountries();
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingCountry) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('countries')
      .update({
        name: formData.name,
        flag: formData.flag,
        freedom_index: formData.freedom_index,
      })
      .eq('code', editingCountry.code);
    
    if (!error) {
      setEditingCountry(null);
      loadCountries();
    }
    setSaving(false);
  };

  const handleDelete = async (code: string) => {
    if (!confirm('Tem certeza? Isso também excluirá todas as entradas deste país.')) return;
    
    // Delete entries first
    await supabase.from('cartilha_entries').delete().eq('country_code', code);
    // Then delete country
    await supabase.from('countries').delete().eq('code', code);
    loadCountries();
  };

  const startEdit = (country: Country) => {
    setEditingCountry(country);
    setFormData({
      code: country.code,
      name: country.name,
      flag: country.flag,
      freedom_index: country.freedom_index,
    });
  };

  if (loading) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Países ({countries.length})</h2>
        <button
          onClick={() => {
            setIsCreating(true);
            setFormData({ code: '', name: '', flag: '', freedom_index: 5 });
          }}
          className="btn btn-primary"
        >
          ➕ Novo País
        </button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingCountry) && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isCreating ? 'Novo País' : `Editando: ${editingCountry?.name}`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isCreating && (
              <div>
                <label className="block text-sm font-medium mb-1">Código (ex: BR)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="search-input"
                  maxLength={2}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="search-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bandeira (emoji)</label>
              <input
                type="text"
                value={formData.flag}
                onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                className="search-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Índice de Liberdade: {formData.freedom_index}
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={formData.freedom_index}
                onChange={(e) => setFormData({ ...formData, freedom_index: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={isCreating ? handleCreate : handleUpdate}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingCountry(null);
              }}
              className="btn bg-gray-200 dark:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">Bandeira</th>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Índice</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {countries.map((country) => (
              <tr key={country.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 text-2xl">{country.flag}</td>
                <td className="px-4 py-3 font-mono">{country.code}</td>
                <td className="px-4 py-3">{country.name}</td>
                <td className="px-4 py-3">{country.freedom_index}/10</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => startEdit(country)}
                    className="text-indigo-600 hover:text-indigo-800 mr-3"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(country.code)}
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️ Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
