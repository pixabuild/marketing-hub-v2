"use client";

import { useState } from "react";
import { useTodoContext } from "../TodoContext";

const colors = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
];

export default function ProjectsPage() {
  const { projects, addProject, updateProject, deleteProject, loading } = useTodoContext();
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; color: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#8b5cf6",
  });

  const openAddModal = () => {
    setEditingProject(null);
    setFormData({ name: "", description: "", color: "#8b5cf6" });
    setShowModal(true);
  };

  const openEditModal = (project: { id: string; name: string; description?: string | null; color: string }) => {
    setEditingProject({ id: project.id, name: project.name, color: project.color });
    setFormData({
      name: project.name,
      description: project.description || "",
      color: project.color,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);

    if (editingProject) {
      await updateProject(editingProject.id, formData.name.trim(), formData.description || undefined, formData.color);
    } else {
      await addProject(formData.name.trim(), formData.description || undefined, formData.color);
    }

    setShowModal(false);
    setEditingProject(null);
    setFormData({ name: "", description: "", color: "#8b5cf6" });
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project? Todos will be unassigned.")) return;
    await deleteProject(id);
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
        <h2 className="section-title">Projects</h2>
        <div className="section-actions">
          <button className="btn btn-glow" onClick={openAddModal}>
            <span>+</span> Add Project
          </button>
        </div>
      </div>

      <div className="data-list">
        {projects.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3>No projects yet</h3>
            <p>Create a project to organize your todos</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="data-item" style={{ gridTemplateColumns: "auto 1fr auto auto" }}>
              <div
                className="project-color"
                style={{ backgroundColor: project.color }}
              ></div>
              <div className="data-details">
                <div className="data-title">{project.name}</div>
                <div className="data-subtitle">{project._count.todos} todos</div>
              </div>
              <div className="data-meta">
                <span className="badge" style={{ backgroundColor: project.color + "20", color: project.color }}>
                  {project._count.todos}
                </span>
              </div>
              <div className="data-actions">
                <button className="action-btn edit" onClick={() => openEditModal(project)} title="Edit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="action-btn delete" onClick={() => handleDelete(project.id)} title="Delete">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Project Modal */}
      {showModal && (
        <div className="modal-backdrop open" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingProject ? "Edit Project" : "Add Project"}</h2>
              <button className="modal-x" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="field">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Project"
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
                  {submitting ? "Saving..." : editingProject ? "Save Changes" : "Add Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .project-color {
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
