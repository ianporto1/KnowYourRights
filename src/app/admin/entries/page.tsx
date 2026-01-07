'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Entry {
  id: string;
  country_code: string;
  category_id: number;
  topic: string;
  status: 'green' | 'yellow' | 'red';
  legal_basis: string;
  plain_explanation: string;
  cultural_note: string | null;
}

interface Country {
  code: string;
  name: string;
  flag: string;
}

interface Category {
  id: number;
  name_key: string;
  icon: string;
}

const statusOptions = [
  { value: 'green', label: '🟢 Permitido', color: 'bg-green-100 text-green-800' },
  { value: 'yellow', label: '🟡 Restrições', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'red', label: '🔴 Proibido', color: 'bg-red-100 text-red-800' },
];

export default function AdminEntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [filterCountry, setFilterCountry] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // Form
  const [formData, setFormData] = useState({
    country_code: '',
    category_id: 0,
    topic: '',
    status: 'green' as 'green' | 'yellow' | 'red',
    legal_basis: '',
    plain_explanation: '',
    cultural_note: '',
  });

  const loadData = async () => {
    const [entriesRes, countriesRes, categoriesRes] = await Promise.all([
      supabase.from('cartilha_entries').select('*').order('topic'),
      supabase.from('countries').select('code, name, flag').order('name'),
      supabase.from('categories').select('id, name_key, icon').order('id'),
    ]);
    
    setEntries(entriesRes.data || []);
    setCountries(countriesRes.data || []);
    setCategories(categoriesRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEntries = entries.filter((e) => {
    if (filterCountry && e.country_code !== filterCountry) return false;
    if (filterCategory && e.category_id !== parseInt(filterCategory)) return false;
    return true;
  });

  const handleCreate = async () => {
    setSaving(true);
    const { error } = await supabase.from('cartilha_entries').insert([{
      country_code: formData.country_code,
      category_id: formData.category_id,
      topic: formData.topic,
      status: formData.status,
      legal_basis: formData.legal_basis,
      plain_explanation: formData.plain_explanation,
      cultural_note: formData.cultural_note || null,
    }]);
    
    if (!error) {
      setIsCreating(false);
      resetForm();
      loadData();
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingEntry) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('cartilha_entries')
      .update({
        country_code: formData.country_code,
        category_id: formData.category_id,
        topic: formData.topic,
        status: formData.status,
        legal_basis: formData.legal_basis,
        plain_explanation: formData.plain_explanation,
        cultural_note: formData.cultural_note || null,
        last_updated: new Date().toISOString(),
      })
      .eq('id', editingEntry.id);
    
    if (!error) {
      setEditingEntry(null);
      loadData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta entrada?')) return;
    await supabase.from('cartilha_entries').delete().eq('id', id);
    loadData();
  };

  const startEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setFormData({
      country_code: entry.country_code,
      category_id: entry.category_id,
      topic: entry.topic,
      status: entry.status,
      legal_basis: entry.legal_basis,
      plain_explanation: entry.plain_explanation,
      cultural_note: entry.cultural_note || '',
    });
  };

  const resetForm = () => {
    setFormData({
      country_code: '',
      category_id: 0,
      topic: '',
      status: 'green',
      legal_basis: '',
      plain_explanation: '',
      cultural_note: '',
    });
  };

  const getCountryName = (code: string) => {
    const country = countries.find((c) => c.code === code);
    return country ? `${country.flag} ${country.name}` : code;
  };

  const getCategoryName = (id: number) => {
    const category = categories.find((c) => c.id === id);
    return category ? `${category.icon} ${category.name_key}` : id;
  };

  if (loading) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Entradas ({filteredEntries.length})</h2>
        <button
          onClick={() => {
            setIsCreating(true);
            resetForm();
          }}
          className="btn btn-primary"
        >
          ➕ Nova Entrada
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">País</label>
          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <option value="">Todos</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Categoria</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name_key}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingEntry) && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isCreating ? 'Nova Entrada' : `Editando: ${editingEntry?.topic}`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">País</label>
              <select
                value={formData.country_code}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                className="search-input"
              >
                <option value="">Selecione...</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                className="search-input"
              >
                <option value={0}>Selecione...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name_key}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tópico</label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="search-input"
                placeholder="ex: Beijo em público"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'green' | 'yellow' | 'red' })}
                className="search-input"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Base Legal</label>
              <input
                type="text"
                value={formData.legal_basis}
                onChange={(e) => setFormData({ ...formData, legal_basis: e.target.value })}
                className="search-input"
                placeholder="ex: Constituição Federal, Art. 5º"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Explicação</label>
              <textarea
                value={formData.plain_explanation}
                onChange={(e) => setFormData({ ...formData, plain_explanation: e.target.value })}
                className="search-input min-h-[100px]"
                placeholder="Explicação em linguagem simples..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Nota Cultural (opcional)</label>
              <textarea
                value={formData.cultural_note}
                onChange={(e) => setFormData({ ...formData, cultural_note: e.target.value })}
                className="search-input min-h-[80px]"
                placeholder="Contexto cultural adicional..."
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
                setEditingEntry(null);
              }}
              className="btn bg-gray-200 dark:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">País</th>
              <th className="px-4 py-3 text-left">Categoria</th>
              <th className="px-4 py-3 text-left">Tópico</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEntries.map((entry) => {
              const statusOpt = statusOptions.find((s) => s.value === entry.status);
              return (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">{getCountryName(entry.country_code)}</td>
                  <td className="px-4 py-3">{getCategoryName(entry.category_id)}</td>
                  <td className="px-4 py-3">{entry.topic}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusOpt?.color}`}>
                      {statusOpt?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(entry)}
                      className="text-indigo-600 hover:text-indigo-800 mr-3"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
