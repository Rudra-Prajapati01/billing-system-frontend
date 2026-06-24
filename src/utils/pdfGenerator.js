import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getLogoUrl } from "./logoUtil";

// Helper: Load image and return aspect ratio data
const loadImageAsBase64 = (url) => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const fullUrl = url.startsWith("http://") || url.startsWith("https://") 
      ? url 
      : getLogoUrl(url);

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
        console.error("Error drawing image to canvas:", e);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn("Failed to load image at:", fullUrl);
      resolve(null);
    };
    img.src = fullUrl;
  });
};

// Helper: Format currency (INR)
const formatCurrency = (amount) => {
  const num = parseFloat(amount || 0);
  return "INR " + num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// ==========================================
// MNC LEVEL COLOR PALETTE (Corporate Blue)
// ==========================================
const COLORS = {
  primary: [30, 64, 175],       // Deep Corporate Navy Blue (#1e40af)
  primaryLight: [239, 246, 255], // Very light blue for alternate rows
  textMain: [15, 23, 42],       // Very dark slate for readability
  textMuted: [100, 116, 139],   // Muted gray for labels
  borderLight: [203, 213, 225], // Soft borders
  white: [255, 255, 255]
};

const PAGE_BOTTOM = 285; // usable bottom margin on A4 (297mm tall)

// Layout: 1. Premium Header with Top Accent Bar
const drawHeader = (doc, title, docNo, companyInfo, logoObj) => {
  // Top Corporate Accent Bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 4, "F");

  let currentY = 18; // tightened from 22

  const rightAlignX = 195;

  // Left: INVOICE / QUOTATION Title
  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22); // tightened from 26
  doc.text(`${title.toUpperCase()}`, 15, currentY + 6);
  
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(10);
  doc.text(`Reference: #${docNo}`, 15, currentY + 12);

  // Right: Logo
  if (logoObj && logoObj.data) {
    try {
      const ratio = logoObj.width / logoObj.height;
      let targetHeight = 14; // tightened from 16
      let targetWidth = targetHeight * ratio;

      if (targetWidth > 55) {
        targetWidth = 55;
        targetHeight = targetWidth / ratio;
      }

      const logoX = rightAlignX - targetWidth;
      doc.addImage(logoObj.data, "PNG", logoX, currentY - 4, targetWidth, targetHeight);
      currentY += targetHeight + 1; 
    } catch (e) {
      console.error("Failed to add logo:", e);
    }
  }

  // ==========================================
  // Right: Company Details (MODIFIED SECTION)
  // ==========================================
  
  // Company Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.textMain);

  doc.text(
    companyInfo?.company_name || "COMPANY NAME",
    rightAlignX,
    currentY + 4,
    { align: "right" }
  );

  let detailsY = currentY + 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textMuted);
  // ==========================================

  // Strip a leading "Company Name," from the stored address (some records
  // save the company name as part of the address string), so it doesn't
  // print twice — once as the bold header, once inside the address block.
  const companyNameForCheck = (companyInfo?.company_name || "").trim().toLowerCase();
  let cleanAddress = (companyInfo?.address || "").trim();
  if (companyNameForCheck && cleanAddress.toLowerCase().startsWith(companyNameForCheck)) {
    cleanAddress = cleanAddress.slice(companyNameForCheck.length).replace(/^[,\s]+/, "");
  }

  if (cleanAddress) {
    const addrLines = doc.splitTextToSize(
      `${cleanAddress}, ${companyInfo.city || ""} - ${companyInfo.pincode || ""}`,
      70
    );
    addrLines.forEach(line => {
      doc.text(line, rightAlignX, detailsY, { align: "right" });
      detailsY += 3.5; // tightened from 4
    });
  }

  let contacts = [];
  if (companyInfo?.contact_no_1) contacts.push(`+91 ${companyInfo.contact_no_1}`);
  if (companyInfo?.contact_no_2) contacts.push(`+91 ${companyInfo.contact_no_2}`);
  if (contacts.length > 0) {
    doc.text(contacts.join("  |  "), rightAlignX, detailsY, { align: "right" });
    detailsY += 3.5;
  }

  if (companyInfo?.email) {
    doc.text(companyInfo.email, rightAlignX, detailsY, { align: "right" });
    detailsY += 3.5;
  }

  if (companyInfo?.gst_number) {
    doc.setTextColor(...COLORS.textMain);
    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN: ${companyInfo.gst_number}`, rightAlignX, detailsY, { align: "right" });
    detailsY += 3.5;
  }

  // Divider Line
  const headerMaxY = Math.max(currentY + 12, detailsY);
  doc.setDrawColor(...COLORS.borderLight); 
  doc.setLineWidth(0.5);
  doc.line(15, headerMaxY + 3, 195, headerMaxY + 3);

  return headerMaxY + 10; // tightened from +15
};

// Layout: 2. Invoiced To & Colored Meta Table
const drawBillingAndSummary = (doc, yStart, isInvoice, docNo, docDate, grandTotal, customer, balanceDue = null) => {
  // --- Left Side: Billed To ---
  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(isInvoice ? "BILLED TO:" : "QUOTED TO:", 15, yStart);

  const primaryName = customer?.company_name || customer?.customer_name || "Walk-in Customer";
  const attnName = customer?.customer_name || primaryName;

  doc.setTextColor(...COLORS.textMain);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5); // tightened from 11
  doc.text(primaryName, 15, yStart + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.textMuted);
  if (primaryName !== attnName) {
    doc.text(`Attn: ${attnName}`, 15, yStart + 10);
  }

  let addressY = yStart + 14.5; // tightened from +16
  const custAddress = customer?.address || customer?.billing_address || customer?.customer_address;
  if (custAddress) {
    const addrLines = doc.splitTextToSize(custAddress, 80);
    addrLines.forEach(line => {
      doc.text(line, 15, addressY);
      addressY += 3.8; // tightened from 4
    });
  }

  let regionParts = [];
  if (customer?.city) regionParts.push(customer.city);
  if (customer?.state) regionParts.push(customer.state);
  if (customer?.country) regionParts.push(customer.country);

  if (regionParts.length > 0) {
    let regionText = regionParts.join(", ");
    if (customer?.pincode) regionText += ` - ${customer.pincode}`;
    const regionLines = doc.splitTextToSize(regionText, 80);
    regionLines.forEach(line => {
      doc.text(line, 15, addressY);
      addressY += 3.8;
    });
  }
  
  const phoneNo = customer?.phone_no || customer?.mobile;
  if (phoneNo) {
    doc.text(`Phone: ${phoneNo}`, 15, addressY + 1);
    addressY += 4;
  }

  if (customer?.email) {
    doc.text(`Email: ${customer.email}`, 15, addressY + 1);
    addressY += 4;
  }

  const gstNo = customer?.gst_no || customer?.gst_number;
  if (gstNo) {
    doc.setTextColor(...COLORS.textMain);
    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN: ${gstNo}`, 15, addressY + 1);
    addressY += 4;
  }

  // --- Right Side: Highlighted Meta Table ---
  const metaX = 120;
  const col1Width = 32;
  const col2Width = 43;
  const rowHeight = 7; // tightened from 7.5
  let metaY = yStart - 4;

  const formattedDate = new Date(docDate).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });

  const dueDate = new Date(docDate);
  dueDate.setDate(dueDate.getDate() + 15);
  const formattedDueDate = dueDate.toLocaleDateString("en-IN", { 
    day: "2-digit", month: "short", year: "numeric" 
  });

  const displayAmount = (isInvoice && balanceDue !== null && balanceDue !== undefined) ? balanceDue : grandTotal;

  const rows = [
    [isInvoice ? "Invoice No" : "Quote No", docNo],
    [isInvoice ? "Invoice Date" : "Quote Date", formattedDate],
    ["Due Date", formattedDueDate],
    [isInvoice ? "Balance Due" : "Amount Due", formatCurrency(displayAmount)]
  ];

  if (!isInvoice) rows.splice(2, 1); 

  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.2);

  rows.forEach((row, i) => {
    const isAmountRow = row[0] === "Amount Due" || row[0] === "Balance Due";

    if (isAmountRow) {
      doc.setFillColor(...COLORS.primary);
      doc.rect(metaX, metaY, col1Width + col2Width, rowHeight + 1.5, "F");
    } else {
      doc.rect(metaX, metaY, col1Width + col2Width, rowHeight);
      doc.line(metaX + col1Width, metaY, metaX + col1Width, metaY + rowHeight);
    }
    
    doc.setFont("helvetica", isAmountRow ? "bold" : "normal");
    doc.setFontSize(isAmountRow ? 9.5 : 8.5);
    doc.setTextColor(...(isAmountRow ? COLORS.white : COLORS.textMuted));
    doc.text(row[0], metaX + 3, metaY + (isAmountRow ? 5.5 : 5));
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(isAmountRow ? COLORS.white : COLORS.textMain));
    doc.text(row[1], metaX + col1Width + 3, metaY + (isAmountRow ? 5.5 : 5));
    
    metaY += isAmountRow ? rowHeight + 1.5 : rowHeight;
  });

  return Math.max(addressY + 6, metaY + 6); // tightened from +8
};

