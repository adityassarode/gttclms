import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import Toast from "../components/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [toast, setToast] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    try {
      const res = await api.post("/api/admin/login", form);
      login(res.data);
      navigate("/admin");
    } catch (error) {
      setToast(error?.response?.data?.message || "Admin login failed");
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2>Admin Login</h2>
        <p>Use your admin credentials to manage the system.</p>
      </div>
      <form className="form" onSubmit={submit}>
        <label>
          Username
          <input
            type="text"
            value={form.username}
            onChange={(event) =>
              setForm({ ...form, username: event.target.value })
            }
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            required
          />
        </label>
        <button type="submit">Login</button>
      </form>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
