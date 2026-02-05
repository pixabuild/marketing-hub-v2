"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

interface Subtask {
  id: string;
  text: string;
  completed: boolean;
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
  categoryId: string | null;
  subtasks: Subtask[];
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
  categories: TodoCategory[];
  todos: Todo[];
  stats: Stats;
  loading: boolean;
  addCategory: (name: string, color?: string) => Promise<TodoCategory | null>;
  updateCategory: (id: string, name: string, color?: string) => Promise<TodoCategory | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  addTodo: (todo: Omit<Todo, "id" | "createdAt" | "updatedAt" | "subtasks"> & { subtasks?: Subtask[] }) => Promise<Todo | null>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<Todo | null>;
  deleteTodo: (id: string) => Promise<boolean>;
  addSubtask: (todoId: string, text: string) => Promise<boolean>;
  updateSubtask: (todoId: string, subtaskId: string, updates: Partial<Subtask>) => Promise<boolean>;
  deleteSubtask: (todoId: string, subtaskId: string) => Promise<boolean>;
  refreshData: () => void;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function TodoProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<TodoCategory[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, completedToday: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  const saveToServer = useCallback((categoryList: TodoCategory[], todoList: Todo[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const dataToSave = {
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
      const categoryList = data.categories || [];
      // Ensure todos have subtasks array (migration for old data)
      const todoList = (data.todos || []).map((t: Todo) => ({
        ...t,
        subtasks: t.subtasks || [],
      }));

      setCategories(getCategoriesWithCounts(categoryList, todoList));
      setTodos(todoList);
      setStats(calculateStats(todoList));
    } catch (error) {
      console.error("Error loading data:", error);
      setCategories([]);
      setTodos([]);
      setStats({ total: 0, pending: 0, completedToday: 0, overdue: 0 });
    } finally {
      setLoading(false);
    }
  }, [getCategoriesWithCounts, calculateStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    saveToServer(updated, todos);
    return newCategory;
  };

  const updateCategory = async (id: string, name: string, color?: string): Promise<TodoCategory | null> => {
    const updated = categories.map((c) =>
      c.id === id ? { ...c, name, color: color ?? c.color } : c
    );
    setCategories(updated);
    saveToServer(updated, todos);
    return updated.find((c) => c.id === id) || null;
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    const updatedCategories = categories.filter((c) => c.id !== id);
    const updatedTodos = todos.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t));

    setCategories(updatedCategories);
    setTodos(updatedTodos);
    saveToServer(updatedCategories, updatedTodos);
    return true;
  };

  // Todo CRUD
  const addTodo = async (todo: Omit<Todo, "id" | "createdAt" | "updatedAt" | "subtasks"> & { subtasks?: Subtask[] }): Promise<Todo | null> => {
    const now = new Date().toISOString();
    const newTodo: Todo = {
      ...todo,
      id: generateId(),
      subtasks: todo.subtasks || [],
      createdAt: now,
      updatedAt: now,
    };
    const updatedTodos = [...todos, newTodo];
    setTodos(updatedTodos);

    const updatedCategories = getCategoriesWithCounts(categories, updatedTodos);
    setCategories(updatedCategories);
    setStats(calculateStats(updatedTodos));

    saveToServer(updatedCategories, updatedTodos);
    return newTodo;
  };

  const updateTodo = async (id: string, updates: Partial<Todo>): Promise<Todo | null> => {
    const updatedTodos = todos.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    );
    setTodos(updatedTodos);

    const updatedCategories = getCategoriesWithCounts(categories, updatedTodos);
    setCategories(updatedCategories);
    setStats(calculateStats(updatedTodos));

    saveToServer(updatedCategories, updatedTodos);
    return updatedTodos.find((t) => t.id === id) || null;
  };

  const deleteTodo = async (id: string): Promise<boolean> => {
    const updatedTodos = todos.filter((t) => t.id !== id);
    setTodos(updatedTodos);

    const updatedCategories = getCategoriesWithCounts(categories, updatedTodos);
    setCategories(updatedCategories);
    setStats(calculateStats(updatedTodos));

    saveToServer(updatedCategories, updatedTodos);
    return true;
  };

  // Subtask CRUD
  const addSubtask = async (todoId: string, text: string): Promise<boolean> => {
    const newSubtask: Subtask = {
      id: generateId(),
      text,
      completed: false,
    };
    const updatedTodos = todos.map((t) =>
      t.id === todoId ? { ...t, subtasks: [...t.subtasks, newSubtask], updatedAt: new Date().toISOString() } : t
    );
    setTodos(updatedTodos);
    saveToServer(categories, updatedTodos);
    return true;
  };

  const updateSubtask = async (todoId: string, subtaskId: string, updates: Partial<Subtask>): Promise<boolean> => {
    const updatedTodos = todos.map((t) =>
      t.id === todoId
        ? {
            ...t,
            subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, ...updates } : s)),
            updatedAt: new Date().toISOString(),
          }
        : t
    );
    setTodos(updatedTodos);
    saveToServer(categories, updatedTodos);
    return true;
  };

  const deleteSubtask = async (todoId: string, subtaskId: string): Promise<boolean> => {
    const updatedTodos = todos.map((t) =>
      t.id === todoId
        ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId), updatedAt: new Date().toISOString() }
        : t
    );
    setTodos(updatedTodos);
    saveToServer(categories, updatedTodos);
    return true;
  };

  return (
    <TodoContext.Provider
      value={{
        categories,
        todos,
        stats,
        loading,
        addCategory,
        updateCategory,
        deleteCategory,
        addTodo,
        updateTodo,
        deleteTodo,
        addSubtask,
        updateSubtask,
        deleteSubtask,
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
