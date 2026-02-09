"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ProjectTrackerProvider, useProjectTrackerContext } from "./ProjectTrackerContext";
import GlobalSearch from "@/components/GlobalSearch";

function ProjectTrackerLayoutInner({ children }: { children: React.ReactNode }) {
  const { stats, selectedMonth, setSelectedMonth, isAdmin } = useProjectTrackerContext();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="brand">
            <div className="brand-logo project-tracker">
              <div className="brand-logo-ring"></div>
            </div>
            <div className="brand-text">
              <h1>ProjectHub</h1>
              <p>project_tracker.v1</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="date-filter-container">
            <button
              className="month-nav-btn"
              onClick={() => {
                const [y, m] = selectedMonth.split("-").map(Number);
                const d = new Date(y, m - 2, 1);
                setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
              }}
              title="Previous month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="month-label">
              {new Date(Number(selectedMonth.split("-")[0]), Number(selectedMonth.split("-")[1]) - 1).toLocaleString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button
              className="month-nav-btn"
              onClick={() => {
                const [y, m] = selectedMonth.split("-").map(Number);
                const d = new Date(y, m, 1);
                setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
              }}
              title="Next month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <GlobalSearch />
          <Link href="/dashboard" className="home-btn" title="Back to Hub">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </Link>
        </div>
      </header>

      {isAdmin && (
        <div className="stats-grid">
          <div className="stat-card balance">
            <div className="shine"></div>
            <div className="stat-label">
              <div className="stat-icon">&#10003;</div>
              <span>PAID</span>
            </div>
            <div className="stat-value">{formatCurrency(stats.totalPaid)}</div>
          </div>
          <div className="stat-card expense">
            <div className="shine"></div>
            <div className="stat-label">
              <div className="stat-icon">!</div>
              <span>UNPAID</span>
            </div>
            <div className="stat-value">{formatCurrency(stats.totalUnpaid)}</div>
          </div>
          <div className="stat-card income">
            <div className="shine"></div>
            <div className="stat-label">
              <div className="stat-icon">$</div>
              <span>REVENUE</span>
            </div>
            <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
          </div>
        </div>
      )}

      <section className="view active">
        {children}
      </section>

      <style jsx>{`
        .brand-logo.project-tracker {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
        }
      `}</style>
    </div>
  );
}

export default function ProjectTrackerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectTrackerProvider>
      <ProjectTrackerLayoutInner>{children}</ProjectTrackerLayoutInner>
    </ProjectTrackerProvider>
  );
}
