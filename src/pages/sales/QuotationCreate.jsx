import React, { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiSave, FiAlertCircle, FiCheckCircle, FiSearch, FiFileText, FiEye, FiDownload, FiX, FiEdit } from "react-icons/fi";
import apiClient from "../../services/apiClient";
import { QuickAddCustomer, QuickAddBank, QuickAddTerms } from "../../components/QuickAddModals";
import { generateQuotationPDF } from "../../utils/pdfGenerator";
import { getImageUrl } from "../../utils/logoUtil";

const API_QUOTATIONS = "/quotations";
const API_CUSTOMERS = "/customers";
const API_BANKS = "/banks";
const API_TERMS = "/terms";
const API_COMPANY = "/company-profile";

export default function QuotationCreate() {
  const [activeTab, setActiveTab] = useState("create");

  const [customers, setCustomers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [terms, setTerms] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);

  const [quotationsList, setQuotationsList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesCount, setEntriesCount] = useState(10);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);

  // Edit Mode States

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editQuotationId, setEditQuotationId] = useState(null);

  const [header, setHeader] = useState({
    quotation_no: "",
    quotation_date: new Date().toISOString().split("T")[0],
    customer_id: "",
    bank_id: "",
    terms_id: ""
  });

  const [items, setItems] = useState([
    { service_name: "", description: "", qty: 1, rate: "", gst_percent: 18, amount: 0 }
  ]);

  const [totals, setTotals] = useState({
    subtotal: 0, gst_amount: 0, grand_total: 0
  });

  useEffect(() => {
    fetchOptions();
    fetchNextQuotationNumber();
    fetchQuotations();
  }, []);

  const fetchOptions = async () => {
    try {
      const [resCust, resBank, resTerms, resCompany] = await Promise.all([
        apiClient.get(API_CUSTOMERS),
        apiClient.get(API_BANKS),
        apiClient.get(API_TERMS),
        apiClient.get(API_COMPANY)
      ]);
      setCustomers(resCust.data || []);
      setBanks(resBank.data || []);
      const termsData = resTerms.data || [];
      setTerms(termsData);
      
      // Auto-select terms if creating new quotation
      if (!isEditMode) {
        let selectedTermsId = "";
        const defaultTerms = termsData.filter(t => t.is_default);
        if (defaultTerms.length > 0) {
          if (defaultTerms.length > 1) {
            console.warn("Multiple default terms found. Selecting the latest one.");
          }
          selectedTermsId = defaultTerms[0].id;
        } else if (termsData.length > 0) {
          selectedTermsId = termsData[0].id;
        }
        
        setHeader(prev => ({
          ...prev,
          terms_id: prev.terms_id || String(selectedTermsId)
        }));
      }

      if (resCompany.data && resCompany.data.profile) {
        setCompanyInfo(resCompany.data.profile);
      }
    } catch (err) {
      console.error("Error loading dropdown choices:", err);
    }
  };

  const fetchNextQuotationNumber = async () => {
    if (isEditMode) return;
    try {
      const response = await apiClient.get(`${API_QUOTATIONS}/next-number`);
      setHeader(prev => ({
        ...prev, quotation_no: response.data.nextNumber || "QTN-0001"
      }));
    } catch (err) {
      console.error("Error fetching next quotation number:", err);
    }
  };

  const fetchQuotations = async () => {
    setListLoading(true);
    try {
      const response = await apiClient.get(API_QUOTATIONS);
      setQuotationsList(response.data || []);
    } catch (err) {
      console.error("Error loading quotations:", err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    let subtotal = 0;
    let totalGst = 0;

    const updatedItems = items.map(item => {
      const rateVal = parseFloat(item.rate) || 0;
      const qtyVal = parseFloat(item.qty) || 1;
      const gstPercentVal = parseFloat(item.gst_percent) || 0;

      const baseAmount = qtyVal * rateVal;
      const gstVal = baseAmount * (gstPercentVal / 100);
      const rowTotal = baseAmount + gstVal;

      subtotal += baseAmount;
      totalGst += gstVal;

      return {
        ...item, amount: parseFloat(rowTotal.toFixed(2))
      };
    });

    setTotals({
      subtotal: parseFloat(subtotal.toFixed(2)),
      gst_amount: parseFloat(totalGst.toFixed(2)),
      grand_total: parseFloat((subtotal + totalGst).toFixed(2))
    });
  }, [items]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeader(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };

      if (field === "rate" || field === "qty" || field === "gst_percent") {
        const rateVal = parseFloat(field === "rate" ? value : item.rate) || 0;
        const qtyVal = parseFloat(field === "qty" ? value : item.qty) || 1;
        const gstPercentVal = parseFloat(field === "gst_percent" ? value : item.gst_percent) || 0;

        const baseAmount = qtyVal * rateVal;
        const gstVal = baseAmount * (gstPercentVal / 100);
        updated.amount = parseFloat((baseAmount + gstVal).toFixed(2));
      }
      return updated;
    }));
  };

  const addRow = () => setItems(prev => [...prev, { service_name: "", description: "", qty: 1, rate: "", gst_percent: 18, amount: 0 }]);

  const removeRow = (index) => {
    if (items.length === 1) return alert("At least one service item row is required.");
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = async () => {
    setIsEditMode(false);
    setEditQuotationId(null);
    setHeader({
      quotation_no: "",
      quotation_date: new Date().toISOString().split("T")[0],
      customer_id: "",
      bank_id: "",
      terms_id: ""
    });
    setItems([{ service_name: "", description: "", qty: 1, rate: "", gst_percent: 18, amount: 0 }]);
    await fetchNextQuotationNumber();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!header.customer_id) {
      setError("Please select a customer.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].service_name.trim()) return setError(`Service name is required on row ${i + 1}.`);
      if (!items[i].rate || parseFloat(items[i].rate) <= 0) return setError(`Please enter a valid rate/amount on row ${i + 1}.`);
      if (!items[i].qty || parseFloat(items[i].qty) <= 0) return setError(`Please enter a valid quantity on row ${i + 1}.`);
    }

    const payload = {
      ...header,
      subtotal: totals.subtotal,
      gst_amount: totals.gst_amount,
      grand_total: totals.grand_total,
      items: items.map(item => ({
        id: item.id || undefined,
        service_name: item.service_name.trim(),
        description: item.description.trim(),
        qty: parseFloat(item.qty) || 1,
        rate: parseFloat(item.rate) || 0,
        gst_percent: parseFloat(item.gst_percent) || 0,
        amount: item.amount
      }))
    };

    setLoading(true);
    try {
      let response;
      if (isEditMode) {
        response = await apiClient.put(`${API_QUOTATIONS}/${editQuotationId}`, payload);
      } else {
        response = await apiClient.post(API_QUOTATIONS, payload);
      }

      if (response.data.success) {
        setSuccess(isEditMode ? "Quotation updated successfully" : "Quotation saved successfully");
        setError(null);
        await resetForm();
        await fetchQuotations();
        setActiveTab("list");
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.message || "Failed to process quotation.");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to process quotation.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (row) => {
    try {
      const res = await apiClient.get(`${API_QUOTATIONS}/${row.id}`);
      if (res.data) {
        const qtnHeader = res.data.header || res.data.quotation || row;
        const qtnItems = res.data.items || [];

        setHeader({
          quotation_no: qtnHeader.quotation_no,
          quotation_date: new Date(qtnHeader.quotation_date).toISOString().split("T")[0],
          customer_id: qtnHeader.customer_id || "",
          bank_id: qtnHeader.bank_id || "",
          terms_id: qtnHeader.terms_id || ""
        });

        if (qtnItems.length > 0) {
          setItems(qtnItems.map(item => ({
            id: item.id,
            service_name: item.service_name,
            description: item.description || "",
            rate: parseFloat(item.rate) || parseFloat(item.amount) || 0,
            qty: parseFloat(item.qty) || 1,
            gst_percent: parseFloat(item.gst_percent) || 0,
            amount: parseFloat(item.total) || 0
          })));
        } else {
          setItems([{ service_name: "", description: "", rate: "", qty: 1, gst_percent: 18, amount: 0 }]);
        }

        setIsEditMode(true);
        setEditQuotationId(row.id);
        setActiveTab("create");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Error fetching quotation for edit:", err);
      alert("Failed to load quotation details for editing.");
    }
  };

  const handleDeleteClick = async (id, quotationNo) => {
    if (window.confirm(`Are you sure you want to delete quotation "${quotationNo}"?`)) {
      try {
        const response = await apiClient.delete(`${API_QUOTATIONS}/${id}`);
        if (response.data.success) {
          setSuccess("Quotation deleted successfully");
          setError(null);
          await fetchQuotations();
          if (!isEditMode) await fetchNextQuotationNumber();
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(response.data.message || "Failed to delete quotation.");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to delete quotation.");
      }
    }
  };

  const handleViewClick = async (row) => {
    const cust = customers.find(c => c.id === row.customer_id) || {};
    const bank = banks.find(b => b.id === row.bank_id) || {};
    const term = terms.find(t => t.id === row.terms_id) || {};

    try {
      const res = await apiClient.get(`${API_QUOTATIONS}/${row.id}`);
      if (res.data && res.data.items) {
        setViewDoc({
          header: row,
          items: res.data.items,
          customer: cust,
          bank,
          terms: term,
          company: res.data.companyInfo || companyInfo || {}
        });
      } else {
        alert("Failed to load quotation items.");
      }
    } catch (err) {
      alert("Failed to fetch quotation details: " + err.message);
    }
  };

  const handleDownloadPDFClick = async (row) => {
    const cust = customers.find(c => c.id === row.customer_id) || {};
    const bank = banks.find(b => b.id === row.bank_id) || {};
    const term = terms.find(t => t.id === row.terms_id) || {};

    try {
      const res = await apiClient.get(`${API_QUOTATIONS}/${row.id}`);
      if (res.data && res.data.items) {
        await generateQuotationPDF({
          header: row,
          items: res.data.items,
          customer: cust,
          bank,
          terms: term,
          companyInfo: res.data.companyInfo || companyInfo || {}
        });
      } else {
        alert("Failed to load quotation items for printing.");
      }
    } catch (err) {
      alert("Failed to fetch quotation details: " + err.message);
    }
  };

  const filteredQuotations = quotationsList.filter(q => {
    const query = searchQuery.toLowerCase();
    return (q.quotation_no || "").toLowerCase().includes(query) || (q.customer_name || "").toLowerCase().includes(query);
  });

  const totalEntries = filteredQuotations.length;
  const totalPages = Math.ceil(totalEntries / entriesCount) || 1;
  const startIndex = (currentPage - 1) * entriesCount;
  const endIndex = Math.min(startIndex + entriesCount, totalEntries);
  const paginatedQuotations = filteredQuotations.slice(startIndex, endIndex);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, entriesCount]);

  const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" };
  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", color: "#495057", backgroundColor: "#fff", boxSizing: "border-box" };

  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #5156be", paddingBottom: "8px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#495057", margin: "0" }}>Manage Service Quotations</h2>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => { setActiveTab("create"); if (!isEditMode) fetchNextQuotationNumber(); }}
            style={{
              padding: "8px 16px", borderRadius: "6px", fontWeight: "600", fontSize: "13px", cursor: "pointer", border: "1px solid #5156be",
              backgroundColor: activeTab === "create" ? "#5156be" : "#fff", color: activeTab === "create" ? "#fff" : "#5156be"
            }}
          >
            {isEditMode ? "Edit Quotation" : "Create Quotation"}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("list"); fetchQuotations(); resetForm(); }}
            style={{
              padding: "8px 16px", borderRadius: "6px", fontWeight: "600", fontSize: "13px", cursor: "pointer", border: "1px solid #5156be",
              backgroundColor: activeTab === "list" ? "#5156be" : "#fff", color: activeTab === "list" ? "#fff" : "#5156be"
            }}
          >
            Quotation List
          </button>
        </div>
      </div>

      {/* ALERTS SECTION */}
      {success && (
        <div style={{ padding: "12px 16px", backgroundColor: "#d1e7dd", color: "#0f5132", border: "1px solid #badbcc", borderRadius: "6px", marginBottom: "20px", fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><FiCheckCircle size={16} /><span>{success}</span></div>
          <button onClick={() => setSuccess(null)} style={{ background: "none", border: "none", color: "#0f5132", cursor: "pointer", fontSize: "18px", fontWeight: "bold" }}>&times;</button>
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", backgroundColor: "#f8d7da", color: "#842029", border: "1px solid #f5c2c7", borderRadius: "6px", marginBottom: "20px", fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><FiAlertCircle size={16} /><span>{error}</span></div>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#842029", cursor: "pointer", fontSize: "18px", fontWeight: "bold" }}>&times;</button>
        </div>
      )}

      {/* TAB 1: CREATE/EDIT QUOTATION */}
      {activeTab === "create" && (

        <>
          <QuickAddCustomer isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} onSuccess={async (id) => { await fetchOptions(); setHeader(prev => ({ ...prev, customer_id: String(id) })); setSuccess("Customer added successfully!"); setTimeout(() => setSuccess(null), 3000); }} />
          <QuickAddBank isOpen={showBankModal} onClose={() => setShowBankModal(false)} onSuccess={async (id) => { await fetchOptions(); setHeader(prev => ({ ...prev, bank_id: String(id) })); setSuccess("Bank added successfully!"); setTimeout(() => setSuccess(null), 3000); }} />
          <QuickAddTerms isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} onSuccess={async (id) => { await fetchOptions(); setHeader(prev => ({ ...prev, terms_id: String(id) })); setSuccess("Terms added successfully!"); setTimeout(() => setSuccess(null), 3000); }} />

          <form onSubmit={handleSubmit}>

            {/* HEADER DETAILS CARD */}
            <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", padding: "24px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "20px" }}>
                <h3 style={{ margin: "0", fontSize: "14px", color: "#5156be", fontWeight: "600" }}>
                  {isEditMode ? "Update Quotation Details" : "Quotation Details"}
                </h3>
                {isEditMode && (
                  <span style={{ backgroundColor: "#fff3cd", color: "#d97706", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>
                    Editing Mode Active
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
                <div>
                  <label style={labelStyle}>Quotation No</label>
                  <input type="text" name="quotation_no" value={header.quotation_no} readOnly style={{ ...inputStyle, backgroundColor: "#f8f9fa", fontWeight: "600", color: "#5156be" }} />
                </div>

                <div>
                  <label style={labelStyle}>Quotation Date <span style={{ color: "#f46a6a" }}>*</span></label>
                  <input type="date" name="quotation_date" value={header.quotation_date} onChange={handleHeaderChange} required style={inputStyle} />
                </div>

                <div>
                  <label style={{ ...labelStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>Customer <span style={{ color: "#f46a6a" }}>*</span> <button type="button" onClick={() => setShowCustomerModal(true)} style={{ background: "none", border: "none", color: "#5156be", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: 0 }}>[ + Add Customer ]</button></label>
                  <select name="customer_id" value={header.customer_id} onChange={handleHeaderChange} required style={inputStyle}>
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.customer_name} ({c.contact_person || "No Contact Person"})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ ...labelStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>Select Bank <button type="button" onClick={() => setShowBankModal(true)} style={{ background: "none", border: "none", color: "#5156be", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: 0 }}>[ + Add Bank ]</button></label>
                  <select name="bank_id" value={header.bank_id} onChange={handleHeaderChange} style={inputStyle}>
                    <option value="">-- Select Bank --</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ ...labelStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>Terms & Conditions <button type="button" onClick={() => setShowTermsModal(true)} style={{ background: "none", border: "none", color: "#5156be", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: 0 }}>[ + Add Terms ]</button></label>
                  <select name="terms_id" value={header.terms_id} onChange={handleHeaderChange} style={inputStyle}>
                    <option value="">-- Select Terms --</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SERVICE ITEMS GRID CARD */}
            <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", padding: "24px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" }}>
                <h3 style={{ margin: "0", fontSize: "14px", color: "#5156be", fontWeight: "600" }}>Service Items Grid</h3>
                <button type="button" onClick={addRow} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#2da949", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                  <FiPlus /> Add Item
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px", minWidth: "850px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8f9fa", color: "#495057", borderBottom: "2px solid #e5e7eb", height: "40px" }}>
                      <th style={{ padding: "10px", width: "25%" }}>Service Name *</th>
                      <th style={{ padding: "10px", width: "28%" }}>Description</th>
                      <th style={{ padding: "10px", width: "12%" }}>Rate *</th>
                      <th style={{ padding: "10px", width: "8%" }}>Qty *</th>
                      <th style={{ padding: "10px", width: "10%" }}>GST %</th>
                      <th style={{ padding: "10px", width: "12%" }}>Total</th>
                      <th style={{ padding: "10px", width: "5%", textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "10px" }}>
                          <input type="text" value={row.service_name} onChange={(e) => handleItemChange(index, "service_name", e.target.value)} placeholder="e.g. Website Development" required style={inputStyle} />
                        </td>
                        <td style={{ padding: "10px" }}>
                          <textarea value={row.description} onChange={(e) => handleItemChange(index, "description", e.target.value)} rows="2" placeholder="Detail specifications..." style={{ ...inputStyle, padding: "8px 10px", resize: "vertical", height: "48px", fontFamily: "inherit" }} />
                        </td>
                        <td style={{ padding: "10px" }}>
                          <input type="number" step="0.01" value={row.rate} onChange={(e) => handleItemChange(index, "rate", e.target.value)} required placeholder="0.00" style={{ ...inputStyle, padding: "8px 10px", textAlign: "right" }} />
                        </td>
                        <td style={{ padding: "10px" }}>
                          <input type="number" step="0.01" value={row.qty} onChange={(e) => handleItemChange(index, "qty", e.target.value)} required placeholder="1" style={{ ...inputStyle, padding: "8px 10px", textAlign: "center" }} />
                        </td>
                        <td style={{ padding: "10px" }}>
                          <input type="number" step="0.01" value={row.gst_percent} onChange={(e) => handleItemChange(index, "gst_percent", e.target.value === "" ? "" : Number(e.target.value))} placeholder="0.00" style={{ ...inputStyle, padding: "8px 10px", textAlign: "right" }} />
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: "#495057", verticalAlign: "middle" }}>
                          {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "10px", textAlign: "center", verticalAlign: "middle" }}>
                          <button type="button" onClick={() => removeRow(index)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", backgroundColor: "#ffebee", color: "#f46a6a", border: "1px solid #ffcdd2", width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer" }}>
                            <FiTrash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BOTTOM SECTION: NOTES & TOTALS GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "24px" }}>

              {/* Notes Card Removed */}

              {/* Totals Panel Card */}
              <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#495057", fontWeight: "600", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" }}>Summary</h4>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px", color: "#74788d" }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: "600", color: "#495057" }}>{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px", color: "#74788d" }}>
                  <span>GST Tax Amount:</span>
                  <span style={{ fontWeight: "600", color: "#495057" }}>{totals.gst_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px double #e5e7eb", paddingTop: "12px", fontSize: "16px", color: "#5156be", fontWeight: "700" }}>
                  <span>Grand Total:</span>
                  <span>{totals.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

            </div>

            {/* BOTTOM ACTION PANEL */}
            <div style={{ display: "flex", gap: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
              <button type="submit" disabled={loading} style={{ backgroundColor: "#5156be", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiSave size={14} />
                {isEditMode ? "Update Quotation" : "Save Quotation"}
              </button>
              <button type="button" onClick={resetForm} style={{ backgroundColor: "#74788d", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}>
                {isEditMode ? "Cancel Edit" : "Reset"}
              </button>
            </div>

          </form>
        </>
      )}

      {/* TAB 2: QUOTATION LIST */}
      {activeTab === "list" && (
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "15px", color: "#495057", fontWeight: "600", borderBottom: "1px solid #e5e7eb", paddingBottom: "10px" }}>
            Quotations List
          </h3>

          {/* SEARCH & FILTERS BAR */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#495057", fontSize: "13px" }}>
              <span>Show</span>
              <select value={entriesCount} onChange={(e) => setEntriesCount(Number(e.target.value))} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ced4da", outline: "none", backgroundColor: "#fff" }}>
                <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#495057", fontSize: "13px" }}>Search:</span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input type="text" placeholder="No or Customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "200px", padding: "8px 12px 8px 32px", borderRadius: "6px", border: "1px solid #ced4da", outline: "none", fontSize: "13px" }} />
                <FiSearch size={14} style={{ position: "absolute", left: "10px", color: "#74788d" }} />
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa", color: "#495057", borderBottom: "2px solid #e5e7eb", height: "45px" }}>
                  <th style={{ padding: "12px 14px", fontWeight: "600" }}>Quotation No</th>
                  <th style={{ padding: "12px 14px", fontWeight: "600" }}>Date</th>
                  <th style={{ padding: "12px 14px", fontWeight: "600" }}>Customer Name</th>
                  <th style={{ padding: "12px 14px", fontWeight: "600", textAlign: "right" }}>Grand Total</th>
                  <th style={{ padding: "12px 14px", fontWeight: "600", textAlign: "center", width: "160px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr><td colSpan="5" style={{ padding: "30px", textAlign: "center", color: "#74788d" }}>Loading quotations...</td></tr>
                ) : paginatedQuotations.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: "30px", textAlign: "center", color: "#74788d" }}>No quotations found.</td></tr>
                ) : (
                  paginatedQuotations.map((row, index) => (
                    <tr key={row.id || index} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: index % 2 === 0 ? "#fff" : "#fbfbfc" }}>
                      <td style={{ padding: "12px 14px", color: "#5156be", fontWeight: "600" }}>{row.quotation_no}</td>
                      <td style={{ padding: "12px 14px", color: "#495057" }}>{new Date(row.quotation_date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                      <td style={{ padding: "12px 14px", color: "#212529" }}>{row.customer_name}</td>
                      <td style={{ padding: "12px 14px", color: "#495057", fontWeight: "600", textAlign: "right" }}>
                        {parseFloat(row.grand_total).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                      </td>
                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button
                            onClick={() => handleEditClick(row)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff8e1", color: "#f57f17", border: "1px solid #ffecb3", width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer" }}
                            title="Edit Quotation"
                          >
                            <FiEdit size={12} />
                          </button>
                          <button
                            onClick={() => handleViewClick(row)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#e8f5e9", color: "#2da949", border: "1px solid #c8e6c9", width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer" }}
                            title="View Details"
                          >
                            <FiEye size={12} />
                          </button>
                          <button
                            onClick={() => handleDownloadPDFClick(row)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#e3f2fd", color: "#1e88e5", border: "1px solid #bbdefb", width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer" }}
                            title="Download PDF"
                          >
                            <FiDownload size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(row.id, row.quotation_no)}
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

          {/* PAGINATION */}
          {totalEntries > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ color: "#74788d", fontSize: "13px" }}>
                Showing {startIndex + 1} to {endIndex} of {totalEntries} entries
              </div>

              <div style={{ display: "flex", gap: "4px" }}>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} style={{ padding: "6px 12px", border: "1px solid #ced4da", backgroundColor: "#fff", borderRadius: "4px", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1, fontSize: "13px" }}>Previous</button>
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i + 1} onClick={() => setCurrentPage(i + 1)} style={{ padding: "6px 12px", border: "1px solid #ced4da", backgroundColor: currentPage === i + 1 ? "#5156be" : "#fff", color: currentPage === i + 1 ? "#fff" : "#495057", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: currentPage === i + 1 ? "600" : "400" }}>{i + 1}</button>
                ))}
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} style={{ padding: "6px 12px", border: "1px solid #ced4da", backgroundColor: "#fff", borderRadius: "4px", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1, fontSize: "13px" }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ON-SCREEN MODAL PREVIEW */}
      {viewDoc && (
        <div style={{ position: "fixed", top: "0", left: "0", width: "100vw", height: "100vh", backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "9999", fontFamily: "inherit" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "8px", width: "90%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ margin: "0", fontSize: "16px", color: "#5156be", fontWeight: "600" }}>Quotation Preview - {viewDoc.header.quotation_no}</h3>
              <button onClick={() => setViewDoc(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#74788d", display: "flex", alignItems: "center" }}><FiX size={20} /></button>
            </div>

            <div style={{ padding: "24px", color: "#495057", fontSize: "13px", lineHeight: "1.5" }}>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #5156be", paddingBottom: "12px", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#5156be", margin: "0 0 4px 0" }}>QUOTATION</h2>
                  <div><strong>Number:</strong> {viewDoc.header.quotation_no}</div>
                  <div><strong>Date:</strong> {new Date(viewDoc.header.quotation_date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  {(() => {
                    const activeComp = viewDoc.company || companyInfo || {};
                    const logoUrl = activeComp.logo ? getImageUrl(activeComp.logo) : null;
                    return logoUrl && (
                      <img
                        src={logoUrl}
                        alt="Company Logo"
                        style={{
                          maxHeight: "80px",
                          maxWidth: "180px",
                          objectFit: "contain"
                        }}
                      />
                    );
                  })()}
                  <h4 style={{ margin: "0 0 2px 0", fontWeight: "700" }}>{(viewDoc.company || companyInfo)?.company_name || "COMPANY NAME"}</h4>
                  <div style={{ fontSize: "11px", color: "#74788d" }}>
                    <div>{(viewDoc.company || companyInfo)?.address}</div>
                    <div>{(viewDoc.company || companyInfo)?.city}, {(viewDoc.company || companyInfo)?.state} - {(viewDoc.company || companyInfo)?.pincode}</div>
                    {(viewDoc.company || companyInfo)?.gst_number && <div>GSTIN: {(viewDoc.company || companyInfo).gst_number}</div>}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px", backgroundColor: "#f9fafb" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#5156be", textTransform: "uppercase", marginBottom: "6px" }}>Quoted To</div>
                  <div style={{ fontWeight: "700", color: "#212529" }}>{viewDoc.customer.customer_name}</div>
                  <div style={{ fontSize: "12px", marginTop: "4px", whiteSpace: "pre-line" }}>{viewDoc.customer.billing_address}</div>
                  <div style={{ fontSize: "11px", color: "#74788d", marginTop: "6px" }}>
                    {viewDoc.customer.mobile && <div>Phone: {viewDoc.customer.mobile}</div>}
                    {viewDoc.customer.email && <div>Email: {viewDoc.customer.email}</div>}
                  </div>
                </div>

                <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px", backgroundColor: "#f9fafb" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#5156be", textTransform: "uppercase", marginBottom: "6px" }}>Summary</div>
                  <table style={{ width: "100%", fontSize: "12px" }}>
                    <tbody>
                      <tr><td style={{ padding: "3px 0", color: "#74788d" }}>Subtotal:</td><td style={{ padding: "3px 0", textAlign: "right", fontWeight: "600" }}>{parseFloat(viewDoc.header.subtotal).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td></tr>
                      <tr><td style={{ padding: "3px 0", color: "#74788d" }}>GST Tax Total:</td><td style={{ padding: "3px 0", textAlign: "right", fontWeight: "600" }}>{parseFloat(viewDoc.header.gst_amount).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td></tr>
                      <tr style={{ borderTop: "1px solid #dee2e6" }}><td style={{ padding: "6px 0 0 0", fontWeight: "700", color: "#5156be" }}>Grand Total:</td><td style={{ padding: "6px 0 0 0", textAlign: "right", fontWeight: "700", color: "#5156be", fontSize: "13px" }}>{parseFloat(viewDoc.header.grand_total).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "20px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#5156be", color: "#fff", textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", width: "8%", textAlign: "center" }}>Sr.No</th><th style={{ padding: "8px 10px", width: "25%" }}>Service Name</th><th style={{ padding: "8px 10px", width: "25%" }}>Description</th><th style={{ padding: "8px 10px", width: "12%", textAlign: "right" }}>Rate</th><th style={{ padding: "8px 10px", width: "8%", textAlign: "center" }}>Qty</th><th style={{ padding: "8px 10px", width: "10%", textAlign: "center" }}>GST %</th><th style={{ padding: "8px 10px", width: "12%", textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewDoc.items.map((item, idx) => {
                    const itemQty = parseFloat(item.qty) || 1;
                    const itemRate = parseFloat(item.rate) || parseFloat(item.amount) || 0;
                    const itemTotal = parseFloat(item.total) || parseFloat(item.amount) || 0;
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #dee2e6" }}>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{idx + 1}</td><td style={{ padding: "8px 10px", fontWeight: "600" }}>{item.service_name}</td><td style={{ padding: "8px 10px", color: "#74788d", whiteSpace: "pre-line" }}>{item.description || "-"}</td><td style={{ padding: "8px 10px", textAlign: "right" }}>{itemRate.toFixed(2)}</td><td style={{ padding: "8px 10px", textAlign: "center" }}>{itemQty}</td><td style={{ padding: "8px 10px", textAlign: "center" }}>{parseFloat(item.gst_percent)}%</td><td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600" }}>{itemTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div><h5 style={{ margin: "0 0 6px 0", color: "#5156be", fontWeight: "700", fontSize: "12px" }}>TERMS & CONDITIONS</h5><div style={{ fontSize: "11px", color: "#74788d", whiteSpace: "pre-line" }}>{viewDoc.terms.description || "Standard terms apply."}</div></div>
                <div><h5 style={{ margin: "0 0 6px 0", color: "#5156be", fontWeight: "700", fontSize: "12px" }}>BANK DETAILS</h5>{viewDoc.bank.bank_name ? (<div style={{ fontSize: "11px", color: "#74788d" }}><div>Bank: {viewDoc.bank.bank_name}</div><div>Holder: {viewDoc.bank.account_holder_name}</div><div>A/C No: {viewDoc.bank.account_number}</div><div>IFSC: {viewDoc.bank.ifsc_code}</div></div>) : (<div style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>No bank details setup.</div>)}</div>
              </div>

            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
              <button onClick={() => handleDownloadPDFClick(viewDoc.header)} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#5156be", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}><FiDownload size={14} /> Download PDF</button>
              <button onClick={() => setViewDoc(null)} style={{ backgroundColor: "#fff", color: "#495057", border: "1px solid #ced4da", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>Close</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}