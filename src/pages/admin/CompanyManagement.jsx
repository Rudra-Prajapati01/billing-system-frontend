import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBriefcase,
  FiPlus,
  FiEdit2,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
  FiCheckCircle,
  FiX
} from "react-icons/fi";
import apiClient from "../../services/apiClient";

export default function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  const [formData, setFormData] = useState({
    company_name: "",
    company_code: "",
    contact_person: "",
    email: "",
    mobile: "",
    address: "",
    status: "Active"
  });

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
    fetchCompanies();
  }, [page, search]);

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get(
        `/tenant-companies?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
      );
      if (response.data.success) {
        setCompanies(response.data.data || []);
        setTotalPages(1);
        setTotalCompanies(response.data.data ? response.data.data.length : 0);
      }
    } catch (err) {
      console.error("Fetch companies error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (err.response.data?.code === "USER_INACTIVE" || err.response.data?.code === "TOKEN_INVALID") {
          localStorage.clear();
          sessionStorage.clear();
          navigate("/login");
        } else {
          setError(err.response?.data?.message || "Unauthorized access.");
        }
      } else {
        setError("Failed to fetch companies.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setSelectedCompanyId(null);
    setFormData({
      company_name: "",
      company_code: "",
      contact_person: "",
      email: "",
      mobile: "",
      address: "",
      status: "Active"
    });
    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const handleOpenEditModal = (company) => {
    setIsEditMode(true);
    setSelectedCompanyId(company.id);
    setFormData({
      company_name: company.company_name,
      company_code: company.company_code || "",
      contact_person: company.contact_person || "",
      email: company.email || "",
      mobile: company.mobile || "",
      address: company.address || "",
      status: company.status
    });
    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.company_name.trim() || !formData.status) {
      setError("Company Name and Status are required.");
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode) {
        const response = await apiClient.put(
          `/tenant-companies/${selectedCompanyId}`,
          formData
        );
        if (response.data.success) {
          setSuccess("Company updated successfully!");
          setTimeout(() => {
            setFormOpen(false);
            fetchCompanies();
          }, 1500);
        }
      } else {
        const response = await apiClient.post(
          "/tenant-companies",
          formData
        );
        if (response.data.success) {
          setSuccess("Company created successfully!");
          setTimeout(() => {
            setFormOpen(false);
            fetchCompanies();
          }, 1500);
        }
      }
    } catch (err) {
      console.error("Save company error:", err);
      setError(err.response?.data?.message || "An error occurred while saving company.");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div style={styles.container}>
      <style>{hoverStyles}</style>
      
      <div style={styles.header}>
        <div style={styles.headerTitleArea}>
          <div style={styles.headerIcon}>
            <FiBriefcase size={22} />
          </div>
          <div>
            <h2 style={styles.pageTitle}>Company Management</h2>
            <span style={styles.pageSubtitle}>
              Manage tenant companies and their isolation status.
            </span>
          </div>
        </div>
        <button onClick={handleOpenAddModal} style={styles.addBtn} className="action-btn">
          <FiPlus size={16} /> Add Company
        </button>
      </div>

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

      <div style={styles.toolbar}>
        <div style={styles.searchWrapper}>
          <FiSearch style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name, code or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.toolbarMeta}>
          Total companies: <strong>{totalCompanies}</strong>
        </div>
      </div>

      <div style={styles.card}>
        {loading ? (
          <div style={styles.loaderArea}>
            <div className="table-spinner"></div>
            <p style={{ marginTop: "12px", color: "#74788d", fontSize: "14px" }}>Loading companies...</p>
          </div>
        ) : companies.length === 0 ? (
          <div style={styles.emptyArea}>
            <FiBriefcase size={48} style={{ color: "#cbd5e1", marginBottom: "12px" }} />
            <h4>No Companies Found</h4>
            <p style={{ color: "#74788d", fontSize: "13px" }}>Try refining your search or add a new company.</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Company Name</th>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>Contact Person</th>
                  <th style={styles.th}>Email / Mobile</th>
                  <th style={styles.th}>Users</th>
                  <th style={styles.th}>Status</th>
                  <th style={{ ...styles.th, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="table-row" style={styles.tr}>
                    <td style={styles.td}>#{c.id}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "600", color: "#212529" }}>{c.company_name}</div>
                    </td>
                    <td style={styles.td}>{c.company_code || "-"}</td>
                    <td style={styles.td}>{c.contact_person || "-"}</td>
                    <td style={styles.td}>
                      <div>{c.email || "-"}</div>
                      <div style={{ fontSize: "11px", color: "#74788d" }}>{c.mobile || "-"}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: "600", color: "#4f46e5", backgroundColor: "#e0e7ff", padding: "2px 8px", borderRadius: "12px" }}>
                        {c.total_users || 0}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: c.status === "Active" ? "#d4edda" : "#f8d7da",
                          color: c.status === "Active" ? "#155724" : "#721c24"
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: "center", display: "flex", justifyContent: "center", gap: "8px" }}>
                      
                      <button
                        onClick={async () => {
                          try {
                            const res = await apiClient.post("/auth/impersonate", { company_id: c.id });
                            if (res.data.success) {
                              localStorage.setItem("token", res.data.token);
                              localStorage.setItem("user", JSON.stringify(res.data.user));
                              window.location.href = "/dashboard";
                            }
                          } catch (error) {
                            console.error("Failed to impersonate:", error);
                            alert("Failed to login as this company.");
                          }
                        }}
                        title="Login As Company"
                        style={{ ...styles.actionIconBtn, backgroundColor: "#fef3c7" }}
                        className="icon-btn"
                      >
                        <span style={{ fontSize: "11px", fontWeight: "600", color: "#d97706" }}>Login As</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(c)}
                        title="Edit Company"
                        style={styles.actionIconBtn}
                        className="icon-btn"
                      >
                        <FiEdit2 size={14} color="#5156be" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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

      {formOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {isEditMode ? "Edit Company" : "Create New Company"}
              </h3>
              <button onClick={() => setFormOpen(false)} style={styles.closeBtn}>
                <FiX size={18} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} style={styles.modalForm}>
              <div style={styles.modalBody}>
                {error && (
                  <div style={{ ...styles.alertError, margin: "0 0 16px 0" }}>
                    <FiAlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.formLabel}>Company Name *</label>
                    <input
                      type="text"
                      name="company_name"
                      required
                      placeholder="Enter company name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      style={styles.modalInput}
                    />
                  </div>
                  <div>
                    <label style={styles.formLabel}>Company Code</label>
                    <input
                      type="text"
                      name="company_code"
                      placeholder="e.g. COMP01"
                      value={formData.company_code}
                      onChange={handleInputChange}
                      style={styles.modalInput}
                    />
                  </div>
                  <div>
                    <label style={styles.formLabel}>Contact Person</label>
                    <input
                      type="text"
                      name="contact_person"
                      placeholder="e.g. Jane Doe"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      style={styles.modalInput}
                    />
                  </div>
                  <div>
                    <label style={styles.formLabel}>Email</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="e.g. admin@company.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      style={styles.modalInput}
                    />
                  </div>
                  <div>
                    <label style={styles.formLabel}>Mobile Number</label>
                    <input
                      type="text"
                      name="mobile"
                      placeholder="Enter mobile number"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      style={styles.modalInput}
                    />
                  </div>
                  <div>
                    <label style={styles.formLabel}>Status *</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      style={styles.modalSelect}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={styles.formLabel}>Address</label>
                    <textarea
                      name="address"
                      placeholder="Enter company address"
                      value={formData.address}
                      onChange={handleInputChange}
                      style={{ ...styles.modalInput, resize: "vertical", minHeight: "60px" }}
                    />
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
                  {submitting ? "Processing..." : isEditMode ? "Save Changes" : "Create Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
  statusBadge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase"
  },
  actionIconBtn: {
    background: "transparent",
    border: "none",
    padding: "6px",
    borderRadius: "4px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s"
  },
  paginationArea: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "20px",
    borderTop: "1px solid #e9ecef",
    paddingTop: "20px"
  },
  pageNavBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "transparent",
    border: "none",
    color: "#495057",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer"
  },
  pageNumbers: {
    display: "flex",
    gap: "6px"
  },
  pageNumberBtn: {
    width: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1050,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    width: "100%",
    maxWidth: "600px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
  },
  modalHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #e9ecef",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
    color: "#212529"
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#74788d",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  modalBody: {
    padding: "24px",
    overflowY: "auto"
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px"
  },
  formLabel: {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#495057"
  },
  modalInput: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    outline: "none",
    transition: "border-color 0.15s ease-in-out"
  },
  modalSelect: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    outline: "none",
    backgroundColor: "#ffffff"
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #e9ecef",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    backgroundColor: "#f8f9fa",
    borderBottomLeftRadius: "10px",
    borderBottomRightRadius: "10px"
  },
  modalCancelBtn: {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#495057",
    backgroundColor: "#ffffff",
    border: "1px solid #ced4da",
    borderRadius: "6px",
    cursor: "pointer"
  },
  modalSaveBtn: {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#ffffff",
    backgroundColor: "#5156be",
    border: "1px solid #5156be",
    borderRadius: "6px",
    cursor: "pointer"
  }
};

const hoverStyles = `
  .action-btn:hover { background-color: #4348a5 !important; }
  .icon-btn:hover { background-color: #f3f4f6; }
  .save-btn:hover { background-color: #4348a5 !important; border-color: #4348a5 !important; }
  .table-row:hover { background-color: #f8f9fa; }
  @keyframes spin { 100% { transform: rotate(360deg); } }
  .table-spinner {
    width: 30px; height: 30px;
    border: 3px solid rgba(81, 86, 190, 0.2);
    border-radius: 50%;
    border-top-color: #5156be;
    animation: spin 1s linear infinite;
  }
`;
