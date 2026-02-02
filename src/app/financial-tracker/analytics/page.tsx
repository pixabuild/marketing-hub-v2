"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useDateFilter } from "../DateFilterContext";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: Category | null;
  description: string;
  amount: number;
  date: string;
}

interface CategoryData {
  id: string;
  name: string;
  color: string;
  total: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

export default function AnalyticsPage() {
  const { filter, getDateRange, stats } = useDateFilter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenseCategoryData, setExpenseCategoryData] = useState<CategoryData[]>([]);
  const [incomeCategoryData, setIncomeCategoryData] = useState<CategoryData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let transUrl = "/api/transactions";
      if (start && end) {
        transUrl += `?startDate=${start}&endDate=${end}`;
      }

      const [transRes, expenseCatRes, incomeCatRes, monthlyRes] = await Promise.all([
        fetch(transUrl, { signal: controller.signal }),
        fetch(`/api/reports?type=by-category&categoryType=expense${start && end ? `&startDate=${start}&endDate=${end}` : ""}`, {
          signal: controller.signal,
        }),
        fetch(`/api/reports?type=by-category&categoryType=income${start && end ? `&startDate=${start}&endDate=${end}` : ""}`, {
          signal: controller.signal,
        }),
        fetch("/api/reports?type=monthly-trends", { signal: controller.signal }),
      ]);

      clearTimeout(timeoutId);

      if (transRes.ok) {
        const data = await transRes.json();
        setTransactions(data);
      }

      if (expenseCatRes.ok) {
        const data = await expenseCatRes.json();
        setExpenseCategoryData(data.filter((c: CategoryData) => c.total > 0));
      }

      if (incomeCatRes.ok) {
        const data = await incomeCatRes.json();
        setIncomeCategoryData(data.filter((c: CategoryData) => c.total > 0));
      }

