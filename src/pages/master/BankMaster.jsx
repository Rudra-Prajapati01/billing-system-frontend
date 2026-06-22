import React, { useState, useEffect } from "react";
import { FiSearch, FiEdit2, FiTrash2, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import apiClient from "../../services/apiClient";

const API_URL = "/banks";

export default function BankMaster() {
  // UI States
  const [entriesCount, setEntriesCount] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBankId, setSelectedBankId] = useState(null);
  
  // Data States
  const [banksList, setBanksList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Form input fields state
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    branch_name: ""
  });

  // Load banks list on mount
  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_URL);
      setBanksList(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching banks:", err);
      setError("Failed to fetch bank accounts. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Account Number restriction: Accept only digits
    if (name === "account_number" && value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setFormDataValue(name, value);
  };

  const setFormDataValue = (name, value) => {
    setBankForm((prev) => ({
      ...prev,
      [name]: name === "ifsc_code" ? value.toUpperCase() : value
    }));
  };

  const resetForm = () => {
    setBankForm({
      bank_name: "",
      account_holder_name: "",
      account_number: "",
      ifsc_code: "",
      branch_name: ""
    });
    setSelectedBankId(null);
  };

  const validateForm = () => {
    const { bank_name, account_holder_name, account_number, ifsc_code } = bankForm;

    if (!bank_name.trim()) return "Bank Name is required.";
    if (!account_holder_name.trim()) return "Account Holder Name is required.";
    if (!account_number.trim()) return "Account Number is required.";
    if (!ifsc_code.trim()) return "IFSC Code is required.";

    // Soft validation: Account Number min 6 digits
    if (account_number.trim().length < 6) {
      return "Account Number must be at least 6 digits.";
    }

    // Soft validation: IFSC Code exactly 11 characters
    if (ifsc_code.trim().length !== 11) {
      return "IFSC Code must be exactly 11 characters.";
    }

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
      if (selectedBankId) {
        // Update Bank Account
        const response = await apiClient.put(`${API_URL}/${selectedBankId}`, bankForm);
        if (response.data.success) {
          setSuccess(response.data.message || "Bank saved successfully");
          setError(null);
          resetForm();
          await fetchBanks();
        } else {
          setError(response.data.message || "Failed to update bank account.");
          setSuccess(null);
        }
      } else {
        // Create Bank Account
        const response = await apiClient.post(API_URL, bankForm);
        if (response.data.success) {
          setSuccess(response.data.message || "Bank saved successfully");
          setError(null);
          resetForm();
          await fetchBanks();
        } else {
          setError(response.data.message || "Failed to create bank account.");
          setSuccess(null);
        }
      }

      // Auto-clear success message
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving bank account:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Failed to save bank details.";
      setError(errMsg);
      setSuccess(null);
    }
  };

  // Populate form for editing
  const handleEditClick = (row) => {
    setSelectedBankId(row.id);
    setBankForm({
      bank_name: row.bank_name || "",
      account_holder_name: row.account_holder_name || "",
      account_number: row.account_number || "",
      ifsc_code: row.ifsc_code || "",
      branch_name: row.branch_name || ""
    });
    setError(null);
    setSuccess(null);
  };

  // Delete handler with confirmation dialog
  const handleDeleteClick = async (id, bankName, accountNo) => {
    if (window.confirm(`Are you sure you want to delete bank account "${bankName} - ${accountNo}"?`)) {
      try {
        const response = await apiClient.delete(`${API_URL}/${id}`);
        if (response.data.success) {
          setSuccess(response.data.message || "Bank deleted successfully");
          setError(null);
          resetForm();
          await fetchBanks();
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(response.data.message || "Failed to delete bank account.");
          setSuccess(null);
        }
      } catch (err) {
        console.error("Error deleting bank account:", err);
        const errMsg = err.response?.data?.message || err.response?.data?.error || "Failed to delete bank account.";
        setError(errMsg);
        setSuccess(null);
      }
    }
  };

  const handleCancelClick = () => {
    resetForm();
    setError(null);
  };

  // Frontend Search Filtering (Search in bank_name, account_holder_name, account_number, and ifsc_code)
  const filteredBanks = banksList.filter((bank) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (bank.bank_name || "").toLowerCase().includes(query);
    const holderMatch = (bank.account_holder_name || "").toLowerCase().includes(query);
    const numberMatch = (bank.account_number || "").toLowerCase().includes(query);
    const ifscMatch = (bank.ifsc_code || "").toLowerCase().includes(query);
    return nameMatch || holderMatch || numberMatch || ifscMatch;
  });

  // Pagination Logic
  const totalEntries = filteredBanks.length;
  const totalPages = Math.ceil(totalEntries / entriesCount) || 1;
  const startIndex = (currentPage - 1) * entriesCount;
  const endIndex = Math.min(startIndex + entriesCount, totalEntries);
  const paginatedBanks = filteredBanks.slice(startIndex, endIndex);

  // Reset page when search or entries limit changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, entriesCount]);

  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      
      {/* MODULE HEADER TITLE */}
      <div style={{ borderBottom: "2px solid #5156be", paddingBottom: "8px", marginBottom: "24px", width: "fit-content" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#495057", margin: "0" }}>Manage Bank Master</h2>
      </div>

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

      {/* TWO COLUMN GRID WRAPPER */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", alignItems: "start" }}>
        
        {/* LEFT COLUMN: BANK ACCOUNT FORM CARD */}
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "15px", color: "#5156be", fontWeight: "600", borderBottom: "1px solid #e5e7eb", paddingBottom: "10px" }}>
            {selectedBankId ? "Edit Bank Account" : "Add Bank Account"}
          </h3>
          
          <form onSubmit={handleFormSubmit}>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                Bank Name <span style={{ color: "#f46a6a" }}>*</span>
              </label>
              <input
                type="text"
                name="bank_name"
                value={bankForm.bank_name}
                onChange={handleInputChange}
                required
                placeholder="e.g. HDFC Bank"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", fontSize: "14px", color: "#495057", boxSizing: "border-box", outline: "none" }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                Account Holder Name <span style={{ color: "#f46a6a" }}>*</span>
              </label>
              <input
                type="text"
                name="account_holder_name"
                value={bankForm.account_holder_name}
                onChange={handleInputChange}
                required
                placeholder="Enter holder's name"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", fontSize: "14px", color: "#495057", boxSizing: "border-box", outline: "none" }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                Account Number <span style={{ color: "#f46a6a" }}>*</span>
              </label>
              <input
                type="text"
                name="account_number"
                value={bankForm.account_number}
                onChange={handleInputChange}
                required
                placeholder="Numbers only (min 6 digits)"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", fontSize: "14px", color: "#495057", boxSizing: "border-box", outline: "none" }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                IFSC Code <span style={{ color: "#f46a6a" }}>*</span>
              </label>
              <input
                type="text"
                name="ifsc_code"
                value={bankForm.ifsc_code}
                onChange={handleInputChange}
                required
                placeholder="11 characters (e.g. HDFC0000123)"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", fontSize: "14px", color: "#495057", boxSizing: "border-box", outline: "none" }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                Branch Name
              </label>
              <input
                type="text"
                name="branch_name"
                value={bankForm.branch_name}
                onChange={handleInputChange}
                placeholder="Enter branch location"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", fontSize: "14px", color: "#495057", boxSizing: "border-box", outline: "none" }}
              />
            </div>

            {/* BUTTON CONTROLS */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{ backgroundColor: "#5156be", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", flex: 1 }}
              >
                {selectedBankId ? "Update" : "Save"}
              </button>
              <button 
                type="button" 
                onClick={handleCancelClick}
                style={{ backgroundColor: "#74788d", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer", flex: 1 }}
              >
                Cancel
              </button>
            </div>

          </form>
        </div>

        {/* RIGHT COLUMN: BANK ACCOUNTS DATATABLE CARD */}
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "15px", color: "#495057", fontWeight: "600", borderBottom: "1px solid #e5e7eb", paddingBottom: "10px" }}>
            Bank Accounts List
          </h3>

          {/* FILTER CONTROLS BAR */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#495057", fontSize: "13px" }}>
              <span>Show</span>
              <select 
                value={entriesCount} 
                onChange={(e) => setEntriesCount(Number(e.target.value))}
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ced4da", outline: "none", backgroundColor: "#fff" }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#495057", fontSize: "13px" }}>Search:</span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "200px", padding: "8px 12px 8px 32px", borderRadius: "6px", border: "1px solid #ced4da", outline: "none", fontSize: "13px" }}
                />
                <FiSearch size={14} style={{ position: "absolute", left: "10px", color: "#74788d" }} />
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa", color: "#495057", borderBottom: "2px solid #e5e7eb", height: "45px" }}>
                  <th style={{ padding: "12px 14px", fontWeight: "600" }}>Bank Name</th>
                  <th style={{ padding: "12px 14px", fontWeight: "600" }}>Account Holder Name</th>
                  <th style={{ padding: "12px 14px", fontWeight: "600" }}>Account Number</th>
                  <th style={{ padding: "12px 14px", fontWeight: "600" }}>IFSC Code</th>
                  <th style={{ padding: "12px 14px", fontWeight: "600" }}>Branch Name</th>
                  <th style={{ padding: "12px 14px", fontWeight: "600", textAlign: "center", width: "90px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && banksList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#74788d" }}>
                      Loading bank accounts...
                    </td>
                  </tr>
                ) : paginatedBanks.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#74788d" }}>
                      No bank accounts found.
                    </td>
                  </tr>
                ) : (
                  paginatedBanks.map((row, index) => (
                    <tr key={row.id || index} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: index % 2 === 0 ? "#fff" : "#fbfbfc" }}>
                      <td style={{ padding: "12px 14px", color: "#5156be", fontWeight: "600" }}>{row.bank_name}</td>
                      <td style={{ padding: "12px 14px", color: "#495057" }}>{row.account_holder_name}</td>
                      <td style={{ padding: "12px 14px", color: "#212529", fontWeight: "500" }}>{row.account_number}</td>
                      <td style={{ padding: "12px 14px", color: "#74788d", fontWeight: "500" }}>{row.ifsc_code}</td>
                      <td style={{ padding: "12px 14px", color: "#74788d" }}>{row.branch_name || "-"}</td>
                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button 
                            onClick={() => handleEditClick(row)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#e8f5e9", color: "#2da949", border: "1px solid #c8e6c9", width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer" }}
                            title="Edit"
                          >
                            <FiEdit2 size={12} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(row.id, row.bank_name, row.account_number)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#ffebee", color: "#f46a6a", border: "1px solid #ffcdd2", width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer" }}
                            title="Delete"
                          >
                            <FiTrash2 size={12} />
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

      </div>

    </div>
  );
}