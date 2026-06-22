import React, { useState, useEffect } from "react";
import { FiSearch, FiRefreshCw, FiFileText, FiDownload, FiDollarSign, FiFile, FiPieChart, FiAlertCircle } from "react-icons/fi";
import apiClient from "../../services/apiClient";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const API_REPORT = "/customer-report";

export default function CustomerReport() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 15;

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await apiClient.get(`${API_REPORT}/customers`);
      setCustomers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch customers");
    }
  };

  const handleSearch = async () => {
    if (!selectedCustomer) {
      setError("Please select a customer.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const summaryRes = await apiClient.get(`${API_REPORT}/summary/${selectedCustomer}`);
      setSummary(summaryRes.data);

      let ledgerUrl = `${API_REPORT}/ledger/${selectedCustomer}?`;
      if (fromDate) ledgerUrl += `fromDate=${fromDate}&`;
      if (toDate) ledgerUrl += `toDate=${toDate}`;

      const ledgerRes = await apiClient.get(ledgerUrl);
      setLedger(ledgerRes.data.ledger || []);
      setOpeningBalance(ledgerRes.data.openingBalance || 0);
      setCurrentPage(1); // Reset pagination on new search
    } catch (err) {
      setError("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedCustomer("");
    setFromDate("");
    setToDate("");
    setSummary(null);
    setLedger([]);
    setOpeningBalance(0);
    setError("");
    setTableSearch("");
  };

  // Standard formatter for UI
  const formatCurrency = (amount) => {
    return "₹" + parseFloat(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getCustomerName = () => {
    const c = customers.find(c => c.id.toString() === selectedCustomer.toString());
    return c ? (c.company_name || c.customer_name) : "Customer";
  };

  // ==========================
  // EXPORT FUNCTIONS
  // ==========================
  const exportToExcel = () => {
    if (ledger.length === 0) return alert("No ledger records found.");
    
    const excelData = ledger.map(l => ({
      "Date": new Date(l.date).toLocaleDateString("en-IN"),
      "Type": l.type,
      "Document No": l.number,
      "Debit (Invoiced)": l.debit,
      "Credit (Paid)": l.credit,
      "Balance": l.balance
    }));

    // Add opening balance at the top
    excelData.unshift({
      "Date": "---", "Type": "Opening Balance", "Document No": "---", 
      "Debit (Invoiced)": 0, "Credit (Paid)": 0, "Balance": openingBalance
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
    XLSX.writeFile(workbook, `Customer-Ledger-${getCustomerName().replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);
  };

  // 1. Create a PDF-safe currency formatter (jsPDF default font doesn't support ₹)
  const formatCurrencyPDF = (amount) => {
    return "Rs. " + parseFloat(amount || 0).toLocaleString("en-IN", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const exportToPDF = () => {
    if (ledger.length === 0) return alert("No ledger records found.");
    
    const doc = new jsPDF();
    const primaryColor = [81, 86, 190]; // #5156be
    
    // --- Header ---
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("CUSTOMER LEDGER REPORT", 15, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Customer: ${getCustomerName()}`, 15, 23);
    
    if (fromDate || toDate) {
      doc.text(`Date: ${fromDate || "Start"} to ${toDate || "End"}`, 195, 23, { align: "right" });
    }

    // --- Account Summary ---
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Account Summary", 15, 40);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Total Invoices: ${summary?.invoice_count || 0}`, 15, 47);
    
    // Using proper spacing and right-alignment to completely prevent overlapping
    doc.text(`Invoice Amount: ${formatCurrencyPDF(summary?.total_invoice_amount)}`, 130, 47, { align: "right" });
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(244, 106, 106); // Red color for outstanding to make it pop
    doc.text(`Outstanding: ${formatCurrencyPDF(summary?.outstanding)}`, 195, 47, { align: "right" });

    // --- Ledger Table ---
    const tableData = ledger.map(l => [
      new Date(l.date).toLocaleDateString("en-IN"),
      l.type,
      l.number,
      l.debit > 0 ? formatCurrencyPDF(l.debit) : "-",
      l.credit > 0 ? formatCurrencyPDF(l.credit) : "-",
      formatCurrencyPDF(l.balance)
    ]);

    // Insert Opening Balance row at the top
    tableData.unshift([
      "-", "Opening Balance", "-", "-", "-", formatCurrencyPDF(openingBalance)
    ]);

    autoTable(doc, {
      startY: 55,
      head: [["Date", "Type", "Ref Number", "Debit (+)", "Credit (-)", "Balance"]],
      body: tableData,
      theme: "striped", // Striped makes financial data much easier to read
      headStyles: { 
        fillColor: primaryColor, 
        textColor: 255, 
        fontSize: 9, 
        fontStyle: 'bold' 
      },
      bodyStyles: { 
        textColor: 50 
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 4,
        font: "helvetica" 
      },
      columnStyles: { 
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { halign: 'right', cellWidth: 30 }, 
        4: { halign: 'right', cellWidth: 30 }, 
        5: { halign: 'right', fontStyle: 'bold' } // Keep Running Balance bold
      },
    });

    // --- Footer ---
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by CRAFTIX Global Solutions Billing System", 105, doc.internal.pageSize.height - 10, { align: "center" });

    doc.save(`Ledger-${getCustomerName().replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  };

  // Filter & Paginate
  const filteredLedger = ledger.filter(l => 
    l.type.toLowerCase().includes(tableSearch.toLowerCase()) || 
    l.number.toLowerCase().includes(tableSearch.toLowerCase())
  );
  const currentLedgerRows = filteredLedger.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  // Styles
  const cardStyle = { backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" };
  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", color: "#495057", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" };

  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #5156be", paddingBottom: "10px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#495057", margin: "0" }}>Customer Report & Ledger</h2>
      </div>

      {/* FILTER CARD */}
      <div style={{ ...cardStyle, marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", alignItems: "end" }}>
          <div>
            <label style={labelStyle}>Customer <span style={{color:"red"}}>*</span></label>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} style={inputStyle}>
              <option value="">-- Select Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.company_name || c.customer_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleSearch} disabled={loading} style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "none", backgroundColor: "#5156be", color: "#fff", fontWeight: "600", cursor: "pointer", display:"flex", justifyContent:"center", alignItems:"center", gap:"6px" }}>
              <FiSearch /> {loading ? "Searching..." : "Search"}
            </button>
            <button onClick={handleReset} style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #74788d", backgroundColor: "#fff", color: "#74788d", fontWeight: "600", cursor: "pointer", display:"flex", justifyContent:"center", alignItems:"center", gap:"6px" }}>
              <FiRefreshCw /> Reset
            </button>
          </div>
        </div>
        {error && (
          <div style={{ marginTop: "12px", color: "#f46a6a", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FiAlertCircle /> {error}
          </div>
        )}
      </div>

      {/* SUMMARY CARDS */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          {[
            { title: "Quotations", val: summary.quotation_count, icon: <FiFileText />, color: "#556ee6" },
            { title: "Invoices", val: summary.invoice_count, icon: <FiFile />, color: "#34c38f" },
            { title: "Invoice Amount", val: formatCurrency(summary.total_invoice_amount), icon: <FiDollarSign />, color: "#50a5f1" },
            { title: "Total Paid", val: formatCurrency(summary.total_paid), icon: <FiPieChart />, color: "#f1b44c" },
            { title: "Outstanding", val: formatCurrency(summary.outstanding), icon: <FiAlertCircle />, color: "#f46a6a" },
          ].map((card, idx) => (
            <div key={idx} style={{ ...cardStyle, display: "flex", alignItems: "center", padding: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: `${card.color}15`, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", marginRight: "12px" }}>
                {card.icon}
              </div>
              <div>
                <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#74788d", fontWeight: "600" }}>{card.title}</p>
                <h4 style={{ margin: "0", fontSize: "16px", color: "#495057" }}>{card.val}</h4>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LEDGER TABLE */}
      {summary && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: "0", fontSize: "15px", color: "#495057" }}>Ledger Statement</h3>
            
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input type="text" placeholder="Search entries..." value={tableSearch} onChange={(e) => {setTableSearch(e.target.value); setCurrentPage(1);}} style={{ ...inputStyle, width: "200px", padding: "8px 12px" }} />
              
              <button onClick={exportToExcel} style={{ padding: "8px 12px", borderRadius: "6px", border: "none", backgroundColor: "#34c38f", color: "#fff", cursor: "pointer", display:"flex", alignItems:"center", gap:"6px", fontSize: "13px", fontWeight: "600" }}>
                <FiDownload /> Excel
              </button>
              <button onClick={exportToPDF} style={{ padding: "8px 12px", borderRadius: "6px", border: "none", backgroundColor: "#f46a6a", color: "#fff", cursor: "pointer", display:"flex", alignItems:"center", gap:"6px", fontSize: "13px", fontWeight: "600" }}>
                <FiFileText /> PDF
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e5e7eb", color: "#495057" }}>
                  <th style={{ padding: "12px" }}>Date</th>
                  <th style={{ padding: "12px" }}>Type</th>
                  <th style={{ padding: "12px" }}>Document No</th>
                  <th style={{ padding: "12px", textAlign: "right", color: "#f46a6a" }}>Debit (+)</th>
                  <th style={{ padding: "12px", textAlign: "right", color: "#34c38f" }}>Credit (-)</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {/* OPENING BALANCE ROW */}
                {currentPage === 1 && tableSearch === "" && (
                  <tr style={{ backgroundColor: "#fafafa", borderBottom: "1px solid #e5e7eb", fontWeight: "600" }}>
                    <td style={{ padding: "12px", color: "#74788d" }}>-</td>
                    <td style={{ padding: "12px", color: "#5156be" }}>Opening Balance</td>
                    <td style={{ padding: "12px" }}>-</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>-</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>-</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>{formatCurrency(openingBalance)}</td>
                  </tr>
                )}

                {/* DATA ROWS */}
                {currentLedgerRows.map((l, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px" }}>{new Date(l.date).toLocaleDateString("en-IN")}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ backgroundColor: l.type === "Invoice" ? "#fef4e4" : "#e0f2f1", color: l.type === "Invoice" ? "#f1b44c" : "#00897b", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                        {l.type}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontWeight: "600", color: "#5156be" }}>{l.number}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>{l.debit > 0 ? formatCurrency(l.debit) : "-"}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>{l.credit > 0 ? formatCurrency(l.credit) : "-"}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: "600" }}>{formatCurrency(l.balance)}</td>
                  </tr>
                ))}

                {filteredLedger.length === 0 && (
                  <tr><td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#74788d" }}>No ledger records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {filteredLedger.length > entriesPerPage && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
              <span style={{ fontSize: "13px", color: "#74788d" }}>
                Showing {(currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filteredLedger.length)} of {filteredLedger.length} entries
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: "6px 12px", border: "1px solid #ced4da", borderRadius: "4px", backgroundColor: "#fff", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>Prev</button>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage * entriesPerPage >= filteredLedger.length} style={{ padding: "6px 12px", border: "1px solid #ced4da", borderRadius: "4px", backgroundColor: "#fff", cursor: currentPage * entriesPerPage >= filteredLedger.length ? "not-allowed" : "pointer" }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}