      if (monthlyRes.ok) {
        const data = await monthlyRes.json();
        setMonthlyData(data.slice(-6));
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error fetching analytics data:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchData();
  }, [filter, fetchData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatCompact = (amount: number) => {
    if (amount >= 1000) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(amount);
    }
    return formatCurrency(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  // Calculate analytics
  const totalIncome = stats.totalIncome;
  const totalExpense = stats.totalExpense;
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0;

  // Get number of days in period
  const { start, end } = getDateRange();
  const daysInPeriod = start && end
    ? Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 30;

  const avgDailySpend = totalExpense / daysInPeriod;
  const avgDailyIncome = totalIncome / daysInPeriod;

  // Transaction counts
  const expenseCount = transactions.filter(t => t.type === "expense").length;
  const incomeCount = transactions.filter(t => t.type === "income").length;

  // Top spending category
  const topCategory = expenseCategoryData.length > 0
    ? expenseCategoryData.reduce((a, b) => a.total > b.total ? a : b)
    : null;

  // Calculate max value for chart scaling
  const maxValue = Math.max(
    ...monthlyData.map((d) => Math.max(d.income, d.expense)),
    1
  );

  // Calculate totals for category percentages
  const totalExpenseCategories = expenseCategoryData.reduce((sum, c) => sum + c.total, 0);
  const totalIncomeCategories = incomeCategoryData.reduce((sum, c) => sum + c.total, 0);

  // Calculate month-over-month change
  const currentMonth = monthlyData[monthlyData.length - 1];
  const prevMonth = monthlyData[monthlyData.length - 2];
  const expenseChange = currentMonth && prevMonth && prevMonth.expense > 0
    ? ((currentMonth.expense - prevMonth.expense) / prevMonth.expense) * 100
    : 0;
  const incomeChange = currentMonth && prevMonth && prevMonth.income > 0
    ? ((currentMonth.income - prevMonth.income) / prevMonth.income) * 100
    : 0;

  // Weekly breakdown
  const weeklyData = transactions.reduce((acc, tx) => {
    const dayOfWeek = new Date(tx.date).getDay();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const day = days[dayOfWeek];
    if (!acc[day]) acc[day] = { income: 0, expense: 0 };
    if (tx.type === "income") acc[day].income += tx.amount;
    else acc[day].expense += tx.amount;
    return acc;
  }, {} as Record<string, { income: number; expense: number }>);

  const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxWeeklyValue = Math.max(
    ...orderedDays.map(d => Math.max(weeklyData[d]?.expense || 0, weeklyData[d]?.income || 0)),
    1
  );

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <>
      <div className="section-top">
        <h2 className="section-title">Analytics</h2>
      </div>

      {/* Quick Stats Grid */}
      <div className="analytics-stats">
        <div className="stat-mini income">
          <div className="stat-mini-header">
            <span className="stat-mini-label">Total Income</span>
            {incomeChange !== 0 && (
              <span className={`stat-trend ${incomeChange >= 0 ? "up" : "down"}`}>
                {incomeChange >= 0 ? "+" : ""}{incomeChange.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="stat-mini-value">{formatCompact(totalIncome)}</div>
          <div className="stat-mini-sub">{incomeCount} transactions</div>
        </div>

        <div className="stat-mini expense">
          <div className="stat-mini-header">
            <span className="stat-mini-label">Total Expenses</span>
            {expenseChange !== 0 && (
              <span className={`stat-trend ${expenseChange <= 0 ? "up" : "down"}`}>
                {expenseChange >= 0 ? "+" : ""}{expenseChange.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="stat-mini-value">{formatCompact(totalExpense)}</div>
          <div className="stat-mini-sub">{expenseCount} transactions</div>
        </div>

        <div className={`stat-mini ${netSavings >= 0 ? "savings" : "negative"}`}>
          <div className="stat-mini-header">
            <span className="stat-mini-label">Net Savings</span>
            <span className={`stat-trend ${savingsRate >= 0 ? "up" : "down"}`}>
              {savingsRate.toFixed(0)}% rate
            </span>
          </div>
          <div className="stat-mini-value">{formatCompact(netSavings)}</div>
          <div className="stat-mini-sub">{netSavings >= 0 ? "You're saving!" : "Over budget"}</div>
        </div>

        <div className="stat-mini neutral">
          <div className="stat-mini-header">
            <span className="stat-mini-label">Avg Daily Spend</span>
          </div>
          <div className="stat-mini-value">{formatCurrency(avgDailySpend)}</div>
          <div className="stat-mini-sub">per day ({daysInPeriod} days)</div>
        </div>
      </div>

      {/* Monthly Trends Chart */}
      <div className="analytics-grid">
        <div className="chart-panel large">
          <div className="chart-header">
            <h3>Monthly Trends</h3>
            <div className="chart-legend inline">
              <span className="legend-item">
                <span className="legend-dot income"></span> Income
              </span>
              <span className="legend-item">
                <span className="legend-dot expense"></span> Expenses
              </span>
            </div>
          </div>
          <div className="chart-wrap">
            {monthlyData.length === 0 ? (
              <div className="empty" style={{ padding: "60px 20px" }}>
                <div className="empty-icon">
                  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3>No data yet</h3>
                <p>Add transactions to see trends</p>
              </div>
            ) : (
              <div className="bar-chart enhanced">
                {monthlyData.map((data, idx) => (
                  <div key={data.month} className="bar-group">
                    <div className="bar-values">
                      <span className="bar-value income">{formatCompact(data.income)}</span>
                      <span className="bar-value expense">{formatCompact(data.expense)}</span>
                    </div>
                    <div className="bars">
                      <div
                        className="bar income"
                        style={{ height: `${(data.income / maxValue) * 100}%` }}
                      />
                      <div
                        className="bar expense"
                        style={{ height: `${(data.expense / maxValue) * 100}%` }}
                      />
                    </div>
                    <span className={`bar-label ${idx === monthlyData.length - 1 ? "current" : ""}`}>
                      {formatMonth(data.month)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="chart-panel">
          <div className="chart-header">
            <h3>Weekly Pattern</h3>
          </div>
          <div className="weekly-chart">
            {orderedDays.map((day) => {
              const data = weeklyData[day] || { income: 0, expense: 0 };
              const total = data.expense;
              const height = maxWeeklyValue > 0 ? (total / maxWeeklyValue) * 100 : 0;
              return (
                <div key={day} className="weekly-bar">
                  <div className="weekly-bar-track">
                    <div
                      className="weekly-bar-fill"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="weekly-label">{day}</span>
                  <span className="weekly-value">{formatCompact(total)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="analytics-grid two-col">
        {/* Expense Categories */}
        <div className="chart-panel">
          <div className="chart-header">
            <h3>Expense Breakdown</h3>
            <span className="chart-total">{formatCurrency(totalExpenseCategories)}</span>
          </div>
          {expenseCategoryData.length === 0 ? (
            <div className="empty-mini">No expense data</div>
          ) : (
            <>
              <div className="donut-chart">
                <svg viewBox="0 0 100 100" className="donut">
                  {expenseCategoryData.reduce((acc, cat, idx) => {
                    const percentage = (cat.total / totalExpenseCategories) * 100;
                    const circumference = 2 * Math.PI * 40;
                    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                    const rotation = acc.offset;
                    acc.offset += percentage * 3.6;
                    acc.elements.push(
                      <circle
                        key={cat.id}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={cat.color}
                        strokeWidth="12"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset="0"
                        transform={`rotate(${rotation - 90} 50 50)`}
                        className="donut-segment"
                      />
                    );
                    return acc;
                  }, { elements: [] as React.ReactElement[], offset: 0 }).elements}
                </svg>
                <div className="donut-center">
                  <span className="donut-count">{expenseCategoryData.length}</span>
                  <span className="donut-label">categories</span>
                </div>
              </div>
              <div className="category-list">
                {expenseCategoryData.slice(0, 5).map((cat) => (
                  <div key={cat.id} className="category-item">
                    <span className="category-dot" style={{ backgroundColor: cat.color }} />
                    <span className="category-name">{cat.name}</span>
                    <span className="category-percent">
                      {((cat.total / totalExpenseCategories) * 100).toFixed(0)}%
                    </span>
                    <span className="category-amount">{formatCompact(cat.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Income Categories */}
        <div className="chart-panel">
          <div className="chart-header">
            <h3>Income Sources</h3>
            <span className="chart-total income">{formatCurrency(totalIncomeCategories)}</span>
          </div>
          {incomeCategoryData.length === 0 ? (
            <div className="empty-mini">No income data</div>
          ) : (
            <>
              <div className="donut-chart">
                <svg viewBox="0 0 100 100" className="donut">
                  {incomeCategoryData.reduce((acc, cat, idx) => {
                    const percentage = (cat.total / totalIncomeCategories) * 100;
                    const circumference = 2 * Math.PI * 40;
                    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                    const rotation = acc.offset;
                    acc.offset += percentage * 3.6;
                    acc.elements.push(
                      <circle
                        key={cat.id}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={cat.color || "var(--income)"}
                        strokeWidth="12"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset="0"
                        transform={`rotate(${rotation - 90} 50 50)`}
                        className="donut-segment"
                      />
                    );
                    return acc;
                  }, { elements: [] as React.ReactElement[], offset: 0 }).elements}
                </svg>
                <div className="donut-center">
                  <span className="donut-count">{incomeCategoryData.length}</span>
                  <span className="donut-label">sources</span>
                </div>
              </div>
              <div className="category-list">
                {incomeCategoryData.slice(0, 5).map((cat) => (
                  <div key={cat.id} className="category-item">
                    <span className="category-dot" style={{ backgroundColor: cat.color || "var(--income)" }} />
                    <span className="category-name">{cat.name}</span>
                    <span className="category-percent">
                      {((cat.total / totalIncomeCategories) * 100).toFixed(0)}%
                    </span>
                    <span className="category-amount">{formatCompact(cat.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Insights Panel */}
      {topCategory && (
        <div className="insights-panel">
          <h3>Insights</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="insight-content">
                <span className="insight-label">Top Spending</span>
                <span className="insight-value" style={{ color: topCategory.color }}>{topCategory.name}</span>
                <span className="insight-detail">
                  {formatCurrency(topCategory.total)} ({((topCategory.total / totalExpenseCategories) * 100).toFixed(0)}% of expenses)
                </span>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon savings">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="insight-content">
                <span className="insight-label">Savings Rate</span>
                <span className={`insight-value ${savingsRate >= 20 ? "good" : savingsRate >= 0 ? "ok" : "bad"}`}>
                  {savingsRate.toFixed(1)}%
                </span>
                <span className="insight-detail">
                  {savingsRate >= 20 ? "Excellent! Keep it up" : savingsRate >= 10 ? "Good progress" : savingsRate >= 0 ? "Try to save more" : "Spending exceeds income"}
                </span>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="insight-content">
                <span className="insight-label">Daily Average</span>
                <span className="insight-value">{formatCurrency(avgDailySpend)}</span>
                <span className="insight-detail">
                  {formatCurrency(avgDailyIncome)} income / day
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .analytics-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-mini {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }
        .stat-mini::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
        }
        .stat-mini.income::before { background: var(--income); }
        .stat-mini.expense::before { background: var(--expense); }
        .stat-mini.savings::before { background: linear-gradient(90deg, var(--income), var(--accent)); }
        .stat-mini.negative::before { background: var(--expense); }
        .stat-mini.neutral::before { background: var(--accent); }
        .stat-mini-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .stat-mini-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stat-trend {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .stat-trend.up {
          color: var(--income);
          background: var(--income-bg);
        }
        .stat-trend.down {
          color: var(--expense);
          background: var(--expense-bg);
        }
        .stat-mini-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: "JetBrains Mono", monospace;
          color: var(--text-primary);
        }
        .stat-mini.income .stat-mini-value { color: var(--income); }
        .stat-mini.expense .stat-mini-value { color: var(--expense); }
        .stat-mini.savings .stat-mini-value { color: var(--income); }
        .stat-mini.negative .stat-mini-value { color: var(--expense); }
        .stat-mini-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        .analytics-grid.two-col {
          grid-template-columns: repeat(2, 1fr);
        }
        .chart-panel {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
        }
        .chart-panel.large {
          min-height: 320px;
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .chart-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        .chart-total {
          font-size: 0.9rem;
          font-weight: 600;
          font-family: "JetBrains Mono", monospace;
          color: var(--expense);
        }
        .chart-total.income {
          color: var(--income);
        }
        .chart-legend.inline {
          display: flex;
          gap: 16px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .legend-dot.income { background: var(--income); }
        .legend-dot.expense { background: var(--expense); }

        .bar-chart.enhanced {
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          height: 220px;
          padding: 20px 0 0;
          gap: 8px;
        }
        .bar-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          max-width: 100px;
        }
        .bar-values {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          margin-bottom: 8px;
          min-height: 36px;
        }
        .bar-value {
          font-size: 0.7rem;
          font-family: "JetBrains Mono", monospace;
          font-weight: 500;
        }
        .bar-value.income { color: var(--income); }
        .bar-value.expense { color: var(--expense); }
        .bars {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 140px;
          width: 100%;
          justify-content: center;
        }
        .bar {
          width: 24px;
          min-height: 4px;
          border-radius: 6px 6px 0 0;
          transition: height 0.5s ease;
        }
        .bar.income {
          background: linear-gradient(180deg, var(--income), rgba(16, 185, 129, 0.6));
        }
        .bar.expense {
          background: linear-gradient(180deg, var(--expense), rgba(239, 68, 68, 0.6));
        }
        .bar-label {
          margin-top: 12px;
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .bar-label.current {
          color: var(--accent);
          font-weight: 600;
        }

        .weekly-chart {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          height: 180px;
          padding-top: 20px;
        }
        .weekly-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }
        .weekly-bar-track {
          width: 12px;
          height: 100px;
          background: var(--bg-hover);
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
        }
        .weekly-bar-fill {
          width: 100%;
          background: linear-gradient(180deg, var(--accent), rgba(168, 85, 247, 0.5));
          border-radius: 6px;
          transition: height 0.5s ease;
        }
        .weekly-label {
          margin-top: 8px;
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .weekly-value {
          font-size: 0.65rem;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .donut-chart {
          position: relative;
          width: 140px;
          height: 140px;
          margin: 0 auto 20px;
        }
        .donut {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }
        .donut-segment {
          transition: stroke-dasharray 0.5s ease;
        }
        .donut-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        .donut-count {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .donut-label {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .category-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .category-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }
        .category-item:last-child {
          border-bottom: none;
        }
        .category-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .category-name {
          flex: 1;
          font-size: 0.85rem;
          color: var(--text-primary);
        }
        .category-percent {
          font-size: 0.8rem;
          color: var(--text-muted);
          min-width: 40px;
          text-align: right;
        }
        .category-amount {
          font-size: 0.85rem;
          font-weight: 600;
          font-family: "JetBrains Mono", monospace;
          color: var(--text-primary);
          min-width: 70px;
          text-align: right;
        }
        .empty-mini {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .insights-panel {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
        }
        .insights-panel h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 20px;
        }
        .insights-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .insight-card {
          display: flex;
          gap: 16px;
          padding: 16px;
          background: var(--bg-hover);
          border-radius: 12px;
        }
        .insight-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--expense-bg);
          color: var(--expense);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .insight-icon.savings {
          background: var(--income-bg);
          color: var(--income);
        }
        .insight-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .insight-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .insight-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .insight-value.good { color: var(--income); }
        .insight-value.ok { color: var(--warning); }
        .insight-value.bad { color: var(--expense); }
        .insight-detail {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        @media (max-width: 1024px) {
          .analytics-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .analytics-grid {
            grid-template-columns: 1fr;
          }
          .insights-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .analytics-stats {
            grid-template-columns: 1fr;
          }
          .analytics-grid.two-col {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
