import React, { useState, useEffect } from "react";
import { FiSearch, FiEdit2, FiTrash2, FiPlus, FiArrowLeft, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import apiClient from "../../services/apiClient";

const API_URL = "/terms";

export default function TermsCondition() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState("Manage Terms"); 
  const [entriesCount, setEntriesCount] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTermId, setSelectedTermId] = useState(null);

  // Data States
  const [termsList, setTermsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Form input states
  const [termForm, setTermForm] = useState({
    title: "",
    description: "",
    status: "Active"
  });

  // Load terms list on mount
  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_URL);
      setTermsList(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching terms:", err);
      setError("Failed to load terms list. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTermForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setTermForm({
      title: "",
      description: "",
      status: "Active"
    });
    setSelectedTermId(null);
  };

  const validateForm = () => {
    if (!termForm.title.trim()) return "Terms Title is required.";
    if (!termForm.description.trim()) return "Description is required.";
    return null;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    try {
      if (selectedTermId) {
        // Update Terms
        const response = await apiClient.put(`${API_URL}/${selectedTermId}`, termForm);
        if (response.data.success) {
          setSuccess(response.data.message || "Terms saved successfully");
          setError(null);
          resetForm();
          await fetchTerms();
          setActiveTab("Manage Terms");
        } else {
          setError(response.data.message || "Failed to update terms.");
          setSuccess(null);
        }
      } else {
        // Create Terms
        const response = await apiClient.post(API_URL, termForm);
        if (response.data.success) {
          setSuccess(response.data.message || "Terms saved successfully");
          setError(null);
          resetForm();
          await fetchTerms();
          setActiveTab("Manage Terms");
        } else {
          setError(response.data.message || "Failed to save terms.");
          setSuccess(null);
        }
      }

      // Auto-clear success message
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving terms:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Failed to save terms.";
      setError(errMsg);
      setSuccess(null);
    }
  };

  // Populate form with existing values for editing
  const handleEditClick = (row) => {
    setSelectedTermId(row.id);
    setTermForm({
      title: row.title || "",
      description: row.description || "",
      status: row.status || "Active"
    });
    setError(null);
    setSuccess(null);
    setActiveTab("Add Terms"); // Switch to form tab
  };

  // Delete terms with confirmation prompt
  const handleDeleteClick = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete terms profile "${title}"?`)) {
      try {
        const response = await apiClient.delete(`${API_URL}/${id}`);
        if (response.data.success) {
          setSuccess(response.data.message || "Terms deleted successfully");
          setError(null);
          resetForm();
          await fetchTerms();
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(response.data.message || "Failed to delete terms.");
          setSuccess(null);
        }
      } catch (err) {
        console.error("Error deleting terms:", err);
        const errMsg = err.response?.data?.message || err.response?.data?.error || "Failed to delete terms.";
        setError(errMsg);
        setSuccess(null);
      }
    }
  };

  const handleCancelClick = () => {
    resetForm();
    setError(null);
    setActiveTab("Manage Terms");
  };

  // Frontend Search Filtering (Search in title and description)
  const filteredTerms = termsList.filter((item) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = (item.title || "").toLowerCase().includes(query);
    const descMatch = (item.description || "").toLowerCase().includes(query);
    return titleMatch || descMatch;
  });

  // Pagination Logic
  const totalEntries = filteredTerms.length;
  const totalPages = Math.ceil(totalEntries / entriesCount) || 1;
  const startIndex = (currentPage - 1) * entriesCount;
  const endIndex = Math.min(startIndex + entriesCount, totalEntries);
  const paginatedTerms = filteredTerms.slice(startIndex, endIndex);

  // Reset page when search or entries limit changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, entriesCount]);

  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      
      {/* ALERTS SECTION */}
      {success && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: "#d1e7dd",
          color: "#0f5132",
          border: "1px solid #badbcc",
          borderRadius: "6px",
          marginBottom: "20px",
          fontSize: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FiCheckCircle size={16} />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} style={{ background: "none", border: "none", color: "#0f5132", cursor: "pointer", fontSize: "18px", fontWeight: "bold" }}>&times;</button>
        </div>
      )}

      {error && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: "#f8d7da",
          color: "#842029",
          border: "1px solid #f5c2c7",
          borderRadius: "6px",
          marginBottom: "20px",
          fontSize: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FiAlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#842029", cursor: "pointer", fontSize: "18px", fontWeight: "bold" }}>&times;</button>
        </div>
      )}

      {/* TOP HEADER AND TABS */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
        <button 
          onClick={() => {
            setActiveTab("Manage Terms");
            resetForm();
            setError(null);
          }}
          style={{ 
            color: activeTab === "Manage Terms" ? "#5156be" : "#495057", 
            fontWeight: "600", 
            padding: "8px 16px",
            backgroundColor: "#fff",
            border: "1px solid #dee2e6",
            borderBottom: activeTab === "Manage Terms" ? "3px solid #5156be" : "1px solid #dee2e6",
            borderRadius: "6px 6px 0 0",
            cursor: "pointer"
          }}
        >
          Manage Terms
        </button>
        {activeTab !== "Add Terms" && (
          <button 
            onClick={() => {
              resetForm();
              setError(null);
              setActiveTab("Add Terms");
            }}
            style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#2da949", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "500", cursor: "pointer" }}
          >
            <FiPlus size={16} /> Add Terms
          </button>
        )}
      </div>

      {/* VIEW 1: MANAGE TERMS LISTING TABLE */}
      {activeTab === "Manage Terms" && (
        <div style={{ backgroundColor: "#fff", borderRadius: "10px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb", padding: "20px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#495057", fontSize: "14px" }}>
              <span>Show</span>
              <select 
                value={entriesCount} 
                onChange={(e) => setEntriesCount(Number(e.target.value))}
                style={{ width: "75px", padding: "6px 10px", borderRadius: "6px", border: "1px solid #ced4da", backgroundColor: "#fff", outline: "none" }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#495057", fontSize: "14px" }}>Search:</span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Search title, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "240px", padding: "8px 12px 8px 32px", borderRadius: "6px", border: "1px solid #ced4da", outline: "none", fontSize: "14px" }}
                />
                <FiSearch size={14} style={{ position: "absolute", left: "10px", color: "#74788d" }} />
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa", color: "#495057", borderBottom: "2px solid #e5e7eb", height: "45px" }}>
                  <th style={{ padding: "14px 16px", fontWeight: "600", width: "20%" }}>Title</th>
                  <th style={{ padding: "14px 16px", fontWeight: "600", width: "45%" }}>Description</th>
                  <th style={{ padding: "14px 16px", fontWeight: "600", width: "10%", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "14px 16px", fontWeight: "600", width: "15%" }}>Created Date</th>
                  <th style={{ padding: "14px 16px", fontWeight: "600", width: "10%", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ padding: "30px", textAlign: "center", color: "#74788d" }}>
                      Loading terms & conditions...
                    </td>
                  </tr>
                ) : paginatedTerms.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: "30px", textAlign: "center", color: "#74788d" }}>
                      No terms and conditions profiles found.
                    </td>
                  </tr>
                ) : (
                  paginatedTerms.map((row, index) => (
                    <tr key={row.id || index} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: index % 2 === 0 ? "#fff" : "#fbfbfc" }}>
                      <td style={{ padding: "14px 16px", fontWeight: "600", color: "#5156be", verticalAlign: "top" }}>
                        {row.title}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#495057", whiteSpace: "pre-wrap", lineHeight: "1.5", verticalAlign: "top" }}>
                        {row.description}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center", verticalAlign: "top" }}>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "600",
                          backgroundColor: row.status === "Active" ? "#e8f5e9" : "#ffebee",
                          color: row.status === "Active" ? "#2da949" : "#f46a6a",
                          border: row.status === "Active" ? "1px solid #c8e6c9" : "1px solid #ffcdd2"
                        }}>
                          {row.status || "Active"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#74788d", verticalAlign: "top" }}>
                        {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                          <button 
                            onClick={() => handleEditClick(row)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#e8f5e9", color: "#2da949", border: "1px solid #c8e6c9", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer" }}
                            title="Edit"
                          >
                            <FiEdit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(row.id, row.title)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#ffebee", color: "#f46a6a", border: "1px solid #ffcdd2", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer" }}
                            title="Delete"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {totalEntries > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ color: "#74788d", fontSize: "13px" }}>
                Showing {startIndex + 1} to {endIndex} of {totalEntries} entries
              </div>
              
              <div style={{ display: "flex", gap: "4px" }}>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #ced4da",
                    backgroundColor: "#fff",
                    borderRadius: "4px",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    opacity: currentPage === 1 ? 0.5 : 1,
                    fontSize: "13px"
                  }}
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #ced4da",
                      backgroundColor: currentPage === i + 1 ? "#5156be" : "#fff",
                      color: currentPage === i + 1 ? "#fff" : "#495057",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: currentPage === i + 1 ? "600" : "400"
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #ced4da",
                    backgroundColor: "#fff",
                    borderRadius: "4px",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    fontSize: "13px"
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* VIEW 2: ADD / EDIT TERMS FORM VIEW */}
      {activeTab === "Add Terms" && (
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", padding: "24px" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", color: "#495057" }}>
            <button onClick={handleCancelClick} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "#5156be", fontWeight: "600" }}>
              <FiArrowLeft size={16} style={{ marginRight: "4px" }} /> Back to List
            </button>
            <span style={{ color: "#bdc3c7" }}>|</span>
            <span style={{ fontWeight: "600", fontSize: "15px" }}>
              {selectedTermId ? "Edit Terms and Conditions" : "Create General Terms"}
            </span>
          </div>

          <form onSubmit={handleFormSubmit}>
            
            {/* Title */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                Terms Title <span style={{ color: "#f46a6a" }}>*</span>
              </label>
              <input 
                type="text" 
                name="title"
                value={termForm.title}
                onChange={handleInputChange}
                required
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                placeholder="e.g. Standard Terms, Service Terms"
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                Description <span style={{ color: "#f46a6a" }}>*</span>
              </label>
              <textarea 
                name="description"
                rows="8"
                value={termForm.description}
                onChange={handleInputChange}
                required
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", resize: "vertical", lineHeight: "1.5", boxSizing: "border-box", fontFamily: "inherit" }}
                placeholder="Enter terms detail text. Line breaks will be preserved exactly."
              />
            </div>

            {/* Status Selection */}
            <div style={{ marginBottom: "28px", maxWidth: "300px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                Status
              </label>
              <select
                name="status"
                value={termForm.status}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", backgroundColor: "#fff" }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* FOOTER ACTIONS */}
            <div style={{ display: "flex", gap: "10px", borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{ backgroundColor: "#5156be", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px" }}
              >
                {selectedTermId ? "Update Terms" : "Save Terms"}
              </button>
              <button 
                type="button" 
                onClick={handleCancelClick}
                style={{ backgroundColor: "#74788d", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}