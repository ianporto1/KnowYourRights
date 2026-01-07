'use client';

import { useEffect, useState } from 'react';

interface Entry {
  id: string;
  country_code: string;
  category_id: number;
  topic: string;
  status: 'green' | 'yellow' | 'red';
  legal_basis: string;
  plain_explanation: string;
  cultural_note: string | null;
  moderation_status: string;
  created_at: string;
  countries: { name: string; flag: string };
  categories: { name_key: string; icon: string };
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
}

const statusLabels = {
  green: '🟢 Permitido',
  yellow: '🟡 Restrições',
  red: '🔴 Proibido',
};

export default function ModerationPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    loadEntries();
  }, [filter]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/moderation?status=${filter}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setStats(data.stats || { pending: 0, approved: 0, rejected: 0 });
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (entryId: string, action: 'approve' | 'reject', note?: string) => {
    setProcessing(true);
    try {
      await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId, action, note }),
      });
      loadEntries();
      setExpandedId(null);
      setRejectNote('');
    } catch (error) {
      console.error('Error moderating:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkModerate = async (action: 'approve' | 'reject') => {
    if (selected.size === 0) return;
    setProcessing(true);
    try {
      await fetch('/api/admin/moderation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_ids: Array.from(selected), action }),
      });
      setSelected(new Set());
      loadEntries();
    } catch (error) {
      console.error('Error bulk moderating:', error);
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map(e => e.id)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Moderação de Entradas</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setFilter('pending')}
          className={`p-3 rounded-lg text-center transition-colors ${
            filter === 'pending'
              ? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pendentes</div>
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`p-3 rounded-lg text-center transition-colors ${
            filter === 'approved'
              ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Aprovadas</div>
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`p-3 rounded-lg text-center transition-colors ${
            filter === 'rejected'
              ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Rejeitadas</div>
        </button>
      </div>

      {/* Bulk actions */}
      {filter === 'pending' && entries.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <input
            type="checkbox"
            checked={selected.size === entries.length && entries.length > 0}
            onChange={selectAll}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selected.size > 0 ? `${selected.size} selecionadas` : 'Selecionar todas'}
          </span>
          {selected.size > 0 && (
            <>
              <button
                onClick={() => handleBulkModerate('approve')}
                disabled={processing}
                className="ml-auto px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
              >
                ✓ Aprovar ({selected.size})
              </button>
              <button
                onClick={() => handleBulkModerate('reject')}
                disabled={processing}
                className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
              >
                ✗ Rejeitar ({selected.size})
              </button>
            </>
          )}
        </div>
      )}

      {/* Entries list */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nenhuma entrada {filter === 'pending' ? 'pendente' : filter === 'approved' ? 'aprovada' : 'rejeitada'}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`card p-4 ${
                expandedId === entry.id ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {filter === 'pending' && (
                  <input
                    type="checkbox"
                    checked={selected.has(entry.id)}
                    onChange={() => toggleSelect(entry.id)}
                    className="mt-1 w-4 h-4"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{entry.countries?.flag}</span>
                    <span className="font-medium">{entry.topic}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                      {entry.categories?.icon} {entry.categories?.name_key}
                    </span>
                    <span className="text-xs">{statusLabels[entry.status]}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {entry.plain_explanation}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Base legal: {entry.legal_basis}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    {expandedId === entry.id ? 'Fechar' : 'Detalhes'}
                  </button>
                  {filter === 'pending' && (
                    <>
                      <button
                        onClick={() => handleModerate(entry.id, 'approve')}
                        disabled={processing}
                        className="px-2 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setExpandedId(entry.id)}
                        disabled={processing}
                        className="px-2 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
                      >
                        ✗
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === entry.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>País:</strong> {entry.countries?.flag} {entry.countries?.name}
                    </div>
                    <div>
                      <strong>Categoria:</strong> {entry.categories?.icon} {entry.categories?.name_key}
                    </div>
                    <div className="col-span-2">
                      <strong>Base Legal:</strong>
                      <p className="text-gray-600 dark:text-gray-400">{entry.legal_basis}</p>
                    </div>
                    <div className="col-span-2">
                      <strong>Explicação:</strong>
                      <p className="text-gray-600 dark:text-gray-400">{entry.plain_explanation}</p>
                    </div>
                    {entry.cultural_note && (
                      <div className="col-span-2">
                        <strong>Nota Cultural:</strong>
                        <p className="text-gray-600 dark:text-gray-400">{entry.cultural_note}</p>
                      </div>
                    )}
                  </div>

                  {filter === 'pending' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="block text-sm font-medium mb-2">
                        Motivo da rejeição (opcional):
                      </label>
                      <textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                        rows={2}
                        placeholder="Ex: Informação incorreta, duplicada, etc."
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleModerate(entry.id, 'approve')}
                          disabled={processing}
                          className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
                        >
                          ✓ Aprovar
                        </button>
                        <button
                          onClick={() => handleModerate(entry.id, 'reject', rejectNote)}
                          disabled={processing}
                          className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
                        >
                          ✗ Rejeitar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
