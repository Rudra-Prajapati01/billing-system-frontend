import React, { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import {
  FiShield,
  FiLock,
  FiUserCheck,
  FiUser,
  FiClock,
  FiCalendar,
  FiBriefcase,
  FiAlertCircle
} from "react-icons/fi";

export default function AdminMaster() {
  const [activeSubTab, setActiveSubTab] = useState("User Profile");

  // State for fetching user profile
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Load fallback user data from storage immediately
        const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (storedUser) {
          setUserData(JSON.parse(storedUser));
          setLoading(false);
        }

        // Verify token with backend
        const response = await apiClient.get("/auth/me");
        if (response.data && response.data.user) {
          setUserData(response.data.user);
          // Update stored user
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }
      } catch (err) {
        if (err.response && err.response.status === 401) {
          // Handled globally by apiClient, but we can also clear and redirect here if needed
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/login";
        } else if (!userData) {
          setError(err.response?.data?.message || err.message || "Failed to fetch profile information.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Helper to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* 1. TOP PREMIUM HEADER SECTION */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "1px solid #e5e7eb", paddingBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#5156be", color: "#fff", width: "42px", height: "42px", borderRadius: "8px" }}>
          <FiShield size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#212529", margin: "0" }}>Admin Master</h2>
          <span style={{ fontSize: "12px", color: "#74788d" }}>View profile context, access roles, and system properties.</span>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb", padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", fontSize: "14px", fontWeight: "500" }}>
          <FiAlertCircle size={16} />
          {error}
        </div>
      )}

      {/* 2. ADMIN COMPONENT TABS CONTROLLERS */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
        {[
          { id: "User Profile", icon: <FiUser size={14} />, activeBg: "#5156be" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: activeSubTab === tab.id ? tab.activeBg : "#fff",
              color: activeSubTab === tab.id ? "#fff" : "#495057",
              border: activeSubTab === tab.id ? "1px solid transparent" : "1px solid #ced4da",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {tab.icon} {tab.id}
          </button>
        ))}
      </div>

      {/* 3. MAIN PRIVILEGE WORKING FRAME CARD */}
      <div style={{ backgroundColor: "#fff", borderRadius: "10px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb", padding: "24px" }}>

        {activeSubTab === "User Profile" && (
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#495057", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Logged In User Details
            </h3>

            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#74788d", fontSize: "14px" }}>
                Loading profile data...
              </div>
            ) : userData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                {/* User Identity Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "12px", color: "#74788d", marginBottom: "4px" }}>Full Name</span>
                    <strong style={{ fontSize: "15px", color: "#212529" }}>{userData.name || "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "12px", color: "#74788d", marginBottom: "4px" }}>Username</span>
                    <strong style={{ fontSize: "15px", color: "#212529" }}>{userData.username || "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "12px", color: "#74788d", marginBottom: "4px" }}>System Role</span>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      backgroundColor: userData.role === "SuperAdmin" ? "#e0e1f6" : "#e2f3e6",
                      color: userData.role === "SuperAdmin" ? "#5156be" : "#2da949",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      {userData.role || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "12px", color: "#74788d", marginBottom: "4px" }}>Account Status</span>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      backgroundColor: userData.status === "Active" ? "#e2f3e6" : "#fde8e8",
                      color: userData.status === "Active" ? "#2da949" : "#e11d48",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      {userData.status || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Company Context */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", padding: "0 10px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ backgroundColor: "#f3f4f6", padding: "10px", borderRadius: "6px", color: "#5156be" }}>
                      <FiBriefcase size={18} />
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "12px", color: "#74788d", marginBottom: "2px" }}>
                        {userData.role === "SuperAdmin" ? "Active Global Context" : "Company Assignment"}
                      </span>
                      <strong style={{ fontSize: "14px", color: "#495057", display: "block" }}>{userData.company_name || userData.company || "Global System Access"}</strong>
                      {(userData.company_code) && (
                        <span style={{ fontSize: "12px", color: "#74788d" }}>Code: {userData.company_code}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ backgroundColor: "#f3f4f6", padding: "10px", borderRadius: "6px", color: "#2da949" }}>
                      <FiClock size={18} />
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "12px", color: "#74788d", marginBottom: "2px" }}>Last Login</span>
                      <strong style={{ fontSize: "14px", color: "#495057" }}>{formatDate(userData.last_login)}</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ backgroundColor: "#f3f4f6", padding: "10px", borderRadius: "6px", color: "#74788d" }}>
                      <FiCalendar size={18} />
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "12px", color: "#74788d", marginBottom: "2px" }}>Created Date</span>
                      <strong style={{ fontSize: "14px", color: "#495057" }}>{formatDate(userData.created_at)}</strong>
                    </div>
                  </div>
                </div>

                {userData.role === "SuperAdmin" && (
                  <div style={{ marginTop: "10px", padding: "12px 16px", backgroundColor: "#e0e1f6", borderRadius: "6px", border: "1px solid #c9cbf1" }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "#5156be", fontWeight: "500" }}>
                      <FiShield style={{ marginRight: "6px", verticalAlign: "middle" }} />
                      SuperAdmin Notice: You currently have elevated global privileges and can access all company workspaces.
                    </p>
                  </div>
                )}

              </div>
            ) : null}
          </div>
        )}

        {/* Keeping placeholders for the other tabs */}
        {activeSubTab === "Security Framework" && (
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#495057", marginBottom: "16px" }}>Cryptographic & Access Protocols</h3>
            <p style={{ color: "#74788d", fontSize: "13px" }}>Access role matrices, global API token provisioning, and network level IP blocking controls config rules appear here.</p>
          </div>
        )}

        {activeSubTab === "System Access Logs" && (
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#495057", marginBottom: "16px" }}>Real-time Audit Trail Monitor</h3>
            <p style={{ color: "#74788d", fontSize: "13px" }}>Live monitor displaying user session initialization, record mutations, and billing override execution logs.</p>
          </div>
        )}

      </div>
    </div>
  );
}