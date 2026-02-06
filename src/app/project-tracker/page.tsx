"use client";

import { useState, useMemo } from "react";
import { useProjectTrackerContext } from "./ProjectTrackerContext";

export default function ProjectTrackerPage() {
  const {
    projects,
    teams,
    selectedMonth,
    setSelectedMonth,
    loading,
    addProject,
    updateProject,
    deleteProject,
    addTeam,
  } = useProjectTrackerContext();

  const [showModal, setShowModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    projectName: "",
    clientName: "",
    description: "",
    cost: "",
    status: "unpaid" as "paid" | "unpaid" | "partial",
    teamName: "",
  });

  // Generate month tabs for the current year
  const monthTabs = useMemo(() => {
    const year = new Date().getFullYear();
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(year, i, 1);
      const value = `${year}-${String(i + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      months.push({ value, label });
    }
    return months;
  }, []);

  // Filter projects for selected month
  const monthProjects = useMemo(() => {
    return projects.filter((p) => p.month === selectedMonth);
  }, [projects, selectedMonth]);

  // Group by team
  const groupedByTeam = useMemo(() => {
    const groups: Record<string, typeof monthProjects> = {};
    monthProjects.forEach((p) => {
      const team = p.teamName || "Uncategorized";
      if (!groups[team]) groups[team] = [];
      groups[team].push(p);
    });
    return groups;
  }, [monthProjects]);

  const editingProject = useMemo(() => {
    if (!editingProjectId) return null;
    return projects.find((p) => p.id === editingProjectId) || null;
  }, [editingProjectId, projects]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);

  const openAddModal = () => {
    setEditingProjectId(null);
    setFormData({
      projectName: "",
      clientName: "",
      description: "",
      cost: "",
      status: "unpaid",
      teamName: teams[0] || "",
    });
    setShowModal(true);
  };

  const openEditModal = (project: typeof projects[0]) => {
    setEditingProjectId(project.id);
    setFormData({
      projectName: project.projectName,
      clientName: project.clientName,
      description: project.description,
      cost: project.cost !== null ? String(project.cost) : "",
      status: project.status,
      teamName: project.teamName,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const projectData = {
      projectName: formData.projectName,
      clientName: formData.clientName,
      description: formData.description,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      status: formData.status,
      month: selectedMonth,
      teamName: formData.teamName,
    };

    if (editingProject) {
      await updateProject(editingProject.id, projectData);
    } else {
      await addProject(projectData);
    }
    setShowModal(false);
    setEditingProjectId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await deleteProject(id);
  };

  const cycleStatus = async (project: typeof projects[0]) => {
    const next = project.status === "paid" ? "unpaid" : project.status === "unpaid" ? "partial" : "paid";
    await updateProject(project.id, { status: next });
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <>
      {/* Month Tabs */}
      <div className="month-tabs-container">
        <div className="month-tabs">
          {monthTabs.map((tab) => (
            <button
              key={tab.value}
              className={`month-tab ${selectedMonth === tab.value ? "active" : ""}`}
              onClick={() => setSelectedMonth(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="tracker-actions">
        <button className="btn btn-glow" onClick={openAddModal}>
          + Add Project
        </button>
      </div>

      {/* Project Table */}
      {monthProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p>No projects for this month</p>
          <button className="btn btn-glow" onClick={openAddModal}>Add your first project</button>
        </div>
      ) : (
        Object.entries(groupedByTeam).map(([team, teamProjects]) => (
          <div key={team} className="team-section">
            <div className="team-header">
              <span className="team-name">{team}</span>
              <span className="team-count">{teamProjects.length} project{teamProjects.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="tracker-table-wrapper">
              <table className="tracker-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Client Name</th>
                    <th>Description</th>
                    <th>Cost</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {teamProjects.map((project) => (
                    <tr key={project.id}>
                      <td className="td-name">{project.projectName}</td>
                      <td className="td-client">{project.clientName}</td>
                      <td className="td-desc">{project.description}</td>
                      <td className="td-cost">{project.cost !== null ? formatCurrency(project.cost) : "—"}</td>
                      <td>
                        <button
                          className={`status-badge ${project.status}`}
                          onClick={() => cycleStatus(project)}
                          title="Click to change status"
                        >
                          {project.status.toUpperCase()}
                        </button>
                      </td>
                      <td className="td-actions">
                        <button className="action-btn edit" onClick={() => openEditModal(project)} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(project.id)} title="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop open" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingProject ? "Edit Project" : "New Project"}</h2>
              <button className="modal-x" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="field">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="Project name"
                    required
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label>Client Name</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="Client name"
                    required
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Project description"
                    rows={3}
                  />
                </div>
                <div className="field">
                  <label>Team</label>
                  <input
                    type="text"
                    value={formData.teamName}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    placeholder="e.g., DESIGN TEAM"
                    list="team-list"
                    required
                  />
                  <datalist id="team-list">
                    {teams.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Cost</label>
                    <input
                      type="number"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      placeholder="0"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="field">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "paid" | "unpaid" | "partial" })}
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                      <option value="partial">Partial</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow">
                  {editingProject ? "Save" : "Add Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
