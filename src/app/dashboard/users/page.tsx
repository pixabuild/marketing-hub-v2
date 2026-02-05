"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AppPermission {
  id: string;
  appName: string;
  canAccess: boolean;
}

interface ProjectPermission {
  id: string;
  project: {
    id: string;
    name: string;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  appPermissions: AppPermission[];
  projectPermissions: ProjectPermission[];
}

interface Project {
  id: string;
  name: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "user",
    affiliateHQ: false,
    financialTracker: false,
    todoDashboard: false,
    projectIds: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const [usersRes, projectsRes] = await Promise.all([
        fetch("/api/users", { signal: controller.signal }),
        fetch("/api/projects", { signal: controller.signal }),
      ]);

      if (usersRes.status === 403) {
        router.push("/dashboard");
        return;
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error fetching data:", error);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      name: "",
      password: "",
      role: "user",
      affiliateHQ: false,
      financialTracker: false,
      todoDashboard: false,
      projectIds: [],
    });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    const hasAffiliateHQ = user.appPermissions.some(
      (p) => p.appName === "affiliate_hq" && p.canAccess
    );
    const hasFinancialTracker = user.appPermissions.some(
      (p) => p.appName === "financial_tracker" && p.canAccess
    );
    const hasTodoDashboard = user.appPermissions.some(
      (p) => p.appName === "todo_dashboard" && p.canAccess
    );
    setFormData({
      email: user.email,
      name: user.name,
      password: "",
      role: user.role,
      affiliateHQ: hasAffiliateHQ,
      financialTracker: hasFinancialTracker,
      todoDashboard: hasTodoDashboard,
      projectIds: user.projectPermissions.map((p) => p.project.id),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const appPermissions = {
      affiliate_hq: formData.affiliateHQ,
      financial_tracker: formData.financialTracker,
      todo_dashboard: formData.todoDashboard,
    };

    try {
      if (editingUser) {
        const updatePayload: Record<string, unknown> = {
          name: formData.name,
          role: formData.role,
          appPermissions,
          projectIds: formData.projectIds,
        };

        // Only include password if provided
        if (formData.password) {
          updatePayload.password = formData.password;
        }

        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to update user");
        }
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            name: formData.name,
            password: formData.password,
            role: formData.role,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to create user");
        }

        const newUser = await res.json();

        // Update permissions for new user
        await fetch(`/api/users/${newUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appPermissions,
            projectIds: formData.projectIds,
          }),
        });
      }

      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("Error saving user:", error);
      alert(error instanceof Error ? error.message : "Failed to save user");
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user "${user.name}"?`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete user");
      fetchData();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  const toggleProject = (projectId: string) => {
    setFormData((prev) => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter((id) => id !== projectId)
        : [...prev.projectIds, projectId],
    }));
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <button className="back-btn" onClick={() => router.push("/dashboard")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1>User Management</h1>
        </div>
        <button className="btn btn-glow" onClick={openAddModal}>
          + Add User
        </button>
      </header>

      <div className="section-top">
        <div className="data-list">
          {users.length === 0 ? (
            <div className="empty-state">
              <p>No users found</p>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="data-item">
                <div className="data-item-main">
                  <div className="data-item-info">
                    <div className="user-avatar-small">{user.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <strong>{user.name}</strong>
                      <span className="text-muted" style={{ marginLeft: 8 }}>{user.email}</span>
                    </div>
                  </div>
                  <div className="data-item-meta">
                    <span className={`role-badge ${user.role}`}>{user.role}</span>
                    <div className="app-badges">
                      {user.appPermissions.some(p => p.appName === "affiliate_hq" && p.canAccess) && (
                        <span className="app-badge affiliate">AffiliateHQ</span>
                      )}
                      {user.appPermissions.some(p => p.appName === "financial_tracker" && p.canAccess) && (
                        <span className="app-badge vault">Vault</span>
                      )}
                      {user.appPermissions.some(p => p.appName === "todo_dashboard" && p.canAccess) && (
                        <span className="app-badge taskhub">TaskHub</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="data-item-actions">
                  <button className="action-btn edit" onClick={() => openEditModal(user)} title="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button className="action-btn delete" onClick={() => handleDelete(user)} title="Delete">
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

      {/* User Modal */}
      {showModal && (
        <div className="modal-backdrop open" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingUser ? "Edit User" : "Add User"}</h2>
              <button className="modal-x" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!!editingUser}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="field">
                  <label>Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="John Doe"
                  />
                </div>
                <div className="field">
                  <label>{editingUser ? "New Password (leave blank to keep current)" : "Password"}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    minLength={6}
                    placeholder={editingUser ? "Enter new password" : "Min. 6 characters"}
                  />
                </div>
                <div className="field">
                  <label>Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="field">
                  <label>App Access</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.affiliateHQ}
                        onChange={(e) => setFormData({ ...formData, affiliateHQ: e.target.checked })}
                      />
                      <span>AffiliateHQ</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.financialTracker}
                        onChange={(e) => setFormData({ ...formData, financialTracker: e.target.checked })}
                      />
                      <span>Vault - Financial Tracker</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.todoDashboard}
                        onChange={(e) => setFormData({ ...formData, todoDashboard: e.target.checked })}
                      />
                      <span>TaskHub - Todo Dashboard</span>
                    </label>
                  </div>
                </div>

                {formData.affiliateHQ && projects.length > 0 && (
                  <div className="field">
                    <label>Project Access</label>
                    <div className="checkbox-group projects-list">
                      {projects.map((project) => (
                        <label key={project.id} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.projectIds.includes(project.id)}
                            onChange={() => toggleProject(project.id)}
                          />
                          <span>{project.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow">
                  {editingUser ? "Save Changes" : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
