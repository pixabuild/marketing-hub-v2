"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DateFilterProvider, useDateFilter } from "./DateFilterContext";
import GlobalSearch from "@/components/GlobalSearch";

function AffiliateHQLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    filter,
    setFilter,
    customRange,
    setCustomRange,
    projects,
    selectedProject,
    setSelectedProject,
    stats,
    addProject,
    updateProject,
    deleteProject,
    isAdmin,
  } = useDateFilter();

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingProject, setEditingProject] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const navItems = [
    { name: "Sales", href: "/affiliate-hq" },
    { name: "Traffic", href: "/affiliate-hq/traffic" },
    { name: "Expenses", href: "/affiliate-hq/expenses" },
    { name: "Goals", href: "/affiliate-hq/goals" },
    { name: "Analytics", href: "/affiliate-hq/analytics" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setSubmitting(true);

    if (editingProject) {
      const updated = await updateProject(editingProject.id, newProjectName.trim());
      if (updated) {
        setNewProjectName("");
        setEditingProject(null);
        setShowProjectModal(false);
      }
    } else {
      const project = await addProject(newProjectName.trim());
      if (project) {
        setNewProjectName("");
        setShowProjectModal(false);
      }
    }

    setSubmitting(false);
  };

  const openEditProjectModal = (project: { id: string; name: string }) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setShowProjectMenu(false);
    setShowProjectModal(true);
  };

  const openNewProjectModal = () => {
    setEditingProject(null);
    setNewProjectName("");
    setShowProjectMenu(false);
    setShowProjectModal(true);
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project? All associated data will be lost.")) return;
    await deleteProject(id);
  };

  const selectedProjectName = projects.find((p) => p.id === selectedProject)?.name || "Select Project";

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="brand">
            <div className="brand-logo affiliate">
              <div className="brand-logo-ring"></div>
            </div>
            <div className="brand-text">
              <h1>AffiliateHQ</h1>
              <p>affiliate_hq.v2</p>
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
                          {p.name}
                        </button>
                        {isAdmin && (
                          <>
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
                          </>
                        )}
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <div className="dropdown-empty">No projects yet</div>
                    )}
                  </div>
                  {isAdmin && (
                    <>
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
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="date-filter-container">
            <select
              className="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
            {filter === "custom" && (
              <div className="custom-date-range">
                <input
                  type="date"
                  className="date-input"
                  value={customRange.start}
                  onChange={(e) =>
                    setCustomRange({ ...customRange, start: e.target.value })
                  }
                />
                <span className="date-separator">to</span>
                <input
                  type="date"
                  className="date-input"
                  value={customRange.end}
                  onChange={(e) =>
                    setCustomRange({ ...customRange, end: e.target.value })
                  }
                />
              </div>
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
        <div className="stat-card income">
          <div className="shine"></div>
          <div className="stat-label">
            <div className="stat-icon">+</div>
            <span>SALES</span>
          </div>
          <div className="stat-value">{formatCurrency(stats.sales)}</div>
        </div>
        <div className="stat-card expense">
          <div className="shine"></div>
          <div className="stat-label">
            <div className="stat-icon">-</div>
            <span>EXPENSES</span>
          </div>
          <div className="stat-value">{formatCurrency(stats.expenses)}</div>
        </div>
        <div className="stat-card balance">
          <div className="shine"></div>
          <div className="stat-label">
            <div className="stat-icon">=</div>
            <span>PROFIT</span>
          </div>
          <div className="stat-value">{formatCurrency(stats.profit)}</div>
        </div>
      </div>

      {/* Navigation Pills */}
      <nav className="nav-pills">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/affiliate-hq" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-pill ${isActive ? "active" : ""}`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

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
                    placeholder="My Affiliate Project"
                    autoFocus
                    required
                  />
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
    </div>
  );
}

export default function AffiliateHQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DateFilterProvider>
      <AffiliateHQLayoutInner>{children}</AffiliateHQLayoutInner>
    </DateFilterProvider>
  );
}
