import React from "react";
import Footer from "./Footer.jsx";

export default function SimpleLayout({ title, children }) {
  return (
    <div className="auth-layout">
      <header className="auth-header">
        <div className="brand">
          <div className="brand-logo">LOGO</div>
          <div>
            <p className="brand-caption">GTTC</p>
            <h1>{title || "GTTC Library Management System"}</h1>
          </div>
        </div>
      </header>
      <main className="auth-content">{children}</main>
      <Footer />
    </div>
  );
}
