import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import Toast from "../components/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Verify() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [registerNumber, setRegisterNumber] = useState("");
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState({
    name: "",
    department: "",
    semester: "",
    year: "",
  });
  const [toast, setToast] = useState("");

  const lookup = async () => {
    const cleaned = registerNumber.trim();
    if (!cleaned) {
      setToast("Enter a register number to continue");
      return;
    }
    try {
      const res = await api.get(`/api/students/${cleaned}`);
      setStudent(res.data);
      setForm({
        name: res.data.name,
        department: res.data.department,
        semester: res.data.semester,
        year: res.data.year,
      });
    } catch (error) {
      setToast(error?.response?.data?.message || "Register number not found");
    }
  };

  const confirm = async () => {
    try {
      const res = await api.post("/api/users/verify", {
        registerNumber: registerNumber.trim(),
        ...form,
      });
      login({ token: localStorage.getItem("gttc_token"), user: res.data });
      setToast("Verification successful. Welcome!");
      navigate("/");
    } catch (error) {
      setToast(error?.response?.data?.message || "Verification failed");
    }
  };

  return (
    <div className="card verify-card">
      <h2>Student Verification</h2>
      <p>Enter your register number to unlock borrowing and reservations.</p>
      <div className="verify-row">
        <input
          type="text"
          placeholder="Register number"
          value={registerNumber}
          onChange={(event) => setRegisterNumber(event.target.value)}
        />
        <button type="button" onClick={lookup}>
          Lookup
        </button>
      </div>
      {student && (
        <div className="form">
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label>
            Department
            <input
              type="text"
              value={form.department}
              onChange={(event) =>
                setForm({ ...form, department: event.target.value })
              }
            />
          </label>
          <label>
            Semester
            <input
              type="text"
              value={form.semester}
              onChange={(event) =>
                setForm({ ...form, semester: event.target.value })
              }
            />
          </label>
          <label>
            Year
            <input
              type="text"
              value={form.year}
              onChange={(event) =>
                setForm({ ...form, year: event.target.value })
              }
            />
          </label>
          <button type="button" onClick={confirm}>
            Confirm and Continue
          </button>
        </div>
      )}
      <div className="muted">Logged in as {user?.email}</div>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
