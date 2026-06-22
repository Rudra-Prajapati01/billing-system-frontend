import React, { useState, useEffect, useRef } from "react";
import { FiX, FiSave } from "react-icons/fi";
import apiClient from "../services/apiClient";

const ModalOverlay = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackgroundClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackgroundClick}
      style={{
        position: "fixed",
        top: 0, left: 0, width: "100vw", height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, padding: "16px", boxSizing: "border-box"
      }}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          width: "100%", maxWidth: "500px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
          display: "flex", flexDirection: "column"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: "0", fontSize: "16px", color: "#5156be", fontWeight: "600" }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#74788d", display: "flex", alignItems: "center" }}>
            <FiX size={20} />
          </button>
        </div>
        <div style={{ padding: "24px", color: "#495057", fontSize: "13px" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" };
const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", color: "#495057", backgroundColor: "#fff", boxSizing: "border-box", marginBottom: "16px" };
const errorStyle = { color: "#f46a6a", fontSize: "12px", marginTop: "-12px", marginBottom: "16px", display: "block" };
const buttonStyle = { backgroundColor: "#5156be", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", width: "100%" };

export const QuickAddCustomer = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    customer_name: "", company_name: "", phone: "", email: "", address: "", city: "", state: "", country: "India", gst_number: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ customer_name: "", company_name: "", phone: "", email: "", address: "", city: "", state: "", country: "India", gst_number: "" });
      setError(null);
    }
  }, [isOpen]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) return setError(validationError);

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post("/customers", formData);
      if (res.data.success && res.data.customerId) {
        onSuccess(String(res.data.customerId));
        onClose();
      } else {
        setError(res.data.message || "Failed to add customer");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || err.response?.data?.message || "Error adding customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose} title="Quick Add Customer">
      <form onSubmit={handleSubmit}>
        {error && <span style={errorStyle}>{error}</span>}
        
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>Customer Name *</label><input type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} required style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>Company Name *</label><input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required style={inputStyle} /></div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>Phone *</label><input type="text" name="phone" value={formData.phone} onChange={handleChange} required style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} style={inputStyle} /></div>
        </div>

        <label style={labelStyle}>Address *</label>
        <textarea name="address" value={formData.address} onChange={handleChange} required style={{ ...inputStyle, resize: "vertical", height: "60px" }} />

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>City *</label><input type="text" name="city" value={formData.city} onChange={handleChange} required style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>State *</label><input type="text" name="state" value={formData.state} onChange={handleChange} required style={inputStyle} /></div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>Country *</label><input type="text" name="country" value={formData.country} onChange={handleChange} required style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>GST Number</label><input type="text" name="gst_number" value={formData.gst_number} onChange={handleChange} style={inputStyle} /></div>
        </div>

        <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>
          <FiSave /> {loading ? "Saving..." : "Save Customer"}
        </button>
      </form>
    </ModalOverlay>
  );
};

export const QuickAddBank = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    bank_name: "", account_holder_name: "", account_number: "", ifsc_code: "", branch_name: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ bank_name: "", account_holder_name: "", account_number: "", ifsc_code: "", branch_name: "" });
      setError(null);
    }
  }, [isOpen]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const validateForm = () => {
    const { bank_name, account_holder_name, account_number, ifsc_code } = formData;

    if (!bank_name.trim()) return "Bank Name is required.";
    if (!account_holder_name.trim()) return "Account Holder Name is required.";
    if (!account_number.trim()) return "Account Number is required.";
    if (!ifsc_code.trim()) return "IFSC Code is required.";

    if (account_number.trim().length < 6) {
      return "Account Number must be at least 6 digits.";
    }
    if (ifsc_code.trim().length !== 11) {
      return "IFSC Code must be exactly 11 characters.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) return setError(validationError);

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post("/banks", formData);
      if (res.data.success && res.data.bankId) {
        onSuccess(String(res.data.bankId));
        onClose();
      } else {
        setError(res.data.message || "Failed to add bank");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Error adding bank");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose} title="Quick Add Bank">
      <form onSubmit={handleSubmit}>
        {error && <span style={errorStyle}>{error}</span>}
        
        <label style={labelStyle}>Bank Name *</label>
        <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} required style={inputStyle} />

        <label style={labelStyle}>Account Holder Name *</label>
        <input type="text" name="account_holder_name" value={formData.account_holder_name} onChange={handleChange} required style={inputStyle} />

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>Account Number *</label><input type="text" name="account_number" value={formData.account_number} onChange={handleChange} required style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>IFSC Code *</label><input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} required style={inputStyle} /></div>
        </div>

        <label style={labelStyle}>Branch Name</label>
        <input type="text" name="branch_name" value={formData.branch_name} onChange={handleChange} style={inputStyle} />

        <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>
          <FiSave /> {loading ? "Saving..." : "Save Bank"}
        </button>
      </form>
    </ModalOverlay>
  );
};

export const QuickAddTerms = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ title: "", description: "", status: "Active" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ title: "", description: "", status: "Active" });
      setError(null);
    }
  }, [isOpen]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const validateForm = () => {
    if (!formData.title.trim()) return "Terms Title is required.";
    if (!formData.description.trim()) return "Description is required.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) return setError(validationError);

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post("/terms", formData);
      if (res.data.success && res.data.termsId) {
        onSuccess(String(res.data.termsId));
        onClose();
      } else {
        setError(res.data.message || "Failed to add terms");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Error adding terms");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose} title="Quick Add Terms & Conditions">
      <form onSubmit={handleSubmit}>
        {error && <span style={errorStyle}>{error}</span>}
        
        <label style={labelStyle}>Title *</label>
        <input type="text" name="title" value={formData.title} onChange={handleChange} required style={inputStyle} />

        <label style={labelStyle}>Description *</label>
        <textarea name="description" value={formData.description} onChange={handleChange} required rows="5" style={{ ...inputStyle, resize: "vertical" }} />

        <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>
          <FiSave /> {loading ? "Saving..." : "Save Terms"}
        </button>
      </form>
    </ModalOverlay>
  );
};
