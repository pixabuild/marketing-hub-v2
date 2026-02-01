"use client";

import { useState, useEffect, useCallback } from "react";
import { useDateFilter } from "../DateFilterContext";

interface DashboardData {
  period: {
    revenue: number;
    sales: number;
    clicks: number;
    optins: number;
    trafficCost: number;
    expenses: number;
    profit: number;
  };
  previous: {
    revenue: number;
    sales: number;
  };
  month: {
    revenue: number;
    sales: number;
    expenses: number;
    profit: number;
  };
  topPlatforms: {
    platform: string;
    revenue: number;
    sales: number;
  }[];
  dailyRevenue: {
    date: string;
    revenue: number;
  }[];
  goal: {
    id: string;
    targetRevenue: number;
  } | null;
}

export default function AffiliateHQAnalytics() {
  const { filter, getDateRange, selectedProject } = useDateFilter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const params = new URLSearchParams({
        projectId: selectedProject,
        ...(start && { startDate: start }),
        ...(end && { endDate: end }),
      });

      const res = await fetch(`/api/dashboard?${params}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const dashboardData = await res.json();
        setData(dashboardData);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error fetching dashboard:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedProject, getDateRange]);

  useEffect(() => {
    if (selectedProject) {
      fetchDashboard();
    }
  }, [selectedProject, filter, fetchDashboard]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueChange = data
    ? calculateChange(data.period.revenue, data.previous.revenue)
    : 0;

  const conversionRate = data && data.period.clicks > 0
    ? (data.period.sales / data.period.clicks) * 100
    : 0;

  const goalProgress = data?.goal
    ? Math.min(100, (data.month.revenue / data.goal.targetRevenue) * 100)
    : 0;

  return (
    <>
      <div className="section-top">
        <h2 className="section-title">Analytics</h2>
      </div>

      {loading ? (
        <div className="loading">Loading analytics...</div>
      ) : !selectedProject ? (
        <div className="empty">
          <div className="empty-icon">+</div>
          <h3>No project selected</h3>
          <p>Create a project in the Projects tab to get started</p>
        </div>
      ) : !data ? (
        <div className="empty-state">No data available</div>
      ) : (
        <>
          {/* Analytics Summary Cards */}
          <div className="analytics-summary">
            <div className="summary-card">
              <div className="summary-value income">
                {formatCurrency(data.period.revenue)}
              </div>
              <div className="summary-label">Period Revenue</div>
              <div
                className={`summary-change ${revenueChange >= 0 ? "positive" : "negative"}`}
              >
                {revenueChange >= 0 ? "+" : ""}
                {revenueChange.toFixed(1)}% vs previous
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{data.period.sales.toLocaleString()}</div>
              <div className="summary-label">Total Sales</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{data.period.clicks.toLocaleString()}</div>
              <div className="summary-label">Total Clicks</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{conversionRate.toFixed(2)}%</div>
              <div className="summary-label">Conversion Rate</div>
            </div>
          </div>

          {/* Profit Summary */}
          <div className="profit-summary">
            <div className="profit-card">
              <div className="profit-row">
                <span>Revenue</span>
                <span className="income">{formatCurrency(data.period.revenue)}</span>
              </div>
              <div className="profit-row">
                <span>Expenses</span>
                <span className="expense">-{formatCurrency(data.period.expenses)}</span>
              </div>
              <div className="profit-row">
                <span>Traffic Cost</span>
                <span className="expense">-{formatCurrency(data.period.trafficCost)}</span>
              </div>
              <div className="profit-row total">
                <span>Net Profit</span>
                <span className={data.period.profit >= 0 ? "income" : "expense"}>
                  {formatCurrency(data.period.profit - data.period.trafficCost)}
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Goal Progress */}
          {data.goal && (
            <div className="goal-summary">
              <h3>Monthly Goal Progress</h3>
              <div className="goal-info">
                <span className="goal-current">{formatCurrency(data.month.revenue)}</span>
                <span className="goal-separator">/</span>
                <span className="goal-target">{formatCurrency(data.goal.targetRevenue)}</span>
              </div>
              <div className="goal-progress">
                <div className="progress-bar large">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${goalProgress}%`,
                      backgroundColor: goalProgress >= 100 ? "var(--income)" : "var(--accent)",
                    }}
                  />
                </div>
                <span className="progress-text">{goalProgress.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="charts-grid">
            <div className="chart-panel">
              <h3>Last 7 Days Revenue</h3>
              <div className="chart-wrap">
                {data.dailyRevenue.length === 0 ? (
                  <div className="empty-chart">No revenue data</div>
                ) : (
                  <div className="simple-chart">
                    {data.dailyRevenue.map((d, i) => {
                      const maxRevenue = Math.max(
                        ...data.dailyRevenue.map((x) => x.revenue)
                      );
                      const height = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
                      const dateStr = new Date(d.date).toLocaleDateString("en-US", {
                        weekday: "short",
                      });
                      return (
                        <div key={i} className="chart-bar-container">
                          <div
                            className="chart-bar"
                            style={{ height: `${Math.max(5, height)}%` }}
                            title={`${dateStr}: ${formatCurrency(d.revenue)}`}
                          />
                          <span className="chart-label">{dateStr}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="chart-panel">
              <h3>Top Platforms</h3>
              <div className="chart-wrap">
                {data.topPlatforms.length === 0 ? (
                  <div className="empty-chart">No platform data</div>
                ) : (
                  <div className="platform-list">
                    {data.topPlatforms.map((p, i) => {
                      const maxRevenue = data.topPlatforms[0]?.revenue || 1;
                      const width = (p.revenue / maxRevenue) * 100;
                      return (
                        <div key={i} className="platform-item">
                          <div className="platform-info">
                            <span className="platform-name">{p.platform}</span>
                            <span className="platform-revenue">
                              {formatCurrency(p.revenue)}
                            </span>
                          </div>
                          <div className="platform-bar">
                            <div
                              className="platform-bar-fill"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <span className="platform-sales">{p.sales} sales</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
