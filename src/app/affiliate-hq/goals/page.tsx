"use client";

import { useState, useEffect, useCallback } from "react";
import { useDateFilter } from "../DateFilterContext";

interface Goal {
  id: string;
  projectId: string;
  month: number;
  year: number;
  targetRevenue: number;
  actualRevenue: number;
  progress: number;
  isCurrent: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function GoalsPage() {
  const { selectedProject, isAdmin } = useDateFilter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form state
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1);
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formTarget, setFormTarget] = useState("");

  const fetchGoals = useCallback(async () => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`/api/goals?projectId=${selectedProject}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error("Error fetching goals:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      fetchGoals();
    }
  }, [selectedProject, fetchGoals]);

  const openAddModal = () => {
    setEditingGoal(null);
    setFormMonth(new Date().getMonth() + 1);
    setFormYear(new Date().getFullYear());
    setFormTarget("");
    setShowModal(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormMonth(goal.month);
    setFormYear(goal.year);
    setFormTarget(goal.targetRevenue.toString());
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGoal) {
        await fetch(`/api/goals/${editingGoal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetRevenue: parseFloat(formTarget) }),
        });
      } else {
        await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: selectedProject,
            month: formMonth,
            year: formYear,
            targetRevenue: parseFloat(formTarget),
          }),
        });
      }
      setShowModal(false);
      fetchGoals();
    } catch (error) {
      console.error("Error saving goal:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      await fetch(`/api/goals/${id}`, { method: "DELETE" });
      fetchGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (!selectedProject && !loading) {
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
          <h2 className="section-title">Goals</h2>
        </div>
        {isAdmin && (
          <div className="section-actions">
            <button className="btn btn-glow" onClick={openAddModal}>
              <span>+</span> Set Goal
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎯</div>
          <h3>No goals yet</h3>
          <p>Set your first monthly revenue target</p>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className={`goal-card ${goal.isCurrent ? "current" : ""}`}
            >
              <div className="goal-header">
                <div className="goal-period">
                  <h3>{MONTH_NAMES[goal.month - 1]} {goal.year}</h3>
                  {goal.isCurrent && <span className="badge current">Current</span>}
                </div>
                {isAdmin && (
                  <div className="goal-actions">
                    <button
                      className="btn-icon"
                      onClick={() => openEditModal(goal)}
                      title="Edit"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDelete(goal.id)}
                      title="Delete"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="goal-amounts">
                <div className="goal-actual">
                  <span className="label">Actual</span>
                  <span className="value income">{formatCurrency(goal.actualRevenue)}</span>
                </div>
                <div className="goal-target">
                  <span className="label">Target</span>
                  <span className="value">{formatCurrency(goal.targetRevenue)}</span>
                </div>
              </div>

              <div className="goal-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, goal.progress)}%`,
                      backgroundColor: goal.progress >= 100 ? "var(--income)" : "var(--accent)",
                    }}
                  />
                </div>
                <span className="progress-text">{goal.progress.toFixed(1)}%</span>
              </div>

              {goal.progress >= 100 && (
                <div className="goal-achieved">Goal Achieved!</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Goal Modal */}
      {showModal && (
        <div className="modal-backdrop open" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingGoal ? "Edit Goal" : "Set New Goal"}</h2>
              <button className="modal-x" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="field">
                    <label>Month</label>
                    <select
                      value={formMonth}
                      onChange={(e) => setFormMonth(parseInt(e.target.value))}
                      disabled={!!editingGoal}
                    >
                      {MONTH_NAMES.map((name, index) => (
                        <option key={index} value={index + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Year</label>
                    <select
                      value={formYear}
                      onChange={(e) => setFormYear(parseInt(e.target.value))}
                      disabled={!!editingGoal}
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Target Revenue ($)</label>
                  <input
                    type="number"
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    placeholder="5000"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow">
                  {editingGoal ? "Update Goal" : "Set Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
