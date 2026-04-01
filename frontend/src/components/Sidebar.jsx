import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const navItems = [
  { label: "Discover", path: "/", end: true },
  { label: "Category", path: "/category" },
  { label: "My Library", path: "/borrowed" },
  { label: "Download", path: "/donated" },
  { label: "Favorite", path: "/favorites" },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="logo-mark">LOGO</div>
        <div className="logo-text">THE BOOKS</div>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close menu"
        >
          Close
        </button>
      </div>

      <nav className="sidebar-menu">
        <div className="sidebar-label">Menu</div>
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
            onClick={onClose}
          >
            <span className="sidebar-icon" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-label">Quick Access</div>
        <NavLink
          to="/reserved"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? "active" : ""}`
          }
          onClick={onClose}
        >
          <span className="sidebar-icon" />
          Reserved
        </NavLink>
        <NavLink
          to="/donate"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? "active" : ""}`
          }
          onClick={onClose}
        >
          <span className="sidebar-icon" />
          Donate
        </NavLink>
        <div className="sidebar-label">Support</div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? "active" : ""}`
          }
          onClick={onClose}
        >
          <span className="sidebar-icon" />
          Setting
        </NavLink>
        <NavLink
          to="/help"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? "active" : ""}`
          }
          onClick={onClose}
        >
          <span className="sidebar-icon" />
          Help
        </NavLink>
      </div>

      <div className="sidebar-footer">
        {isAdmin && (
          <button
            type="button"
            className="sidebar-item"
            onClick={() => navigate("/admin")}
          >
            <span className="sidebar-icon" />
            Admin Panel
          </button>
        )}
        {user ? (
          <button type="button" className="sidebar-item" onClick={handleLogout}>
            <span className="sidebar-icon" />
            Log out
          </button>
        ) : (
          <button
            type="button"
            className="sidebar-item"
            onClick={() => navigate("/login")}
          >
            <span className="sidebar-icon" />
            Login
          </button>
        )}
      </div>
    </aside>
  );
}
