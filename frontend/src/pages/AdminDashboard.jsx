import React, { useEffect, useState } from "react";
import api from "../api/client.js";
import Toast from "../components/Toast.jsx";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tabs = ["Students", "Books", "Users", "Analytics"];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("Students");
  const [toast, setToast] = useState("");
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [studentForm, setStudentForm] = useState({
    registerNumber: "",
    name: "",
    department: "",
    semester: "",
    year: "",
  });
  const [studentUploadResults, setStudentUploadResults] = useState([]);
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    description: "",
    category: "",
    keywords: "",
    coverUrl: "",
    copiesTotal: 1,
    featured: false,
  });
  const [editingBookId, setEditingBookId] = useState(null);
  const [banForm, setBanForm] = useState({ email: "", registerNumber: "" });

  const loadData = async () => {
    const [booksRes, usersRes, analyticsRes] = await Promise.all([
      api.get("/api/books"),
      api.get("/api/users"),
      api.get("/api/admin/analytics"),
    ]);
    setBooks(booksRes.data);
    setUsers(usersRes.data);
    setAnalytics(analyticsRes.data);
  };

  useEffect(() => {
    loadData().catch(() => setToast("Unable to load admin data"));
  }, []);

  const addStudent = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/admin/students", studentForm);
      setToast("Student added successfully");
      setStudentForm({
        registerNumber: "",
        name: "",
        department: "",
        semester: "",
        year: "",
      });
    } catch (error) {
      setToast(error?.response?.data?.message || "Unable to add student");
    }
  };

  const uploadStudents = async (event) => {
    event.preventDefault();
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    const payload = new FormData();
    payload.append("file", file);
    try {
      const res = await api.post("/api/admin/students/upload", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStudentUploadResults(res.data);
      setToast("Students uploaded successfully");
    } catch (error) {
      setToast(error?.response?.data?.message || "Upload failed");
    }
  };

  const submitBook = async (event) => {
    event.preventDefault();
    try {
      if (editingBookId) {
        await api.put(`/api/books/${editingBookId}`, bookForm);
        setToast("Book updated");
      } else {
        await api.post("/api/books", bookForm);
        setToast("Book added");
      }
      setBookForm({
        title: "",
        author: "",
        description: "",
        category: "",
        keywords: "",
        coverUrl: "",
        copiesTotal: 1,
        featured: false,
      });
      setEditingBookId(null);
      loadData();
    } catch (error) {
      setToast(error?.response?.data?.message || "Unable to save book");
    }
  };

  const editBook = (book) => {
    setEditingBookId(book.id);
    setBookForm({
      title: book.title,
      author: book.author,
      description: book.description,
      category: book.category,
      keywords: book.keywords,
      coverUrl: book.coverUrl,
      copiesTotal: book.copiesTotal,
      featured: book.featured,
    });
  };

  const deleteBook = async (id) => {
    await api.delete(`/api/books/${id}`);
    setToast("Book deleted");
    loadData();
  };

  const banUser = async () => {
    try {
      await api.post("/api/users/ban", banForm);
      setToast("User banned");
      setBanForm({ email: "", registerNumber: "" });
      loadData();
    } catch (error) {
      setToast(error?.response?.data?.message || "Unable to ban user");
    }
  };

  const removeUser = async (id) => {
    await api.delete(`/api/users/${id}`);
    setToast("User removed");
    loadData();
  };

  return (
    <div className="admin-page">
      <div className="tab-row">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === activeTab ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Students" && (
        <div className="admin-grid">
          <div className="card">
            <h3>Add Student</h3>
            <form className="form" onSubmit={addStudent}>
              <input
                type="text"
                placeholder="Register number"
                value={studentForm.registerNumber}
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    registerNumber: event.target.value,
                  })
                }
                required
              />
              <input
                type="text"
                placeholder="Name"
                value={studentForm.name}
                onChange={(event) =>
                  setStudentForm({ ...studentForm, name: event.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Department"
                value={studentForm.department}
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    department: event.target.value,
                  })
                }
                required
              />
              <input
                type="text"
                placeholder="Semester"
                value={studentForm.semester}
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    semester: event.target.value,
                  })
                }
                required
              />
              <input
                type="text"
                placeholder="Year"
                value={studentForm.year}
                onChange={(event) =>
                  setStudentForm({ ...studentForm, year: event.target.value })
                }
                required
              />
              <button type="submit">Add Student</button>
            </form>
          </div>
          <div className="card">
            <h3>Upload Students via Excel</h3>
            <input type="file" accept=".xlsx" onChange={uploadStudents} />
            <div className="muted">
              Expected fields: register number, name, department, semester, year
            </div>
            {studentUploadResults.length > 0 && (
              <div className="list-meta">
                Uploaded: {studentUploadResults.length} students
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "Books" && (
        <div className="admin-grid">
          <div className="card">
            <h3>{editingBookId ? "Edit Book" : "Add Book"}</h3>
            <form className="form" onSubmit={submitBook}>
              <input
                type="text"
                placeholder="Title"
                value={bookForm.title}
                onChange={(event) =>
                  setBookForm({ ...bookForm, title: event.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Author"
                value={bookForm.author}
                onChange={(event) =>
                  setBookForm({ ...bookForm, author: event.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Category"
                value={bookForm.category}
                onChange={(event) =>
                  setBookForm({ ...bookForm, category: event.target.value })
                }
                required
              />
              <textarea
                placeholder="Description"
                value={bookForm.description}
                onChange={(event) =>
                  setBookForm({ ...bookForm, description: event.target.value })
                }
                rows={3}
              />
              <input
                type="text"
                placeholder="Keywords"
                value={bookForm.keywords}
                onChange={(event) =>
                  setBookForm({ ...bookForm, keywords: event.target.value })
                }
              />
              <input
                type="text"
                placeholder="Cover URL"
                value={bookForm.coverUrl}
                onChange={(event) =>
                  setBookForm({ ...bookForm, coverUrl: event.target.value })
                }
              />
              <input
                type="number"
                min={1}
                placeholder="Total copies"
                value={bookForm.copiesTotal}
                onChange={(event) =>
                  setBookForm({
                    ...bookForm,
                    copiesTotal: Number(event.target.value),
                  })
                }
                required
              />
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={bookForm.featured}
                  onChange={(event) =>
                    setBookForm({ ...bookForm, featured: event.target.checked })
                  }
                />
                Featured
              </label>
              <button type="submit">
                {editingBookId ? "Update" : "Add"} Book
              </button>
            </form>
          </div>
          <div className="card">
            <h3>Manage Books</h3>
            <div className="table">
              {books.map((book) => (
                <div key={book.id} className="table-row">
                  <div>
                    <strong>{book.title}</strong>
                    <div className="muted">{book.author}</div>
                  </div>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => editBook(book)}
                    >
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteBook(book.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Users" && (
        <div className="admin-grid">
          <div className="card">
            <h3>Ban User</h3>
            <div className="form">
              <input
                type="email"
                placeholder="Email"
                value={banForm.email}
                onChange={(event) =>
                  setBanForm({ ...banForm, email: event.target.value })
                }
              />
              <input
                type="text"
                placeholder="Register number"
                value={banForm.registerNumber}
                onChange={(event) =>
                  setBanForm({ ...banForm, registerNumber: event.target.value })
                }
              />
              <button type="button" onClick={banUser}>
                Ban user
              </button>
            </div>
          </div>
          <div className="card">
            <h3>All Users</h3>
            <div className="table">
              {users.map((user) => (
                <div key={user.id} className="table-row">
                  <div>
                    <strong>{user.name}</strong>
                    <div className="muted">{user.email}</div>
                    <div className="muted">Phone: {user.phone || "-"}</div>
                    <div className="muted">
                      Register: {user.registerNumber || "-"}
                    </div>
                  </div>
                  <div className="table-actions">
                    <span
                      className={
                        user.status === "BANNED"
                          ? "status unavailable"
                          : "status available"
                      }
                    >
                      {user.status}
                    </span>
                    <button type="button" onClick={() => removeUser(user.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Analytics" && (
        <div className="analytics-grid">
          <div className="card">
            <h3>Most Borrowed Books</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics?.topBorrowed || []}>
                <XAxis dataKey="label" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1f4a3d" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3>Category Popularity</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics?.categoryPopularity || []}>
                <XAxis dataKey="label" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#d9b75f" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3>Borrow Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={analytics?.borrowTrends || []}>
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#1f4a3d"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3>Reserve Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={analytics?.reserveTrends || []}>
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#b26a3d"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
