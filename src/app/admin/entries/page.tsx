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
  moderation_status?: string;
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

interface StandardTopic {
  id: number;
  topic_name: string;
  category_id: number;
  description: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: { topic?: string; category?: number };
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

  // Validation & suggestions
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [standardTopics, setStandardTopics] = useState<StandardTopic[]>([]);
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);

  // Similarity detection
  const [similarEntries, setSimilarEntries] = useState<SimilarEntry[]>([]);
  const [checkingSimilarity, setCheckingSimilarity] = useState(false);
  const [showSimilarityModal, setShowSimilarityModal] = useState(false);
  const [selectedSimilar, setSelectedSimilar] = useState<SimilarEntry | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Load standard topics when category changes
  useEffect(() => {
    if (form.category_id > 0) {
      loadStandardTopics(form.category_id);
    }
  }, [form.category_id]);

  // Validate form on changes (debounced)
  const validateForm = useCallback(async () => {
    if (!form.country_code || !form.topic) return;
    
    setValidating(true);
    try {
      const res = await fetch('/api/admin/validate-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setValidation(data);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setValidating(false);
    }
  }, [form]);

  useEffect(() => {
    if (!isNew) return;
    const timer = setTimeout(validateForm, 500);
    return () => clearTimeout(timer);
  }, [form, isNew, validateForm]);

  // Check similarity
  const checkSimilarity = useCallback(async () => {
    if (!form.country_code || !form.topic || form.topic.length < 3) {
      setSimilarEntries([]);
      return;
    }

    setCheckingSimilarity(true);
    try {
      const res = await fetch('/api/admin/check-similarity', {
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
      const data = await res.json();
      setSimilarEntries(data.similar || []);
    } catch (error) {
      console.error('Similarity error:', error);
    } finally {
      setCheckingSimilarity(false);
    }
  }, [form.country_code, form.category_id, form.topic, form.plain_explanation, form.legal_basis]);

  useEffect(() => {
    if (!isNew) return;
    const timer = setTimeout(checkSimilarity, 500);
    return () => clearTimeout(timer);
  }, [form.topic, form.country_code, form.category_id, isNew, checkSimilarity]);

  const loadData = async () => {
    const [e, c, cat] = await Promise.all([
      supabase.from('cartilha_entries').select('*').order('topic').limit(500),
      supabase.from('countries').select('code, name, flag').order('name'),
      supabase.from('categories').select('id, name_key, icon').order('id'),
    ]);
    setEntries(e.data || []);
    setCountries(c.data || []);
    setCategories(cat.data || []);
    setLoading(false);
  };

  const loadStandardTopics = async (categoryId: number) => {
    try {
      const res = await fetch(`/api/admin/standard-topics?category_id=${categoryId}`);
      const data = await res.json();
      setStandardTopics(data.topics || []);
    } catch (error) {
      console.error('Error loading standard topics:', error);
    }
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
    setValidation(null);
    setSimilarEntries([]);
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
    setValidation(null);
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

  const selectStandardTopic = (topic: StandardTopic) => {
    setForm({ ...form, topic: topic.topic_name });
    setShowTopicSuggestions(false);
  };

  const handleOverwrite = (entry: SimilarEntry) => {
    setSelectedSimilar(entry);
    setShowSimilarityModal(true);
  };

  const confirmOverwrite = () => {
    if (!selectedSimilar) return;
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
    setForm({ ...form, topic: form.topic || selectedSimilar.topic });
    setShowSimilarityModal(false);
    setSimilarEntries([]);
    setSelectedSimilar(null);
  };

  const handleSave = async () => {
    // Validate before saving
    if (isNew && validation && !validation.valid) {
      alert('Corrija os erros antes de salvar:\n' + validation.errors.join('\n'));
      return;
    }

    setSaving(true);
    
    if (isNew) {
      // Use new API with moderation
      const res = await fetch('/api/admin/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          auto_approve: true, // Admin entries are auto-approved
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        setSaving(false);
        return;
      }
    } else if (editing) {
      await fetch('/api/admin/entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...form }),
      });
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
          
          {/* Validation errors */}
          {isNew && validation && validation.errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-red-500">❌</span>
                <span className="font-medium text-red-800 dark:text-red-200">Erros de validação</span>
              </div>
              <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                {validation.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {/* Validation warnings */}
          {isNew && validation && validation.warnings.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-yellow-500">⚠️</span>
                <span className="font-medium text-yellow-800 dark:text-yellow-200">Avisos</span>
              </div>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                {validation.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
              </ul>
            </div>
          )}

          {/* Topic suggestion */}
          {isNew && validation?.suggestions?.topic && validation.suggestions.topic !== form.topic && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-blue-500">💡</span>
                  <span className="ml-2 text-sm text-blue-800 dark:text-blue-200">
                    Sugestão: usar tópico padronizado &quot;{validation.suggestions.topic}&quot;
                  </span>
                </div>
                <button
                  onClick={() => setForm({ ...form, topic: validation.suggestions.topic! })}
                  className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  Usar
                </button>
              </div>
            </div>
          )}

          {/* Similar entries warning */}
          {isNew && similarEntries.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-600 dark:text-amber-400">⚠️</span>
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  Entradas similares ({similarEntries.length})
                </span>
                {checkingSimilarity && <span className="text-xs text-amber-600 animate-pulse">Verificando...</span>}
              </div>
              <div className="space-y-2">
                {similarEntries.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-amber-100 dark:border-amber-900">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{entry.topic}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          entry.similarity_score >= 80 ? 'bg-red-100 text-red-700' :
                          entry.similarity_score >= 60 ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {entry.similarity_score}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{entry.similarity_reason}</p>
                    </div>
                    <button
                      onClick={() => handleOverwrite(entry)}
                      className="ml-2 px-3 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded"
                    >
                      Sobrescrever
                    </button>
                  </div>
                ))}
              </div>
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
            
            {/* Topic with suggestions */}
            <div className="relative sm:col-span-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  onFocus={() => setShowTopicSuggestions(true)}
                  className="search-input flex-1"
                  placeholder="Tópico"
                />
                {standardTopics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowTopicSuggestions(!showTopicSuggestions)}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Ver tópicos padronizados"
                  >
                    📋
                  </button>
                )}
              </div>
              
              {/* Standard topics dropdown */}
              {showTopicSuggestions && standardTopics.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2 text-xs text-gray-500 border-b dark:border-gray-700">
                    Tópicos padronizados para esta categoria:
                  </div>
                  {standardTopics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => selectStandardTopic(topic)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="font-medium">{topic.topic_name}</div>
                      {topic.description && (
                        <div className="text-xs text-gray-500">{topic.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'green' | 'yellow' | 'red' })}
              className="search-input"
            >
              <option value="green">🟢 Permitido</option>
              <option value="yellow">🟡 Restrições</option>
              <option value="red">🔴 Proibido</option>
            </select>
            <div className="text-xs text-gray-500 flex items-center">
              {validating && <span className="animate-pulse">Validando...</span>}
              {!validating && validation?.valid && <span className="text-green-600">✓ Válido</span>}
            </div>
            <input
              type="text"
              value={form.legal_basis}
              onChange={(e) => setForm({ ...form, legal_basis: e.target.value })}
              className="search-input sm:col-span-2"
              placeholder="Base legal (ex: Lei nº 1234/2020, Art. 5º)"
            />
            <textarea
              value={form.plain_explanation}
              onChange={(e) => setForm({ ...form, plain_explanation: e.target.value })}
              className="search-input sm:col-span-2 min-h-[80px]"
              placeholder="Explicação clara e objetiva (mín. 20 caracteres)"
            />
            <textarea
              value={form.cultural_note}
              onChange={(e) => setForm({ ...form, cultural_note: e.target.value })}
              className="search-input sm:col-span-2 min-h-[60px]"
              placeholder="Nota cultural (opcional)"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button 
              onClick={handleSave} 
              disabled={saving || (isNew && validation !== null && !validation.valid)} 
              className="btn btn-primary text-sm disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button 
              onClick={() => { setEditing(null); setIsNew(false); setShowTopicSuggestions(false); }} 
              className="btn bg-gray-200 dark:bg-gray-700 text-sm"
            >
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
            Mostrando 100 de {filtered.length}. Use filtros para refinar.
          </div>
        )}
      </div>

      {/* Similarity Modal */}
      {showSimilarityModal && selectedSimilar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-lg">Confirmar Sobrescrita</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-500">📄</span>
                  <span className="font-medium text-red-800 dark:text-red-200">Atual</span>
                </div>
                <p className="text-sm"><strong>Tópico:</strong> {selectedSimilar.topic}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedSimilar.plain_explanation}</p>
              </div>
              <div className="flex justify-center"><span className="text-2xl">⬇️</span></div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-500">✨</span>
                  <span className="font-medium text-green-800 dark:text-green-200">Novo</span>
                </div>
                <p className="text-sm"><strong>Tópico:</strong> {form.topic || selectedSimilar.topic}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{form.plain_explanation || '(vazio)'}</p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
              <button
                onClick={() => { setShowSimilarityModal(false); setSelectedSimilar(null); }}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded"
              >
                Cancelar
              </button>
              <button onClick={confirmOverwrite} className="px-4 py-2 text-sm bg-amber-500 text-white rounded">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
