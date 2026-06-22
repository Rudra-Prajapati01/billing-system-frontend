import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiUserPlus,
  FiEdit2,
  FiTrash2,
  FiKey,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
  FiCheckCircle,
  FiX
} from "react-icons/fi";
import apiClient from "../../services/apiClient";

export default function UserManagement() {
  // Data & List state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Form Modals State
  const [formOpen, setFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  
  // Form fields state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CompanyAdmin");
  const [status, setStatus] = useState("Active");
  const [companyId, setCompanyId] = useState("");

  // Companies for dropdown (SuperAdmin)
  const [activeCompanies, setActiveCompanies] = useState([]);

  // Password Reset Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  // Alert/Status State
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const currentUserStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  useEffect(() => {
    if (!token || (currentUser && currentUser.role !== "SuperAdmin")) {
      navigate("/dashboard");
      return;
    }
    fetchUsers();
    fetchCompanies();
  }, [page, search]);

  const fetchCompanies = async () => {
    try {
      const response = await apiClient.get(`/tenant-companies?limit=1000`);
      if (response.data.success) {
        // Filter to only active companies for the dropdown
        const active = response.data.data.filter(c => c.status === "Active");
        setActiveCompanies(active);
      }
    } catch (err) {
      console.error("Fetch companies error:", err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get(
        `/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
      );
      if (response.data.success) {
        setUsers(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setTotalUsers(response.data.pagination.total);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Handle token expiry or unauthorized
        if (err.response.data?.code === "USER_INACTIVE" || err.response.data?.code === "TOKEN_INVALID") {
          localStorage.clear();
          sessionStorage.clear();
          navigate("/login");
        } else {
          setError(err.response?.data?.message || "Unauthorized access.");
        }
      } else {
        setError("Failed to fetch users. Make sure backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setSelectedUserId(null);
    setName("");
    setUsername("");
    setPassword("");
    setRole("CompanyAdmin");
    setStatus("Active");
    setCompanyId("");
    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setIsEditMode(true);
    setSelectedUserId(user.id);
    setName(user.name);
    setUsername(user.username);
    setPassword(""); // Leave blank in edit mode
    setRole(user.role);
    setStatus(user.status);
    setCompanyId(user.company_id || "");
    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const handleOpenResetModal = (user) => {
    setResetUser(user);
    setNewPassword("");
    setError("");
    setSuccess("");
    setResetModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !username.trim() || !role || !status) {
      setError("Please fill in all required fields.");
      return;
    }

    if (role !== "SuperAdmin" && !companyId) {
      setError("Company is required for CompanyAdmin and Staff roles.");
      return;
    }

    if (!isEditMode && !password.trim()) {
      setError("Password is required for new users.");
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode) {
        // Edit User
        const response = await apiClient.put(
          `/users/${selectedUserId}`,
          { name, role, status, company_id: companyId || null }
        );
        if (response.data.success) {
          setSuccess("User profile updated successfully!");
          setTimeout(() => {
            setFormOpen(false);
            fetchUsers();
          }, 1500);
        }
      } else {
        // Create User
        const response = await apiClient.post(
          "/users",
          { name, username, password, role, status, company_id: companyId || null }
        );
        if (response.data.success) {
          setSuccess("User created successfully!");
          setTimeout(() => {
            setFormOpen(false);
            fetchUsers();
          }, 1500);
        }
      }
    } catch (err) {
      console.error("Save user error:", err);
      setError(err.response?.data?.message || "An error occurred while saving user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword.trim()) {
      setError("Password cannot be empty.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiClient.put(
        `/users/${resetUser.id}`,
        {
          name: resetUser.name,
          role: resetUser.role,
          status: resetUser.status,
          password: newPassword,
        }
      );
      if (response.data.success) {
        setSuccess("Password reset successful!");
        setTimeout(() => {
          setResetModalOpen(false);
        }, 1500);
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    setError("");
    setSuccess("");

    if (window.confirm(`Are you sure you want to delete user "${user.name}"?`)) {
      try {
        const response = await apiClient.delete(`/users/${user.id}`);
        if (response.data.success) {
          setSuccess("User deleted successfully!");
          fetchUsers();
          setTimeout(() => setSuccess(""), 3000);
        }
      } catch (err) {
        console.error("Delete user error:", err);
        setError(err.response?.data?.message || "Failed to delete user.");
        setTimeout(() => setError(""), 4000);
      }
    }
  };

  return (
    <div style={styles.container}>
      <style>{hoverStyles}</style>

      {/* 1. Header Section */}
      <div style={styles.header}>
        <div style={styles.headerTitleArea}>
          <div style={styles.headerIcon}>
            <FiUsers size={22} />
          </div>
          <div>
            <h2 style={styles.pageTitle}>User Management</h2>
            <span style={styles.pageSubtitle}>
              Create, update, search and administer billing system user credentials.
            </span>
          </div>
        </div>
        <button onClick={handleOpenAddModal} style={styles.addBtn} className="action-btn">
          <FiUserPlus size={16} /> Add User
        </button>
      </div>

      {/* Message Banners */}
      {success && (
        <div style={styles.alertSuccess}>
          <FiCheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div style={styles.alertError}>
          <FiAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Search & Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchWrapper}>
          <FiSearch style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name or username..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset page on new query
            }}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.toolbarMeta}>
          Total users: <strong>{totalUsers}</strong>
        </div>
      </div>

      {/* 3. Main Data Card */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.loaderArea}>
            <div className="table-spinner"></div>
            <p style={{ marginTop: "12px", color: "#74788d", fontSize: "14px" }}>Loading accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={styles.emptyArea}>
            <FiUsers size={48} style={{ color: "#cbd5e1", marginBottom: "12px" }} />
            <h4>No Users Found</h4>
            <p style={{ color: "#74788d", fontSize: "13px" }}>Try refining your search or add a new user.</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Username</th>
                  <th style={styles.th}>Company</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created Date</th>
                  <th style={{ ...styles.th, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="table-row" style={styles.tr}>
                    <td style={styles.td}>#{u.id}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "600", color: "#212529" }}>{u.name}</div>
                    </td>
                    <td style={styles.td}>{u.username}</td>
                    <td style={styles.td}>
                      {u.company_name ? (
                        <div style={{ fontWeight: "500" }}>{u.company_name}</div>
                      ) : (
                        <span style={{ color: "#adb5bd" }}>N/A</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(u.role === "SuperAdmin"
                            ? styles.badgeAdmin
                            : u.role === "CompanyAdmin"
                            ? styles.badgeCompany
                            : styles.badgeStaff)
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: u.status === "Active" ? "#d4edda" : "#f8d7da",
                          color: u.status === "Active" ? "#155724" : "#721c24"
                        }}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td style={styles.td}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <div style={styles.actionGroup}>
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          title="Edit User"
                          style={styles.actionIconBtn}
                          className="icon-btn"
                        >
                          <FiEdit2 size={14} color="#5156be" />
                        </button>
                        <button
                          onClick={() => handleOpenResetModal(u)}
                          title="Reset Password"
                          style={styles.actionIconBtn}
                          className="icon-btn"
                        >
                          <FiKey size={14} color="#f59e0b" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={currentUser && currentUser.id === u.id}
                          title="Delete User"
                          style={{
                            ...styles.actionIconBtn,
                            opacity: currentUser && currentUser.id === u.id ? 0.4 : 1,
                            cursor: currentUser && currentUser.id === u.id ? "not-allowed" : "pointer"
                          }}
                          className="icon-btn"
                        >
                          <FiTrash2 size={14} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Pagination */}
        {totalPages > 1 && (
          <div style={styles.paginationArea}>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              style={{ ...styles.pageNavBtn, opacity: page === 1 ? 0.5 : 1 }}
            >
              <FiChevronLeft size={16} /> Prev
            </button>
            <div style={styles.pageNumbers}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  style={{
                    ...styles.pageNumberBtn,
                    backgroundColor: page === i + 1 ? "#5156be" : "transparent",
                    color: page === i + 1 ? "#ffffff" : "#495057",
                    border: page === i + 1 ? "1px solid #5156be" : "1px solid #ced4da"
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              style={{ ...styles.pageNavBtn, opacity: page === totalPages ? 0.5 : 1 }}
            >
              Next <FiChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 5. Add / Edit Modal */}
      {formOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {isEditMode ? "Edit User Account" : "Create New User"}
              </h3>
              <button onClick={() => setFormOpen(false)} style={styles.closeBtn}>
                <FiX size={18} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} style={styles.modalForm}>
              <div style={styles.modalBody}>
                {/* Form Alert inside modal */}
                {error && (
                  <div style={{ ...styles.alertError, margin: "0 0 16px 0" }}>
                    <FiAlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.formLabel}>Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={styles.modalInput}
                    />
                  </div>

                  <div>
                    <label style={styles.formLabel}>Username *</label>
                    <input
                      type="text"
                      required
                      disabled={isEditMode}
                      placeholder="e.g. johndoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      style={{
                        ...styles.modalInput,
                        backgroundColor: isEditMode ? "#e9ecef" : "#ffffff",
                        cursor: isEditMode ? "not-allowed" : "text"
                      }}
                    />
                  </div>

                  {!isEditMode && (
                    <div>
                      <label style={styles.formLabel}>Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Min 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={styles.modalInput}
                      />
                    </div>
                  )}

                  <div>
                    <label style={styles.formLabel}>User Role *</label>
                    <select
                      value={role}
                      onChange={(e) => {
                        setRole(e.target.value);
                        if (e.target.value === "SuperAdmin") setCompanyId("");
                      }}
                      style={styles.modalSelect}
                    >
                      <option value="SuperAdmin">SuperAdmin</option>
                      <option value="CompanyAdmin">CompanyAdmin</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.formLabel}>
                      Company {role !== "SuperAdmin" && "*"}
                    </label>
                    <select
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      disabled={role === "SuperAdmin"}
                      style={{
                        ...styles.modalSelect,
                        backgroundColor: role === "SuperAdmin" ? "#e9ecef" : "#ffffff"
                      }}
                    >
                      <option value="">Select Company</option>
                      {activeCompanies.map(c => (
                        <option key={c.id} value={c.id}>{c.company_name} {c.company_code ? `(${c.company_code})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={styles.formLabel}>Status *</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={styles.modalSelect}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  style={styles.modalCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={styles.modalSaveBtn}
                  className="save-btn"
                >
                  {submitting ? "Processing..." : isEditMode ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Password Reset Modal */}
      {resetModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: "420px" }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Reset User Password</h3>
              <button onClick={() => setResetModalOpen(false)} style={styles.closeBtn}>
                <FiX size={18} />
              </button>
            </div>
            
            <form onSubmit={handlePasswordResetSubmit} style={styles.modalForm}>
              <div style={styles.modalBody}>
                {error && (
                  <div style={{ ...styles.alertError, margin: "0 0 16px 0" }}>
                    <FiAlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}
                
                <p style={{ fontSize: "13px", color: "#74788d", marginBottom: "16px" }}>
                  Resetting password for: <strong>{resetUser?.name} ({resetUser?.username})</strong>
                </p>

                <div>
                  <label style={styles.formLabel}>New Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={styles.modalInput}
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  style={styles.modalCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={styles.modalSaveBtn}
                  className="save-btn"
                >
                  {submitting ? "Resetting..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom internal CSS variables
const styles = {
  container: {
    padding: "24px",
    fontFamily: "'Inter', sans-serif",
    backgroundColor: "#f5f6fa",
    minHeight: "100vh"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "16px"
  },
  headerTitleArea: {
    display: "flex",
    alignItems: "center",
    gap: "14px"
  },
  headerIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5156be",
    color: "#ffffff",
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(81, 86, 190, 0.2)"
  },
  pageTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#212529",
    margin: 0
  },
  pageSubtitle: {
    fontSize: "13px",
    color: "#74788d"
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#5156be",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    boxShadow: "0 2px 5px rgba(81, 86, 190, 0.2)",
    transition: "all 0.15s ease"
  },
  alertSuccess: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#d4edda",
    border: "1px solid #c3e6cb",
    borderRadius: "8px",
    padding: "12px 18px",
    color: "#155724",
    marginBottom: "20px",
    fontSize: "13px"
  },
  alertError: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#f8d7da",
    border: "1px solid #f5c6cb",
    borderRadius: "8px",
    padding: "12px 18px",
    color: "#721c24",
    marginBottom: "20px",
    fontSize: "13px"
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "16px"
  },
  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    maxWidth: "320px",
    width: "100%"
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    color: "#74788d"
  },
  searchInput: {
    width: "100%",
    padding: "8px 12px 8px 36px",
    fontSize: "13px",
    backgroundColor: "#ffffff",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    outline: "none"
  },
  toolbarMeta: {
    fontSize: "13px",
    color: "#74788d"
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    border: "1px solid #e8ecf0",
    boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
    padding: "20px"
  },
  loaderArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "50px 0"
  },
  emptyArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "50px 0",
    textAlign: "center"
  },
  tableWrapper: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left"
  },
  th: {
    padding: "12px 16px",
    borderBottom: "2px solid #e9ecef",
    color: "#495057",
    fontSize: "13px",
    fontWeight: "600"
  },
  tr: {
    borderBottom: "1px solid #e9ecef"
  },
  td: {
    padding: "14px 16px",
    fontSize: "13px",
    color: "#495057",
    verticalAlign: "middle"
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase"
  },
  badgeAdmin: {
    backgroundColor: "#eef2ff",
    color: "#4f46e5"
  },
  badgeCompany: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32"
  },
  badgeStaff: {
    backgroundColor: "#fff8e1",
    color: "#f57f17"
  },
  statusBadge: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "500"
  },
  actionGroup: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  actionIconBtn: {
    background: "none",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease"
  },
  paginationArea: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "20px",
    flexWrap: "wrap",
    gap: "12px"
  },
  pageNavBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "#ffffff",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "13px",
    color: "#495057",
    cursor: "pointer",
    transition: "all 0.15s ease"
  },
  pageNumbers: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  pageNumberBtn: {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "500",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.15s ease"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1060,
    padding: "20px"
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
    width: "100%",
    maxWidth: "520px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #e9ecef"
  },
  modalTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#495057",
    margin: 0
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#74788d",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  modalForm: {
    display: "flex",
    flexDirection: "column"
  },
  modalBody: {
    padding: "20px"
  },
  formGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  formLabel: {
    display: "block",
    fontSize: "13px",
    fontWeight: "500",
    color: "#495057",
    marginBottom: "6px"
  },
  modalInput: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    color: "#495057",
    backgroundColor: "#ffffff",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    outline: "none"
  },
  modalSelect: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    color: "#495057",
    backgroundColor: "#ffffff",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    outline: "none"
  },
  modalFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "16px 20px",
    backgroundColor: "#f8f9fa",
    borderTop: "1px solid #e9ecef"
  },
  modalCancelBtn: {
    backgroundColor: "#ffffff",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "13px",
    color: "#74788d",
    cursor: "pointer",
    fontWeight: "500"
  },
  modalSaveBtn: {
    backgroundColor: "#5156be",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer"
  }
};

const hoverStyles = `
  .action-btn:hover {
    background-color: #4348a3 !important;
  }
  .save-btn:hover {
    background-color: #4348a3 !important;
  }
  .icon-btn:hover {
    border-color: #5156be !important;
    background-color: #eef2ff !important;
  }
  .icon-btn:active {
    transform: scale(0.95);
  }
  input:focus, select:focus {
    border-color: #5156be !important;
    box-shadow: 0 0 0 3px rgba(81, 86, 190, 0.15) !important;
  }
  .table-row:hover {
    background-color: #f8f9fa;
  }
  .table-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(81, 86, 190, 0.2);
    border-radius: 50%;
    border-top-color: #5156be;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
