import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client.js";
import Toast from "../components/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirectTo = params.get("redirect") || "/";
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
  });
  const [toast, setToast] = useState("");

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) {
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (!window.google) {
        return;
      }
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            const res = await api.post("/api/auth/google", {
              idToken: response.credential,
            });
            login(res.data);
            if (!res.data.user.verified) {
              navigate("/verify");
            } else {
              navigate(redirectTo);
            }
          } catch (error) {
            setToast(error?.response?.data?.message || "Google sign-in failed");
          }
        },
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-signin"),
        {
          theme: "outline",
          size: "large",
          shape: "pill",
        },
      );
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [googleClientId, login, navigate, redirectTo]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : {
              email: form.email,
              password: form.password,
              name: form.name,
              phone: form.phone,
            };
      const res = await api.post(endpoint, payload);
      login(res.data);
      if (!res.data.user.verified) {
        navigate("/verify");
      } else {
        navigate(redirectTo);
      }
    } catch (error) {
      setToast(error?.response?.data?.message || "Login failed");
    }
  };

  const handleMockGoogle = async () => {
    try {
      const res = await api.post("/api/auth/google", {
        idToken: "test:demo@gttc.local",
      });
      login(res.data);
      if (!res.data.user.verified) {
        navigate("/verify");
      } else {
        navigate(redirectTo);
      }
    } catch (error) {
      setToast(error?.response?.data?.message || "Google sign-in failed");
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p>Use Google or your email to access the library system.</p>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        {mode === "register" && (
          <>
            <label>
              Full name
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
            </label>
            <label>
              Phone (optional)
              <input
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
            </label>
          </>
        )}
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
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
        <button type="submit">{mode === "login" ? "Login" : "Register"}</button>
      </form>

      <div className="divider">or continue with</div>
      {googleClientId ? (
        <div id="google-signin" className="google-slot" />
      ) : (
        <button className="ghost" type="button" onClick={handleMockGoogle}>
          Continue with Google (Demo)
        </button>
      )}

      <div className="auth-toggle">
        {mode === "login" ? "New here?" : "Already have an account?"}
        <button
          type="button"
          className="link"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Create account" : "Sign in"}
        </button>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