// Layout: 3. Bank Details, Terms & Totals
const drawFooterBlocks = (doc, yStart, subtotal, gstAmount, grandTotal, bank, term, companyInfo, signatureObj, isInvoice = false, paidAmount = 0, balanceDue = 0) => {
  let currentY = yStart + 3;

  // --- Right Side: Highlighted Totals Table ---
  const totalsX = 120;
  const col1Width = 32;
  const col2Width = 43;
  const rowHeight = 6.5; // tightened from 8
  let totalY = currentY;

  const totals = [
    ["Sub Total", formatCurrency(subtotal)],
    ["GST Tax", formatCurrency(gstAmount)],
    ["Grand Total", formatCurrency(grandTotal)]
  ];

  if (isInvoice) {
    totals.push(["Paid Amount", formatCurrency(paidAmount)]);
    totals.push(["Balance Due", formatCurrency(balanceDue)]);
  }

  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.2);

  totals.forEach((row, i) => {
    const isLast = (i === totals.length - 1); 
    
    if (isLast) {
      doc.setFillColor(...COLORS.primary);
      doc.rect(totalsX, totalY, col1Width + col2Width, rowHeight + 1.5, "F");
    } else {
      doc.rect(totalsX, totalY, col1Width + col2Width, rowHeight);
      doc.line(totalsX + col1Width, totalY, totalsX + col1Width, totalY + rowHeight);
    }

    doc.setFont("helvetica", isLast ? "bold" : "normal");
    doc.setFontSize(isLast ? 9 : 8);
    doc.setTextColor(...(isLast ? COLORS.white : COLORS.textMuted));
    doc.text(row[0], totalsX + 3, totalY + (isLast ? 5 : 4.5));

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(isLast ? COLORS.white : COLORS.textMain));
    doc.text(row[1], totalsX + col1Width + col2Width - 3, totalY + (isLast ? 5 : 4.5), { align: "right" });
    
    totalY += isLast ? rowHeight + 1.5 : rowHeight;
  });

  // --- Left Side: BANK DETAILS & TERMS ---
  let leftY = currentY;

  if (bank && (bank.bank_name || bank.account_number)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.primary);
    doc.text("BANK PAYMENT DETAILS", 15, leftY + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5); // tightened from 8.5
    doc.setTextColor(...COLORS.textMain);
    
    let bankY = leftY + 8.5; // tightened from +10
    if (bank.bank_name) { doc.text(`Bank Name: ${bank.bank_name}`, 15, bankY); bankY += 3.8; }
    if (bank.account_holder_name) { doc.text(`Account Holder: ${bank.account_holder_name}`, 15, bankY); bankY += 3.8; }
    if (bank.account_number) { doc.text(`Account No: ${bank.account_number}   |   IFSC: ${bank.ifsc_code || '-'}`, 15, bankY); bankY += 3.8; }
    if (bank.branch_name) { doc.text(`Branch: ${bank.branch_name}`, 15, bankY); bankY += 3.8; }
    
    leftY = bankY + 2.5; 
  }

  if (term && term.description) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.primary);
    doc.text("TERMS & CONDITIONS", 15, leftY + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7); // tightened from 8
    doc.setTextColor(...COLORS.textMuted);

    const termLines = term.description.split("\n").filter(l => l.trim().length > 0);
    let lineY = leftY + 8; // tightened from +10
    termLines.forEach((line, index) => {
      const prefix = `${index + 1}. `;
      const lineText = line.trim().startsWith(index + 1) || line.trim().startsWith("-") 
        ? line.trim() 
        : prefix + line.trim();

      const wrapped = doc.splitTextToSize(lineText, 100);
      wrapped.forEach(wl => {
        doc.text(wl, 15, lineY);
        lineY += 3.4; // tightened from 4
      });
    });
    leftY = lineY;
  }

  // --- Signature Block ---
  let sigY = Math.max(totalY, leftY) + 8;
  if (signatureObj && signatureObj.data) {
    const sigRatio = signatureObj.width / signatureObj.height;
    const sigHeight = 11; // tightened from 14
    const sigWidth = sigHeight * sigRatio;
    doc.addImage(signatureObj.data, "PNG", totalsX + col1Width + col2Width - sigWidth, sigY, sigWidth, sigHeight);
    sigY += sigHeight + 3;
  } else {
    sigY += 11;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.textMain);
  doc.text("Authorized Signatory", totalsX + col1Width + col2Width, sigY, { align: "right" });

  return sigY + 6; // return final Y so caller knows total content height
};

