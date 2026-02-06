"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

interface Project {
  id: string;
  projectName: string;
  clientName: string;
  description: string;
  cost: number | null;
  status: "paid" | "unpaid" | "partial";
  month: string;
  teamName: string;
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
  teams: string[];
  stats: Stats;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  loading: boolean;
  addProject: (project: Omit<Project, "id" | "createdAt">) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  addTeam: (name: string) => void;
  refreshData: () => void;
}

const ProjectTrackerContext = createContext<ProjectTrackerContextType | undefined>(undefined);

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function ProjectTrackerProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [stats, setStats] = useState<Stats>({ totalProjects: 0, totalPaid: 0, totalUnpaid: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateStats = useCallback((projectList: Project[], month: string): Stats => {
    const monthProjects = projectList.filter(p => p.month === month);
    return {
      totalProjects: monthProjects.length,
      totalPaid: monthProjects.filter(p => p.status === "paid").length,
      totalUnpaid: monthProjects.filter(p => p.status !== "paid").length,
      totalRevenue: monthProjects
        .filter(p => p.status === "paid")
        .reduce((sum, p) => sum + (p.cost || 0), 0),
    };
  }, []);

  const saveToServer = useCallback((projectList: Project[], teamList: string[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch("/api/project-tracker-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projects: projectList, teams: teamList }),
        });
      } catch (error) {
        console.error("Error saving project tracker data:", error);
      }
    }, 500);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/project-tracker-data");

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      const projectList = data.projects || [];
      const teamList = data.teams || [];

      setProjects(projectList);
      setTeams(teamList);
      setStats(calculateStats(projectList, selectedMonth));
    } catch (error) {
      console.error("Error loading project tracker data:", error);
      setProjects([]);
      setTeams([]);
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

  const addProject = async (project: Omit<Project, "id" | "createdAt">): Promise<Project | null> => {
    const newProject: Project = {
      ...project,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    setStats(calculateStats(updatedProjects, selectedMonth));

    // Auto-add team if new
    let updatedTeams = teams;
    if (project.teamName && !teams.includes(project.teamName)) {
      updatedTeams = [...teams, project.teamName];
      setTeams(updatedTeams);
    }

    saveToServer(updatedProjects, updatedTeams);
    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<Project>): Promise<Project | null> => {
    const updatedProjects = projects.map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    setProjects(updatedProjects);
    setStats(calculateStats(updatedProjects, selectedMonth));

    let updatedTeams = teams;
    if (updates.teamName && !teams.includes(updates.teamName)) {
      updatedTeams = [...teams, updates.teamName];
      setTeams(updatedTeams);
    }

    saveToServer(updatedProjects, updatedTeams);
    return updatedProjects.find(p => p.id === id) || null;
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    const updatedProjects = projects.filter(p => p.id !== id);
    setProjects(updatedProjects);
    setStats(calculateStats(updatedProjects, selectedMonth));
    saveToServer(updatedProjects, teams);
    return true;
  };

  const addTeam = (name: string) => {
    if (!teams.includes(name)) {
      const updated = [...teams, name];
      setTeams(updated);
      saveToServer(projects, updated);
    }
  };

  return (
    <ProjectTrackerContext.Provider
      value={{
        projects,
        teams,
        stats,
        selectedMonth,
        setSelectedMonth,
        loading,
        addProject,
        updateProject,
        deleteProject,
        addTeam,
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
