import React, { useEffect, useState } from "react";
import api from "../api/client.js";
import Toast from "../components/Toast.jsx";

function formatCountdown(target) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) {
    return "Overdue";
  }
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return `${days}d ${hours}h ${mins}m`;
}

export default function Borrowed() {
  const [borrows, setBorrows] = useState([]);
  const [toast, setToast] = useState("");

  const loadBorrows = async () => {
    const res = await api.get("/api/borrows/me");
    setBorrows(res.data);
  };

  useEffect(() => {
    loadBorrows().catch(() => setToast("Unable to load borrowed books"));
  }, []);

  const handleReturn = async (borrowId) => {
    try {
      const res = await api.post(`/api/borrows/${borrowId}/return`);
      const fee = res.data.fee;
      if (fee > 0) {
        setToast(`Returned late. Fee: Rs ${fee}`);
      } else {
        setToast("Thank you for returning on time");
      }
      loadBorrows();
    } catch (error) {
      setToast(error?.response?.data?.message || "Unable to return");
    }
  };

  return (
    <div className="list-page">
      <div className="card">
        <h2>Borrowed Books</h2>
        <p>Track your borrowed books and return within 7 days.</p>
      </div>
      <div className="list-grid">
        {borrows.map((borrow) => (
          <div key={borrow.id} className="list-card">
            <img
              src={
                borrow.book.coverUrl || "https://placehold.co/80x110?text=Book"
              }
              alt={borrow.book.title}
            />
            <div>
              <h3>{borrow.book.title}</h3>
              <p className="book-author">{borrow.book.author}</p>
              <div className="list-meta">
                <span>Status: {borrow.status}</span>
                <span>Due in: {formatCountdown(borrow.dueAt)}</span>
                {borrow.fee > 0 && <span>Late fee: Rs {borrow.fee}</span>}
              </div>
            </div>
            <div className="list-actions">
              {borrow.status === "BORROWED" ? (
                <button type="button" onClick={() => handleReturn(borrow.id)}>
                  Return
                </button>
              ) : (
                <span className="status available">Returned</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {borrows.length === 0 && (
        <div className="empty">No borrowed books yet.</div>
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
