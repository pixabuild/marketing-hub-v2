"use client";

import { useState, useEffect, useCallback } from "react";
import { useDateFilter } from "../DateFilterContext";

interface Traffic {
  id: string;
  projectId: string;
  source: string;
  clicks: number;
  optins: number;
  cost: number;
  trafficDate: string;
}

interface Platform {
  id: string;
  name: string;
  type: string;
}

export default function TrafficPage() {
  const { filter, getDateRange, selectedProject, isAdmin } = useDateFilter();
  const [traffic, setTraffic] = useState<Traffic[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [editingTraffic, setEditingTraffic] = useState<Traffic | null>(null);

  const [formData, setFormData] = useState({
    source: "",
    clicks: "",
    optins: "",
    cost: "0",
    trafficDate: new Date().toISOString().split("T")[0],
  });

  const [newPlatform, setNewPlatform] = useState({ name: "", type: "traffic" });
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);

  const fetchTraffic = useCallback(async () => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { start, end } = getDateRange();
    let url = `/api/traffic?projectId=${selectedProject}`;
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
        setTraffic(data);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error fetching traffic:", error);
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
      const res = await fetch(`/api/platforms?projectId=${selectedProject}&type=traffic`, {
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
      fetchTraffic();
      fetchPlatforms();
    }
  }, [selectedProject, filter, fetchTraffic, fetchPlatforms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const method = editingTraffic ? "PUT" : "POST";
    const url = editingTraffic ? `/api/traffic/${editingTraffic.id}` : "/api/traffic";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          source: formData.source,
          clicks: parseInt(formData.clicks) || 0,
          optins: parseInt(formData.optins) || 0,
          cost: parseFloat(formData.cost) || 0,
          trafficDate: formData.trafficDate,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingTraffic(null);
        setFormData({
          source: "",
          clicks: "",
          optins: "",
          cost: "0",
          trafficDate: new Date().toISOString().split("T")[0],
        });
        fetchTraffic();
      }
    } catch (error) {
      console.error("Error saving traffic:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this traffic entry?")) return;

    try {
      const res = await fetch(`/api/traffic/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTraffic();
      }
    } catch (error) {
      console.error("Error deleting traffic:", error);
    }
  };

  const openEditModal = (item: Traffic) => {
    setEditingTraffic(item);
    setFormData({
      source: item.source,
      clicks: item.clicks.toString(),
      optins: item.optins.toString(),
      cost: item.cost.toString(),
      trafficDate: item.trafficDate.split("T")[0],
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingTraffic(null);
    setFormData({
      source: "",
      clicks: "",
      optins: "",
      cost: "0",
      trafficDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const handleSavePlatform = async () => {
    if (!newPlatform.name.trim()) return;

    try {
      if (editingPlatform) {
        const res = await fetch(`/api/platforms/${editingPlatform.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newPlatform.name }),
        });

        if (res.ok) {
          setNewPlatform({ name: "", type: "traffic" });
          setEditingPlatform(null);
          fetchPlatforms();
        }
      } else {
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
          setNewPlatform({ name: "", type: "traffic" });
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
    setNewPlatform({ name: "", type: "traffic" });
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

  const filteredTraffic = platformFilter === "all"
    ? traffic
    : traffic.filter((t) => t.source === platformFilter);

  const uniquePlatforms = [...new Set(traffic.map((t) => t.source))];

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
          <h2 className="section-title">Traffic</h2>
        </div>
        <div className="section-actions">
          {isAdmin && (
            <button className="btn btn-ghost" onClick={() => setShowPlatformModal(true)}>
              Platforms
            </button>
          )}
          <button className="btn btn-glow" onClick={openAddModal}>
            <span>+</span> Add Traffic
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
        {filteredTraffic.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3>No traffic data yet</h3>
            <p>Add your first traffic entry to start tracking</p>
          </div>
        ) : (
          filteredTraffic.map((item) => (
            <div key={item.id} className="data-item">
              <div className="data-indicator traffic">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="data-details">
                <div className="data-title">{item.source}</div>
                <div className="data-subtitle">{formatDate(item.trafficDate)}</div>
              </div>
              <div className="data-meta">
                <span className="badge">{item.clicks.toLocaleString()} clicks</span>
                <span className="badge">{item.optins.toLocaleString()} optins</span>
                {item.clicks > 0 && (
                  <span className="badge">{((item.optins / item.clicks) * 100).toFixed(1)}% rate</span>
                )}
              </div>
              {item.cost > 0 && (
                <div className="data-amount expense">{formatCurrency(item.cost)}</div>
              )}
              <div className="data-actions">
                <button className="action-btn edit" onClick={() => openEditModal(item)} title="Edit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="action-btn delete" onClick={() => handleDelete(item.id)} title="Delete">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Traffic Modal */}
      {showModal && (
        <div className="modal-backdrop open" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingTraffic ? "Edit Traffic" : "Add Traffic"}</h2>
              <button className="modal-x" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="field">
                  <label>Source / Platform</label>
                  <div className="field-row">
                    <select
                      required
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
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
                  <label>Clicks</label>
                  <input
                    type="number"
                    value={formData.clicks}
                    onChange={(e) => setFormData({ ...formData, clicks: e.target.value })}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
                <div className="field">
                  <label>Optins</label>
                  <input
                    type="number"
                    value={formData.optins}
                    onChange={(e) => setFormData({ ...formData, optins: e.target.value })}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="field">
                  <label>Ad Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                    min="0"
                  />
                </div>
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={formData.trafficDate}
                    onChange={(e) => setFormData({ ...formData, trafficDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow" disabled={submitting}>
                  {submitting ? "Saving..." : editingTraffic ? "Save Changes" : "Add Traffic"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Platform Modal - Traffic Only (Admin) */}
      {isAdmin && showPlatformModal && (
        <div className="modal-backdrop open" onClick={() => setShowPlatformModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Traffic Platforms</h2>
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
                        <p className="text-muted">No traffic platforms yet</p>
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
