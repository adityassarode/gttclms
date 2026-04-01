import React, { useEffect, useState } from "react";
import api from "../api/client.js";
import Toast from "../components/Toast.jsx";

function formatCountdown(target) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) {
    return "Expired";
  }
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export default function Reserved() {
  const [reservations, setReservations] = useState([]);
  const [toast, setToast] = useState("");

  const loadReservations = async () => {
    const res = await api.get("/api/reservations/me");
    setReservations(res.data);
  };

  useEffect(() => {
    loadReservations().catch(() => setToast("Unable to load reservations"));
  }, []);

  const handleCancel = async (reservationId) => {
    try {
      await api.post(`/api/reservations/${reservationId}/cancel`);
      setToast("Reservation cancelled");
      loadReservations();
    } catch (error) {
      setToast(error?.response?.data?.message || "Unable to cancel");
    }
  };

  return (
    <div className="list-page">
      <div className="card">
        <h2>Reserved Books</h2>
        <p>Collect within 2 hours or it will be cancelled.</p>
      </div>
      <div className="list-grid">
        {reservations.map((reservation) => (
          <div key={reservation.id} className="list-card">
            <img
              src={
                reservation.book.coverUrl ||
                "https://placehold.co/80x110?text=Book"
              }
              alt={reservation.book.title}
            />
            <div>
              <h3>{reservation.book.title}</h3>
              <p className="book-author">{reservation.book.author}</p>
              <div className="list-meta">
                <span>Status: {reservation.status}</span>
                <span>Countdown: {formatCountdown(reservation.expiresAt)}</span>
              </div>
            </div>
            <div className="list-actions">
              {reservation.status === "ACTIVE" ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => handleCancel(reservation.id)}
                >
                  Cancel
                </button>
              ) : (
                <span className="status unavailable">{reservation.status}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {reservations.length === 0 && (
        <div className="empty">No reservations yet.</div>
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
