"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DateFilterProvider, useDateFilter } from "./DateFilterContext";
import GlobalSearch from "@/components/GlobalSearch";

function FinancialTrackerLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { filter, setFilter, customRange, setCustomRange, stats } = useDateFilter();

  const navItems = [
    { name: "Transactions", href: "/financial-tracker" },
    { name: "Recurring", href: "/financial-tracker/recurring" },
    { name: "Categories", href: "/financial-tracker/categories" },
    { name: "Analytics", href: "/financial-tracker/analytics" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="brand">
            <div className="brand-logo vault">
              <div className="brand-logo-ring"></div>
            </div>
            <div className="brand-text">
              <h1>Vault</h1>
              <p>financial_tracker.v2</p>
            </div>
          </div>
        </div>
        <div className="header-right">
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
            <span>INCOME</span>
          </div>
          <div className="stat-value">{formatCurrency(stats.totalIncome)}</div>
        </div>
        <div className="stat-card expense">
          <div className="shine"></div>
          <div className="stat-label">
            <div className="stat-icon">-</div>
            <span>EXPENSES</span>
          </div>
          <div className="stat-value">{formatCurrency(stats.totalExpense)}</div>
        </div>
        <div className="stat-card balance">
          <div className="shine"></div>
          <div className="stat-label">
            <div className="stat-icon">=</div>
            <span>BALANCE</span>
          </div>
          <div className="stat-value">{formatCurrency(stats.balance)}</div>
        </div>
      </div>

      {/* Navigation Pills */}
      <nav className="nav-pills">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/financial-tracker" && pathname.startsWith(item.href));
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
    </div>
  );
}

export default function FinancialTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DateFilterProvider>
      <FinancialTrackerLayoutInner>{children}</FinancialTrackerLayoutInner>
    </DateFilterProvider>
  );
}
