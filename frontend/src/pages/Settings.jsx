import React, { useEffect, useState } from "react";

export default function Settings() {
  const [prefs, setPrefs] = useState({
    emailUpdates: true,
    reservationReminders: true,
    newArrivals: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem("gttc_settings");
    if (stored) {
      setPrefs(JSON.parse(stored));
    }
  }, []);

  const updatePrefs = (next) => {
    setPrefs(next);
    localStorage.setItem("gttc_settings", JSON.stringify(next));
  };

  return (
    <div className="card">
      <h2>Settings</h2>
      <p>Manage your reading preferences and notifications.</p>
      <div className="settings-list">
        <label className="settings-item">
          <span>Email updates</span>
          <input
            type="checkbox"
            checked={prefs.emailUpdates}
            onChange={(event) =>
              updatePrefs({ ...prefs, emailUpdates: event.target.checked })
            }
          />
        </label>
        <label className="settings-item">
          <span>Reservation reminders</span>
          <input
            type="checkbox"
            checked={prefs.reservationReminders}
            onChange={(event) =>
              updatePrefs({
                ...prefs,
                reservationReminders: event.target.checked,
              })
            }
          />
        </label>
        <label className="settings-item">
          <span>New arrivals alerts</span>
          <input
            type="checkbox"
            checked={prefs.newArrivals}
            onChange={(event) =>
              updatePrefs({ ...prefs, newArrivals: event.target.checked })
            }
          />
        </label>
      </div>
    </div>
  );
}
