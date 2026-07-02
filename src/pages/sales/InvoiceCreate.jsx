import React, { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiSave, FiAlertCircle, FiCheckCircle, FiSearch, FiEye, FiDownload, FiX, FiEdit } from "react-icons/fi";
import apiClient from "../../services/apiClient";
import { QuickAddCustomer, QuickAddBank, QuickAddTerms } from "../../components/QuickAddModals";
import { generateInvoicePDF } from "../../utils/pdfGenerator";
import { getImageUrl } from "../../utils/logoUtil";

const API_INVOICES = "/invoices";
const API_CUSTOMERS = "/customers";
const API_BANKS = "/banks";
const API_TERMS = "/terms";
const API_COMPANY = "/company-profile";
const API_PAYMENTS_SUMMARY = "/payments/summary";

export default function InvoiceCreate() {
  const [activeTab, setActiveTab] = useState("create");
  const [customers, setCustomers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [terms, setTerms] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);

  const [invoicesList, setInvoicesList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesCount, setEntriesCount] = useState(10);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);


  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState(null);

  const [header, setHeader] = useState({
    invoice_no: "",
    invoice_date: new Date().toISOString().split("T")[0],
    customer_id: "",
    bank_id: "",
    terms_id: ""
  });

  const [items, setItems] = useState([
    { service_name: "", description: "", rate: "", qty: 1, gst_percent: 18, amount: 0 }
  ]);

  const [totals, setTotals] = useState({ subtotal: 0, gst_amount: 0, grand_total: 0 });

  useEffect(() => {
    fetchOptions();
    fetchNextInvoiceNumber();
    fetchInvoices();
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
      
      // Auto-select terms if creating new invoice
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

      if (resCompany.data && resCompany.data.profile) setCompanyInfo(resCompany.data.profile);
    } catch (err) {
      setError("Failed to load options for customers, banks, terms or company profile.");
    }
  };

  const fetchNextInvoiceNumber = async () => {
    if (isEditMode) return;
    try {
      const response = await apiClient.get(`${API_INVOICES}/next-number`);
      setHeader(prev => ({ ...prev, invoice_no: response.data.nextNumber || "INV-0001" }));
    } catch (err) { }
  };

  const fetchInvoices = async () => {
    setListLoading(true);
    try {
      const response = await apiClient.get(API_PAYMENTS_SUMMARY);
      setInvoicesList(response.data || []);
    } catch (err) {
      try {
        const fallbackRes = await apiClient.get(API_INVOICES);
        setInvoicesList(fallbackRes.data || []);
      } catch (fallbackErr) { }
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    let subtotal = 0, totalGst = 0;
    const updatedItems = items.map(item => {
      const rateVal = parseFloat(item.rate) || 0;
      const qtyVal = parseFloat(item.qty) || 1;
      const gstPercentVal = parseFloat(item.gst_percent) || 0;
      const baseAmount = rateVal * qtyVal;
      const gstVal = baseAmount * (gstPercentVal / 100);
      const rowTotal = baseAmount + gstVal;
      subtotal += baseAmount;
      totalGst += gstVal;
      return { ...item, amount: parseFloat(rowTotal.toFixed(2)) };
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
      if (["rate", "qty", "gst_percent"].includes(field)) {
        const rateVal = parseFloat(field === "rate" ? value : item.rate) || 0;
        const qtyVal = parseFloat(field === "qty" ? value : item.qty) || 1;
        const gstPercentVal = parseFloat(field === "gst_percent" ? value : item.gst_percent) || 0;
        const baseAmount = rateVal * qtyVal;
        const gstVal = baseAmount * (gstPercentVal / 100);
        updated.amount = parseFloat((baseAmount + gstVal).toFixed(2));
      }
      return updated;
    }));
  };

  const addRow = () => setItems(prev => [...prev, { service_name: "", description: "", rate: "", qty: 1, gst_percent: 18, amount: 0 }]);
  const removeRow = (index) => {
    if (items.length === 1) return alert("At least one service item row is required.");
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = async () => {
    setIsEditMode(false);
    setEditInvoiceId(null);
    setHeader({ invoice_no: "", invoice_date: new Date().toISOString().split("T")[0], customer_id: "", bank_id: "", terms_id: "" });
    setItems([{ service_name: "", description: "", rate: "", qty: 1, gst_percent: 18, amount: 0 }]);
    await fetchNextInvoiceNumber();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!header.customer_id) return setError("Please select a customer.");
    for (let i = 0; i < items.length; i++) {
      if (!items[i].service_name.trim()) return setError(`Service name is required on row ${i + 1}.`);
      if (!items[i].rate || parseFloat(items[i].rate) <= 0) return setError(`Please enter a valid rate on row ${i + 1}.`);
    }

    const payload = {
      ...header, subtotal: totals.subtotal, gst_amount: totals.gst_amount, grand_total: totals.grand_total,
      items: items.map(item => ({
        id: item.id, service_name: item.service_name.trim(), description: item.description.trim(),
        qty: parseFloat(item.qty) || 1, rate: parseFloat(item.rate) || 0,
        amount: (parseFloat(item.qty || 1) * parseFloat(item.rate || 0)),
        gst_percent: parseFloat(item.gst_percent) || 0, total: item.amount
      }))
    };

    setLoading(true);
    try {
      let response = isEditMode ? await apiClient.put(`${API_INVOICES}/${editInvoiceId}`, payload) : await apiClient.post(API_INVOICES, payload);
      if (response.data.success) {
        setSuccess(isEditMode ? "Invoice updated successfully" : "Invoice saved successfully");
        setError(null);
        await resetForm();
        await fetchInvoices();
        setActiveTab("list");
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.message || "Failed to process invoice.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save invoice details.");
    } finally { setLoading(false); }
  };

  const handleEditClick = async (row) => {
    try {
      const res = await apiClient.get(`${API_INVOICES}/${row.id}`);
      if (res.data) {
        const invHeader = res.data.header || row;
        const invItems = res.data.items || [];
        setHeader({
          invoice_no: invHeader.invoice_no,
          invoice_date: new Date(invHeader.invoice_date).toISOString().split("T")[0],
          customer_id: invHeader.customer_id || "",
          bank_id: invHeader.bank_id || "",
          terms_id: invHeader.terms_id || ""
        });
        if (invItems.length > 0) {
          setItems(invItems.map(item => ({
            id: item.id, service_name: item.service_name, description: item.description || "",
            rate: parseFloat(item.rate) || parseFloat(item.amount) || 0, qty: parseFloat(item.qty) || 1,
            gst_percent: parseFloat(item.gst_percent) || 0, amount: parseFloat(item.total) || 0
          })));
        }
        setIsEditMode(true);
        setEditInvoiceId(row.id);
        setActiveTab("create");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      alert("Failed to load invoice details for editing.");
    }
  };

  const handleDeleteClick = async (id, invoiceNo) => {
    if (window.confirm(`Are you sure you want to delete invoice "${invoiceNo}"?`)) {
      try {
        const response = await apiClient.delete(`${API_INVOICES}/${id}`);
        if (response.data.success) {
          setSuccess("Invoice deleted successfully");
          await fetchInvoices();
          if (!isEditMode) await fetchNextInvoiceNumber();
          setTimeout(() => setSuccess(null), 3000);
        }
      } catch (err) {
        setError("Failed to delete invoice.");
      }
    }
  };

  const handleViewClick = async (row) => {
    try {
      const res = await apiClient.get(`${API_INVOICES}/${row.id}`);
      if (res.data && res.data.items) {
        const invHeader = res.data.header;
        const cust = customers.find(c => String(c.id) === String(invHeader.customer_id)) || {};
        const bank = banks.find(b => String(b.id) === String(invHeader.bank_id)) || {};
        const term = terms.find(t => String(t.id) === String(invHeader.terms_id)) || {};

        // Pass payments history and companyInfo as well
        setViewDoc({
          header: invHeader,
          items: res.data.items,
          customer: cust,
          bank: bank,
          terms: term,
          company: res.data.companyInfo || companyInfo || {},
          payments: res.data.payments || []
        });
      } else alert("Failed to load invoice items.");
    } catch (err) { alert("Failed to fetch invoice details."); }
  };

  const handleDownloadPDFClick = async (row) => {
    try {
      const res = await apiClient.get(`${API_INVOICES}/${row.id}`);
      if (res.data && res.data.items) {
        const invHeader = res.data.header;
        const cust = customers.find(c => String(c.id) === String(invHeader.customer_id)) || {};
        const bank = banks.find(b => String(b.id) === String(invHeader.bank_id)) || {};
        const term = terms.find(t => String(t.id) === String(invHeader.terms_id)) || {};

        // Pass payments history and issuing company profile to PDF
        await generateInvoicePDF({
          header: invHeader,
          items: res.data.items,
          customer: cust,
          bank: bank,
          terms: term,
          companyInfo: res.data.companyInfo || companyInfo || {},
          payments: res.data.payments || []
        });
      }
    } catch (err) { alert("Failed to fetch invoice details."); }
  };

  const filteredInvoices = invoicesList.filter(i => {
    const query = searchQuery.toLowerCase();
    return (i.invoice_no || "").toLowerCase().includes(query) || (i.customer_name || "").toLowerCase().includes(query);
  });

  const totalEntries = filteredInvoices.length;
  const totalPages = Math.ceil(totalEntries / entriesCount) || 1;
  const startIndex = (currentPage - 1) * entriesCount;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + entriesCount);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, entriesCount]);

  const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" };
  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", backgroundColor: "#fff", boxSizing: "border-box" };

  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #5156be", paddingBottom: "8px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#495057", margin: "0" }}>Manage Service Invoices</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => { setActiveTab("create"); if (!isEditMode) fetchNextInvoiceNumber(); }} style={{ padding: "8px 16px", borderRadius: "6px", fontWeight: "600", fontSize: "13px", cursor: "pointer", border: "1px solid #5156be", backgroundColor: activeTab === "create" ? "#5156be" : "#fff", color: activeTab === "create" ? "#fff" : "#5156be" }}>
            {isEditMode ? "Edit Invoice" : "Create Invoice"}
          </button>
          <button onClick={() => { setActiveTab("list"); fetchInvoices(); resetForm(); }} style={{ padding: "8px 16px", borderRadius: "6px", fontWeight: "600", fontSize: "13px", cursor: "pointer", border: "1px solid #5156be", backgroundColor: activeTab === "list" ? "#5156be" : "#fff", color: activeTab === "list" ? "#fff" : "#5156be" }}>
            Invoice List
          </button>
        </div>
      </div>

      {success && <div style={{ padding: "12px 16px", backgroundColor: "#d1e7dd", color: "#0f5132", borderRadius: "6px", marginBottom: "20px", display: "flex", justifyContent: "space-between" }}><span><FiCheckCircle style={{ marginRight: "8px" }} />{success}</span><button onClick={() => setSuccess(null)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>&times;</button></div>}
      {error && <div style={{ padding: "12px 16px", backgroundColor: "#f8d7da", color: "#842029", borderRadius: "6px", marginBottom: "20px", display: "flex", justifyContent: "space-between" }}><span><FiAlertCircle style={{ marginRight: "8px" }} />{error}</span><button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>&times;</button></div>}

      {activeTab === "create" && (

        <>
          <QuickAddCustomer isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} onSuccess={async (id) => { await fetchOptions(); setHeader(prev => ({ ...prev, customer_id: String(id) })); setSuccess("Customer added successfully!"); setTimeout(() => setSuccess(null), 3000); }} />
          <QuickAddBank isOpen={showBankModal} onClose={() => setShowBankModal(false)} onSuccess={async (id) => { await fetchOptions(); setHeader(prev => ({ ...prev, bank_id: String(id) })); setSuccess("Bank added successfully!"); setTimeout(() => setSuccess(null), 3000); }} />
          <QuickAddTerms isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} onSuccess={async (id) => { await fetchOptions(); setHeader(prev => ({ ...prev, terms_id: String(id) })); setSuccess("Terms added successfully!"); setTimeout(() => setSuccess(null), 3000); }} />

          <form onSubmit={handleSubmit}>
            <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "20px" }}>
                <h3 style={{ margin: "0", fontSize: "14px", color: "#5156be", fontWeight: "600" }}>{isEditMode ? "Update Invoice Details" : "Invoice Details"}</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
                <div><label style={labelStyle}>Invoice No</label><input type="text" name="invoice_no" value={header.invoice_no} readOnly style={{ ...inputStyle, backgroundColor: "#f8f9fa", fontWeight: "600", color: "#5156be" }} /></div>
                <div><label style={labelStyle}>Invoice Date *</label><input type="date" name="invoice_date" value={header.invoice_date} onChange={handleHeaderChange} required style={inputStyle} /></div>
                <div>
                  <label style={{ ...labelStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>Customer * <button type="button" onClick={() => setShowCustomerModal(true)} style={{ background: "none", border: "none", color: "#5156be", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: 0 }}>[ + Add Customer ]</button></label>
                  <select name="customer_id" value={header.customer_id} onChange={handleHeaderChange} required style={inputStyle}>
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{...labelStyle, display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                    Select Bank
                    <button type="button" onClick={() => setShowBankModal(true)} style={{ background: "none", border: "none", color: "#5156be", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: 0 }}>[ + Add Bank ]</button>
                  </label>
                  <select name="bank_id" value={header.bank_id} onChange={handleHeaderChange} style={inputStyle}>
                    <option value="">-- Select Bank --</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>Terms & Conditions <button type="button" onClick={() => setShowTermsModal(true)} style={{ background: "none", border: "none", color: "#5156be", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: 0 }}>[ + Add Terms ]</button></label>
                  <select name="terms_id" value={header.terms_id} onChange={handleHeaderChange} style={inputStyle}>
                    <option value="">-- Select Terms --</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" }}>
                <h3 style={{ margin: "0", fontSize: "14px", color: "#5156be", fontWeight: "600" }}>Service Items Grid</h3>
                <button type="button" onClick={addRow} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#2da949", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}><FiPlus /> Add Item</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px", minWidth: "850px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e5e7eb", height: "40px" }}>
                      <th style={{ padding: "10px", width: "25%" }}>Service Name *</th>
                      <th style={{ padding: "10px", width: "28%" }}>Description</th>
                      <th style={{ padding: "10px", width: "12%" }}>Rate *</th>
                      <th style={{ padding: "10px", width: "8%" }}>Qty *</th>
                      <th style={{ padding: "10px", width: "10%" }}>GST %</th>
                      <th style={{ padding: "10px", width: "12%" }}>Total</th>
                      <th style={{ padding: "10px", width: "5%" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "10px" }}><input type="text" value={row.service_name} onChange={(e) => handleItemChange(index, "service_name", e.target.value)} required style={inputStyle} /></td>
                        <td style={{ padding: "10px" }}><textarea value={row.description} onChange={(e) => handleItemChange(index, "description", e.target.value)} rows="2" style={{ ...inputStyle, resize: "vertical", height: "48px" }} /></td>
                        <td style={{ padding: "10px" }}><input type="number" step="0.01" value={row.rate} onChange={(e) => handleItemChange(index, "rate", e.target.value)} required style={{ ...inputStyle, textAlign: "right" }} /></td>
                        <td style={{ padding: "10px" }}><input type="number" step="0.01" value={row.qty} onChange={(e) => handleItemChange(index, "qty", e.target.value)} required style={{ ...inputStyle, textAlign: "center" }} /></td>
                        <td style={{ padding: "10px" }}><input type="number" step="0.01" value={row.gst_percent} onChange={(e) => handleItemChange(index, "gst_percent", e.target.value)} style={{ ...inputStyle, textAlign: "right" }} /></td>
                        <td style={{ padding: "10px", textAlign: "right", fontWeight: "600" }}>{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: "10px", textAlign: "center" }}><button type="button" onClick={() => removeRow(index)} style={{ backgroundColor: "#ffebee", color: "#f46a6a", border: "1px solid #ffcdd2", padding: "6px", borderRadius: "6px", cursor: "pointer" }}><FiTrash2 /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "24px" }}>
              {/* Notes Card Removed */}
              <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px" }}>
                <h4 style={{ margin: "0 0 16px 0", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" }}>Summary</h4>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><span>Subtotal:</span><span style={{ fontWeight: "600" }}>{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><span>GST Tax:</span><span style={{ fontWeight: "600" }}>{totals.gst_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #e5e7eb", paddingTop: "12px", color: "#5156be", fontWeight: "700", fontSize: "16px" }}><span>Grand Total:</span><span>{totals.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button type="submit" disabled={loading} style={{ backgroundColor: "#5156be", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}><FiSave /> {isEditMode ? "Update Invoice" : "Save Invoice"}</button>
              <button type="button" onClick={resetForm} style={{ backgroundColor: "#74788d", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", cursor: "pointer" }}>Reset</button>
            </div>
          </form>
        </>
      )}

      {activeTab === "list" && (
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <select value={entriesCount} onChange={(e) => setEntriesCount(Number(e.target.value))} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ced4da" }}><option value={10}>10 Entries</option><option value={25}>25 Entries</option></select>
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ced4da" }} />
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "12px" }}>Invoice No</th>
                <th style={{ padding: "12px" }}>Date</th>
                <th style={{ padding: "12px" }}>Customer Name</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Grand Total</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Paid Amount</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Outstanding</th>
                <th style={{ padding: "12px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.map((row, index) => {
                const grandTotal = parseFloat(row.grand_total) || 0;
                const paidAmount = parseFloat(row.paid_amount) || 0;
                const outstanding = row.outstanding_amount !== undefined ? parseFloat(row.outstanding_amount) : (grandTotal - paidAmount);

                let statusText = "Pending", statusColor = "#d97706", statusBg = "#fff3cd";
                if (paidAmount >= grandTotal) { statusText = "Paid"; statusColor = "#2da949"; statusBg = "#e8f5e9"; }
                else if (paidAmount > 0) { statusText = "Partial"; statusColor = "#1e88e5"; statusBg = "#e3f2fd"; }

                const dateObj = new Date(row.invoice_date);
                const displayDate = isNaN(dateObj.getTime()) ? "-" : dateObj.toLocaleDateString("en-IN");

                return (
                  <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px", color: "#5156be", fontWeight: "600" }}>{row.invoice_no}</td>
                    <td style={{ padding: "12px" }}>{displayDate}</td>
                    <td style={{ padding: "12px" }}>{row.customer_name}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: "600" }}>{grandTotal.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#2da949" }}>{paidAmount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#f46a6a" }}>{outstanding.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}><span style={{ backgroundColor: statusBg, color: statusColor, padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>{statusText}</span></td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <button onClick={() => handleEditClick(row)} style={{ backgroundColor: "#fff8e1", color: "#f57f17", border: "1px solid #ffecb3", padding: "6px", borderRadius: "6px", cursor: "pointer" }} title="Edit"><FiEdit /></button>
                        <button onClick={() => handleViewClick(row)} style={{ backgroundColor: "#e8f5e9", color: "#2da949", border: "1px solid #c8e6c9", padding: "6px", borderRadius: "6px", cursor: "pointer" }} title="View"><FiEye /></button>
                        <button onClick={() => handleDownloadPDFClick(row)} style={{ backgroundColor: "#e3f2fd", color: "#1e88e5", border: "1px solid #bbdefb", padding: "6px", borderRadius: "6px", cursor: "pointer" }} title="Download"><FiDownload /></button>
                        <button onClick={() => handleDeleteClick(row.id, row.invoice_no)} style={{ backgroundColor: "#ffebee", color: "#f46a6a", border: "1px solid #ffcdd2", padding: "6px", borderRadius: "6px", cursor: "pointer" }} title="Delete"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FULL DETAILED MODAL PREVIEW */}
      {viewDoc && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "8px", width: "90%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ margin: 0, color: "#5156be" }}>Invoice Preview</h3>
              <button onClick={() => setViewDoc(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#74788d" }}><FiX size={20} /></button>
            </div>

            <div style={{ padding: "24px", fontSize: "13px", color: "#495057" }}>

              {/* Header Top: Title & Company Info */}
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #5156be", paddingBottom: "12px", marginBottom: "20px" }}>
                <div>
                  {(() => {
                    const detailGrandTotal = parseFloat(viewDoc.header.grand_total) || 0;
                    const detailPaidAmount = parseFloat(viewDoc.header.paid_amount) || 0;
                    let detailStatusText = "Pending", detailStatusColor = "#d97706", detailStatusBg = "#fff3cd";
                    if (detailPaidAmount >= detailGrandTotal) { detailStatusText = "Paid"; detailStatusColor = "#2da949"; detailStatusBg = "#e8f5e9"; }
                    else if (detailPaidAmount > 0) { detailStatusText = "Partial"; detailStatusColor = "#1e88e5"; detailStatusBg = "#e3f2fd"; }
                    return (
                      <h2 style={{ fontSize: "18px", color: "#5156be", margin: "0 0 4px 0", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                        INVOICE
                        <span style={{ backgroundColor: detailStatusBg, color: detailStatusColor, padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                          {detailStatusText}
                        </span>
                      </h2>
                    );
                  })()}
                  <div><strong>Number:</strong> {viewDoc.header.invoice_no}</div>
                  <div><strong>Date:</strong> {new Date(viewDoc.header.invoice_date).toLocaleDateString("en-IN")}</div>
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

              {/* Billed To & Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>

                <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px", backgroundColor: "#f9fafb" }}>
                  <div style={{ fontWeight: "700", color: "#5156be", marginBottom: "6px", fontSize: "10px", textTransform: "uppercase" }}>BILLED TO</div>
                  <div style={{ fontWeight: "700", color: "#212529" }}>{viewDoc.customer.customer_name || viewDoc.customer.company_name}</div>

                  <div style={{ fontSize: "12px", marginTop: "4px", whiteSpace: "pre-line" }}>
                    {viewDoc.customer.address || viewDoc.customer.billing_address || viewDoc.customer.customer_address || "-"}
                  </div>
                  {(viewDoc.customer.city || viewDoc.customer.state) && (
                    <div style={{ fontSize: "12px", marginTop: "2px" }}>
                      {[viewDoc.customer.city, viewDoc.customer.state].filter(Boolean).join(", ")}
                      {viewDoc.customer.pincode ? ` - ${viewDoc.customer.pincode}` : ""}
                    </div>
                  )}

                  <div style={{ fontSize: "11px", color: "#74788d", marginTop: "6px" }}>
                    {(viewDoc.customer.phone_no || viewDoc.customer.mobile) && <div>Phone: {viewDoc.customer.phone_no || viewDoc.customer.mobile}</div>}
                    {viewDoc.customer.email && <div>Email: {viewDoc.customer.email}</div>}
                    {(viewDoc.customer.gst_no || viewDoc.customer.gst_number) && <div style={{ fontWeight: "600", color: "#212529", marginTop: "2px" }}>GSTIN: {viewDoc.customer.gst_no || viewDoc.customer.gst_number}</div>}
                  </div>
                </div>

                <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px", backgroundColor: "#f9fafb" }}>
                  <div style={{ fontWeight: "700", color: "#5156be", marginBottom: "6px", fontSize: "10px", textTransform: "uppercase" }}>SUMMARY</div>
                  <table style={{ width: "100%", fontSize: "12px" }}>
                    <tbody>
                      <tr><td style={{ color: "#74788d", padding: "2px 0" }}>Subtotal:</td><td style={{ textAlign: "right", fontWeight: "600", padding: "2px 0" }}>{(parseFloat(viewDoc.header.subtotal) || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td></tr>
                      <tr><td style={{ color: "#74788d", padding: "2px 0" }}>GST Tax Total:</td><td style={{ textAlign: "right", fontWeight: "600", padding: "2px 0" }}>{(parseFloat(viewDoc.header.gst_amount) || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td></tr>
                      <tr style={{ borderTop: "1px solid #dee2e6" }}><td style={{ padding: "6px 0", fontWeight: "700" }}>Grand Total:</td><td style={{ padding: "6px 0", textAlign: "right", fontWeight: "700", color: "#5156be", fontSize: "13px" }}>{(parseFloat(viewDoc.header.grand_total) || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td></tr>
                      <tr><td style={{ color: "#2da949", fontWeight: "600", padding: "2px 0" }}>Total Paid:</td><td style={{ textAlign: "right", fontWeight: "600", color: "#2da949", padding: "2px 0" }}>{(parseFloat(viewDoc.header.paid_amount) || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td></tr>
                      <tr style={{ borderTop: "1px dashed #dee2e6" }}><td style={{ padding: "6px 0", fontWeight: "700", color: "#f46a6a" }}>Balance Due:</td><td style={{ padding: "6px 0", textAlign: "right", fontWeight: "700", color: "#f46a6a" }}>{(parseFloat(viewDoc.header.outstanding_amount) || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "20px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#5156be", color: "#fff", textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", width: "8%", textAlign: "center" }}>Sr.No</th>
                    <th style={{ padding: "8px 10px", width: "25%" }}>Service Name</th>
                    <th style={{ padding: "8px 10px", width: "25%" }}>Description</th>
                    <th style={{ padding: "8px 10px", width: "12%", textAlign: "right" }}>Rate</th>
                    <th style={{ padding: "8px 10px", width: "8%", textAlign: "center" }}>Qty</th>
                    <th style={{ padding: "8px 10px", width: "10%", textAlign: "center" }}>GST %</th>
                    <th style={{ padding: "8px 10px", width: "12%", textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewDoc.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #dee2e6" }}>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>{idx + 1}</td>
                      <td style={{ padding: "8px 10px", fontWeight: "600" }}>{item.service_name}</td>
                      <td style={{ padding: "8px 10px", color: "#74788d", whiteSpace: "pre-line" }}>{item.description || "-"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{(parseFloat(item.amount) || parseFloat(item.rate) || 0).toFixed(2)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>{parseFloat(item.qty) || 1}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>{parseFloat(item.gst_percent)}%</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600" }}>{parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* PAYMENT HISTORY TABLE (New Section) */}
              {viewDoc.payments && viewDoc.payments.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h5 style={{ margin: "0 0 8px 0", color: "#5156be", fontWeight: "700", fontSize: "12px", textTransform: "uppercase" }}>PAYMENT HISTORY</h5>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "1px solid #e5e7eb" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "1px solid #dee2e6", color: "#495057", textAlign: "left" }}>
                        <th style={{ padding: "8px 10px" }}>Date</th>
                        <th style={{ padding: "8px 10px" }}>Mode</th>
                        <th style={{ padding: "8px 10px" }}>Reference</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewDoc.payments.map((pay, pIdx) => (
                        <tr key={pIdx} style={{ borderBottom: "1px solid #f1f3f5" }}>
                          <td style={{ padding: "8px 10px" }}>{new Date(pay.payment_date).toLocaleDateString("en-IN")}</td>
                          <td style={{ padding: "8px 10px" }}>{pay.payment_mode}</td>
                          <td style={{ padding: "8px 10px", color: "#74788d" }}>{pay.transaction_ref || "-"}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600", color: "#2da949" }}>
                            {parseFloat(pay.amount).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Terms & Bank Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <h5 style={{ margin: "0 0 6px 0", color: "#5156be", fontWeight: "700", fontSize: "12px" }}>TERMS & CONDITIONS</h5>
                  <div style={{ fontSize: "11px", color: "#74788d", whiteSpace: "pre-line" }}>{viewDoc.terms.description || "Standard terms apply."}</div>
                </div>

                <div>
                  <h5 style={{ margin: "0 0 6px 0", color: "#5156be", fontWeight: "700", fontSize: "12px" }}>BANK DETAILS</h5>
                  {viewDoc.bank.bank_name ? (
                    <div style={{ fontSize: "11px", color: "#74788d" }}>
                      <div>Bank: {viewDoc.bank.bank_name}</div>
                      <div>Holder: {viewDoc.bank.account_holder_name}</div>
                      <div>A/C No: {viewDoc.bank.account_number}</div>
                      <div>IFSC: {viewDoc.bank.ifsc_code}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>No bank details setup.</div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
              <button onClick={() => handleDownloadPDFClick(viewDoc.header)} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#5156be", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>
                <FiDownload size={14} /> Download PDF
              </button>
              <button onClick={() => setViewDoc(null)} style={{ backgroundColor: "#fff", color: "#495057", border: "1px solid #ced4da", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}