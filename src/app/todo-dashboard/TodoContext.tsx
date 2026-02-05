"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

interface TodoProject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  _count: { todos: number };
}

interface TodoCategory {
  id: string;
  name: string;
  color: string;
  _count: { todos: number };
}

interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: string;
  dueDate: string | null;
  projectId: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  pending: number;
  completedToday: number;
  overdue: number;
}

interface TodoContextType {
  projects: TodoProject[];
  categories: TodoCategory[];
  todos: Todo[];
  selectedProject: string | null;
  setSelectedProject: (id: string | null) => void;
  stats: Stats;
  loading: boolean;
  addProject: (name: string, description?: string, color?: string) => Promise<TodoProject | null>;
  updateProject: (id: string, name: string, description?: string, color?: string) => Promise<TodoProject | null>;
  deleteProject: (id: string) => Promise<boolean>;
  addCategory: (name: string, color?: string) => Promise<TodoCategory | null>;
  updateCategory: (id: string, name: string, color?: string) => Promise<TodoCategory | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  addTodo: (todo: Omit<Todo, "id" | "createdAt" | "updatedAt">) => Promise<Todo | null>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<Todo | null>;
  deleteTodo: (id: string) => Promise<boolean>;
  refreshData: () => void;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function TodoProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<TodoProject[]>([]);
  const [categories, setCategories] = useState<TodoCategory[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, completedToday: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getProjectsWithCounts = useCallback((projectList: Omit<TodoProject, "_count">[], todoList: Todo[]): TodoProject[] => {
    return projectList.map((p) => ({
      ...p,
      _count: { todos: todoList.filter((t) => t.projectId === p.id).length },
    }));
  }, []);

  const getCategoriesWithCounts = useCallback((categoryList: Omit<TodoCategory, "_count">[], todoList: Todo[]): TodoCategory[] => {
    return categoryList.map((c) => ({
      ...c,
      _count: { todos: todoList.filter((t) => t.categoryId === c.id).length },
    }));
  }, []);

  const calculateStats = useCallback((todoList: Todo[]): Stats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pending = todoList.filter((t) => !t.completed).length;
    const completedToday = todoList.filter((t) => {
      if (!t.completed) return false;
      const updated = new Date(t.updatedAt);
      return updated >= today && updated < tomorrow;
    }).length;
    const overdue = todoList.filter((t) => {
      if (t.completed || !t.dueDate) return false;
      return new Date(t.dueDate) < today;
    }).length;

    return { total: todoList.length, pending, completedToday, overdue };
  }, []);

