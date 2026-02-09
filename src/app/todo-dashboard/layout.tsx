"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TodoProvider, useTodoContext } from "./TodoContext";
import GlobalSearch from "@/components/GlobalSearch";

function TodoDashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { stats } = useTodoContext();

  useEffect(() => {
    const root = document.documentElement;
    const overrides: Record<string, string> = {
      "--accent": "#ec4899",
      "--accent-secondary": "#f472b6",
      "--mesh-1": "rgba(236, 72, 153, 0.15)",
      "--mesh-2": "rgba(244, 114, 182, 0.1)",
      "--mesh-3": "rgba(249, 168, 212, 0.05)",
    };
    const originals: Record<string, string> = {};
    for (const [key, val] of Object.entries(overrides)) {
      originals[key] = root.style.getPropertyValue(key);
      root.style.setProperty(key, val);
    }
    return () => {
      for (const [key, val] of Object.entries(originals)) {
        if (val) root.style.setProperty(key, val);
        else root.style.removeProperty(key);
      }
    };
  }, []);

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

      <style jsx>{`
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
