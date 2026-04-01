import React, { useEffect, useState } from "react";
import api from "../api/client.js";
import Toast from "../components/Toast.jsx";

export default function Donations() {
  const [donations, setDonations] = useState([]);
  const [toast, setToast] = useState("");
  const baseUrl = (
    api.defaults.baseURL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:8080"
  ).replace(/\/$/, "");
  const resolveImage = (path) => {
    if (!path) {
      return null;
    }
    return path.startsWith("/uploads") ? `${baseUrl}${path}` : path;
  };

  useEffect(() => {
    api
      .get("/api/donations")
      .then((res) => setDonations(res.data))
      .catch(() => setToast("Unable to load donations"));
  }, []);

  return (
    <div className="list-page">
      <div className="card">
        <h2>Donated Books</h2>
        <p>Appreciation to the community for growing our library.</p>
      </div>
      <div className="donation-grid">
        {donations.map((donation) => (
          <div key={donation.id} className="donation-card">
            <div className="donation-images">
              {donation.image1 && (
                <img src={resolveImage(donation.image1)} alt={donation.title} />
              )}
              {donation.image2 && (
                <img src={resolveImage(donation.image2)} alt={donation.title} />
              )}
            </div>
            <div>
              <h3>{donation.title}</h3>
              <p className="book-author">{donation.author}</p>
              <p className="book-desc">{donation.description}</p>
              <div className="list-meta">
                <span>Copies: {donation.copies}</span>
                <span>Donor: {donation.donorName || "Anonymous"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {donations.length === 0 && <div className="empty">No donations yet.</div>}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
