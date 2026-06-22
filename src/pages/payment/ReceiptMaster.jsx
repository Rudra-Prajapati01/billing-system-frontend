import React, { useState, useEffect } from "react";
import { FiSave, FiTrash2, FiSearch, FiCheckCircle, FiAlertCircle, FiDownload, FiEye, FiX } from "react-icons/fi";
import apiClient from "../../services/apiClient";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const API_RECEIPTS = "/receipts";
const API_PAYMENTS = "/payments";
const API_COMPANY = "/company-profile";
const API_CUSTOMERS = "/customers";

// ==========================================
// IMAGE HELPER (Base64 Conversion)
// ==========================================
const loadImageAsBase64 = (url) => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const fullUrl = url.startsWith("http://") || url.startsWith("https://") 
      ? url 
      : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${url}`;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve({
          data: canvas.toDataURL("image/png"),
          width: img.width,
          height: img.height
        });
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = fullUrl;
  });
};

const formatCurrency = (amount) => {
  const num = parseFloat(amount || 0);
  return "₹ " + num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default function ReceiptMaster() {
  const [activeTab, setActiveTab] = useState("create"); 

  const [receiptsList, setReceiptsList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]); 
  const [nextReceiptNo, setNextReceiptNo] = useState("RCP-0000");

  const [formData, setFormData] = useState({
    receipt_no: "",
    receipt_date: new Date().toISOString().split("T")[0],
    payment_id: "",
    invoice_no: "",
    customer_name: "",
    amount: "",
    payment_mode: "",
    transaction_ref: "",
    remarks: ""
  });

  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedInvoiceHistory, setSelectedInvoiceHistory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchReceipts();
    fetchNextReceiptNumber();
    fetchPayments();
  }, []);

  const fetchReceipts = async () => {
    try {
      const res = await apiClient.get(API_RECEIPTS);
      setReceiptsList(res.data || []);
    } catch (err) {
      console.error("Failed to load receipts");
    }
  };

  const fetchNextReceiptNumber = async () => {
    try {
      const res = await apiClient.get(`${API_RECEIPTS}/next-number`);
      setNextReceiptNo(res.data.next_number || "RCP-0001");
      setFormData(prev => ({ ...prev, receipt_no: res.data.next_number || "RCP-0001" }));
    } catch (err) {
      setNextReceiptNo("RCP-0001");
      setFormData(prev => ({ ...prev, receipt_no: "RCP-0001" }));
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await apiClient.get(API_PAYMENTS);
      setPaymentsList(res.data || []);
    } catch (err) {
      console.error("Failed to load payments");
    }
  };

  const handlePaymentSelect = (e) => {
    const paymentId = e.target.value;
    if (!paymentId) {
      setFormData(prev => ({ ...prev, payment_id: "", invoice_no: "", customer_name: "", amount: "", payment_mode: "", transaction_ref: "" }));
      return;
    }
    const selectedPayment = paymentsList.find(p => p.id.toString() === paymentId);
    if (selectedPayment) {
      setFormData(prev => ({
        ...prev,
        payment_id: selectedPayment.id,
        invoice_no: selectedPayment.invoice_no,
        customer_name: selectedPayment.customer_name,
        amount: selectedPayment.amount,
        payment_mode: selectedPayment.payment_mode,
        transaction_ref: selectedPayment.transaction_ref || ""
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.payment_id) return setError("Please select a valid payment.");

    setLoading(true);
    try {
      const res = await apiClient.post(API_RECEIPTS, formData);
      setSuccess("Receipt Created Successfully!");
      setError(null);
      
      // Merge response data in case backend generated a new receipt number
      const finalReceiptData = {
        ...formData,
        receipt_no: res.data.receipt_no || formData.receipt_no
      };

      // Auto Download PDF upon creation
      await generatePDF(finalReceiptData);

      // Reset & Refresh
      setFormData({
        receipt_no: "",
        receipt_date: new Date().toISOString().split("T")[0],
        payment_id: "",
        invoice_no: "",
        customer_name: "",
        amount: "",
        payment_mode: "",
        transaction_ref: "",
        remarks: ""
      });
      await fetchReceipts();
      await fetchNextReceiptNumber();
      setActiveTab("list");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save receipt.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
      try {
        await apiClient.delete(`${API_RECEIPTS}/${id}`);
        setSuccess("Receipt deleted successfully.");
        await fetchReceipts();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError("Failed to delete receipt.");
      }
    }
  };

  // =========================================================================
  // 🏢 PREMIUM MNC-LEVEL PDF GENERATION WITH LOGO & FULL DETAILS
  // =========================================================================
  const generatePDF = async (receiptData) => {
    setPdfLoading(true);
    try {
      // 1. DYNAMIC DATA FETCHING
      let companyInfo = {};
      let customerInfo = {};

      try {
        const compRes = await apiClient.get(API_COMPANY);
        companyInfo = Array.isArray(compRes.data) ? compRes.data[0] : compRes.data || {};
        
        const custRes = await apiClient.get(API_CUSTOMERS);
        const customers = custRes.data || [];
        customerInfo = customers.find(c => 
          c.company_name?.toLowerCase() === receiptData.customer_name?.toLowerCase() || 
          c.customer_name?.toLowerCase() === receiptData.customer_name?.toLowerCase()
        ) || {};
      } catch (err) {
        console.warn("Could not fetch extended details for PDF", err);
      }

      const logoObj = await loadImageAsBase64(companyInfo?.logo);
      const signatureObj = await loadImageAsBase64(companyInfo?.signature);

      const doc = new jsPDF("p", "mm", "a4");
      const safeText = (text) => (text ? String(text) : "");

      // Color Palette
      const COLORS = {
        primary: [30, 58, 138],       // Brand Blue
        darkText: [31, 41, 55],       // Gray 800
        lightText: [107, 114, 128],   // Gray 500
        bgLight: [248, 250, 252],     // Slate 50
        borderLight: [226, 232, 240], // Slate 200
        white: [255, 255, 255]
      };

      let currentY = 15;

      // -------------------------------------------------------------
      // 1. HEADER (Logo + Company Details + Receipt Title)
      // -------------------------------------------------------------
      // Top Color Accent Bar
      doc.setFillColor(...COLORS.primary);
      doc.rect(0, 0, 210, 5, "F");

      // Logo (Left)
      if (logoObj && logoObj.data) {
        const ratio = logoObj.width / logoObj.height;
        let tHeight = 16;
        let tWidth = tHeight * ratio;
        if (tWidth > 50) { tWidth = 50; tHeight = tWidth / ratio; }
        doc.addImage(logoObj.data, "PNG", 15, currentY, tWidth, tHeight);
        currentY += tHeight + 5;
      } else {
        doc.setTextColor(...COLORS.primary);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text(companyInfo.company_name || "CRAFTIX Global Solutions", 15, currentY + 8);
        currentY += 15;
      }

      // Receipt Title & Badge (Right)
      doc.setFillColor(...COLORS.primary);
      doc.roundedRect(145, 12, 50, 20, 2, 2, "F");
      doc.setTextColor(...COLORS.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("RECEIPT", 170, 20, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`No: ${safeText(receiptData.receipt_no)}`, 170, 27, { align: "center" });

      // Company Info details (Below Logo)
      doc.setTextColor(...COLORS.darkText);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      if(logoObj) {
        doc.text(companyInfo.company_name || "CRAFTIX Global Solutions", 15, currentY);
        currentY += 5;
      }
      
      doc.setTextColor(...COLORS.lightText);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      const cleanAddress = (companyInfo.address || "").trim();
      if (cleanAddress) {
        const addrLines = doc.splitTextToSize(`${cleanAddress}, ${companyInfo.city || ""} - ${companyInfo.pincode || ""}`, 100);
        addrLines.forEach(line => { doc.text(line, 15, currentY); currentY += 4.5; });
      }
      
      let contactStr = [];
      if (companyInfo.email) contactStr.push(companyInfo.email);
      if (companyInfo.contact_no_1) contactStr.push(`+91 ${companyInfo.contact_no_1}`);
      if (contactStr.length > 0) { doc.text(contactStr.join(" | "), 15, currentY); currentY += 4.5; }
      
      if (companyInfo.gst_number) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.darkText);
        doc.text(`GSTIN: ${companyInfo.gst_number}`, 15, currentY);
      }

      currentY += 10;
      doc.setDrawColor(...COLORS.borderLight);
      doc.setLineWidth(0.5);
      doc.line(15, currentY, 195, currentY);
      currentY += 8;

      // -------------------------------------------------------------
      // 2. BACKGROUND WATERMARK
      // -------------------------------------------------------------
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.05 }));
      doc.setTextColor(...COLORS.primary); 
      doc.setFontSize(90);
      doc.setFont("helvetica", "bold");
      doc.text("P A I D", 50, 160, { angle: 45 });
      doc.restoreGraphicsState();

      // -------------------------------------------------------------
      // 3. RECEIVED FROM & DATE DETAILS
      // -------------------------------------------------------------
      // Left Side: Customer Info
      doc.setTextColor(...COLORS.primary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("RECEIVED FROM:", 15, currentY);
      
      const custName = customerInfo.company_name || customerInfo.customer_name || receiptData.customer_name || "Customer";
      doc.setTextColor(...COLORS.darkText);
      doc.setFontSize(11);
      doc.text(custName, 15, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.lightText);
      let custY = currentY + 11;
      const custAddr = customerInfo.address || customerInfo.billing_address;
      if (custAddr) {
        const lines = doc.splitTextToSize(`${custAddr}, ${customerInfo.city || ""} - ${customerInfo.pincode || ""}`, 80);
        lines.forEach(l => { doc.text(l, 15, custY); custY += 4.5; });
      }
      const custPhone = customerInfo.phone_no || customerInfo.mobile;
      if (custPhone) { doc.text(`Phone: ${custPhone}`, 15, custY); custY += 4.5; }
      
      const custGst = customerInfo.gst_no || customerInfo.gst_number;
      if (custGst) {
        doc.setTextColor(...COLORS.darkText);
        doc.setFont("helvetica", "bold");
        doc.text(`GSTIN: ${custGst}`, 15, custY);
      }

      // Right Side: Payment Meta Box
      doc.setFillColor(...COLORS.bgLight);
      doc.setDrawColor(...COLORS.borderLight);
      doc.roundedRect(120, currentY - 2, 75, 30, 2, 2, "FD");

      const rDate = new Date(receiptData.receipt_date);
      const fDate = !isNaN(rDate) ? rDate.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : safeText(receiptData.receipt_date);

      let metaY = currentY + 4;
      doc.setTextColor(...COLORS.lightText);
      doc.setFont("helvetica", "normal");
      doc.text("Date:", 125, metaY);
      doc.setTextColor(...COLORS.darkText);
      doc.setFont("helvetica", "bold");
      doc.text(fDate, 190, metaY, { align: "right" });
      metaY += 7;

      doc.setTextColor(...COLORS.lightText);
      doc.setFont("helvetica", "normal");
      doc.text("Mode:", 125, metaY);
      doc.setTextColor(...COLORS.darkText);
      doc.setFont("helvetica", "bold");
      doc.text(safeText(receiptData.payment_mode) || "Cash/Online", 190, metaY, { align: "right" });
      metaY += 7;

      if (receiptData.transaction_ref) {
        doc.setTextColor(...COLORS.lightText);
        doc.setFont("helvetica", "normal");
        doc.text("Ref No:", 125, metaY);
        doc.setTextColor(...COLORS.darkText);
        doc.setFont("helvetica", "bold");
        doc.text(safeText(receiptData.transaction_ref), 190, metaY, { align: "right" });
      }

      currentY = Math.max(custY + 10, metaY + 15);

      // -------------------------------------------------------------
      // 4. MAIN PAYMENT TABLE
      // -------------------------------------------------------------
      autoTable(doc, {
        startY: currentY,
        head: [["Invoice Ref.", "Description", "Amount"]],
        body: [
          [
            safeText(receiptData.invoice_no),
            "Payment received towards digital services and solutions.",
            formatCurrency(receiptData.amount)
          ]
        ],
        theme: "grid",
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9, fontStyle: "bold" },
        bodyStyles: { textColor: COLORS.darkText, fontSize: 9, cellPadding: 5 },
        columnStyles: { 
          0: { cellWidth: 40, fontStyle: "bold" }, 
          1: { cellWidth: 100 }, 
          2: { cellWidth: 40, halign: "right", fontStyle: "bold" } 
        },
        margin: { left: 15, right: 15 }
      });

      let finalY = doc.lastAutoTable.finalY + 10;

      // -------------------------------------------------------------
      // 5. HIGHLIGHTED TOTAL
      // -------------------------------------------------------------
      doc.setFillColor(...COLORS.primary);
      doc.rect(130, finalY, 65, 12, "F");

      doc.setTextColor(...COLORS.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Total Amount:", 135, finalY + 8);
      doc.setFontSize(12);
      doc.text(formatCurrency(receiptData.amount), 190, finalY + 8.5, { align: "right" });

      // -------------------------------------------------------------
      // 6. REMARKS & FOOTER
      // -------------------------------------------------------------
      let footerY = finalY + 25;
      if (receiptData.remarks) {
        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Remarks / Notes:", 15, footerY);
        doc.setTextColor(...COLORS.darkText);
        doc.setFont("helvetica", "normal");
        const remarkLines = doc.splitTextToSize(safeText(receiptData.remarks), 100);
        doc.text(remarkLines, 15, footerY + 5);
      }

      // Signature Area
      let sigY = footerY + 15;
      if (signatureObj && signatureObj.data) {
        const sigHeight = 14;
        const sigWidth = sigHeight * (signatureObj.width / signatureObj.height);
        doc.addImage(signatureObj.data, "PNG", 195 - sigWidth, sigY - 16, sigWidth, sigHeight);
      }

      doc.setDrawColor(...COLORS.borderLight);
      doc.setLineWidth(0.5);
      doc.line(140, sigY, 195, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.darkText);
      doc.text("Authorized Signatory", 195, sigY + 5, { align: "right" });

      // Bottom Message
      doc.line(15, 275, 195, 275);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.lightText);
      doc.text("This is a computer-generated receipt and does not require a physical signature.", 105, 280, { align: "center" });
      doc.text("Thank you for your business!", 105, 284, { align: "center" });

      // SAVE PDF
      doc.save(`${safeText(receiptData.receipt_no)}.pdf`);

    } catch (error) {
      console.error("PDF Generation Failed:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const openInvoiceHistory = (invoiceNo, customerName) => {
    const history = paymentsList.filter(p => p.invoice_no === invoiceNo);
    setSelectedInvoiceHistory({
      invoice_no: invoiceNo,
      customer_name: customerName,
      history: history
    });
    setIsModalOpen(true);
  };

  const filteredList = receiptsList.filter(r =>
    r.receipt_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" };
  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", color: "#495057", boxSizing: "border-box" };
  const readOnlyStyle = { ...inputStyle, backgroundColor: "#f8f9fa", fontWeight: "600", color: "#5156be" };

  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER & TABS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #5156be", paddingBottom: "8px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#495057", margin: "0" }}>Receipt Master</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setActiveTab("create")} style={{ padding: "8px 16px", borderRadius: "6px", fontWeight: "600", fontSize: "13px", cursor: "pointer", border: "1px solid #5156be", backgroundColor: activeTab === "create" ? "#5156be" : "#fff", color: activeTab === "create" ? "#fff" : "#5156be" }}>Create Receipt</button>
          <button onClick={() => setActiveTab("list")} style={{ padding: "8px 16px", borderRadius: "6px", fontWeight: "600", fontSize: "13px", cursor: "pointer", border: "1px solid #5156be", backgroundColor: activeTab === "list" ? "#5156be" : "#fff", color: activeTab === "list" ? "#fff" : "#5156be" }}>Receipt List</button>
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

      {/* TAB 1: CREATE RECEIPT */}
      {activeTab === "create" && (
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
              
              <div>
                <label style={labelStyle}>Receipt No (Auto)</label>
                <input type="text" readOnly value={formData.receipt_no} style={readOnlyStyle} />
              </div>

              <div>
                <label style={labelStyle}>Receipt Date <span style={{ color: "red" }}>*</span></label>
                <input type="date" name="receipt_date" value={formData.receipt_date} onChange={handleInputChange} required style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Select Payment <span style={{ color: "red" }}>*</span></label>
                <select name="payment_id" value={formData.payment_id} onChange={handlePaymentSelect} required style={inputStyle}>
                  <option value="">-- Choose Payment --</option>
                  {paymentsList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.invoice_no} | {p.customer_name} | ₹{p.amount}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Invoice No</label>
                <input type="text" readOnly value={formData.invoice_no} style={readOnlyStyle} placeholder="Auto-fill" />
              </div>

              <div>
                <label style={labelStyle}>Customer Name</label>
                <input type="text" readOnly value={formData.customer_name} style={readOnlyStyle} placeholder="Auto-fill" />
              </div>

              <div>
                <label style={labelStyle}>Amount</label>
                <input type="text" readOnly value={formData.amount} style={readOnlyStyle} placeholder="Auto-fill" />
              </div>

              <div>
                <label style={labelStyle}>Payment Mode</label>
                <input type="text" readOnly value={formData.payment_mode} style={readOnlyStyle} placeholder="Auto-fill" />
              </div>
            </div>

            <div style={{ marginTop: "20px" }}>
              <label style={labelStyle}>Transaction Ref / Details</label>
              <input type="text" readOnly value={formData.transaction_ref} style={readOnlyStyle} placeholder="Auto-fill" />
            </div>

            <div style={{ marginTop: "20px" }}>
              <label style={labelStyle}>Remarks</label>
              <textarea name="remarks" rows="2" value={formData.remarks} onChange={handleInputChange} style={{ ...inputStyle, resize: "vertical" }} placeholder="Optional notes..."></textarea>
            </div>

            <div style={{ marginTop: "24px" }}>
              <button type="submit" disabled={loading || pdfLoading} style={{ backgroundColor: "#5156be", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiSave /> {pdfLoading ? "Generating PDF..." : "Generate Receipt & Download PDF"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: RECEIPT LIST */}
      {activeTab === "list" && (
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ margin: "0", fontSize: "15px", color: "#495057" }}>Generated Receipts</h3>
            <div style={{ position: "relative", width: "300px" }}>
              <input type="text" placeholder="Search by name, invoice, or receipt no..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: "6px", border: "1px solid #ced4da", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              <FiSearch style={{ position: "absolute", left: "10px", top: "10px", color: "#74788d" }} />
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e5e7eb", color: "#495057" }}>
                <th style={{ padding: "12px" }}>Receipt No</th>
                <th style={{ padding: "12px" }}>Date</th>
                <th style={{ padding: "12px" }}>Invoice No</th>
                <th style={{ padding: "12px" }}>Customer</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "12px", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px", color: "#5156be", fontWeight: "600" }}>{r.receipt_no}</td>
                  <td style={{ padding: "12px" }}>{new Date(r.receipt_date).toLocaleDateString("en-IN")}</td>
                  <td style={{ padding: "12px" }}>{r.invoice_no}</td>
                  <td style={{ padding: "12px" }}>{r.customer_name}</td>
                  <td style={{ padding: "12px", textAlign: "right", fontWeight: "600" }}>₹{parseFloat(r.amount).toFixed(2)}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    
                    <button onClick={() => openInvoiceHistory(r.invoice_no, r.customer_name)} title="View Payment History" style={{ background: "#e0f2f1", color: "#00897b", border: "1px solid #b2dfdb", padding: "6px", borderRadius: "4px", cursor: "pointer", marginRight: "6px" }}>
                      <FiEye />
                    </button>
                    
                    <button onClick={() => generatePDF(r)} disabled={pdfLoading} title="Download PDF" style={{ background: "#e3f2fd", color: "#1e88e5", border: "1px solid #bbdefb", padding: "6px", borderRadius: "4px", cursor: "pointer", marginRight: "6px", opacity: pdfLoading ? 0.6 : 1 }}>
                      <FiDownload />
                    </button>
                    
                    <button onClick={() => handleDelete(r.id)} title="Delete Receipt" style={{ background: "#ffebee", color: "#f46a6a", border: "1px solid #ffcdd2", padding: "6px", borderRadius: "4px", cursor: "pointer" }}>
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#74788d" }}>No receipts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && selectedInvoiceHistory && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "#fff", padding: "24px", borderRadius: "8px", width: "500px", maxWidth: "90%", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#495057" }}>Payment History: {selectedInvoiceHistory.invoice_no}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", color: "#74788d" }}><FiX /></button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <strong>Customer:</strong> {selectedInvoiceHistory.customer_name}
            </div>

            <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
              {selectedInvoiceHistory.history.map((hist, idx) => (
                <li key={idx} style={{ padding: "10px", border: "1px solid #e5e7eb", borderRadius: "6px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8f9fa" }}>
                  <div>
                    <span style={{ fontWeight: "600", color: "#2da949" }}>₹{parseFloat(hist.amount).toFixed(2)}</span>
                    <span style={{ marginLeft: "8px", fontSize: "12px", color: "#74788d" }}>{hist.payment_mode}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#495057" }}>
                    {new Date(hist.payment_date).toLocaleDateString("en-IN")}
                  </div>
                </li>
              ))}
              {selectedInvoiceHistory.history.length === 0 && (
                <li style={{ textAlign: "center", color: "#74788d" }}>No previous payments recorded.</li>
              )}
            </ul>

            <div style={{ marginTop: "24px", textAlign: "right" }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: "8px 16px", backgroundColor: "#5156be", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}