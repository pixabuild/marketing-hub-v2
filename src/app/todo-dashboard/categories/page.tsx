"use client";

import { useState } from "react";
import { useTodoContext } from "../TodoContext";

const colors = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
];

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory, loading } = useTodoContext();
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; color: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#6c757d",
  });

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", color: "#6c757d" });
    setShowModal(true);
  };

  const openEditModal = (category: { id: string; name: string; color: string }) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      color: category.color,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);

    if (editingCategory) {
      await updateCategory(editingCategory.id, formData.name.trim(), formData.color);
    } else {
      await addCategory(formData.name.trim(), formData.color);
    }

    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: "", color: "#6c757d" });
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? Todos will be uncategorized.")) return;
    await deleteCategory(id);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="section-top">
        <h2 className="section-title">Categories</h2>
        <div className="section-actions">
          <button className="btn btn-glow" onClick={openAddModal}>
            <span>+</span> Add Category
          </button>
        </div>
      </div>

      <div className="data-list">
        {categories.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3>No categories yet</h3>
            <p>Create categories to organize your todos</p>
          </div>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="data-item" style={{ gridTemplateColumns: "auto 1fr auto auto" }}>
              <div
                className="category-color"
                style={{ backgroundColor: category.color }}
              ></div>
              <div className="data-details">
                <div className="data-title">{category.name}</div>
                <div className="data-subtitle">{category._count.todos} todos</div>
              </div>
              <div className="data-meta">
                <span className="badge" style={{ backgroundColor: category.color + "20", color: category.color }}>
                  {category._count.todos}
                </span>
              </div>
              <div className="data-actions">
                <button className="action-btn edit" onClick={() => openEditModal(category)} title="Edit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="action-btn delete" onClick={() => handleDelete(category.id)} title="Delete">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Category Modal */}
      {showModal && (
        <div className="modal-backdrop open" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingCategory ? "Edit Category" : "Add Category"}</h2>
              <button className="modal-x" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="field">
                  <label>Category Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Work, Personal, etc."
                    required
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label>Color</label>
                  <div className="color-picker">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`color-option ${formData.color === color ? "selected" : ""}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow" disabled={submitting}>
                  {submitting ? "Saving..." : editingCategory ? "Save Changes" : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .category-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }
        .color-picker {
          display: flex;
          gap: 12px;
        }
        .color-option {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .color-option:hover {
          transform: scale(1.1);
        }
        .color-option.selected {
          border-color: white;
          transform: scale(1.15);
          box-shadow: 0 0 0 3px rgba(255,255,255,0.2);
        }
      `}</style>
    </>
  );
}