// Watermark Function
const addWatermark = (doc, logoObj) => {
  if (!logoObj || !logoObj.data) return;
  const pageCount = doc.internal.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    try {
      doc.saveGraphicsState();
      // Set transparency to 6%
      const gState = new doc.GState({ opacity: 0.06 });
      doc.setGState(gState);
      
      const maxWmWidth = 140; 
      const maxWmHeight = 80; 
      
      let ratio = logoObj.width / logoObj.height;
      let wmWidth = maxWmWidth;
      let wmHeight = wmWidth / ratio;
      
      if (wmHeight > maxWmHeight) {
        wmHeight = maxWmHeight;
        wmWidth = wmHeight * ratio;
      }
      
      const x = (210 - wmWidth) / 2;
      const y = (297 - wmHeight) / 2;
      
      doc.addImage(logoObj.data, "PNG", x, y, wmWidth, wmHeight);
      doc.restoreGraphicsState();
    } catch (e) {
      console.warn("Watermark not supported:", e);
    }
  }
};

// Shared helper to render the items + (optional) payment history tables
const drawItemsAndPayments = (doc, startY, items, payments) => {
  autoTable(doc, {
    startY,
    head: [["Item Description", "Price", "Qty", "Total"]],
    body: items.map((item) => {
      const price = parseFloat(item.rate) || parseFloat(item.amount) || 0;
      const qty = parseFloat(item.qty) || 1;
      const total = parseFloat(item.total) || parseFloat(item.amount) || (price * qty);

      return [
        `${item.service_name}${item.description ? `\n${item.description}` : ''}`,
        formatCurrency(price),
        qty.toString(), 
        formatCurrency(total)
      ];
    }),
    theme: "striped", 
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9, fontStyle: "bold", halign: "left" },
    alternateRowStyles: { fillColor: COLORS.primaryLight },
    bodyStyles: { lineColor: COLORS.borderLight, lineWidth: 0.1, textColor: COLORS.textMain, valign: "top" },
    columnStyles: { 0: { cellWidth: 95 }, 1: { halign: "left", cellWidth: 30 }, 2: { halign: "center", cellWidth: 15 }, 3: { halign: "left", cellWidth: 40 } },
    styles: { fontSize: 8, cellPadding: 3.5 }, // tightened cellPadding from 5
    margin: { left: 15, right: 15 }
  });

  let finalY = doc.lastAutoTable.finalY;

  if (payments && payments.length > 0) {
    const titleY = finalY + 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.primary);
    doc.text("PAYMENT HISTORY", 15, titleY);

    autoTable(doc, {
      startY: titleY + 2,
      head: [["Payment Date", "Payment Mode", "Reference", "Amount Paid"]],
      body: payments.map(p => [
        new Date(p.payment_date).toLocaleDateString("en-IN"),
        p.payment_mode,
        p.transaction_ref || "-",
        formatCurrency(p.amount)
      ]),
      theme: "plain",
      headStyles: { fillColor: COLORS.primaryLight, textColor: COLORS.primary, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { textColor: COLORS.textMain },
      styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: COLORS.borderLight, lineWidth: 0.1 }, // tightened cellPadding from 4
      margin: { left: 15, right: 15 }
    });
    finalY = doc.lastAutoTable.finalY;
  }

  return finalY;
};

