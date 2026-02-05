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
        .subtasks-preview {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }
        .subtasks-progress-bar {
          flex: 1;
          height: 4px;
          background: rgba(0,0,0,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .subtasks-progress-fill {
          height: 100%;
          background: #10b981;
          transition: width 0.3s ease;
        }
        .subtasks-count {
          font-size: 0.7rem;
          color: #6b7280;
          font-weight: 500;
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
          max-width: 450px;
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
        /* Subtasks Styles */
        .subtasks-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }
        .subtasks-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 12px 0;
        }
        .subtasks-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
        }
        .subtask-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: var(--bg);
          border-radius: 6px;
          border: 1px solid var(--border);
        }
        .subtask-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          cursor: pointer;
        }
        .subtask-checkbox input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #ec4899;
        }
        .subtask-text {
          font-size: 0.85rem;
          color: var(--text);
        }
        .subtask-text.completed {
          text-decoration: line-through;
          color: var(--text-muted);
        }
        .subtask-delete {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 1rem;
          padding: 0 4px;
          opacity: 0.5;
          transition: opacity 0.2s, color 0.2s;
        }
        .subtask-delete:hover {
          opacity: 1;
          color: #ef4444;
        }
        .subtask-add {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
        .subtask-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg);
          color: var(--text);
          font-size: 0.85rem;
        }
        .subtask-input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .subtask-add-btn {
          padding: 8px 14px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .subtask-add-btn:hover {
          opacity: 0.9;
        }
      `}</style>
    </>
  );
}
