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
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ slug: '', name_key: '', icon: '' });
  const [saving, setSaving] = useState(false);
  const [entryCounts, setEntryCounts] = useState<Record<number, number>>({});

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('id');
    setCategories(data || []);
    
    // Get entry counts per category
    const { data: entries } = await supabase.from('cartilha_entries').select('category_id');
    const counts: Record<number, number> = {};
    entries?.forEach((e) => {
      counts[e.category_id] = (counts[e.category_id] || 0) + 1;
    });
    setEntryCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    const { error } = await supabase.from('categories').insert([{
      slug: formData.slug,
      name_key: formData.name_key,
      icon: formData.icon,
    }]);
    
    if (!error) {
      setIsCreating(false);
      setFormData({ slug: '', name_key: '', icon: '' });
      loadCategories();
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingCategory) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('categories')
      .update({
        slug: formData.slug,
        name_key: formData.name_key,
        icon: formData.icon,
      })
      .eq('id', editingCategory.id);
    
    if (!error) {
      setEditingCategory(null);
      loadCategories();
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (entryCounts[id] > 0) {
      alert(`Não é possível excluir. Esta categoria tem ${entryCounts[id]} entradas associadas.`);
      return;
    }
    
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    
    await supabase.from('categories').delete().eq('id', id);
    loadCategories();
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      slug: category.slug,
      name_key: category.name_key,
      icon: category.icon,
    });
  };

  if (loading) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Categorias ({categories.length})</h2>
        <button
          onClick={() => {
            setIsCreating(true);
            setFormData({ slug: '', name_key: '', icon: '' });
          }}
          className="btn btn-primary"
        >
          ➕ Nova Categoria
        </button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingCategory) && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isCreating ? 'Nova Categoria' : `Editando: ${editingCategory?.name_key}`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="search-input"
                placeholder="ex: public-affection"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input
                type="text"
                value={formData.name_key}
                onChange={(e) => setFormData({ ...formData, name_key: e.target.value })}
                className="search-input"
                placeholder="ex: Afeto em público"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ícone (emoji)</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="search-input"
                placeholder="ex: 💑"
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
                setEditingCategory(null);
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
              <th className="px-4 py-3 text-left">Ícone</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Entradas</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 text-2xl">{category.icon}</td>
                <td className="px-4 py-3 font-mono text-sm">{category.slug}</td>
                <td className="px-4 py-3">{category.name_key}</td>
                <td className="px-4 py-3">{entryCounts[category.id] || 0}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => startEdit(category)}
                    className="text-indigo-600 hover:text-indigo-800 mr-3"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
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