// Estimate how tall the footer block will be
const estimateFooterHeight = (bank, term, isInvoice) => {
  let bankLines = 0;
  if (bank && (bank.bank_name || bank.account_number)) {
    bankLines = 1; // title
    if (bank.bank_name) bankLines++;
    if (bank.account_holder_name) bankLines++;
    if (bank.account_number) bankLines++;
    if (bank.branch_name) bankLines++;
  }

  let termLines = 0;
  if (term && term.description) {
    termLines = 1 + term.description.split("\n").filter(l => l.trim().length > 0).length;
  }

  const totalsRows = isInvoice ? 5 : 3;

  const leftHeight = (bankLines > 0 ? bankLines * 3.8 + 6 : 0) + (termLines > 0 ? termLines * 3.4 + 6 : 0);
  const rightHeight = totalsRows * 6.5 + 1.5;

  return Math.max(leftHeight, rightHeight) + 20; // +20 for signature space
};

// MAIN EXPORT: Generate Invoice PDF
export const generateInvoicePDF = async (data) => {
  const { header, items, customer, bank, terms, companyInfo, payments } = data; // Receive payments
  
  // Debug Log added here
  console.log("COMPANY INFO PDF", companyInfo);

  const logoObj = await loadImageAsBase64(companyInfo?.logo);
  const signatureObj = await loadImageAsBase64(companyInfo?.signature);

  const doc = new jsPDF("p", "mm", "a4");

  const paidAmount = parseFloat(header.paid_amount) || 0;
  const grandTotal = parseFloat(header.grand_total) || 0;
  const balanceDue = header.outstanding_amount !== undefined ? parseFloat(header.outstanding_amount) : (grandTotal - paidAmount);

  const headerY = drawHeader(doc, "Invoice", header.invoice_no, companyInfo, logoObj);
  const summaryY = drawBillingAndSummary(doc, headerY, true, header.invoice_no, header.invoice_date, grandTotal, customer, balanceDue);

  const tableFinalY = drawItemsAndPayments(doc, summaryY + 3, items, payments);

  const projectedHeight = tableFinalY + estimateFooterHeight(bank, terms, true);
  if (projectedHeight > PAGE_BOTTOM) {
    console.warn(
      `Invoice content (${projectedHeight.toFixed(0)}mm) exceeds one page (${PAGE_BOTTOM}mm). ` +
      `Consider shortening Terms & Conditions text.`
    );
  }

  drawFooterBlocks(doc, tableFinalY, header.subtotal, header.gst_amount, grandTotal, bank, terms, companyInfo, signatureObj, true, paidAmount, balanceDue);

  addWatermark(doc, logoObj);
  doc.save(`Invoice-${header.invoice_no}.pdf`);
};

