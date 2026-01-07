'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Category {
  id: number;
  slug: string;
  name_key: string;
  icon: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ slug: '', name_key: '', icon: '' });
  const [saving, setSaving] = useState(false);
  const [entryCounts, setEntryCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('id');
    setCategories(data || []);
    
    const { data: entries } = await supabase.from('cartilha_entries').select('category_id');
    const counts: Record<number, number> = {};
    entries?.forEach((e: { category_id: number }) => {
      counts[e.category_id] = (counts[e.category_id] || 0) + 1;
    });
    setEntryCounts(counts);
    setLoading(false);
  };

  const startEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ slug: cat.slug, name_key: cat.name_key, icon: cat.icon });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    
    await supabase
      .from('categories')
      .update({ slug: form.slug, name_key: form.name_key, icon: form.icon })
      .eq('id', editing.id);
    
    setEditing(null);
    loadCategories();
    setSaving(false);
  };

  if (loading) return <div className="animate-pulse">Carregando...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Categorias ({categories.length})</h2>

      {editing && (
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Editando: {editing.name_key}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="search-input"
              placeholder="Slug"
            />
            <input
              type="text"
              value={form.name_key}
              onChange={(e) => setForm({ ...form, name_key: e.target.value })}
              className="search-input"
              placeholder="Nome"
            />
            <input
              type="text"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="search-input"
              placeholder="Ícone"
            />
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
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left">Categoria</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Entradas</th>
              <th className="px-3 py-2 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-3 py-2">{cat.icon} {cat.name_key}</td>
                <td className="px-3 py-2 font-mono text-xs">{cat.slug}</td>
                <td className="px-3 py-2">{entryCounts[cat.id] || 0}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => startEdit(cat)} className="text-indigo-600 hover:underline">
                    Editar
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
