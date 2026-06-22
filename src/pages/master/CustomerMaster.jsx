import React, { useState, useEffect } from "react";
import { 
  FiEdit2, 
  FiTrash2, 
  FiPlus, 
  FiSearch,
  FiArrowLeft,
  FiAlertCircle
} from "react-icons/fi";
import apiClient from "../../services/apiClient";

const API_URL = "/customers";

export default function CustomerMaster() {
  // Navigation & UI States
  const [activeMainTab, setActiveMainTab] = useState("Manage Party"); 
  const [entriesCount, setEntriesCount] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Data States
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // CRUD / Edit State
  const [editId, setEditId] = useState(null);

  // Form State Values (Exactly matching MySQL DB Columns)
  const [formData, setFormData] = useState({
    customer_name: "",
    company_name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    country: "India", // Default setting
    gst_number: ""
  });

  // Fetch all customers on mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_URL);
      setCustomers(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError("Failed to fetch customers. Please check if the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form helper
  const resetForm = () => {
    setFormData({
      customer_name: "",
      company_name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      gst_number: ""
    });
    setEditId(null);
  };

  // Validate form inputs
  const validateForm = () => {
    if (!formData.customer_name.trim()) return "Customer Name is required";
    if (!formData.company_name.trim()) return "Company Name is required";
    if (!formData.phone.trim()) return "Phone Number is required";
    if (formData.phone.trim().length < 8) return "Phone number must be at least 8 digits";
    if (!formData.address.trim()) return "Address is required";
    if (!formData.city.trim()) return "City is required";
    if (!formData.state.trim()) return "State is required";
    if (!formData.country.trim()) return "Country is required";

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        return "Please enter a valid email address";
      }
    }

    if (formData.gst_number.trim()) {
      if (formData.gst_number.trim().length !== 15) {
        return "GST number must be exactly 15 characters";
      }
    }

    return null;
  };

  // Form Submit Handler (Add or Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      if (editId) {
        // Update Customer
        const response = await apiClient.put(`${API_URL}/${editId}`, formData);
        setSuccess(response.data.message || "Customer updated successfully");
      } else {
        // Create Customer
        const response = await apiClient.post(API_URL, formData);
        setSuccess(response.data.message || "Customer created successfully");
      }

      setError(null);
      resetForm();
      await fetchCustomers();
      setActiveMainTab("Manage Party");

      // Clear success alert after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving customer:", err);
      const errMsg = err.response?.data?.error || err.response?.data?.details || "Failed to save customer details.";
      setError(errMsg);
      setSuccess(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Edit Click Handler (Populate Form)
  const handleEditClick = (customer) => {
    setEditId(customer.id);
    setFormData({
      customer_name: customer.customer_name || "",
      company_name: customer.company_name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      country: customer.country || "India",
      gst_number: customer.gst_number || ""
    });
    setError(null);
    setSuccess(null);
    setActiveMainTab("Add Party"); // Switch to form tab
  };

  // Delete Click Handler
  const handleDeleteClick = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete customer "${name}"?`)) {
      try {
        const response = await apiClient.delete(`${API_URL}/${id}`);
        setSuccess(response.data.message || "Customer deleted successfully");
        setError(null);
        await fetchCustomers();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        console.error("Error deleting customer:", err);
        const errMsg = err.response?.data?.error || "Failed to delete customer";
        setError(errMsg);
        setSuccess(null);
      }
    }
  };

  // Cancel Handler
  const handleCancelClick = () => {
    resetForm();
    setError(null);
    setActiveMainTab("Manage Party");
  };

  // Frontend Search Filtering
  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (customer.customer_name || "").toLowerCase().includes(query);
    const companyMatch = (customer.company_name || "").toLowerCase().includes(query);
    const phoneMatch = (customer.phone || "").toLowerCase().includes(query);
    return nameMatch || companyMatch || phoneMatch;
  });

  // Pagination Logic
  const totalEntries = filteredCustomers.length;
  const totalPages = Math.ceil(totalEntries / entriesCount) || 1;
  const startIndex = (currentPage - 1) * entriesCount;
  const endIndex = Math.min(startIndex + entriesCount, totalEntries);
  const paginatedCustomers = filteredCustomers.slice(startIndex, entriesCount === -1 ? totalEntries : endIndex);

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
          alignItems: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: "600" }}>Success:</span>
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
          alignItems: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FiAlertCircle size={16} />
            <span style={{ fontWeight: "600" }}>Error:</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#842029", cursor: "pointer", fontSize: "18px", fontWeight: "bold" }}>&times;</button>
        </div>
      )}

      {/* NAVIGATION CONTROLS BAR */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
        <button 
          onClick={() => {
            setActiveMainTab("Manage Party");
            resetForm();
            setError(null);
          }}
          style={{ 
            color: activeMainTab === "Manage Party" ? "#5156be" : "#495057", 
            fontWeight: "600", 
            padding: "8px 16px",
            backgroundColor: "#fff",
            border: "1px solid #dee2e6",
            borderBottom: activeMainTab === "Manage Party" ? "3px solid #5156be" : "1px solid #dee2e6",
            borderRadius: "6px 6px 0 0",
            cursor: "pointer"
          }}
        >
          Manage Customer
        </button>
        {activeMainTab !== "Add Party" && (
          <button 
            onClick={() => {
              resetForm();
              setError(null);
              setActiveMainTab("Add Party");
            }}
            style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#2da949", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "500", cursor: "pointer" }}
          >
            <FiPlus size={16} /> Add Customer
          </button>
        )}
      </div>

      {/* VIEW 1: MANAGE CUSTOMER TABLE LIST */}
      {activeMainTab === "Manage Party" && (
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
                  style={{ width: "240px", padding: "8px 12px 8px 32px", borderRadius: "6px", border: "1px solid #ced4da", outline: "none", fontSize: "14px" }}
                  placeholder="Search customer, company, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <FiSearch size={14} style={{ position: "absolute", left: "10px", color: "#74788d" }} />
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa", color: "#495057", borderBottom: "2px solid #e5e7eb", height: "45px" }}>
                  <th style={{ padding: "14px 16px", fontWeight: "600" }}>Customer Name</th>
                  <th style={{ padding: "14px 16px", fontWeight: "600" }}>Company Name</th>
                  <th style={{ padding: "14px 16px", fontWeight: "600" }}>Phone</th>
                  <th style={{ padding: "14px 16px", fontWeight: "600" }}>Email</th>
                  <th style={{ padding: "14px 16px", fontWeight: "600" }}>City</th>
                  <th style={{ padding: "14px 16px", fontWeight: "600" }}>State</th>
                  <th style={{ padding: "14px 16px", fontWeight: "600" }}>GST No</th>
                  <th style={{ padding: "14px 16px", fontWeight: "600", textAlign: "center", width: "100px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ padding: "30px", textAlign: "center", color: "#74788d" }}>
                      Loading customers list...
                    </td>
                  </tr>
                ) : paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: "30px", textAlign: "center", color: "#74788d" }}>
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer, index) => (
                    <tr key={customer.id || index} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: index % 2 === 0 ? "#fff" : "#fbfbfc" }}>
                      <td style={{ padding: "14px 16px", fontWeight: "600", color: "#5156be", verticalAlign: "middle" }}>
                        {customer.customer_name}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#495057", verticalAlign: "middle" }}>
                        {customer.company_name}
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: "500", color: "#212529", verticalAlign: "middle" }}>
                        {customer.phone}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#74788d", verticalAlign: "middle" }}>
                        {customer.email || "-"}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#212529", verticalAlign: "middle" }}>
                        {customer.city}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#212529", verticalAlign: "middle" }}>
                        {customer.state}
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: "500", color: "#212529", verticalAlign: "middle" }}>
                        {customer.gst_number || "N/A"}
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                          <button 
                            onClick={() => handleEditClick(customer)}
                            title="Edit"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#e8f5e9", color: "#2da949", border: "1px solid #c8e6c9", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer" }}
                          >
                            <FiEdit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(customer.id, customer.customer_name)}
                            title="Delete"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#ffebee", color: "#f46a6a", border: "1px solid #ffcdd2", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer" }}
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
                Showing {totalEntries === 0 ? 0 : startIndex + 1} to {endIndex} of {totalEntries} entries
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

      {/* VIEW 2: ADD / EDIT CUSTOMER FORM VIEW */}
      {activeMainTab === "Add Party" && (
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", padding: "24px" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", color: "#495057" }}>
            <button onClick={handleCancelClick} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "#5156be", fontWeight: "600" }}>
              <FiArrowLeft size={16} style={{ marginRight: "4px" }} /> Back to List
            </button>
            <span style={{ color: "#bdc3c7" }}>|</span>
            <span style={{ fontWeight: "600", fontSize: "15px" }}>
              {editId ? "Edit Customer Details" : "Add Customer Details"}
            </span>
          </div>

          <form onSubmit={handleFormSubmit}>
            
            {/* Row 1: Name & Company Name */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                  Customer Name <span style={{ color: "#f46a6a" }}>*</span>
                </label>
                <input 
                  type="text" 
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                  Company Name <span style={{ color: "#f46a6a" }}>*</span>
                </label>
                <input 
                  type="text" 
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="Enter company name"
                />
              </div>
            </div>

            {/* Row 2: Phone No & Email */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                  Phone No <span style={{ color: "#f46a6a" }}>*</span>
                </label>
                <input 
                  type="text" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                  Email
                </label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="email@company.com"
                />
              </div>
            </div>

            {/* Row 3: Address Fields */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                Address <span style={{ color: "#f46a6a" }}>*</span>
              </label>
              <textarea 
                name="address"
                rows="3"
                value={formData.address}
                onChange={handleInputChange}
                required
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", resize: "none", lineHeight: "1.5", boxSizing: "border-box" }}
                placeholder="Enter address details..."
              />
            </div>

            {/* Row 4: City, State, Country */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                  City <span style={{ color: "#f46a6a" }}>*</span>
                </label>
                <input 
                  type="text" 
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="e.g. Ahmedabad"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                  State <span style={{ color: "#f46a6a" }}>*</span>
                </label>
                <input 
                  type="text" 
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="e.g. Gujarat"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                  Country <span style={{ color: "#f46a6a" }}>*</span>
                </label>
                <input 
                  type="text" 
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="e.g. India"
                />
              </div>
            </div>

            {/* Row 5: GST No */}
            <div style={{ marginBottom: "28px", maxWidth: "50%" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" }}>
                GST No
              </label>
              <input 
                type="text" 
                name="gst_number"
                value={formData.gst_number}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                placeholder="Enter 15-digit GST number"
              />
            </div>

            {/* BUTTON FOOTER ACTIONS */}
            <div style={{ display: "flex", gap: "10px", borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
              <button 
                type="submit" 
                style={{ backgroundColor: "#5156be", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", fontWeight: "500", cursor: "pointer", fontSize: "14px" }}
              >
                {editId ? "Update Customer" : "Save Customer"}
              </button>
              <button 
                type="button" 
                onClick={handleCancelClick}
                style={{ backgroundColor: "#74788d", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", fontWeight: "500", cursor: "pointer", fontSize: "14px" }}
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