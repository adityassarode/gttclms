import React, { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";
import Footer from "./Footer.jsx";

export default function AppLayout({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div
        className={`sidebar-backdrop ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
        role="presentation"
      />
      <div className="main-area">
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="content">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
