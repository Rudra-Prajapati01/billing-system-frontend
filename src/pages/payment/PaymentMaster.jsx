import React, { useState, useEffect } from "react";
import { FiSave, FiTrash2, FiSearch, FiCheckCircle, FiAlertCircle, FiFilter, FiEdit } from "react-icons/fi";
import apiClient from "../../services/apiClient";

const API_PAYMENTS = "/payments";

export default function PaymentMaster() {
  const [activeTab, setActiveTab] = useState("create"); // create, list, report

  // Data States
  const [invoicesSummary, setInvoicesSummary] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);

  // Selected Invoice for read-only fields
  const [selectedInvoiceInfo, setSelectedInvoiceInfo] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    invoice_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    payment_mode: "",
    transaction_ref: "",
    remarks: ""
  });

  // Edit State
  const [editingId, setEditingId] = useState(null);

  // Report Filter State
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    customer: "",
    payment_mode: ""
  });

  // UI States
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const entriesCount = 10;

  useEffect(() => {
    fetchInvoiceSummary();
    fetchPayments();
  }, []);

  const fetchInvoiceSummary = async () => {
    try {
      const res = await apiClient.get(`${API_PAYMENTS}/summary`);
      setInvoicesSummary(res.data || []);
    } catch (err) {
      console.error("Failed to load invoices.");
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await apiClient.get(API_PAYMENTS);
      setPaymentsList(res.data || []);
    } catch (err) {
      console.error("Failed to load payments.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-populate read-only fields when invoice is selected
    if (name === "invoice_id") {
      const selected = invoicesSummary.find((i) => i.id.toString() === value);
      setSelectedInvoiceInfo(selected || null);
    }
  };

  const handleEdit = (payment) => {
    setEditingId(payment.id);

    setFormData({
      invoice_id: payment.invoice_id,
      payment_date: payment.payment_date?.split("T")[0],
      amount: payment.amount,
      payment_mode: payment.payment_mode,
      transaction_ref: payment.transaction_ref || "",
      remarks: payment.remarks || ""
    });

    const selected = invoicesSummary.find((i) => i.id === payment.invoice_id);
    setSelectedInvoiceInfo(selected);
    setActiveTab("create");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceInfo) return setError("Please select an invoice.");

    const payAmount = parseFloat(formData.amount);
    const outstanding = parseFloat(selectedInvoiceInfo.outstanding_amount);

    if (payAmount <= 0) {
      return setError("Amount must be greater than zero.");
    }
    
    // In edit mode, the outstanding amount might need backend recalculation 
    // depending on your API, but keeping the original logic for safety.
    if (!editingId && payAmount > outstanding) {
      return setError(`Payment amount cannot exceed outstanding balance of INR ${outstanding.toFixed(2)}`);
    }

    setLoading(true);
    try {
      if (editingId) {
        await apiClient.put(`${API_PAYMENTS}/${editingId}`, formData);
        setSuccess("Payment updated successfully!");
      } else {
        await apiClient.post(API_PAYMENTS, formData);
        setSuccess("Payment recorded successfully!");
      }

      setError(null);
      setFormData({
        invoice_id: "",
        payment_date: new Date().toISOString().split("T")[0],
        amount: "",
        payment_mode: "",
        transaction_ref: "",
        remarks: ""
      });
      setSelectedInvoiceInfo(null);
      setEditingId(null);

      // Refresh data
      await fetchInvoiceSummary();
      await fetchPayments();

      setActiveTab("list");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save payment.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
      try {
        await apiClient.delete(`${API_PAYMENTS}/${id}`);
        setSuccess("Payment deleted successfully.");
        await fetchInvoiceSummary();
        await fetchPayments();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError("Failed to delete payment.");
      }
    }
  };

  // List Filtering & Pagination
  const filteredList = paymentsList.filter(
    (p) =>
      p.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.transaction_ref || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedList = filteredList.slice((currentPage - 1) * entriesCount, currentPage * entriesCount);

  // Report Filtering Logic
  const getFilteredReport = () => {
    return paymentsList.filter((p) => {
      let match = true;
      if (filters.fromDate && new Date(p.payment_date) < new Date(filters.fromDate)) match = false;
      if (filters.toDate && new Date(p.payment_date) > new Date(filters.toDate)) match = false;
      if (filters.customer && !p.customer_name.toLowerCase().includes(filters.customer.toLowerCase())) match = false;
      if (filters.payment_mode && p.payment_mode !== filters.payment_mode) match = false;
      return match;
    });
  };
  const reportData = getFilteredReport();

  // Styles
  const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" };
  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", color: "#495057", boxSizing: "border-box" };
  const readOnlyStyle = { ...inputStyle, backgroundColor: "#f8f9fa", fontWeight: "600", color: "#5156be" };

  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      {/* HEADER & TABS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #5156be", paddingBottom: "8px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#495057", margin: "0" }}>Payment Entry & Tracking</h2>

        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => { setActiveTab("create"); setEditingId(null); setFormData({ invoice_id: "", payment_date: new Date().toISOString().split("T")[0], amount: "", payment_mode: "", transaction_ref: "", remarks: "" }); setSelectedInvoiceInfo(null); }} style={{ padding: "8px 16px", borderRadius: "6px", fontWeight: "600", fontSize: "13px", cursor: "pointer", border: "1px solid #5156be", backgroundColor: activeTab === "create" ? "#5156be" : "#fff", color: activeTab === "create" ? "#fff" : "#5156be" }}>Add Payment</button>
          <button onClick={() => setActiveTab("list")} style={{ padding: "8px 16px", borderRadius: "6px", fontWeight: "600", fontSize: "13px", cursor: "pointer", border: "1px solid #5156be", backgroundColor: activeTab === "list" ? "#5156be" : "#fff", color: activeTab === "list" ? "#fff" : "#5156be" }}>Payment List</button>
          <button onClick={() => setActiveTab("report")} style={{ padding: "8px 16px", borderRadius: "6px", fontWeight: "600", fontSize: "13px", cursor: "pointer", border: "1px solid #5156be", backgroundColor: activeTab === "report" ? "#5156be" : "#fff", color: activeTab === "report" ? "#fff" : "#5156be" }}>Reports</button>
        </div>
      </div>

      {/* ALERTS */}
      {success && (
        <div style={{ padding: "12px 16px", backgroundColor: "#d1e7dd", color: "#0f5132", borderRadius: "6px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <FiCheckCircle /><span>{success}</span>
        </div>
      )}
      {error && (
        <div style={{ padding: "12px 16px", backgroundColor: "#f8d7da", color: "#842029", borderRadius: "6px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <FiAlertCircle /><span>{error}</span>
        </div>
      )}

      {/* TAB 1: ADD / EDIT PAYMENT */}
      {activeTab === "create" && (
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
              {/* Invoice Selection */}
              <div>
                <label style={labelStyle}>Select Invoice <span style={{ color: "red" }}>*</span></label>
                <select name="invoice_id" value={formData.invoice_id} onChange={handleInputChange} required style={inputStyle}>
                  <option value="">-- Choose Pending Invoice --</option>
                  {invoicesSummary.map((i) => (
                    <option key={i.id} value={i.id}>{i.invoice_no} - {i.customer_name} (Due: {i.outstanding_amount})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Payment Date <span style={{ color: "red" }}>*</span></label>
                <input type="date" name="payment_date" value={formData.payment_date} onChange={handleInputChange} required style={inputStyle} />
              </div>

              {/* Read Only Summaries */}
              <div>
                <label style={labelStyle}>Customer Name</label>
                <input type="text" readOnly value={selectedInvoiceInfo?.customer_name || ""} style={readOnlyStyle} placeholder="Auto-filled" />
              </div>
              <div>
                <label style={labelStyle}>Invoice Total Amount</label>
                <input type="text" readOnly value={selectedInvoiceInfo?.grand_total || ""} style={readOnlyStyle} placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>Already Paid</label>
                <input type="text" readOnly value={selectedInvoiceInfo?.paid_amount || ""} style={{ ...readOnlyStyle, color: "#2da949" }} placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>Outstanding Amount</label>
                <input type="text" readOnly value={selectedInvoiceInfo?.outstanding_amount || ""} style={{ ...readOnlyStyle, color: "#f46a6a" }} placeholder="0.00" />
              </div>

              {/* Entry Fields */}
              <div>
                <label style={labelStyle}>Amount Received <span style={{ color: "red" }}>*</span></label>
                <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleInputChange} required placeholder="Enter amount" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Payment Mode <span style={{ color: "red" }}>*</span></label>
                <select name="payment_mode" value={formData.payment_mode} onChange={handleInputChange} required style={inputStyle}>
                  <option value="">-- Select --</option>
                  <option value="Cash">Cash</option>
                  <option value="Online">Online</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Transaction Ref (Check/UPI No)</label>
                <input type="text" name="transaction_ref" value={formData.transaction_ref} onChange={handleInputChange} placeholder="Optional" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginTop: "20px" }}>
              <label style={labelStyle}>Remarks</label>
              <textarea name="remarks" rows="2" value={formData.remarks} onChange={handleInputChange} style={{ ...inputStyle, resize: "vertical" }} placeholder="Add note..."></textarea>
            </div>

            <div style={{ marginTop: "24px", display: "flex", gap: "10px" }}>
              <button type="submit" disabled={loading} style={{ backgroundColor: "#5156be", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiSave /> {editingId ? "Update Payment" : "Save Payment"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({ invoice_id: "", payment_date: new Date().toISOString().split("T")[0], amount: "", payment_mode: "", transaction_ref: "", remarks: "" });
                  setSelectedInvoiceInfo(null);
                  setEditingId(null);
                }}
                style={{ backgroundColor: "#74788d", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: PAYMENT LIST */}
      {activeTab === "list" && (
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ margin: "0", fontSize: "15px", color: "#495057" }}>Recent Payments</h3>
            <div style={{ position: "relative" }}>
              <input type="text" placeholder="Search invoice or ref..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: "8px 12px 8px 32px", borderRadius: "6px", border: "1px solid #ced4da", fontSize: "13px", outline: "none" }} />
              <FiSearch style={{ position: "absolute", left: "10px", top: "10px", color: "#74788d" }} />
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e5e7eb", color: "#495057" }}>
                <th style={{ padding: "12px" }}>Date</th>
                <th style={{ padding: "12px" }}>Invoice No</th>
                <th style={{ padding: "12px" }}>Customer</th>
                <th style={{ padding: "12px" }}>Mode</th>
                <th style={{ padding: "12px" }}>Trans. Ref</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "12px", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px" }}>{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
                  <td style={{ padding: "12px", color: "#5156be", fontWeight: "600" }}>{p.invoice_no}</td>
                  <td style={{ padding: "12px" }}>{p.customer_name}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ backgroundColor: "#e3f2fd", color: "#1e88e5", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>{p.payment_mode}</span>
                  </td>
                  <td style={{ padding: "12px" }}>{p.transaction_ref || "-"}</td>
                  <td style={{ padding: "12px", textAlign: "right", fontWeight: "600" }}>₹{parseFloat(p.amount).toFixed(2)}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <button
                      onClick={() => handleEdit(p)}
                      style={{ background: "#fff8e1", color: "#f59e0b", border: "1px solid #fde68a", padding: "6px", borderRadius: "4px", cursor: "pointer", marginRight: "6px" }}
                    >
                      <FiEdit />
                    </button>
                    <button onClick={() => handleDelete(p.id)} style={{ background: "#ffebee", color: "#f46a6a", border: "1px solid #ffcdd2", padding: "6px", borderRadius: "4px", cursor: "pointer" }}>
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedList.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: "20px", textAlign: "center", color: "#74788d" }}>No payments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: PAYMENT REPORT */}
      {activeTab === "report" && (
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px", backgroundColor: "#f8f9fa", padding: "16px", borderRadius: "6px" }}>
            <div>
              <label style={labelStyle}>From Date</label>
              <input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>To Date</label>
              <input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Customer Search</label>
              <input type="text" placeholder="Name..." value={filters.customer} onChange={(e) => setFilters({ ...filters, customer: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Mode</label>
              <select value={filters.payment_mode} onChange={(e) => setFilters({ ...filters, payment_mode: e.target.value })} style={inputStyle}>
                <option value="">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
                <option value="Bank">Bank</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: "0", fontSize: "15px", color: "#495057", display: "flex", alignItems: "center", gap: "6px" }}>
              <FiFilter /> Filtered Results
            </h3>
            <h3 style={{ margin: "0", fontSize: "15px", color: "#2da949" }}>Total Collected: ₹{reportData.reduce((acc, curr) => acc + parseFloat(curr.amount), 0).toFixed(2)}</h3>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#5156be", color: "#fff" }}>
                <th style={{ padding: "10px" }}>Date</th>
                <th style={{ padding: "10px" }}>Invoice</th>
                <th style={{ padding: "10px" }}>Customer</th>
                <th style={{ padding: "10px" }}>Mode</th>
                <th style={{ padding: "10px", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px" }}>{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td style={{ padding: "10px", fontWeight: "600" }}>{p.invoice_no}</td>
                  <td style={{ padding: "10px" }}>{p.customer_name}</td>
                  <td style={{ padding: "10px" }}>{p.payment_mode}</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: "600" }}>₹{parseFloat(p.amount).toFixed(2)}</td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: "20px", textAlign: "center" }}>No records match criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}