"use client";

import { useState, useMemo } from "react";
import { useTodoContext } from "./TodoContext";

export default function TodosPage() {
  const { categories, todos, addTodo, updateTodo, deleteTodo, addSubtask, updateSubtask, deleteSubtask } = useTodoContext();
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<typeof todos[0] | null>(null);
  const [draggedTodo, setDraggedTodo] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    categoryId: "",
  });

  // Group todos by status for Kanban columns
  const columns = useMemo(() => {
    return {
      todo: todos.filter(t => !t.completed && t.priority !== "high"),
      inProgress: todos.filter(t => !t.completed && t.priority === "high"),
      done: todos.filter(t => t.completed),
    };
  }, [todos]);

  const openAddModal = (status?: string) => {
    setEditingTodo(null);
    setNewSubtaskText("");
    setFormData({
      title: "",
      description: "",
      priority: status === "inProgress" ? "high" : "medium",
      dueDate: "",
      categoryId: "",
    });
    setShowModal(true);
  };

  const openEditModal = (todo: typeof todos[0]) => {
    setEditingTodo(todo);
    setNewSubtaskText("");
    setFormData({
      title: todo.title,
      description: todo.description || "",
      priority: todo.priority,
      dueDate: todo.dueDate ? todo.dueDate.split("T")[0] : "",
      categoryId: todo.categoryId || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTodo) {
      await updateTodo(editingTodo.id, {
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        categoryId: formData.categoryId || null,
      });
    } else {
      await addTodo({
        title: formData.title,
        description: formData.description || null,
        completed: false,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        categoryId: formData.categoryId || null,
      });
    }
    setShowModal(false);
    setEditingTodo(null);
  };

  const handleDragStart = (todoId: string) => {
    setDraggedTodo(todoId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: "todo" | "inProgress" | "done") => {
    if (!draggedTodo) return;

    const todo = todos.find(t => t.id === draggedTodo);
    if (!todo) return;

    if (status === "done") {
      await updateTodo(draggedTodo, { completed: true });
    } else if (status === "inProgress") {
      await updateTodo(draggedTodo, { completed: false, priority: "high" });
    } else {
      await updateTodo(draggedTodo, { completed: false, priority: "medium" });
    }

    setDraggedTodo(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    await deleteTodo(id);
  };

  const handleAddSubtask = async (todoId: string) => {
    if (!newSubtaskText.trim()) return;
    await addSubtask(todoId, newSubtaskText.trim());
    setNewSubtaskText("");
  };

  const handleToggleSubtask = async (e: React.MouseEvent, todoId: string, subtaskId: string, currentCompleted: boolean) => {
    e.stopPropagation();
    await updateSubtask(todoId, subtaskId, { completed: !currentCompleted });
  };

  const handleDeleteSubtask = async (e: React.MouseEvent, todoId: string, subtaskId: string) => {
    e.stopPropagation();
    await deleteSubtask(todoId, subtaskId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "#ef4444";
      case "medium": return "#f59e0b";
      case "low": return "#10b981";
      default: return "#6b7280";
    }
  };

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId)?.color;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getSubtaskProgress = (todo: typeof todos[0]) => {
    if (!todo.subtasks || todo.subtasks.length === 0) return null;
    const completed = todo.subtasks.filter(s => s.completed).length;
    return { completed, total: todo.subtasks.length };
  };

  const renderNote = (todo: typeof todos[0], className?: string) => {
    const progress = getSubtaskProgress(todo);

    return (
      <div
        key={todo.id}
        className={`sticky-note ${className || ""}`}
        draggable
        onDragStart={() => handleDragStart(todo.id)}
        onClick={() => openEditModal(todo)}
        style={{ borderLeftColor: getPriorityColor(todo.priority) }}
      >
        <div className="note-content">
          <p className="note-title">{todo.title}</p>
          {todo.description && (
            <p className="note-desc">{todo.description}</p>
          )}
          {/* Subtasks preview on card */}
          {progress && (
            <div className="subtasks-preview" onClick={(e) => e.stopPropagation()}>
              <div className="subtasks-progress-bar">
                <div
                  className="subtasks-progress-fill"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
              <span className="subtasks-count">{progress.completed}/{progress.total}</span>
            </div>
          )}
        </div>
        <div className="note-footer">
          {todo.categoryId && (
            <span
              className="note-tag"
              style={{ backgroundColor: getCategoryColor(todo.categoryId) + "30", color: getCategoryColor(todo.categoryId) || undefined }}
            >
              {categories.find(c => c.id === todo.categoryId)?.name}
            </span>
          )}
          {todo.dueDate && (
            <span className="note-date">{formatDate(todo.dueDate)}</span>
          )}
        </div>
        <button className="note-delete" onClick={(e) => { e.stopPropagation(); handleDelete(todo.id); }}>
          &times;
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="board-header">
        <h2 className="board-title">All Tasks</h2>
      </div>

      <div className="kanban-board">
        {/* To Do Column */}
        <div
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop("todo")}
        >
          <div className="column-header">
            <span className="column-dot todo"></span>
            <h3>To Do</h3>
            <span className="column-count">{columns.todo.length}</span>
          </div>
          <div className="column-content">
            {columns.todo.map((todo) => renderNote(todo))}
            <button className="add-note-btn" onClick={() => openAddModal("todo")}>
              + Add note
            </button>
          </div>
        </div>

        {/* In Progress Column */}
        <div
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop("inProgress")}
        >
          <div className="column-header">
            <span className="column-dot progress"></span>
            <h3>In Progress</h3>
            <span className="column-count">{columns.inProgress.length}</span>
          </div>
          <div className="column-content">
            {columns.inProgress.map((todo) => renderNote(todo, "urgent"))}
            <button className="add-note-btn" onClick={() => openAddModal("inProgress")}>
              + Add note
            </button>
          </div>
        </div>

        {/* Done Column */}
        <div
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop("done")}
        >
          <div className="column-header">
            <span className="column-dot done"></span>
            <h3>Done</h3>
            <span className="column-count">{columns.done.length}</span>
          </div>
          <div className="column-content">
            {columns.done.map((todo) => renderNote(todo, "completed"))}
          </div>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {showModal && (
        <div className="modal-backdrop open" onClick={() => setShowModal(false)}>
          <div className="modal-box note-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingTodo ? "Edit Note" : "New Note"}</h2>
              <button className="modal-x" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="field">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="What needs to be done?"
                    required
                    autoFocus
                    className="note-input"
                  />
                </div>
                <div className="field">
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add details..."
                    rows={3}
                    className="note-textarea"
                  />
                </div>
                <div className="field">
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="note-select"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Subtasks Section */}
                {editingTodo && (
                  <div className="subtasks-section">
                    <h4 className="subtasks-title">Checklist</h4>
                    <div className="subtasks-list">
                      {editingTodo.subtasks.map((subtask) => (
                        <div key={subtask.id} className="subtask-item">
                          <label className="subtask-checkbox">
                            <input
                              type="checkbox"
                              checked={subtask.completed}
                              onChange={(e) => handleToggleSubtask(e as unknown as React.MouseEvent, editingTodo.id, subtask.id, subtask.completed)}
                            />
                            <span className={`subtask-text ${subtask.completed ? "completed" : ""}`}>
                              {subtask.text}
                            </span>
                          </label>
                          <button
                            type="button"
                            className="subtask-delete"
                            onClick={(e) => handleDeleteSubtask(e, editingTodo.id, subtask.id)}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="subtask-add">
                      <input
                        type="text"
                        value={newSubtaskText}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        placeholder="Add a subtask..."
                        className="subtask-input"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSubtask(editingTodo.id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="subtask-add-btn"
                        onClick={() => handleAddSubtask(editingTodo.id)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow">
                  {editingTodo ? "Save" : "Add Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

<style jsx>{`
        .board-header {
          margin-bottom: 24px;
        }
        .board-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }
      `}</style>
    </>
  );
}
