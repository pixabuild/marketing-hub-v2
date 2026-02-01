"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

type DateFilterValue = "today" | "yesterday" | "7days" | "this_month" | "last_month" | "all" | "custom";

interface DateRange {
  start: string | null;
  end: string | null;
}

interface Project {
  id: string;
  name: string;
}

interface DashboardStats {
  sales: number;
  expenses: number;
  profit: number;
}

interface DateFilterContextType {
  filter: DateFilterValue;
  setFilter: (value: DateFilterValue) => void;
  customRange: { start: string; end: string };
  setCustomRange: (range: { start: string; end: string }) => void;
  getDateRange: () => DateRange;
  projects: Project[];
  selectedProject: string;
  setSelectedProject: (id: string) => void;
  stats: DashboardStats;
  loading: boolean;
  addProject: (name: string, description?: string) => Promise<Project | null>;
  updateProject: (id: string, name: string) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  isAdmin: boolean;
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

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [stats, setStats] = useState<DashboardStats>({ sales: 0, expenses: 0, profit: 0 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

  // Fetch projects and user role on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch("/api/projects", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
          if (data.length > 0 && !selectedProject) {
            setSelectedProject(data[0].id);
          }
        } else {
          console.error("Failed to fetch projects:", res.status, res.statusText);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error fetching projects:", error);
        }
      }
    };

    const fetchUserRole = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.role === "admin");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    fetchProjects();
    fetchUserRole();
  }, []);

  // Fetch dashboard stats when project or filter changes
  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedProject) return;
      setLoading(true);
      try {
        const { start, end } = getDateRange();
        const params = new URLSearchParams({
          projectId: selectedProject,
          ...(start && { startDate: start }),
          ...(end && { endDate: end }),
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`/api/dashboard?${params}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          setStats({
            sales: data.period.revenue || 0,
            expenses: data.period.expenses || 0,
            profit: data.period.profit || 0,
          });
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error fetching stats:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedProject, filter, customRange, getDateRange]);

  const addProject = async (name: string, description?: string): Promise<Project | null> => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        const newProject = await res.json();
        setProjects((prev) => [newProject, ...prev]);
        setSelectedProject(newProject.id);
        return newProject;
      }
      return null;
    } catch (error) {
      console.error("Error creating project:", error);
      return null;
    }
  };

  const updateProject = async (id: string, name: string): Promise<Project | null> => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const updatedProject = await res.json();
        setProjects((prev) => prev.map((p) => (p.id === id ? updatedProject : p)));
        return updatedProject;
      }
      return null;
    } catch (error) {
      console.error("Error updating project:", error);
      return null;
    }
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });

      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (selectedProject === id) {
          const remaining = projects.filter((p) => p.id !== id);
          setSelectedProject(remaining.length > 0 ? remaining[0].id : "");
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting project:", error);
      return false;
    }
  };

  return (
    <DateFilterContext.Provider
      value={{
        filter,
        setFilter,
        customRange,
        setCustomRange,
        getDateRange,
        projects,
        selectedProject,
        setSelectedProject,
        stats,
        loading,
        addProject,
        updateProject,
        deleteProject,
        isAdmin,
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
