"use client";

import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Budget {
  id: string;
  categoryId: string;
  category: Category;
  amount: number;
  spent: number;
  period: string;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    period: "monthly",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const [budgetsRes, catRes] = await Promise.all([
        fetch("/api/budgets", { signal: controller.signal }),
        fetch("/api/categories", { signal: controller.signal }),
      ]);

      if (budgetsRes.ok) {
        const budgetsData = await budgetsRes.json();
        setBudgets(budgetsData);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  // Only show expense categories that don't already have a budget (or the current editing budget's category)
  const availableCategories = categories.filter(
    (c) => c.type === "expense" && (!budgets.some((b) => b.categoryId === c.id) || (editingBudget && editingBudget.categoryId === c.id))
  );

  const openAddModal = () => {
    setEditingBudget(null);
    setFormData({
      categoryId: "",
      amount: "",
      period: "monthly",
    });
    setShowModal(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      categoryId: budget.categoryId,
      amount: budget.amount.toString(),
      period: budget.period,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId && !editingBudget) {
      alert("Please select a category");
      return;
    }
    setSubmitting(true);

    const method = editingBudget ? "PUT" : "POST";
    const url = editingBudget ? `/api/budgets/${editingBudget.id}` : "/api/budgets";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const savedBudget = await res.json();
        if (editingBudget) {
          setBudgets(budgets.map((b) => (b.id === savedBudget.id ? savedBudget : b)));
        } else {
          setBudgets([...budgets, savedBudget]);
        }
        setShowModal(false);
        setEditingBudget(null);
        setFormData({
          categoryId: "",
          amount: "",
          period: "monthly",
        });
      }
    } catch (error) {
      console.error("Error saving budget:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) return;

    try {
      const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBudgets(budgets.filter((b) => b.id !== id));
      }
    } catch (error) {
      console.error("Error deleting budget:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getProgressColor = (spent: number, amount: number) => {
    const percentage = (spent / amount) * 100;
    if (percentage >= 100) return "var(--expense)";
    if (percentage >= 80) return "var(--warning)";
    return "var(--income)";
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
        <h2 className="section-title">Budgets</h2>
        <div className="section-actions">
          <button
            className="btn btn-glow"
            onClick={openAddModal}
            disabled={availableCategories.length === 0}
          >
            <span>+</span> Add Budget
          </button>
        </div>
      </div>

      {availableCategories.length === 0 && budgets.length > 0 && (
        <div className="badge" style={{ marginBottom: '16px' }}>
          All expense categories have budgets
        </div>
      )}

      {/* Budgets Grid */}
      {budgets.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3>No budgets set up yet</h3>
          <p>
            {categories.filter((c) => c.type === "expense").length === 0
              ? "Create expense categories first to set up budgets"
              : "Set spending limits for your expense categories"}
          </p>
        </div>
      ) : (
        <div className="budgets-grid">
          {budgets.map((budget) => {
            const percentage = Math.min((budget.spent / budget.amount) * 100, 100);
            const remaining = budget.amount - budget.spent;
            const progressColor = getProgressColor(budget.spent, budget.amount);

            return (
              <div key={budget.id} className="budget-card">
                <div className="budget-header">
                  <div>
                    <h3 className="budget-name">{budget.category?.name || "Unknown"}</h3>
                    <span className="budget-period">{budget.period}</span>
                  </div>
                  <div className="budget-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => openEditModal(budget)}
                      title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(budget.id)}
                      title="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="budget-amounts">
                  <span className="budget-spent">{formatCurrency(budget.spent)}</span>
                  <span className="budget-total">/ {formatCurrency(budget.amount)}</span>
                </div>
                <div className="budget-progress">
                  <div
                    className="budget-progress-bar"
                    style={{
                      width: `${percentage}%`,
                      background: progressColor
                    }}
                  />
                </div>
                <div className={`budget-remaining ${remaining >= 0 ? 'positive' : 'negative'}`}>
                  {remaining >= 0
                    ? `${formatCurrency(remaining)} remaining`
                    : `${formatCurrency(Math.abs(remaining))} over budget`
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Budget Modal */}
      {showModal && (
        <div className="modal-backdrop open" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingBudget ? "Edit Budget" : "Add Budget"}</h2>
              <button className="modal-x" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="field">
                  <label>Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                    disabled={!!editingBudget}
                  >
                    <option value="">Select category</option>
                    {availableCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Budget Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    required
                  />
                </div>
                <div className="field">
                  <label>Period</label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow" disabled={submitting}>
                  {submitting ? "Saving..." : editingBudget ? "Save Changes" : "Add Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .budgets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .budget-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s ease;
        }
        .budget-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-2px);
        }
        .budget-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .budget-actions {
          display: flex;
          gap: 8px;
        }
        .budget-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }
        .budget-period {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: capitalize;
        }
        .budget-amounts {
          margin-bottom: 12px;
        }
        .budget-spent {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-primary);
        }
        .budget-total {
          font-size: 1rem;
          color: var(--text-muted);
          margin-left: 4px;
        }
        .budget-progress {
          height: 8px;
          background: var(--bg-hover);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .budget-progress-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .budget-remaining {
          font-size: 0.9rem;
          font-weight: 500;
        }
        .budget-remaining.positive {
          color: var(--income);
        }
        .budget-remaining.negative {
          color: var(--expense);
        }
      `}</style>
    </>
  );
}