  // Save data to server (debounced)
  const saveToServer = useCallback((projectList: TodoProject[], categoryList: TodoCategory[], todoList: Todo[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const dataToSave = {
          projects: projectList.map(({ _count, ...rest }) => rest),
          categories: categoryList.map(({ _count, ...rest }) => rest),
          todos: todoList,
        };

        await fetch("/api/todo-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSave),
        });
      } catch (error) {
        console.error("Error saving to server:", error);
      }
    }, 500);
  }, []);

  // Load data from server
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/todo-data");

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      const projectList = data.projects || [];
      const categoryList = data.categories || [];
      const todoList = data.todos || [];

      setProjects(getProjectsWithCounts(projectList, todoList));
      setCategories(getCategoriesWithCounts(categoryList, todoList));
      setTodos(todoList);
      setStats(calculateStats(todoList));
    } catch (error) {
      console.error("Error loading data:", error);
      // Initialize with empty data
      setProjects([]);
      setCategories([]);
      setTodos([]);
      setStats({ total: 0, pending: 0, completedToday: 0, overdue: 0 });
    } finally {
      setLoading(false);
    }
  }, [getProjectsWithCounts, getCategoriesWithCounts, calculateStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Project CRUD
  const addProject = async (name: string, description?: string, color?: string): Promise<TodoProject | null> => {
    const newProject: TodoProject = {
      id: generateId(),
      name,
      description: description || null,
      color: color || "#8b5cf6",
      _count: { todos: 0 },
    };
    const updated = [...projects, newProject];
    setProjects(updated);
    saveToServer(updated, categories, todos);
    return newProject;
  };

  const updateProject = async (id: string, name: string, description?: string, color?: string): Promise<TodoProject | null> => {
    const updated = projects.map((p) =>
      p.id === id ? { ...p, name, description: description ?? p.description, color: color ?? p.color } : p
    );
    setProjects(updated);
    saveToServer(updated, categories, todos);
    return updated.find((p) => p.id === id) || null;
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    const updatedProjects = projects.filter((p) => p.id !== id);
    const updatedTodos = todos.map((t) => (t.projectId === id ? { ...t, projectId: null } : t));

    setProjects(updatedProjects);
    setTodos(updatedTodos);
    saveToServer(updatedProjects, categories, updatedTodos);

    if (selectedProject === id) setSelectedProject(null);
    return true;
  };

  // Category CRUD
  const addCategory = async (name: string, color?: string): Promise<TodoCategory | null> => {
    const newCategory: TodoCategory = {
      id: generateId(),
      name,
      color: color || "#6c757d",
      _count: { todos: 0 },
    };
    const updated = [...categories, newCategory];
    setCategories(updated);
    saveToServer(projects, updated, todos);
    return newCategory;
  };

  const updateCategory = async (id: string, name: string, color?: string): Promise<TodoCategory | null> => {
    const updated = categories.map((c) =>
      c.id === id ? { ...c, name, color: color ?? c.color } : c
    );
    setCategories(updated);
    saveToServer(projects, updated, todos);
    return updated.find((c) => c.id === id) || null;
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    const updatedCategories = categories.filter((c) => c.id !== id);
    const updatedTodos = todos.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t));

    setCategories(updatedCategories);
    setTodos(updatedTodos);
    saveToServer(projects, updatedCategories, updatedTodos);
    return true;
  };

  // Todo CRUD
  const addTodo = async (todo: Omit<Todo, "id" | "createdAt" | "updatedAt">): Promise<Todo | null> => {
    const now = new Date().toISOString();
    const newTodo: Todo = {
      ...todo,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const updatedTodos = [...todos, newTodo];
    setTodos(updatedTodos);

    const updatedProjects = getProjectsWithCounts(projects, updatedTodos);
    const updatedCategories = getCategoriesWithCounts(categories, updatedTodos);
    setProjects(updatedProjects);
    setCategories(updatedCategories);
    setStats(calculateStats(updatedTodos));

    saveToServer(updatedProjects, updatedCategories, updatedTodos);
    return newTodo;
  };

  const updateTodo = async (id: string, updates: Partial<Todo>): Promise<Todo | null> => {
    const updatedTodos = todos.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    );
    setTodos(updatedTodos);

    const updatedProjects = getProjectsWithCounts(projects, updatedTodos);
    const updatedCategories = getCategoriesWithCounts(categories, updatedTodos);
    setProjects(updatedProjects);
    setCategories(updatedCategories);
    setStats(calculateStats(updatedTodos));

    saveToServer(updatedProjects, updatedCategories, updatedTodos);
    return updatedTodos.find((t) => t.id === id) || null;
  };

  const deleteTodo = async (id: string): Promise<boolean> => {
    const updatedTodos = todos.filter((t) => t.id !== id);
    setTodos(updatedTodos);

    const updatedProjects = getProjectsWithCounts(projects, updatedTodos);
    const updatedCategories = getCategoriesWithCounts(categories, updatedTodos);
    setProjects(updatedProjects);
    setCategories(updatedCategories);
    setStats(calculateStats(updatedTodos));

    saveToServer(updatedProjects, updatedCategories, updatedTodos);
    return true;
  };

  return (
    <TodoContext.Provider
      value={{
        projects,
        categories,
        todos,
        selectedProject,
        setSelectedProject,
        stats,
        loading,
        addProject,
        updateProject,
        deleteProject,
        addCategory,
        updateCategory,
        deleteCategory,
        addTodo,
        updateTodo,
        deleteTodo,
        refreshData: loadData,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
}

export function useTodoContext() {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error("useTodoContext must be used within a TodoProvider");
  }
  return context;
}
