"use client";

import { useState, useEffect, useCallback } from "react";
import { useDateFilter } from "./DateFilterContext";

interface Sale {
  id: string;
  platform: string;
  amount: number;
  salesCount: number;
  saleDate: string;
  projectId: string;
}

interface Platform {
  id: string;
  name: string;
  type: string;
}

export default function AffiliateHQSales() {
  const { filter, getDateRange, selectedProject, isAdmin } = useDateFilter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const [formData, setFormData] = useState({
    platform: "",
    amount: "",
    salesCount: "1",
    saleDate: new Date().toISOString().split("T")[0],
  });

  const [newPlatform, setNewPlatform] = useState({ name: "", type: "sales" });
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);

  const fetchSales = useCallback(async () => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { start, end } = getDateRange();
    let url = `/api/sales?projectId=${selectedProject}`;
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
        setSales(data);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error fetching sales:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedProject, getDateRange]);

  const fetchPlatforms = useCallback(async () => {
    if (!selectedProject) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`/api/platforms?projectId=${selectedProject}&type=sales`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setPlatforms(data);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error fetching platforms:", error);
      }
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      fetchSales();
      fetchPlatforms();
    } else {
      setLoading(false);
    }
  }, [selectedProject, filter, fetchSales, fetchPlatforms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const method = editingSale ? "PUT" : "POST";
    const url = editingSale ? `/api/sales/${editingSale.id}` : "/api/sales";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          platform: formData.platform,
          amount: formData.amount,
          salesCount: formData.salesCount,
          saleDate: formData.saleDate,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingSale(null);
        setFormData({
          platform: "",
          amount: "",
          salesCount: "1",
          saleDate: new Date().toISOString().split("T")[0],
        });
        fetchSales();
      }
    } catch (error) {
      console.error("Error saving sale:", error);
    }
  };

  const handleDelete = async (sale: Sale) => {
    if (!confirm("Delete this sale?")) return;

    try {
      const res = await fetch(`/api/sales/${sale.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSales();
      }
    } catch (error) {
      console.error("Error deleting sale:", error);
    }
  };

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      platform: sale.platform,
      amount: sale.amount.toString(),
      salesCount: sale.salesCount.toString(),
      saleDate: sale.saleDate.split("T")[0],
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingSale(null);
    setFormData({
      platform: "",
      amount: "",
      salesCount: "1",
      saleDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const handleSavePlatform = async () => {
    if (!newPlatform.name.trim()) return;

    try {
      if (editingPlatform) {
        // Update existing platform
        const res = await fetch(`/api/platforms/${editingPlatform.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newPlatform.name }),
        });

        if (res.ok) {
          setNewPlatform({ name: "", type: "sales" });
          setEditingPlatform(null);
          fetchPlatforms();
        }
      } else {
        // Create new platform
        const res = await fetch("/api/platforms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: selectedProject,
            name: newPlatform.name,
            platformType: newPlatform.type,
          }),
        });

        if (res.ok) {
          setNewPlatform({ name: "", type: "sales" });
          fetchPlatforms();
        }
      }
    } catch (error) {
      console.error("Error saving platform:", error);
    }
  };

  const handleEditPlatform = (platform: Platform) => {
    setEditingPlatform(platform);
    setNewPlatform({ name: platform.name, type: platform.type });
  };

  const handleCancelEditPlatform = () => {
    setEditingPlatform(null);
    setNewPlatform({ name: "", type: "sales" });
  };

  const handleDeletePlatform = async (id: string) => {
    if (!confirm("Delete this platform?")) return;

    try {
      const res = await fetch(`/api/platforms/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPlatforms();
      }
    } catch (error) {
      console.error("Error deleting platform:", error);
    }
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

  const filteredSales = platformFilter === "all"
    ? sales
    : sales.filter((s) => s.platform === platformFilter);

  const uniquePlatforms = [...new Set(sales.map((s) => s.platform))];

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
          <h2 className="section-title">Sales</h2>
        </div>
        <div className="section-actions">
          {isAdmin && (
            <button className="btn btn-ghost" onClick={() => setShowPlatformModal(true)}>
              Platforms
            </button>
          )}
          <button className="btn btn-glow" onClick={openAddModal}>
            <span>+</span> Add Sale
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <select
          className="filter-select"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
        >
          <option value="all">All Platforms</option>
          {uniquePlatforms.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="data-list">
        {filteredSales.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">$</div>
            <h3>No sales yet</h3>
            <p>Add your first sale to start tracking</p>
          </div>
        ) : (
          filteredSales.map((sale) => (
            <div key={sale.id} className="data-item">
              <div className="data-indicator sale">$</div>
              <div className="data-details">
                <div className="data-title">{sale.platform}</div>
                <div className="data-subtitle">{formatDate(sale.saleDate)}</div>
              </div>
              <div className="data-meta">
                <span className="badge">{sale.salesCount} sale{sale.salesCount > 1 ? "s" : ""}</span>
              </div>
              <div className="data-amount income">{formatCurrency(sale.amount)}</div>
              <div className="data-actions">
                <button className="action-btn edit" onClick={() => openEditModal(sale)} title="Edit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="action-btn delete" onClick={() => handleDelete(sale)} title="Delete">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sale Modal */}
      {showModal && (
        <div className="modal-backdrop open" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingSale ? "Edit Sale" : "Add Sale"}</h2>
              <button className="modal-x" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="field">
                  <label>Platform</label>
                  <div className="field-row">
                    <select
                      required
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    >
                      <option value="">Select Platform</option>
                      {platforms.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowPlatformModal(true)}
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
                <div className="field">
                  <label>Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Sales Count</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.salesCount}
                    onChange={(e) => setFormData({ ...formData, salesCount: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    required
                    value={formData.saleDate}
                    onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow">
                  {editingSale ? "Save Changes" : "Add Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Platform Modal - Sales Only (Admin) */}
      {isAdmin && showPlatformModal && (
        <div className="modal-backdrop open" onClick={() => setShowPlatformModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Sales Platforms</h2>
              <button className="modal-x" onClick={() => setShowPlatformModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>{editingPlatform ? "Edit Platform" : "Add New Platform"}</label>
                <div className="field-row">
                  <input
                    type="text"
                    placeholder="Platform name"
                    value={newPlatform.name}
                    onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  {editingPlatform && (
                    <button type="button" className="btn btn-ghost" onClick={handleCancelEditPlatform}>
                      Cancel
                    </button>
                  )}
                  <button type="button" className="btn btn-glow" onClick={handleSavePlatform}>
                    {editingPlatform ? "Update" : "Add"}
                  </button>
                </div>
              </div>

              <div className="platform-lists">
                <div className="platform-section">
                  <div className="data-list" style={{ marginTop: "16px" }}>
                    {platforms.length === 0 ? (
                      <div className="empty" style={{ padding: "32px" }}>
                        <p className="text-muted">No sales platforms yet</p>
                      </div>
                    ) : (
                      platforms.map((p) => (
                        <div key={p.id} className="data-item" style={{ gridTemplateColumns: "1fr auto" }}>
                          <div className="data-details">
                            <div className="data-title">{p.name}</div>
                          </div>
                          <div className="data-actions">
                            <button className="action-btn edit" onClick={() => handleEditPlatform(p)} title="Edit">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button className="action-btn delete" onClick={() => handleDeletePlatform(p.id)} title="Delete">
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
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => setShowPlatformModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
