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

const API_URL = "/leads";

export default function LeadMaster() {
  const [activeMainTab, setActiveMainTab] = useState("Manage Lead"); 
  const [entriesCount, setEntriesCount] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editId, setEditId] = useState(null);

  // Exact match with new DB schema
  const [formData, setFormData] = useState({
    lead_no: "",
    firm_name: "",
    contact_no_1: "",
    contact_no_2: "",
    email: "",
    gst_no: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    ref_by: "",
    lead_date: new Date().toISOString().split("T")[0],
    interested_product: "",
    assign_employee: "",
    remarks: "",
    status: "Pending"
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_URL);
      setLeads(response.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching leads:", err);
      setError("Failed to fetch leads. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      lead_no: "",
      firm_name: "",
      contact_no_1: "",
      contact_no_2: "",
      email: "",
      gst_no: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      ref_by: "",
      lead_date: new Date().toISOString().split("T")[0],
      interested_product: "",
      assign_employee: "",
      remarks: "",
      status: "Pending"
    });
    setEditId(null);
  };

  const validateForm = () => {
    if (!formData.firm_name.trim()) return "Firm Name is required";
    if (!formData.contact_no_1.trim()) return "Primary Contact Number is required";
    if (!formData.ref_by.trim()) return "Referred By is required";
    if (!formData.interested_product.trim()) return "Interested Product is required";
    if (!formData.lead_date) return "Lead Date is required";
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) return "Enter a valid email address";
    }
    return null;
  };

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
      // Optional: Parse assign_employee to integer if needed
      const payload = { 
        ...formData, 
        assign_employee: formData.assign_employee ? parseInt(formData.assign_employee) : null 
      };

      if (editId) {
        const response = await apiClient.put(`${API_URL}/${editId}`, payload);
        setSuccess(response.data.message || "Lead updated successfully");
      } else {
        const response = await apiClient.post(API_URL, payload);
        setSuccess(response.data.message || "Lead created successfully");
      }

      setError(null);
      resetForm();
      await fetchLeads();
      setActiveMainTab("Manage Lead");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving lead:", err);
      setError(err.response?.data?.error || "Failed to save lead.");
      setSuccess(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleEditClick = (lead) => {
    setEditId(lead.id);
    setFormData({
      lead_no: lead.lead_no || "",
      firm_name: lead.firm_name || "",
      contact_no_1: lead.contact_no_1 || "",
      contact_no_2: lead.contact_no_2 || "",
      email: lead.email || "",
      gst_no: lead.gst_no || "",
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      country: lead.country || "India",
      ref_by: lead.ref_by || "",
      lead_date: lead.lead_date ? lead.lead_date.split("T")[0] : new Date().toISOString().split("T")[0],
      interested_product: lead.interested_product || "",
      assign_employee: lead.assign_employee || "",
      remarks: lead.remarks || "",
      status: lead.status || "Pending"
    });
    setError(null);
    setSuccess(null);
    setActiveMainTab("Add Lead"); 
  };

  const handleDeleteClick = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete lead "${name}"?`)) {
      try {
        const response = await apiClient.delete(`${API_URL}/${id}`);
        setSuccess(response.data.message || "Lead deleted successfully");
        setError(null);
        await fetchLeads();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to delete lead");
        setSuccess(null);
      }
    }
  };

  const handleCancelClick = () => {
    resetForm();
    setError(null);
    setActiveMainTab("Manage Lead");
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case "Pending": return { bg: "#fff3cd", color: "#856404" };
      case "Inprocess": return { bg: "#cce5ff", color: "#004085" };
      case "Order": return { bg: "#d4edda", color: "#155724" };
      case "Closed": return { bg: "#e2e3e5", color: "#383d41" };
      case "Cancel": return { bg: "#f8d7da", color: "#721c24" };
      default: return { bg: "#f8f9fa", color: "#495057" };
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase();
    return (lead.firm_name || "").toLowerCase().includes(query) || 
           (lead.contact_no_1 || "").toLowerCase().includes(query) || 
           (lead.lead_no || "").toLowerCase().includes(query);
  });

  const totalEntries = filteredLeads.length;
  const totalPages = Math.ceil(totalEntries / entriesCount) || 1;
  const startIndex = (currentPage - 1) * entriesCount;
  const endIndex = Math.min(startIndex + entriesCount, totalEntries);
  const paginatedLeads = filteredLeads.slice(startIndex, entriesCount === -1 ? totalEntries : endIndex);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, entriesCount]);

  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      
      {/* ALERTS SECTION */}
      {success && (
        <div style={{ padding: "12px 16px", backgroundColor: "#d1e7dd", color: "#0f5132", border: "1px solid #badbcc", borderRadius: "6px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span><strong style={{marginRight: "8px"}}>Success:</strong>{success}</span>
          <button onClick={() => setSuccess(null)} style={{ background: "none", border: "none", color: "#0f5132", cursor: "pointer", fontSize: "18px", fontWeight: "bold" }}>&times;</button>
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", backgroundColor: "#f8d7da", color: "#842029", border: "1px solid #f5c2c7", borderRadius: "6px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><FiAlertCircle /> <strong>Error:</strong> {error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#842029", cursor: "pointer", fontSize: "18px", fontWeight: "bold" }}>&times;</button>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
        <button onClick={() => { setActiveMainTab("Manage Lead"); resetForm(); setError(null); }} style={{ color: activeMainTab === "Manage Lead" ? "#5156be" : "#495057", fontWeight: "600", padding: "8px 16px", backgroundColor: "#fff", border: "1px solid #dee2e6", borderBottom: activeMainTab === "Manage Lead" ? "3px solid #5156be" : "1px solid #dee2e6", borderRadius: "6px 6px 0 0", cursor: "pointer" }}>Manage Lead</button>
        {activeMainTab !== "Add Lead" && (
          <button onClick={() => { resetForm(); setError(null); setActiveMainTab("Add Lead"); }} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#2da949", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "500", cursor: "pointer" }}><FiPlus /> Add Lead</button>
        )}
      </div>

      {/* MANAGE LEADS TABLE */}
      {activeMainTab === "Manage Lead" && (
        <div style={{ backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
              Show <select value={entriesCount} onChange={(e) => setEntriesCount(Number(e.target.value))} style={{ padding: "6px", borderRadius: "6px", border: "1px solid #ced4da" }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select> entries
            </div>
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="Search firm, phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: "8px 12px 8px 32px", borderRadius: "6px", border: "1px solid #ced4da", fontSize: "14px", width: "240px" }} />
              <FiSearch style={{ position: "absolute", left: "10px", top: "10px", color: "#74788d" }} />
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Lead No</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Firm Name</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Contact</th>
                <th style={{ padding: "12px", textAlign: "left" }}>City</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Product</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "12px", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: "20px", textAlign: "center" }}>Loading...</td></tr>
              ) : paginatedLeads.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: "20px", textAlign: "center" }}>No leads found.</td></tr>
              ) : (
                paginatedLeads.map((lead, i) => {
                  const s = getStatusStyle(lead.status);
                  return (
                    <tr key={lead.id} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: i % 2 === 0 ? "#fff" : "#fbfbfc" }}>
                      <td style={{ padding: "12px", fontWeight: "600" }}>{lead.lead_no || "-"}</td>
                      <td style={{ padding: "12px", fontWeight: "600", color: "#5156be" }}>{lead.firm_name}</td>
                      <td style={{ padding: "12px" }}>{lead.contact_no_1}</td>
                      <td style={{ padding: "12px" }}>{lead.city || "-"}</td>
                      <td style={{ padding: "12px" }}>{lead.interested_product}</td>
                      <td style={{ padding: "12px" }}><span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", backgroundColor: s.bg, color: s.color }}>{lead.status}</span></td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                          <button onClick={() => handleEditClick(lead)} style={{ background: "#e8f5e9", color: "#2da949", border: "1px solid #c8e6c9", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer" }}><FiEdit2 /></button>
                          <button onClick={() => handleDeleteClick(lead.id, lead.firm_name)} style={{ background: "#ffebee", color: "#f46a6a", border: "1px solid #ffcdd2", width: "32px", height: "32px", borderRadius: "6px", cursor: "pointer" }}><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD/EDIT FORM */}
      {activeMainTab === "Add Lead" && (
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <button onClick={handleCancelClick} style={{ background: "none", border: "none", color: "#5156be", fontWeight: "600", cursor: "pointer" }}><FiArrowLeft /> Back</button>
            <span style={{color: "#ccc"}}>|</span>
            <span style={{ fontWeight: "600" }}>{editId ? "Edit Lead" : "Add Lead"}</span>
          </div>

          <form onSubmit={handleFormSubmit}>
            
            {/* ROW 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Lead No</label>
                <input 
                  type="text" 
                  name="lead_no" 
                  value={formData.lead_no || "Auto Generated"} 
                  disabled 
                  style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box", backgroundColor: "#e9ecef", color: "#6c757d", cursor: "not-allowed" }} 
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Firm Name <span style={{ color: "red" }}>*</span></label>
                <input type="text" name="firm_name" value={formData.firm_name} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Lead Date <span style={{ color: "red" }}>*</span></label>
                <input type="date" name="lead_date" value={formData.lead_date} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }} />
              </div>
            </div>

            {/* ROW 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Contact No 1 <span style={{ color: "red" }}>*</span></label>
                <input type="text" name="contact_no_1" value={formData.contact_no_1} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Contact No 2</label>
                <input type="text" name="contact_no_2" value={formData.contact_no_2} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }} />
              </div>
            </div>

            {/* ROW 3 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>City</label>
                <input type="text" name="city" value={formData.city} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>State</label>
                <input type="text" name="state" value={formData.state} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Country</label>
                <input type="text" name="country" value={formData.country} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }} />
              </div>
            </div>

            {/* ADDRESS */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Address</label>
              <textarea name="address" rows="2" value={formData.address} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }}></textarea>
            </div>

            {/* ROW 4 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Referred By <span style={{ color: "red" }}>*</span></label>
                <input type="text" name="ref_by" value={formData.ref_by} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Interested Product <span style={{ color: "red" }}>*</span></label>
                <input type="text" name="interested_product" value={formData.interested_product} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>GST No</label>
                <input type="text" name="gst_no" value={formData.gst_no} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }} />
              </div>
            </div>

            {/* ROW 5 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Assign Employee (ID)</label>
                <input type="number" name="assign_employee" value={formData.assign_employee} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }} placeholder="e.g. 1" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box", backgroundColor:"#fff" }}>
                  <option value="Pending">Pending</option>
                  <option value="Inprocess">Inprocess</option>
                  <option value="Order">Order</option>
                  <option value="Closed">Closed</option>
                  <option value="Cancel">Cancel</option>
                </select>
              </div>
            </div>

            {/* REMARKS */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Remarks</label>
              <textarea name="remarks" rows="2" value={formData.remarks} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ced4da", borderRadius: "6px", boxSizing:"border-box" }}></textarea>
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "20px", display: "flex", gap: "10px" }}>
              <button type="submit" style={{ background: "#5156be", color: "#fff", padding: "10px 24px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? "Update Lead" : "Save Lead"}
              </button>
              <button type="button" onClick={handleCancelClick} style={{ background: "#74788d", color: "#fff", padding: "10px 24px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                Cancel
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}