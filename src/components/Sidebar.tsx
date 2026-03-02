"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AppPermissions {
  affiliate_hq: boolean;
  financial_tracker: boolean;
  todo_dashboard: boolean;
  project_tracker: boolean;
}

interface UserInfo {
  name: string;
  email: string;
  role: string;
  appPermissions: AppPermissions;
}

const appNav = [
  {
    id: "financial-tracker",
    permKey: "financial_tracker" as keyof AppPermissions,
    name: "Vault",
    icon: "V",
    href: "/financial-tracker",
    accent: "#a855f7",
    subPages: [
      { name: "Transactions", href: "/financial-tracker" },
      { name: "Recurring", href: "/financial-tracker/recurring" },
      { name: "Categories", href: "/financial-tracker/categories" },
      { name: "Analytics", href: "/financial-tracker/analytics" },
    ],
  },
  {
    id: "affiliate-hq",
    permKey: "affiliate_hq" as keyof AppPermissions,
    name: "AffiliateHQ",
    icon: "A",
    href: "/affiliate-hq",
    accent: "#3b82f6",
    subPages: [
      { name: "Sales", href: "/affiliate-hq" },
      { name: "Traffic", href: "/affiliate-hq/traffic" },
      { name: "Expenses", href: "/affiliate-hq/expenses" },
      { name: "Goals", href: "/affiliate-hq/goals" },
      { name: "Analytics", href: "/affiliate-hq/analytics" },
    ],
  },
  {
    id: "todo-dashboard",
    permKey: "todo_dashboard" as keyof AppPermissions,
    name: "TaskHub",
    icon: "T",
    href: "/todo-dashboard",
    accent: "#ec4899",
    subPages: [
      { name: "Tasks", href: "/todo-dashboard" },
      { name: "Categories", href: "/todo-dashboard/categories" },
    ],
  },
  {
    id: "project-tracker",
    permKey: "project_tracker" as keyof AppPermissions,
    name: "ProjectHub",
    icon: "P",
    href: "/project-tracker",
    accent: "#f97316",
    subPages: [],
  },
];

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUser(data))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const activeApp = appNav.find(
    (app) =>
      pathname === app.href ||
      pathname.startsWith(app.id === "financial-tracker" ? "/financial-tracker/" : `/${app.id}/`)
  );

  const isOnDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  const isSubPageActive = (href: string, app: typeof appNav[0]) => {
    if (href === app.href) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <Link href="/dashboard" className="sidebar-brand-link">
          <div className="sidebar-logo">M</div>
          {!collapsed && <span className="sidebar-brand-text">MarketingHQ</span>}
        </Link>
        <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? "Expand" : "Collapse"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <path d="M9 18l6-6-6-6" />
            ) : (
              <path d="M15 18l-6-6 6-6" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Dashboard link */}
        <Link
          href="/dashboard"
          className={`sidebar-app ${isOnDashboard ? "active" : ""}`}
        >
          <div className="sidebar-app-icon" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          {!collapsed && <span>Dashboard</span>}
        </Link>

        <div className="sidebar-divider" />

        {/* Apps */}
        {appNav.filter((app) => user?.appPermissions?.[app.permKey] !== false).map((app) => {
          const isActive = activeApp?.id === app.id;
          return (
            <div key={app.id} className="sidebar-app-group">
              <Link
                href={app.href}
                className={`sidebar-app ${isActive ? "active" : ""}`}
                style={isActive ? { borderLeftColor: app.accent } : undefined}
              >
                <div
                  className="sidebar-app-icon"
                  style={{ background: `linear-gradient(135deg, ${app.accent}, ${app.accent}dd)` }}
                >
                  {app.icon}
                </div>
                {!collapsed && (
                  <>
                    <span>{app.name}</span>
                    {app.subPages.length > 0 && (
                      <svg className={`sidebar-chevron ${isActive ? "open" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    )}
                  </>
                )}
              </Link>

              {/* Sub-pages */}
              {isActive && !collapsed && app.subPages.length > 0 && (
                <div className="sidebar-sub-nav">
                  {app.subPages.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`sidebar-sub-item ${isSubPageActive(sub.href, app) ? "active" : ""}`}
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Admin: Users link */}
        {user?.role === "admin" && (
          <>
            <div className="sidebar-divider" />
            <Link
              href="/dashboard/users"
              className={`sidebar-app ${pathname === "/dashboard/users" ? "active" : ""}`}
            >
              <div className="sidebar-app-icon" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              {!collapsed && <span>Users</span>}
            </Link>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="sidebar-footer">
        <div className="sidebar-divider" />
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{userInitial}</div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.name}</span>
                <span className="sidebar-user-role">{user.role}</span>
              </div>
            )}
          </div>
        )}
        <button className="sidebar-logout" onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
