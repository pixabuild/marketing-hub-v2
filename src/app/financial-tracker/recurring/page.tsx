"use client";

import { useState, useEffect, useCallback } from "react";
import { useDateFilter } from "../DateFilterContext";

interface Category {
  id: string;
  name: string;
  type: string;
}

interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
  category: Category | null;
  frequency: string;
  nextDate: string;
  isActive: boolean;
}

const frequencies = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function RecurringPage() {
  const { filter, customRange } = useDateFilter();
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    categoryId: "",
    frequency: "monthly",
    startDate: new Date().toISOString().split("T")[0],
  });
  const [processing, setProcessing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const [recurringRes, catRes] = await Promise.all([
        fetch("/api/recurring", { signal: controller.signal }),
        fetch("/api/categories", { signal: controller.signal }),
      ]);

      if (recurringRes.ok) {
        const recurringData = await recurringRes.json();
        setRecurring(recurringData);
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCategories = categories.filter((c) => c.type === formData.type);

  const openAddModal = () => {
    setEditingRecurring(null);
    setFormData({
      description: "",
      amount: "",
      type: "expense",
      categoryId: "",
      frequency: "monthly",
      startDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const openEditModal = (r: RecurringTransaction) => {
    setEditingRecurring(r);
    setFormData({
      description: r.description,
      amount: r.amount.toString(),
      type: r.type,
      categoryId: r.categoryId || "",
      frequency: r.frequency,
      startDate: r.nextDate.split("T")[0],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const method = editingRecurring ? "PUT" : "POST";
    const url = editingRecurring ? `/api/recurring/${editingRecurring.id}` : "/api/recurring";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const savedRecurring = await res.json();
        if (editingRecurring) {
          setRecurring(recurring.map((r) => (r.id === savedRecurring.id ? savedRecurring : r)));
        } else {
          setRecurring([...recurring, savedRecurring]);
        }
        setShowModal(false);
        setEditingRecurring(null);
        setFormData({
          description: "",
          amount: "",
          type: "expense",
          categoryId: "",
          frequency: "monthly",
          startDate: new Date().toISOString().split("T")[0],
        });
      }
    } catch (error) {
      console.error("Error saving recurring:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/recurring/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        setRecurring(recurring.map((r) => (r.id === id ? updated : r)));
      }
    } catch (error) {
      console.error("Error toggling recurring:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recurring transaction?")) return;

    try {
      const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecurring(recurring.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error("Error deleting recurring:", error);
    }
  };

  const processDueRecurring = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/recurring/process", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.processed > 0) {
          alert(`Processed ${data.processed} recurring transaction(s). Transactions have been created.`);
          fetchData(); // Refresh the list to update nextDate values
        } else {
          alert("No due recurring transactions to process.");
        }
      } else {
        alert("Failed to process recurring transactions.");
      }
    } catch (error) {
      console.error("Error processing recurring:", error);
      alert("Error processing recurring transactions.");
    } finally {
      setProcessing(false);
    }
  };

  // Count due recurring transactions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueCount = recurring.filter((r) => {
    const nextDate = new Date(r.nextDate);
    nextDate.setHours(0, 0, 0, 0);
    return r.isActive && nextDate <= today;
  }).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredRecurring = recurring.filter((r) => {
    if (categoryFilter !== "all" && r.categoryId !== categoryFilter) return false;
    return true;
  });

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
        <h2 className="section-title">Recurring Transactions</h2>
        <div className="section-actions">
          {dueCount > 0 && (
            <button
              className="btn btn-secondary"
              onClick={processDueRecurring}
              disabled={processing}
            >
              {processing ? "Processing..." : `Process Due (${dueCount})`}
            </button>
          )}
          <button className="btn btn-glow" onClick={openAddModal}>
            <span>+</span> Add Recurring
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="data-list">
        {filteredRecurring.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3>No recurring transactions</h3>
            <p>Set up automatic income and expenses</p>
          </div>
        ) : (
          filteredRecurring.map((r) => (
            <div key={r.id} className={`data-item ${!r.isActive ? 'opacity-50' : ''}`}>
              <div className={`data-indicator ${r.type}`}>
                {r.type === 'income' ? '+' : '-'}
              </div>
              <div className="data-details">
                <div className="data-title">{r.description}</div>
                <div className="data-subtitle">
                  {r.category?.name || 'Uncategorized'} &bull; {r.frequency}
                </div>
              </div>
              <div className="data-meta">
                <span className="badge">Next: {formatDate(r.nextDate)}</span>
                <button
                  onClick={() => toggleActive(r.id, r.isActive)}
                  className={`badge ${r.isActive ? 'badge-income' : 'badge-muted'}`}
                  style={{ cursor: 'pointer' }}
                >
                  {r.isActive ? 'Active' : 'Paused'}
                </button>
              </div>
              <div className={`data-amount ${r.type}`}>
                {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
              </div>
              <div className="data-actions">
                <button className="action-btn edit" onClick={() => openEditModal(r)} title="Edit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="action-btn delete" onClick={() => handleDelete(r.id)} title="Delete">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recurring Modal */}
      {showModal && (
        <div className="modal-backdrop open" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingRecurring ? "Edit Recurring Transaction" : "Add Recurring Transaction"}</h2>
              <button className="modal-x" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Type Switch */}
                <div className="type-switch">
                  <button
                    type="button"
                    className={`type-opt ${formData.type === 'income' ? 'sel-income' : ''}`}
                    onClick={() => setFormData({ ...formData, type: "income", categoryId: "" })}
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
                    onClick={() => setFormData({ ...formData, type: "expense", categoryId: "" })}
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
                  <label>Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Monthly rent"
                    required
                  />
                </div>
                <div className="field">
                  <label>Amount ($)</label>
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
                  <label>Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  >
                    <option value="">No category</option>
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  >
                    {frequencies.map((freq) => (
                      <option key={freq.value} value={freq.value}>{freq.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{editingRecurring ? "Next Date" : "Start Date"}</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow" disabled={submitting}>
                  {submitting ? "Saving..." : editingRecurring ? "Save Changes" : "Add Recurring"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
