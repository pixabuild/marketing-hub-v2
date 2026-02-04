"use client";

import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  _count?: { transactions: number };
  total?: number;
}

const colors = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
];

interface Transaction {
  id: string;
  categoryId: string | null;
  amount: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    color: "#8b5cf6",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const [catRes, txRes] = await Promise.all([
        fetch("/api/categories", { signal: controller.signal }),
        fetch("/api/transactions", { signal: controller.signal }),
      ]);

      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data);
      }

      if (txRes.ok) {
        const transactions: Transaction[] = await txRes.json();
        // Calculate totals per category
        const totals: Record<string, number> = {};
        transactions.forEach((tx) => {
          if (tx.categoryId) {
            totals[tx.categoryId] = (totals[tx.categoryId] || 0) + tx.amount;
          }
        });
        setCategoryTotals(totals);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      type: "expense",
      color: "#8b5cf6",
    });
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      type: cat.type,
      color: cat.color,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const method = editingCategory ? "PUT" : "POST";
    const url = editingCategory ? `/api/categories/${editingCategory.id}` : "/api/categories";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const savedCategory = await res.json();
        if (editingCategory) {
          setCategories(categories.map((c) => (c.id === savedCategory.id ? savedCategory : c)));
        } else {
          setCategories([...categories, savedCategory]);
        }
        setShowModal(false);
        setEditingCategory(null);
        setFormData({
          name: "",
          type: "expense",
          color: "#8b5cf6",
        });
      }
    } catch (error) {
      console.error("Error saving category:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories(categories.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const incomeCategories = categories.filter(c => c.type === "income");
  const expenseCategories = categories.filter(c => c.type === "expense");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="empty">
        <div className="empty-icon">...</div>
        <h3>Loading...</h3>
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

      {/* Categories Grid */}
      <div className="categories-grid">
        {/* Income Categories */}
        <div className="category-section">
          <div className="category-section-header income">
            <div className="category-dot income"></div>
            <h3>Income Categories</h3>
          </div>
          <div className="data-list">
            {incomeCategories.length === 0 ? (
              <div className="empty" style={{ padding: '40px' }}>
                <p>No income categories yet</p>
              </div>
            ) : (
              incomeCategories.map((cat) => (
                <div key={cat.id} className="data-item" style={{ gridTemplateColumns: 'auto 1fr auto auto' }}>
                  <div className="category-color" style={{ backgroundColor: cat.color }}></div>
                  <div className="data-details">
                    <div className="data-title">{cat.name}</div>
                  </div>
                  <div className="data-amount income">
                    {formatCurrency(categoryTotals[cat.id] || 0)}
                  </div>
                  <div className="data-actions">
                    <button className="action-btn edit" onClick={() => openEditModal(cat)} title="Edit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(cat.id)} title="Delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="category-section">
          <div className="category-section-header expense">
            <div className="category-dot expense"></div>
            <h3>Expense Categories</h3>
          </div>
          <div className="data-list">
            {expenseCategories.length === 0 ? (
              <div className="empty" style={{ padding: '40px' }}>
                <p>No expense categories yet</p>
              </div>
            ) : (
              expenseCategories.map((cat) => (
                <div key={cat.id} className="data-item" style={{ gridTemplateColumns: 'auto 1fr auto auto' }}>
                  <div className="category-color" style={{ backgroundColor: cat.color }}></div>
                  <div className="data-details">
                    <div className="data-title">{cat.name}</div>
                  </div>
                  <div className="data-amount expense">
                    {formatCurrency(categoryTotals[cat.id] || 0)}
                  </div>
                  <div className="data-actions">
                    <button className="action-btn edit" onClick={() => openEditModal(cat)} title="Edit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(cat.id)} title="Delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
                {/* Type Switch - disabled when editing */}
                <div className="type-switch">
                  <button
                    type="button"
                    className={`type-opt ${formData.type === 'income' ? 'sel-income' : ''}`}
                    onClick={() => !editingCategory && setFormData({ ...formData, type: "income" })}
                    disabled={!!editingCategory}
                    style={editingCategory ? { opacity: formData.type === 'income' ? 1 : 0.5, cursor: 'not-allowed' } : {}}
                  >
                    <div className="type-icon">
                      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      </svg>
                    </div>
                    <span className="type-label">Income</span>
                  </button>
                  <button
                    type="button"
                    className={`type-opt ${formData.type === 'expense' ? 'sel-expense' : ''}`}
                    onClick={() => !editingCategory && setFormData({ ...formData, type: "expense" })}
                    disabled={!!editingCategory}
                    style={editingCategory ? { opacity: formData.type === 'expense' ? 1 : 0.5, cursor: 'not-allowed' } : {}}
                  >
                    <div className="type-icon">
                      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 5v14M5 12l7 7 7-7" />
                      </svg>
                    </div>
                    <span className="type-label">Expense</span>
                  </button>
                </div>

                <div className="field">
                  <label>Category Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Category name"
                    required
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
                        className={`color-option ${formData.color === color ? 'selected' : ''}`}
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
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        .category-section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .category-section-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0;
        }
        .category-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .category-dot.income {
          background: var(--income);
        }
        .category-dot.expense {
          background: var(--expense);
        }
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
        @media (max-width: 768px) {
          .categories-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
