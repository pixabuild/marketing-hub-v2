"use client";

import { useState, useEffect } from "react";

interface Project {
  id: string;
  name: string;
}

interface Sale {
  id: string;
  projectId: string;
  platform: string;
  amount: number;
  salesCount: number;
  saleDate: string;
}

export default function SalesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [formData, setFormData] = useState({
    projectId: "",
    platform: "",
    amount: "",
    salesCount: "1",
    saleDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, salesRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/sales"),
      ]);

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
        if (projectsData.length > 0) {
          setSelectedProject(projectsData[0].id);
          setFormData((prev) => ({ ...prev, projectId: projectsData[0].id }));
        }
      }

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSales(salesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId) {
      alert("Please select a project");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newSale = await res.json();
        setSales([newSale, ...sales]);
        setShowForm(false);
        setFormData({
          projectId: selectedProject,
          platform: "",
          amount: "",
          salesCount: "1",
          saleDate: new Date().toISOString().split("T")[0],
        });
      }
    } catch (error) {
      console.error("Error creating sale:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sale?")) return;

    try {
      const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSales(sales.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error("Error deleting sale:", error);
    }
  };

  const filteredSales = selectedProject
    ? sales.filter((s) => s.projectId === selectedProject)
    : sales;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-[var(--muted)] mb-4">Create a project first to start tracking sales</p>
        <a href="/affiliate-hq/projects" className="btn btn-primary">
          Go to Projects
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Sales</h2>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="py-2 px-3 text-sm"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setFormData((prev) => ({ ...prev, projectId: selectedProject || projects[0]?.id }));
            setShowForm(true);
          }}
          className="btn btn-primary"
        >
          + Add Sale
        </button>
      </div>

      {/* Add Sale Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Add Sale</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Project</label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Platform</label>
                <input
                  type="text"
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  placeholder="e.g., ClickBank, JVZoo"
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Number of Sales</label>
                <input
                  type="number"
                  value={formData.salesCount}
                  onChange={(e) => setFormData({ ...formData, salesCount: e.target.value })}
                  min="1"
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={formData.saleDate}
                  onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                  className="w-full"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-secondary flex-1"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales Table */}
      <div className="card overflow-hidden p-0">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Platform</th>
              <th>Sales Count</th>
              <th className="text-right">Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-[var(--muted)]">
                  No sales recorded yet. Click &quot;Add Sale&quot; to get started.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.saleDate).toLocaleDateString()}</td>
                  <td>{sale.platform}</td>
                  <td>{sale.salesCount}</td>
                  <td className="text-right text-emerald-400">${sale.amount.toFixed(2)}</td>
                  <td className="text-right">
                    <button
                      onClick={() => handleDelete(sale.id)}
                      className="text-[var(--muted)] hover:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
