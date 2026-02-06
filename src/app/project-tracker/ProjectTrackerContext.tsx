"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

interface Project {
  id: string;
  projectName: string;
  clientName: string;
  description: string;
  cost: number | null;
  status: "paid" | "unpaid" | "partial";
  date: string;
  month: string;
  createdAt: string;
}

interface Stats {
  totalProjects: number;
  totalPaid: number;
  totalUnpaid: number;
  totalRevenue: number;
}

interface ProjectTrackerContextType {
  projects: Project[];
  stats: Stats;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  loading: boolean;
  isAdmin: boolean;
  addProject: (project: Omit<Project, "id" | "createdAt">) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  refreshData: () => void;
}

const ProjectTrackerContext = createContext<ProjectTrackerContextType | undefined>(undefined);

export function ProjectTrackerProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [stats, setStats] = useState<Stats>({ totalProjects: 0, totalPaid: 0, totalUnpaid: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const servicesCategoryIdRef = useRef<string | null>(null);

  const calculateStats = useCallback((projectList: Project[], month: string): Stats => {
    const monthProjects = projectList.filter(p => p.month === month);
    return {
      totalProjects: monthProjects.length,
      totalPaid: monthProjects
        .filter(p => p.status === "paid")
        .reduce((sum, p) => sum + (p.cost || 0), 0),
      totalUnpaid: monthProjects
        .filter(p => p.status !== "paid")
        .reduce((sum, p) => sum + (p.cost || 0), 0),
      totalRevenue: monthProjects
        .reduce((sum, p) => sum + (p.cost || 0), 0),
    };
  }, []);

  // --- Financial Tracker Sync ---

  const ensureServicesCategory = useCallback(async (): Promise<string | null> => {
    if (servicesCategoryIdRef.current) return servicesCategoryIdRef.current;

    try {
      const res = await fetch("/api/categories");
      if (!res.ok) return null;
      const categories = await res.json();

      const existing = categories.find(
        (c: { name: string; type: string }) => c.name === "Services" && c.type === "income"
      );
      if (existing) {
        servicesCategoryIdRef.current = existing.id;
        return existing.id;
      }

      const createRes = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Services", type: "income", color: "#f97316" }),
      });
      if (!createRes.ok) {
        const retryRes = await fetch("/api/categories");
        const retryCategories = await retryRes.json();
        const found = retryCategories.find(
          (c: { name: string; type: string }) => c.name === "Services" && c.type === "income"
        );
        if (found) { servicesCategoryIdRef.current = found.id; return found.id; }
        return null;
      }
      const newCategory = await createRes.json();
      servicesCategoryIdRef.current = newCategory.id;
      return newCategory.id;
    } catch (error) {
      console.error("Error ensuring Services category:", error);
      return null;
    }
  }, []);

  const syncProjectToTransaction = useCallback(async (project: Project) => {
    if (!project.cost || project.cost <= 0) return;

    const categoryId = await ensureServicesCategory();

    try {
      const searchRes = await fetch(
        `/api/transactions?source=project_tracker&externalId=${project.id}`
      );
      const existing = searchRes.ok ? await searchRes.json() : [];

      const transactionData = {
        description: `${project.projectName}${project.clientName ? ` - ${project.clientName}` : ""}`,
        amount: project.cost,
        type: "income",
        categoryId,
        date: project.date || `${project.month}-01`,
        source: "project_tracker",
        externalId: project.id,
      };

      if (existing.length > 0) {
        await fetch(`/api/transactions/${existing[0].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionData),
        });
      } else {
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transactionData),
        });
      }
    } catch (error) {
      console.error("Error syncing project to transaction:", error);
    }
  }, [ensureServicesCategory]);

  const deleteSyncedTransaction = useCallback(async (projectId: string) => {
    try {
      const searchRes = await fetch(
        `/api/transactions?source=project_tracker&externalId=${projectId}`
      );
      const existing = searchRes.ok ? await searchRes.json() : [];

      if (existing.length > 0) {
        await fetch(`/api/transactions/${existing[0].id}`, { method: "DELETE" });
      }
    } catch (error) {
      console.error("Error deleting synced transaction:", error);
    }
  }, []);

  // --- Data Loading ---

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [response, meRes] = await Promise.all([
        fetch("/api/project-tracker-data"),
        fetch("/api/me"),
      ]);

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const projectList = await response.json();
      setProjects(projectList);
      setStats(calculateStats(projectList, selectedMonth));

      if (meRes.ok) {
        const user = await meRes.json();
        setIsAdmin(user.role === "admin");
      }
    } catch (error) {
      console.error("Error loading project tracker data:", error);
      setProjects([]);
      setStats({ totalProjects: 0, totalPaid: 0, totalUnpaid: 0, totalRevenue: 0 });
    } finally {
      setLoading(false);
    }
  }, [calculateStats, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setStats(calculateStats(projects, selectedMonth));
  }, [selectedMonth, projects, calculateStats]);

  // --- CRUD Operations ---

  const addProject = async (project: Omit<Project, "id" | "createdAt">): Promise<Project | null> => {
    try {
      const res = await fetch("/api/project-tracker-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });

      if (!res.ok) throw new Error("Failed to create project");

      const newProject = await res.json();
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
      setStats(calculateStats(updatedProjects, selectedMonth));

      syncProjectToTransaction(newProject);
      return newProject;
    } catch (error) {
      console.error("Error adding project:", error);
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>): Promise<Project | null> => {
    try {
      const res = await fetch("/api/project-tracker-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!res.ok) throw new Error("Failed to update project");

      const updatedProject = await res.json();
      const updatedProjects = projects.map(p =>
        p.id === id ? updatedProject : p
      );
      setProjects(updatedProjects);
      setStats(calculateStats(updatedProjects, selectedMonth));

      if (updatedProject.cost && updatedProject.cost > 0) {
        syncProjectToTransaction(updatedProject);
      } else {
        deleteSyncedTransaction(id);
      }

      return updatedProject;
    } catch (error) {
      console.error("Error updating project:", error);
      return null;
    }
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/project-tracker-data?projectId=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete project");

      const updatedProjects = projects.filter(p => p.id !== id);
      setProjects(updatedProjects);
      setStats(calculateStats(updatedProjects, selectedMonth));

      deleteSyncedTransaction(id);
      return true;
    } catch (error) {
      console.error("Error deleting project:", error);
      return false;
    }
  };

  return (
    <ProjectTrackerContext.Provider
      value={{
        projects,
        stats,
        selectedMonth,
        setSelectedMonth,
        loading,
        isAdmin,
        addProject,
        updateProject,
        deleteProject,
        refreshData: loadData,
      }}
    >
      {children}
    </ProjectTrackerContext.Provider>
  );
}

export function useProjectTrackerContext() {
  const context = useContext(ProjectTrackerContext);
  if (!context) {
    throw new Error("useProjectTrackerContext must be used within a ProjectTrackerProvider");
  }
  return context;
}
