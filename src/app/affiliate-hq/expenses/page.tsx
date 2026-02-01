"use client";

import { useState, useEffect, useCallback } from "react";
import { useDateFilter } from "../DateFilterContext";

interface Expense {
  id: string;
  projectId: string;
  category: string;
  description: string | null;
  amount: number;
  expenseType: string;
  expenseDate: string;
}

const categories = [
  "Advertising",
  "Software",
  "Email Service",
  "Hosting",
  "Training",
  "Outsourcing",
  "Other"
];

export default function ExpensesPage() {
  const { filter, getDateRange, selectedProject, isAdmin } = useDateFilter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
    expenseType: "one-time",
    expenseDate: new Date().toISOString().split("T")[0],
  });

  const fetchExpenses = useCallback(async () => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { start, end } = getDateRange();
    let url = `/api/expenses?projectId=${selectedProject}`;
    if (start && end) {
      url += `&startDate=${start}&endDate=${end}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error fetching expenses:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedProject, getDateRange]);

  useEffect(() => {
    if (selectedProject) {
      fetchExpenses();
    }
  }, [selectedProject, filter, fetchExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const method = editingExpense ? "PUT" : "POST";
    const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          expenseType: formData.expenseType,
          expenseDate: formData.expenseDate,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingExpense(null);
        setFormData({
          category: "",
          description: "",
          amount: "",
          expenseType: "one-time",
          expenseDate: new Date().toISOString().split("T")[0],
        });
        fetchExpenses();
      }
    } catch (error) {
      console.error("Error saving expense:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchExpenses();
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description || "",
      amount: expense.amount.toString(),
      expenseType: expense.expenseType,
      expenseDate: expense.expenseDate.split("T")[0],
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({
      category: "",
      description: "",
      amount: "",
      expenseType: "one-time",
      expenseDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const filteredExpenses = categoryFilter === "all"
    ? expenses
    : expenses.filter((e) => e.category === categoryFilter);

  const uniqueCategories = [...new Set(expenses.map((e) => e.category))];

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="empty">
        <div className="empty-icon">+</div>
        <h3>No project selected</h3>
        <p>Create a project in the Projects tab to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="section-top">
        <div className="section-left">
          <h2 className="section-title">Expenses</h2>
        </div>
        {isAdmin && (
          <div className="section-actions">
            <button className="btn btn-glow" onClick={openAddModal}>
              <span>+</span> Add Expense
            </button>
          </div>
        )}
      </div>

      <div className="filter-bar">
        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="data-list">
        {filteredExpenses.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">-</div>
            <h3>No expenses yet</h3>
            <p>Add your first expense to start tracking</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <div key={expense.id} className="data-item">
              <div className="data-indicator expense">-</div>
              <div className="data-details">
                <div className="data-title">{expense.description || expense.category}</div>
                <div className="data-subtitle">{expense.category} &bull; {formatDate(expense.expenseDate)}</div>
              </div>
              <div className="data-meta">
                <span className={`badge ${expense.expenseType === "recurring" ? "badge-recurring" : ""}`}>
                  {expense.expenseType}
                </span>
              </div>
              <div className="data-amount expense">{formatCurrency(expense.amount)}</div>
              {isAdmin && (
                <div className="data-actions">
                  <button className="action-btn edit" onClick={() => openEditModal(expense)} title="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button className="action-btn delete" onClick={() => handleDelete(expense.id)} title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Expense Modal */}
      {showModal && (
        <div className="modal-backdrop open" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingExpense ? "Edit Expense" : "Add Expense"}</h2>
              <button className="modal-x" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="field">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What was this expense for?"
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
                  <label>Type</label>
                  <select
                    value={formData.expenseType}
                    onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                  >
                    <option value="one-time">One-time</option>
                    <option value="recurring">Recurring</option>
                  </select>
                </div>
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow" disabled={submitting}>
                  {submitting ? "Saving..." : editingExpense ? "Save Changes" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
