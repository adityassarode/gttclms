import React from "react";

export default function Toast({ message, tone = "neutral", onClose }) {
  if (!message) {
    return null;
  }
  return (
    <div className={`toast toast-${tone}`}>
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Close">
        Close
      </button>
    </div>
  );
}
