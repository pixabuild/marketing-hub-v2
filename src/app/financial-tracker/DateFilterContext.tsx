"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

type DateFilterValue = "today" | "yesterday" | "7days" | "this_month" | "last_month" | "all" | "custom";

interface DateRange {
  start: string | null;
  end: string | null;
}

interface Stats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

interface DateFilterContextType {
  filter: DateFilterValue;
  setFilter: (value: DateFilterValue) => void;
  customRange: { start: string; end: string };
  setCustomRange: (range: { start: string; end: string }) => void;
  getDateRange: () => DateRange;
  stats: Stats;
  refreshStats: () => void;
}

const DateFilterContext = createContext<DateFilterContextType | null>(null);

function toLocalDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<DateFilterValue>("this_month");
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [customRange, setCustomRange] = useState({
    start: toLocalDateString(firstOfMonth),
    end: toLocalDateString(today),
  });

  const [stats, setStats] = useState<Stats>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });

  const getDateRange = useCallback((): DateRange => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case "today":
        return {
          start: toLocalDateString(today),
          end: toLocalDateString(today),
        };
      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: toLocalDateString(yesterday),
          end: toLocalDateString(yesterday),
        };
      }
      case "7days": {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 6);
        return {
          start: toLocalDateString(weekAgo),
          end: toLocalDateString(today),
        };
      }
      case "this_month": {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: toLocalDateString(firstDay),
          end: toLocalDateString(today),
        };
      }
      case "last_month": {
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: toLocalDateString(firstDayLastMonth),
          end: toLocalDateString(lastDayLastMonth),
        };
      }
      case "custom":
        return {
          start: customRange.start,
          end: customRange.end,
        };
      case "all":
      default:
        return { start: null, end: null };
    }
  }, [filter, customRange]);

  const fetchStats = useCallback(async () => {
    const { start, end } = getDateRange();
    let url = "/api/reports?type=summary";
    if (start && end) {
      url += `&startDate=${start}&endDate=${end}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setStats({
          totalIncome: data.totalIncome || 0,
          totalExpense: data.totalExpense || 0,
          balance: data.balance || 0,
        });
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error fetching stats:", error);
      }
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchStats();
  }, [filter, customRange, fetchStats]);

  return (
    <DateFilterContext.Provider
      value={{
        filter,
        setFilter,
        customRange,
        setCustomRange,
        getDateRange,
        stats,
        refreshStats: fetchStats,
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (!context) {
    throw new Error("useDateFilter must be used within DateFilterProvider");
  }
  return context;
}
