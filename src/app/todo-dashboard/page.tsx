"use client";

import { useState, useMemo } from "react";
import { useTodoContext } from "./TodoContext";

export default function TodosPage() {
  const { projects, categories, todos, selectedProject, addTodo, updateTodo, deleteTodo } = useTodoContext();
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<typeof todos[0] | null>(null);
  const [draggedTodo, setDraggedTodo] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    projectId: "",
    categoryId: "",
  });

  // Group todos by status for Kanban columns
  const columns = useMemo(() => {
    const projectTodos = selectedProject
      ? todos.filter(t => t.projectId === selectedProject)
      : todos;

    return {
      todo: projectTodos.filter(t => !t.completed && t.priority !== "high"),
      inProgress: projectTodos.filter(t => !t.completed && t.priority === "high"),
      done: projectTodos.filter(t => t.completed),
    };
  }, [todos, selectedProject]);

  const openAddModal = (status?: string) => {
    setEditingTodo(null);
    setFormData({
      title: "",
      description: "",
      priority: status === "inProgress" ? "high" : "medium",
      dueDate: "",
      projectId: selectedProject || "",
      categoryId: "",
    });
    setShowModal(true);
  };

  const openEditModal = (todo: typeof todos[0]) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || "",
      priority: todo.priority,
      dueDate: todo.dueDate ? todo.dueDate.split("T")[0] : "",
      projectId: todo.projectId || "",
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
        projectId: formData.projectId || null,
        categoryId: formData.categoryId || null,
      });
    } else {
      await addTodo({
        title: formData.title,
        description: formData.description || null,
        completed: false,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        projectId: formData.projectId || null,
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

  return (
    <>
      <div className="board-header">
        <h2 className="board-title">
          {selectedProject
            ? projects.find(p => p.id === selectedProject)?.name || "Board"
            : "All Tasks"}
        </h2>
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
            {columns.todo.map((todo) => (
              <div
                key={todo.id}
                className="sticky-note"
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
            ))}
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
            {columns.inProgress.map((todo) => (
              <div
                key={todo.id}
                className="sticky-note urgent"
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
            ))}
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
            {columns.done.map((todo) => (
              <div
                key={todo.id}
                className="sticky-note completed"
                draggable
                onDragStart={() => handleDragStart(todo.id)}
                onClick={() => openEditModal(todo)}
              >
                <div className="note-content">
                  <p className="note-title">{todo.title}</p>
                  {todo.description && (
                    <p className="note-desc">{todo.description}</p>
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
                </div>
                <button className="note-delete" onClick={(e) => { e.stopPropagation(); handleDelete(todo.id); }}>
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
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
          color: var(--text);
        }
        .kanban-board {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          height: calc(100vh - 280px);
          min-height: 400px;
        }
        .kanban-column {
          background: var(--card-bg);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border);
        }
        .column-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        .column-header h3 {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text);
          flex: 1;
        }
        .column-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .column-dot.todo { background: #6b7280; }
        .column-dot.progress { background: #f59e0b; }
        .column-dot.done { background: #10b981; }
        .column-count {
          background: var(--bg);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .column-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sticky-note {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 8px;
          padding: 14px;
          cursor: grab;
          position: relative;
          border-left: 4px solid #f59e0b;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .sticky-note:hover {
          transform: translateY(-2px) rotate(1deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .sticky-note:active {
          cursor: grabbing;
        }
        .sticky-note.urgent {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
        }
        .sticky-note.completed {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          opacity: 0.8;
          border-left-color: #10b981;
        }
        .sticky-note.completed .note-title {
          text-decoration: line-through;
          color: #666;
        }
        .note-content {
          margin-bottom: 10px;
        }
        .note-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 6px 0;
          line-height: 1.3;
        }
        .note-desc {
          font-size: 0.8rem;
          color: #4b5563;
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .note-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .note-tag {
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }
        .note-date {
          font-size: 0.7rem;
          color: #6b7280;
        }
        .note-delete {
          position: absolute;
          top: 6px;
          right: 8px;
          background: none;
          border: none;
          font-size: 1.2rem;
          color: #9ca3af;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .sticky-note:hover .note-delete {
          opacity: 1;
        }
        .note-delete:hover {
          color: #ef4444;
        }
        .add-note-btn {
          background: transparent;
          border: 2px dashed var(--border);
          border-radius: 8px;
          padding: 12px;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        .add-note-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent)10;
        }
        .note-modal {
          max-width: 400px;
        }
        .note-input {
          width: 100%;
          padding: 12px;
          border: none;
          border-bottom: 2px solid var(--border);
          background: transparent;
          font-size: 1.1rem;
          color: var(--text);
          font-weight: 500;
        }
        .note-input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .note-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg);
          color: var(--text);
          font-family: inherit;
          resize: vertical;
          font-size: 0.9rem;
        }
        .note-textarea:focus {
          outline: none;
          border-color: var(--accent);
        }
        .field-row {
          display: flex;
          gap: 12px;
        }
        .note-select {
          flex: 1;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg);
          color: var(--text);
          font-size: 0.85rem;
        }
        .note-select:focus {
          outline: none;
          border-color: var(--accent);
        }
        .note-select option {
          background: #1a1a2e;
          color: #e0e0e0;
          padding: 8px;
        }
        .note-select option:checked,
        .note-select option:hover {
          background: #8b5cf6;
          color: white;
        }
      `}</style>
    </>
  );
}
