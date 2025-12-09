import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

/**
 * Simple API client helpers for the backend at http://localhost:3001
 * Assumes backend provides standard REST endpoints:
 *  GET    /tasks
 *  POST   /tasks             body: { title: string }
 *  PUT    /tasks/:id         body: { title?: string, completed?: boolean }
 *  DELETE /tasks/:id
 */
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

// PUBLIC_INTERFACE
export async function fetchTasks() {
  /** Fetch all tasks from backend. */
  const res = await fetch(`${API_BASE}/tasks`, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
  return res.json();
}

// PUBLIC_INTERFACE
export async function createTask(title) {
  /** Create a new task with the given title. */
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);
  return res.json();
}

// PUBLIC_INTERFACE
export async function updateTask(id, updates) {
  /** Update a task (title/completed). */
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update task: ${res.status}`);
  return res.json();
}

// PUBLIC_INTERFACE
export async function deleteTask(id) {
  /** Delete a task by id. */
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`);
  return true;
}

// PUBLIC_INTERFACE
function App() {
  /**
   * Todo App: lists tasks, add, edit, delete, toggle complete with clean light UI,
   * showing loading and error states, persisting via backend.
   */
  const [theme] = useState('light'); // adhere to provided light theme
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null); // track per-item busy state
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all | active | completed
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    fetchTasks()
      .then(data => { if (!ignore) setTasks(data || []); })
      .catch(err => { if (!ignore) setError(err.message || 'Failed to load'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const visibleTasks = useMemo(() => {
    if (filter === 'active') return tasks.filter(t => !t.completed);
    if (filter === 'completed') return tasks.filter(t => t.completed);
    return tasks;
  }, [tasks, filter]);

  async function handleAdd(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setError(null);
    setLoading(true);
    try {
      const created = await createTask(title);
      setTasks(prev => [created, ...prev]);
      setNewTitle('');
    } catch (err) {
      setError(err.message || 'Failed to add task');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(task) {
    setBusyId(task.id);
    setError(null);
    try {
      const updated = await updateTask(task.id, { completed: !task.completed });
      setTasks(prev => prev.map(t => (t.id === task.id ? updated : t)));
    } catch (err) {
      setError(err.message || 'Failed to toggle task');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(task) {
    setBusyId(task.id);
    setError(null);
    try {
      await deleteTask(task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (err) {
      setError(err.message || 'Failed to delete task');
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setEditingTitle(task.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle('');
  }

  async function saveEdit(task) {
    const title = editingTitle.trim();
    if (!title || title === task.title) {
      cancelEdit();
      return;
    }
    setBusyId(task.id);
    setError(null);
    try {
      const updated = await updateTask(task.id, { title });
      setTasks(prev => prev.map(t => (t.id === task.id ? updated : t)));
      cancelEdit();
    } catch (err) {
      setError(err.message || 'Failed to update task');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="App">
      <header className="todo-header">
        <h1 className="app-title">Todo</h1>
        <p className="app-subtitle">Stay organized. Get things done.</p>
      </header>

      <main className="container">
        <section className="card">
          <form className="add-form" onSubmit={handleAdd} aria-label="Add new task">
            <input
              type="text"
              className="input"
              placeholder="What needs to be done?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              aria-label="Task title"
            />
            <button className="btn" type="submit" disabled={loading || !newTitle.trim()}>
              Add
            </button>
          </form>

          <div className="toolbar">
            <div className="filters" role="tablist" aria-label="Filter tasks">
              <button
                className={`chip ${filter === 'all' ? 'chip-active' : ''}`}
                onClick={() => setFilter('all')}
                role="tab"
                aria-selected={filter === 'all'}
              >
                All
              </button>
              <button
                className={`chip ${filter === 'active' ? 'chip-active' : ''}`}
                onClick={() => setFilter('active')}
                role="tab"
                aria-selected={filter === 'active'}
              >
                Active
              </button>
              <button
                className={`chip ${filter === 'completed' ? 'chip-active' : ''}`}
                onClick={() => setFilter('completed')}
                role="tab"
                aria-selected={filter === 'completed'}
              >
                Completed
              </button>
            </div>
            {loading && <div className="spinner" aria-live="polite">Loading…</div>}
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <ul className="task-list">
            {visibleTasks.map(task => (
              <li key={task.id} className={`task-item ${task.completed ? 'task-completed' : ''}`}>
                <label className="task-main">
                  <input
                    type="checkbox"
                    checked={!!task.completed}
                    onChange={() => handleToggle(task)}
                    disabled={busyId === task.id}
                    aria-label={`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`}
                  />
                  {editingId === task.id ? (
                    <input
                      className="edit-input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(task);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      aria-label="Edit task title"
                    />
                  ) : (
                    <span className="task-title">{task.title}</span>
                  )}
                </label>
                <div className="task-actions">
                  {editingId === task.id ? (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={() => saveEdit(task)}
                        disabled={busyId === task.id || !editingTitle.trim()}
                        aria-label="Save changes"
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={cancelEdit}
                        aria-label="Cancel edit"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={() => startEdit(task)}
                        disabled={busyId === task.id}
                        aria-label="Edit task"
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(task)}
                        disabled={busyId === task.id}
                        aria-label="Delete task"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
            {!loading && visibleTasks.length === 0 && (
              <li className="empty">No tasks found.</li>
            )}
          </ul>
        </section>
      </main>

      <footer className="footer">
        <span>API: {API_BASE.replace(/^https?:\/\//, '')}</span>
      </footer>
    </div>
  );
}

export default App;
