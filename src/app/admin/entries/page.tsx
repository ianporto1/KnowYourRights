'use client';

import { useEffect, useState, useCallback } from 'react';
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

interface SimilarEntry {
  id: string;
  topic: string;
  status: string;
  legal_basis: string;
  plain_explanation: string;
  cultural_note: string | null;
  similarity_score: number;
  similarity_reason: string;
}

interface Country { code: string; name: string; flag: string; }
interface Category { id: number; name_key: string; icon: string; }

const statusLabels = {
  green: '🟢 Permitido',
  yellow: '🟡 Restrições',
  red: '🔴 Proibido',
};

export default function AdminEntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCountry, setFilterCountry] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  
  const [form, setForm] = useState({
    country_code: '',
    category_id: 0,
    topic: '',
    status: 'green' as 'green' | 'yellow' | 'red',
    legal_basis: '',
    plain_explanation: '',
    cultural_note: '',
  });

  // Similarity detection state
  const [similarEntries, setSimilarEntries] = useState<SimilarEntry[]>([]);
  const [checkingSimilarity, setCheckingSimilarity] = useState(false);
  const [showSimilarityModal, setShowSimilarityModal] = useState(false);
  const [selectedSimilar, setSelectedSimilar] = useState<SimilarEntry | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Debounced similarity check
  const checkSimilarity = useCallback(async () => {
    if (!form.country_code || !form.topic || form.topic.length < 3) {
      setSimilarEntries([]);
      return;
    }

    setCheckingSimilarity(true);
    try {
      const response = await fetch('/api/admin/check-similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country_code: form.country_code,
          category_id: form.category_id || undefined,
          topic: form.topic,
          plain_explanation: form.plain_explanation,
          legal_basis: form.legal_basis,
        }),
      });

      const data = await response.json();
      setSimilarEntries(data.similar || []);
    } catch (error) {
      console.error('Error checking similarity:', error);
    } finally {
      setCheckingSimilarity(false);
    }
  }, [form.country_code, form.category_id, form.topic, form.plain_explanation, form.legal_basis]);

  // Check similarity when form changes (debounced)
  useEffect(() => {
    if (!isNew) return;
    
    const timer = setTimeout(() => {
      checkSimilarity();
    }, 500);

    return () => clearTimeout(timer);
  }, [form.topic, form.country_code, form.category_id, isNew, checkSimilarity]);

  const loadData = async () => {
    const [e, c, cat] = await Promise.all([
      supabase.from('cartilha_entries').select('*').order('topic'),
      supabase.from('countries').select('code, name, flag').order('name'),
      supabase.from('categories').select('id, name_key, icon').order('id'),
    ]);
    setEntries(e.data || []);
    setCountries(c.data || []);
    setCategories(cat.data || []);
    setLoading(false);
  };

  const filtered = entries.filter((e) => {
    if (filterCountry && e.country_code !== filterCountry) return false;
    if (filterCategory && e.category_id !== parseInt(filterCategory)) return false;
    if (search && !e.topic.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const startEdit = (entry: Entry) => {
    setEditing(entry);
    setIsNew(false);
    setForm({
      country_code: entry.country_code,
      category_id: entry.category_id,
      topic: entry.topic,
      status: entry.status,
      legal_basis: entry.legal_basis,
      plain_explanation: entry.plain_explanation,
      cultural_note: entry.cultural_note || '',
    });
  };

  const startNew = () => {
    setEditing(null);
    setIsNew(true);
    setSimilarEntries([]);
    setSelectedSimilar(null);
    setForm({
      country_code: filterCountry || '',
      category_id: filterCategory ? parseInt(filterCategory) : 0,
      topic: '',
      status: 'green',
      legal_basis: '',
      plain_explanation: '',
      cultural_note: '',
    });
  };

  const handleOverwrite = (entry: SimilarEntry) => {
    setSelectedSimilar(entry);
    setShowSimilarityModal(true);
  };

  const confirmOverwrite = () => {
    if (!selectedSimilar) return;
    
    // Preenche o formulário com os dados existentes para edição
    setEditing({
      id: selectedSimilar.id,
      country_code: form.country_code,
      category_id: form.category_id,
      topic: selectedSimilar.topic,
      status: selectedSimilar.status as 'green' | 'yellow' | 'red',
      legal_basis: selectedSimilar.legal_basis,
      plain_explanation: selectedSimilar.plain_explanation,
      cultural_note: selectedSimilar.cultural_note,
    });
    setIsNew(false);
    
    // Mantém os novos dados do formulário para sobrescrever
    setForm({
      ...form,
      topic: form.topic || selectedSimilar.topic,
    });
    
    setShowSimilarityModal(false);
    setSimilarEntries([]);
    setSelectedSimilar(null);
  };

  const handleSave = async () => {
    setSaving(true);
    
    if (isNew) {
      await supabase.from('cartilha_entries').insert([{
        country_code: form.country_code,
        category_id: form.category_id,
        topic: form.topic,
        status: form.status,
        legal_basis: form.legal_basis,
        plain_explanation: form.plain_explanation,
        cultural_note: form.cultural_note || null,
      }]);
    } else if (editing) {
      await supabase.from('cartilha_entries').update({
        country_code: form.country_code,
        category_id: form.category_id,
        topic: form.topic,
        status: form.status,
        legal_basis: form.legal_basis,
        plain_explanation: form.plain_explanation,
        cultural_note: form.cultural_note || null,
      }).eq('id', editing.id);
    }
    
    setEditing(null);
    setIsNew(false);
    loadData();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta entrada?')) return;
    await supabase.from('cartilha_entries').delete().eq('id', id);
    loadData();
  };

  const getCountry = (code: string) => countries.find(c => c.code === code);
  const getCategory = (id: number) => categories.find(c => c.id === id);

  if (loading) return <div className="animate-pulse">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Entradas ({filtered.length})</h2>
        <button onClick={startNew} className="btn btn-primary text-sm">➕ Nova</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <option value="">Todos países</option>
          {countries.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <option value="">Todas categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name_key}</option>)}
        </select>
        <input
          type="text"
          placeholder="Buscar tópico..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        />
      </div>

      {/* Form */}
      {(editing || isNew) && (
        <div className="card p-4">
          <h3 className="font-semibold mb-3">{isNew ? 'Nova Entrada' : `Editando: ${editing?.topic}`}</h3>
          
          {/* Similar entries warning */}
          {isNew && similarEntries.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-600 dark:text-amber-400">⚠️</span>
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  Entradas similares encontradas ({similarEntries.length})
                </span>
                {checkingSimilarity && (
                  <span className="text-xs text-amber-600 animate-pulse">Verificando...</span>
                )}
              </div>
              <div className="space-y-2">
                {similarEntries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-amber-100 dark:border-amber-900"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{entry.topic}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          entry.similarity_score >= 80 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          entry.similarity_score >= 60 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {entry.similarity_score}% similar
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {entry.similarity_reason} • {statusLabels[entry.status as keyof typeof statusLabels]}
                      </p>
                    </div>
                    <button
                      onClick={() => handleOverwrite(entry)}
                      className="ml-2 px-3 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
                    >
                      Sobrescrever
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                💡 Clique em &quot;Sobrescrever&quot; para atualizar uma entrada existente com os novos dados.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={form.country_code}
              onChange={(e) => setForm({ ...form, country_code: e.target.value })}
              className="search-input"
            >
              <option value="">País...</option>
              {countries.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
            </select>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: parseInt(e.target.value) })}
              className="search-input"
            >
              <option value={0}>Categoria...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name_key}</option>)}
            </select>
            <input
              type="text"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              className="search-input"
              placeholder="Tópico"
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'green' | 'yellow' | 'red' })}
              className="search-input"
            >
              <option value="green">🟢 Permitido</option>
              <option value="yellow">🟡 Restrições</option>
              <option value="red">🔴 Proibido</option>
            </select>
            <input
              type="text"
              value={form.legal_basis}
              onChange={(e) => setForm({ ...form, legal_basis: e.target.value })}
              className="search-input sm:col-span-2"
              placeholder="Base legal"
            />
            <textarea
              value={form.plain_explanation}
              onChange={(e) => setForm({ ...form, plain_explanation: e.target.value })}
              className="search-input sm:col-span-2 min-h-[80px]"
              placeholder="Explicação"
            />
            <textarea
              value={form.cultural_note}
              onChange={(e) => setForm({ ...form, cultural_note: e.target.value })}
              className="search-input sm:col-span-2 min-h-[60px]"
              placeholder="Nota cultural (opcional)"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => { setEditing(null); setIsNew(false); }} className="btn bg-gray-200 dark:bg-gray-700 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">País</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-left">Tópico</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.slice(0, 100).map((entry) => {
                const country = getCountry(entry.country_code);
                const category = getCategory(entry.category_id);
                return (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2">{country?.flag} {country?.name}</td>
                    <td className="px-3 py-2">{category?.icon} {category?.name_key}</td>
                    <td className="px-3 py-2">{entry.topic}</td>
                    <td className="px-3 py-2">{statusLabels[entry.status]}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => startEdit(entry)} className="text-indigo-600 hover:underline mr-2">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(entry.id)} className="text-red-600 hover:underline">
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div className="p-2 text-center text-sm text-gray-500">
            Mostrando 100 de {filtered.length} entradas. Use os filtros para refinar.
          </div>
        )}
      </div>

      {/* Similarity Confirmation Modal */}
      {showSimilarityModal && selectedSimilar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-lg">Confirmar Sobrescrita</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Você está prestes a atualizar uma entrada existente com os novos dados.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Existing entry */}
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-500">📄</span>
                  <span className="font-medium text-red-800 dark:text-red-200">Entrada Atual (será substituída)</span>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>Tópico:</strong> {selectedSimilar.topic}</p>
                  <p><strong>Status:</strong> {statusLabels[selectedSimilar.status as keyof typeof statusLabels]}</p>
                  <p><strong>Base Legal:</strong> {selectedSimilar.legal_basis || '(vazio)'}</p>
                  <p className="text-gray-600 dark:text-gray-400">{selectedSimilar.plain_explanation}</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <span className="text-2xl">⬇️</span>
              </div>

              {/* New entry */}
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-500">✨</span>
                  <span className="font-medium text-green-800 dark:text-green-200">Novos Dados</span>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>Tópico:</strong> {form.topic || selectedSimilar.topic}</p>
                  <p><strong>Status:</strong> {statusLabels[form.status]}</p>
                  <p><strong>Base Legal:</strong> {form.legal_basis || '(vazio)'}</p>
                  <p className="text-gray-600 dark:text-gray-400">{form.plain_explanation || '(vazio)'}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSimilarityModal(false);
                  setSelectedSimilar(null);
                }}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmOverwrite}
                className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
              >
                Confirmar Sobrescrita
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
