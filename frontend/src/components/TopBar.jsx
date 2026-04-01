import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function TopBar({ title, onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className="top-bar">
      <button
        className="menu-button"
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        Menu
      </button>
      <div className="brand">
        <div className="brand-logo">LOGO</div>
        <div>
          <p className="brand-caption">GTTC</p>
          <h1>{title || "GTTC Library Management System"}</h1>
        </div>
      </div>
      <div className="topbar-profile">
        <div className="profile-avatar">
          {user ? user.name?.charAt(0) : "G"}
        </div>
        <div className="profile-meta">
          <span>{user ? user.name : "Guest"}</span>
          <small>{user ? user.email : "Public access"}</small>
        </div>
      </div>
    </header>
  );
}
