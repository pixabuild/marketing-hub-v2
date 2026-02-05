"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TodoProvider, useTodoContext } from "./TodoContext";
import GlobalSearch from "@/components/GlobalSearch";

function TodoDashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    projects,
    selectedProject,
    setSelectedProject,
    stats,
    addProject,
    updateProject,
    deleteProject,
  } = useTodoContext();

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#8b5cf6");
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; color: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const navItems = [
    { name: "All Todos", href: "/todo-dashboard" },
    { name: "Projects", href: "/todo-dashboard/projects" },
    { name: "Categories", href: "/todo-dashboard/categories" },
  ];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setSubmitting(true);

    if (editingProject) {
      const updated = await updateProject(editingProject.id, newProjectName.trim(), undefined, newProjectColor);
      if (updated) {
        setNewProjectName("");
        setNewProjectColor("#8b5cf6");
        setEditingProject(null);
        setShowProjectModal(false);
      }
    } else {
      const project = await addProject(newProjectName.trim(), undefined, newProjectColor);
      if (project) {
        setNewProjectName("");
        setNewProjectColor("#8b5cf6");
        setShowProjectModal(false);
      }
    }

    setSubmitting(false);
  };

  const openEditProjectModal = (project: { id: string; name: string; color: string }) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setNewProjectColor(project.color);
    setShowProjectMenu(false);
    setShowProjectModal(true);
  };

  const openNewProjectModal = () => {
    setEditingProject(null);
    setNewProjectName("");
    setNewProjectColor("#8b5cf6");
    setShowProjectMenu(false);
    setShowProjectModal(true);
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project? All associated todos will be unassigned.")) return;
    await deleteProject(id);
  };

  const selectedProjectName = selectedProject
    ? projects.find((p) => p.id === selectedProject)?.name || "Select Project"
    : "All Projects";

  const colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="brand">
            <div className="brand-logo todo">
              <div className="brand-logo-ring"></div>
            </div>
            <div className="brand-text">
              <h1>TaskHub</h1>
              <p>todo_dashboard.v1</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          {/* Project Selector with Dropdown */}
          <div className="project-dropdown-container">
            <button
              className="project-dropdown-btn"
              onClick={() => setShowProjectMenu(!showProjectMenu)}
            >
              <span>{selectedProjectName}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showProjectMenu && (
              <>
                <div className="dropdown-backdrop" onClick={() => setShowProjectMenu(false)} />
                <div className="project-dropdown-menu">
                  <div className="dropdown-section">
                    <div className="dropdown-label">Projects</div>
                    <div
                      className={`dropdown-item ${!selectedProject ? "active" : ""}`}
                    >
                      <button
                        className="dropdown-item-main"
                        onClick={() => {
                          setSelectedProject(null);
                          setShowProjectMenu(false);
                        }}
                      >
                        All Projects
                      </button>
                    </div>
                    {projects.map((p) => (
                      <div
                        key={p.id}
                        className={`dropdown-item ${p.id === selectedProject ? "active" : ""}`}
                      >
                        <button
                          className="dropdown-item-main"
                          onClick={() => {
                            setSelectedProject(p.id);
                            setShowProjectMenu(false);
                          }}
                        >
                          <span className="project-color-dot" style={{ backgroundColor: p.color }}></span>
                          {p.name}
                          <span className="dropdown-count">{p._count.todos}</span>
                        </button>
                        <button
                          className="dropdown-item-action edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditProjectModal(p);
                          }}
                          title="Edit project"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="dropdown-item-action delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(p.id);
                          }}
                          title="Delete project"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <div className="dropdown-empty">No projects yet</div>
                    )}
                  </div>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item add-new"
                    onClick={openNewProjectModal}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    New Project
                  </button>
                </div>
              </>
            )}
          </div>

          <GlobalSearch />
          <Link href="/dashboard" className="home-btn" title="Back to Hub">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card balance">
          <div className="shine"></div>
          <div className="stat-label">
            <div className="stat-icon">#</div>
            <span>PENDING</span>
          </div>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="stat-card income">
          <div className="shine"></div>
          <div className="stat-label">
            <div className="stat-icon">✓</div>
            <span>COMPLETED TODAY</span>
          </div>
          <div className="stat-value">{stats.completedToday}</div>
        </div>
        <div className="stat-card expense">
          <div className="shine"></div>
          <div className="stat-label">
            <div className="stat-icon">!</div>
            <span>OVERDUE</span>
          </div>
          <div className="stat-value">{stats.overdue}</div>
        </div>
      </div>

      {/* View Content */}
      <section className="view active">
        {children}
      </section>

      {/* Project Modal */}
      {showProjectModal && (
        <div className="modal-backdrop open" onClick={() => setShowProjectModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingProject ? "Edit Project" : "New Project"}</h2>
              <button className="modal-x" onClick={() => setShowProjectModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="modal-body">
                <div className="field">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="My Project"
                    autoFocus
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
                        onClick={() => setNewProjectColor(color)}
                        className={`color-option ${newProjectColor === color ? "selected" : ""}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowProjectModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow" disabled={submitting}>
                  {submitting ? "Saving..." : editingProject ? "Save Changes" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .project-color-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 8px;
        }
        .dropdown-count {
          margin-left: auto;
          font-size: 0.75rem;
          color: var(--text-muted);
          background: var(--bg);
          padding: 2px 8px;
          border-radius: 10px;
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
        .brand-logo.todo {
          background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
        }
      `}</style>
    </div>
  );
}

export default function TodoDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TodoProvider>
      <TodoDashboardLayoutInner>{children}</TodoDashboardLayoutInner>
    </TodoProvider>
  );
}
