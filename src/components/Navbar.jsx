import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import {
  FiSearch,
  FiGrid,
  FiClipboard,
  FiBell,
  FiSettings,
  FiChevronDown,
  FiMenu,
} from "react-icons/fi";

/**
 * Navbar
 * Fixed-height white top bar: search on the left, a row of utility
 * icons + notification badge + user profile on the right.
 */
const Navbar = ({ onToggleSidebar }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  let name = "Guest";
  let role = "User";
  let companyName = "";

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      name = user.name || "Guest";
      role = user.role || "User";
      companyName = user.company_name || "";
    } catch (e) {
      console.error("Error reading user in navbar:", e);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="mn-navbar">
      <div className="mn-navbar__left">
        <button
          className="mn-navbar__burger"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <FiMenu />
        </button>

        <div className="mn-navbar__search">
          <FiSearch className="mn-navbar__search-icon" />
          <input type="text" placeholder="Search..." />
        </div>
      </div>

      <div className="mn-navbar__right">
        {userStr && JSON.parse(userStr).impersonation === true ? (
          <div style={{ marginRight: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ backgroundColor: "#ffebd6", color: "#d97706", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>
              Viewing As: {companyName}
            </span>
            <button 
              onClick={async () => {
                try {
                  const res = await apiClient.post("/auth/exit-impersonation");
                  if (res.data.success) {
                    localStorage.setItem("token", res.data.token);
                    localStorage.setItem("user", JSON.stringify(res.data.user));
                    window.location.href = "/dashboard";
                  }
                } catch (error) {
                  console.error("Failed to exit impersonation:", error);
                  alert("Error exiting impersonation mode.");
                }
              }}
              style={{
                backgroundColor: "#dc2626", color: "white", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", border: "none", cursor: "pointer"
              }}>
              Exit Impersonation
            </button>
          </div>
        ) : companyName && role !== "SuperAdmin" ? (
          <div style={{ marginRight: "16px", display: "flex", alignItems: "center" }}>
            <span style={{ backgroundColor: "#eef2ff", color: "#4f46e5", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>
              {companyName}
            </span>
          </div>
        ) : null}

        <button className="mn-navbar__icon-btn mn-navbar__flag" aria-label="Language">
          <span className="mn-navbar__flag-emoji">🇺🇸</span>
        </button>

        <button className="mn-navbar__icon-btn" aria-label="Apps">
          <FiGrid />
        </button>

        <button className="mn-navbar__icon-btn" aria-label="Notes">
          <FiClipboard />
        </button>

        <button className="mn-navbar__icon-btn mn-navbar__bell" aria-label="Notifications">
          <FiBell />
          <span className="mn-navbar__badge">3</span>
        </button>

        <div className="mn-navbar__profile" ref={profileRef}>
          <button
            className="mn-navbar__profile-btn"
            onClick={() => setProfileOpen((p) => !p)}
          >
            <img
              className="mn-navbar__avatar"
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=5156be&color=fff`}
              alt={name}
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginRight: "4px" }}>
              <span className="mn-navbar__profile-name" style={{ fontSize: "13px", fontWeight: "600", lineHeight: "1.2" }}>{name}</span>
              <span style={{ fontSize: "10px", color: "#74788d", marginTop: "2px" }}>{role}</span>
            </div>
            <FiChevronDown size={14} />
          </button>

          {profileOpen && (
            <div className="mn-navbar__dropdown">
              <a href="#logout" className="mn-navbar__dropdown-item" onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}>
                Logout
              </a>
            </div>
          )}
        </div>

        <button className="mn-navbar__icon-btn" aria-label="Settings">
          <FiSettings />
        </button>
      </div>
    </header>
  );
};

export default Navbar;