// MAIN EXPORT 2: Generate Quotation PDF
export const generateQuotationPDF = async (data) => {
  const { header, items, customer, bank, terms, companyInfo } = data;
  
  // Debug Log added here
  console.log("COMPANY INFO PDF", companyInfo);

  const logoObj = await loadImageAsBase64(companyInfo?.logo);
  const signatureObj = await loadImageAsBase64(companyInfo?.signature);

  const doc = new jsPDF("p", "mm", "a4");

  const grandTotal = parseFloat(header.grand_total) || 0;

  const headerY = drawHeader(doc, "Quotation", header.quotation_no, companyInfo, logoObj);
  const summaryY = drawBillingAndSummary(doc, headerY, false, header.quotation_no, header.quotation_date, grandTotal, customer);

  const tableFinalY = drawItemsAndPayments(doc, summaryY + 3, items, null);

  const projectedHeight = tableFinalY + estimateFooterHeight(bank, terms, false);
  if (projectedHeight > PAGE_BOTTOM) {
    console.warn(
      `Quotation content (${projectedHeight.toFixed(0)}mm) exceeds one page (${PAGE_BOTTOM}mm). ` +
      `Consider shortening Terms & Conditions text.`
    );
  }

  drawFooterBlocks(doc, tableFinalY, header.subtotal, header.gst_amount, grandTotal, bank, terms, companyInfo, signatureObj, false);

  addWatermark(doc, logoObj);
  doc.save(`Quotation-${header.quotation_no}.pdf`);
};