import React, { useState, useEffect } from "react";
import { 
  FiEdit2, 
  FiArrowLeft, 
  FiSave, 
  FiUpload, 
  FiTrash2, 
  FiAlertCircle, 
  FiCheckCircle,
  FiPlus,
  FiX
} from "react-icons/fi";
import apiClient from "../../services/apiClient";
import { getImageUrl } from "../../utils/logoUtil";

const API_URL = "/company-profile";

export default function CompanyProfile() {
  // UI & Data States
  const [showForm, setShowForm] = useState(false); // Form ko hide/show karne ke liye
  const [profileId, setProfileId] = useState(null);
  const [banks, setBanks] = useState([]);
  const [profilesList, setProfilesList] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form State Values
  const initialFormState = {
    company_name: "",
    owner_name: "",
    gst_number: "",
    legal_name: "",
    pan_number: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    contact_no_1: "",
    contact_no_2: "",
    bank_id: "",
    show_contact1_bill: true,
    show_contact2_bill: true,
    show_email_bill: true,
    show_website_bill: true
  };

  const [formData, setFormData] = useState(initialFormState);

  // Uploaded Files State
  const [logoFile, setLogoFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);

  // File Preview States
  const [logoPreview, setLogoPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_URL);
      
      // Backend array return kar raha hai ya single object, dono handle ho jayenge
      const fetchedProfiles = response.data.profiles || (response.data.profile ? [response.data.profile] : []);
      const fetchedBanks = response.data.banks || [];
      
      setProfilesList(fetchedProfiles);
      setBanks(fetchedBanks);
      setError(null);
    } catch (err) {
      console.error("Error loading company profiles:", err);
      setError("Failed to load company profiles. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setProfileId(null);
    setFormData(initialFormState);
    setLogoPreview(null);
    setSignaturePreview(null);
    setLogoFile(null);
    setSignatureFile(null);
    setShowForm(true);
  };

  const handleEdit = (profile) => {
    console.log("PROFILE LOGO", profile.logo);

    setProfileId(profile.id);
    
    setFormData({
      company_name: profile.company_name || "",
      owner_name: profile.owner_name || "",
      gst_number: profile.gst_number || "",
      legal_name: profile.legal_name || "",
      pan_number: profile.pan_number || "",
      email: profile.email || "",
      website: profile.website || "",
      address: profile.address || "",
      city: profile.city || "",
      state: profile.state || "",
      pincode: profile.pincode || "",
      contact_no_1: profile.contact_no_1 || "",
      contact_no_2: profile.contact_no_2 || "",
      bank_id: profile.bank_id || "",
      show_contact1_bill: !!profile.show_contact1_bill,
      show_contact2_bill: !!profile.show_contact2_bill,
      show_email_bill: !!profile.show_email_bill,
      show_website_bill: !!profile.show_website_bill
    });

    setLogoPreview(profile.logo ? getImageUrl(profile.logo) : null);
    setSignaturePreview(profile.signature ? getImageUrl(profile.signature) : null);
    
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleFileChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = (inputId, setFile, setPreview) => {
    setFile(null);
    setPreview(null);
    const fileInput = document.getElementById(inputId);
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.company_name.trim()) {
      setError("Company Name is required.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      data.append(key, formData[key]);
    });

    if (logoFile) data.append("logo", logoFile);
    if (signatureFile) data.append("signature", signatureFile);

    setLoading(true);
    try {
      // CRITICAL: Do NOT set Content-Type header manually.
      // When using FormData, the browser automatically sets
      // 'Content-Type: multipart/form-data; boundary=----xxxx'
      // Manually setting 'multipart/form-data' strips the boundary,
      // causing Multer on the backend to receive req.files = undefined.
      if (profileId) {
        const response = await apiClient.put(`${API_URL}/${profileId}`, data);
        setSuccess(response.data.message || "Company Profile updated successfully!");
      } else {
        const response = await apiClient.post(API_URL, data);
        setSuccess(response.data.message || "Company Profile saved successfully!");
      }

      // Reset file states so old blobs don't linger
      setLogoFile(null);
      setSignatureFile(null);
      const logoInput = document.getElementById("logoInput");
      const sigInput = document.getElementById("signatureInput");
      if (logoInput) logoInput.value = "";
      if (sigInput) sigInput.value = "";

      setError(null);
      await loadProfiles();
      setShowForm(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      console.error("Error saving profile details:", err);
      const errMsg = err.response?.data?.error || err.response?.data?.details || "Failed to save Company Profile.";
      setError(errMsg);
      setSuccess(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  // Styles definitions
  const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#495057", marginBottom: "6px" };
  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", outline: "none", fontSize: "14px", color: "#495057", backgroundColor: "#fff", boxSizing: "border-box" };
  const toggleLabelStyle = { display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#5156be", fontWeight: "600", cursor: "pointer", marginTop: "6px" };

  console.log("LOGO PREVIEW", logoPreview);

  return (
    <div style={{ padding: "24px", backgroundColor: "#f3f4f6", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER BAR WITH ADD BUTTON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ borderBottom: "2px solid #5156be", paddingBottom: "8px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#495057", margin: "0" }}>Company Profile Master</h2>
        </div>
        {!showForm && (
          <button 
            onClick={handleAddNew}
            style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#5156be", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
          >
            <FiPlus size={16} /> Add Company
          </button>
        )}
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

      {/* 1. ENTRY FORM (ONLY SHOWS WHEN 'ADD COMPANY' OR 'EDIT' IS CLICKED) */}
      {showForm && (
        <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", padding: "24px", marginBottom: "24px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
            <h3 style={{ margin: "0", fontSize: "16px", color: "#5156be" }}>{profileId ? "Edit Company Profile" : "Create New Company"}</h3>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#74788d", display: "flex", alignItems: "center", gap: "4px" }}>
              <FiX size={18} /> Close
            </button>
          </div>

          {loading && <div style={{ fontSize: "14px", color: "#74788d", marginBottom: "16px" }}>Processing details, please wait...</div>}

          <form onSubmit={handleSubmit}>
            {/* Row 1: Company Name & Owner Name */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={labelStyle}>Company Name <span style={{ color: "#f46a6a" }}>*</span></label>
                <input type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} style={inputStyle} required placeholder="Enter registered company name" />
              </div>
              <div>
                <label style={labelStyle}>Owner Name</label>
                <input type="text" name="owner_name" value={formData.owner_name} onChange={handleInputChange} style={inputStyle} placeholder="Enter owner name" />
              </div>
            </div>

            {/* Row 2: Address */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Address</label>
              <textarea name="address" rows="3" value={formData.address} onChange={handleInputChange} style={{ ...inputStyle, resize: "none", lineHeight: "1.5" }} placeholder="Enter building or local street details" />
            </div>

            {/* Row 3: State, City, Pincode */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div><label style={labelStyle}>State</label><input type="text" name="state" value={formData.state} onChange={handleInputChange} style={inputStyle} placeholder="e.g. Gujarat" /></div>
              <div><label style={labelStyle}>City</label><input type="text" name="city" value={formData.city} onChange={handleInputChange} style={inputStyle} placeholder="e.g. Ahmedabad" /></div>
              <div><label style={labelStyle}>Pincode</label><input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} style={inputStyle} placeholder="e.g. 380001" /></div>
            </div>

            {/* Row 4: Contact 1 & Contact 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={labelStyle}>Contact No 1</label>
                <input type="text" name="contact_no_1" value={formData.contact_no_1} onChange={handleInputChange} style={inputStyle} placeholder="Enter primary contact number" />
                <label style={toggleLabelStyle}><input type="checkbox" name="show_contact1_bill" checked={formData.show_contact1_bill} onChange={handleInputChange} /> Show Contact 1 In Bill</label>
              </div>
              <div>
                <label style={labelStyle}>Contact No 2</label>
                <input type="text" name="contact_no_2" value={formData.contact_no_2} onChange={handleInputChange} style={inputStyle} placeholder="Enter secondary contact number" />
                <label style={toggleLabelStyle}><input type="checkbox" name="show_contact2_bill" checked={formData.show_contact2_bill} onChange={handleInputChange} /> Show Contact 2 In Bill</label>
              </div>
            </div>

            {/* Row 5: Email & Website */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} style={inputStyle} placeholder="e.g. info@company.com" />
                <label style={toggleLabelStyle}><input type="checkbox" name="show_email_bill" checked={formData.show_email_bill} onChange={handleInputChange} /> Show Email In Bill</label>
              </div>
              <div>
                <label style={labelStyle}>Website</label>
                <input type="text" name="website" value={formData.website} onChange={handleInputChange} style={inputStyle} placeholder="e.g. www.company.com" />
                <label style={toggleLabelStyle}><input type="checkbox" name="show_website_bill" checked={formData.show_website_bill} onChange={handleInputChange} /> Show Website In Bill</label>
              </div>
            </div>

            {/* Row 6: PAN Number & GST Number & Legal Name */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div><label style={labelStyle}>PAN Number</label><input type="text" name="pan_number" value={formData.pan_number} onChange={handleInputChange} style={inputStyle} placeholder="Enter 10-digit PAN" /></div>
              <div><label style={labelStyle}>GST Number</label><input type="text" name="gst_number" value={formData.gst_number} onChange={handleInputChange} style={inputStyle} placeholder="Enter 15-digit GSTIN" /></div>
              <div><label style={labelStyle}>Legal Name</label><input type="text" name="legal_name" value={formData.legal_name} onChange={handleInputChange} style={inputStyle} placeholder="Enter official business name" /></div>
            </div>



            {/* Row 8: Company Logo & Signature Uploads */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "16px", backgroundColor: "#f9fafb" }}>
                <label style={labelStyle}>Company Logo Upload</label>
                <input id="logoInput" type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLogoFile, setLogoPreview)} style={{ fontSize: "13px", width: "100%", marginBottom: "12px" }} />
                {logoPreview && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", border: "1px solid #ced4da", padding: "8px", borderRadius: "4px", backgroundColor: "#fff" }}>
                    <img
                      src={logoPreview}
                      alt="Company Logo"
                      style={{ height: "70px", minWidth: "120px", objectFit: "contain" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <button type="button" onClick={() => handleRemoveFile("logoInput", setLogoFile, setLogoPreview)} style={{ backgroundColor: "#f46a6a", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center" }}><FiTrash2 size={13} /></button>
                  </div>
                )}
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "16px", backgroundColor: "#f9fafb" }}>
                <label style={labelStyle}>Company Signature Upload</label>
                <input id="signatureInput" type="file" accept="image/*" onChange={(e) => handleFileChange(e, setSignatureFile, setSignaturePreview)} style={{ fontSize: "13px", width: "100%", marginBottom: "12px" }} />
                {signaturePreview && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", border: "1px solid #ced4da", padding: "8px", borderRadius: "4px", backgroundColor: "#fff" }}>
                    <img
                      src={signaturePreview}
                      alt="Company Signature"
                      style={{ height: "65px", width: "160px", objectFit: "contain" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <button type="button" onClick={() => handleRemoveFile("signatureInput", setSignatureFile, setSignaturePreview)} style={{ backgroundColor: "#f46a6a", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center" }}><FiTrash2 size={13} /></button>
                  </div>
                )}
              </div>
            </div>

            {/* Row 9: Bank Dropdown */}
            <div style={{ marginBottom: "28px" }}>
              <label style={labelStyle}>Bank Account Setup</label>
              <select name="bank_id" value={formData.bank_id} onChange={handleInputChange} style={inputStyle}>
                <option value="">-- Select Bank Account --</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bank_name} - {bank.account_number} ({bank.branch_name})
                  </option>
                ))}
              </select>
            </div>

            {/* FOOTER ACTION BUTTONS */}
            <div style={{ display: "flex", gap: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
              <button type="submit" disabled={loading} style={{ backgroundColor: "#5156be", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "6px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <FiSave size={14} />
                {profileId ? "Update Profile" : "Save Profile"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ backgroundColor: "#fff", color: "#495057", border: "1px solid #ced4da", padding: "10px 24px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. DATA LIST GRID (ALWAYS VISIBLE) */}
      <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", color: "#495057", height: "45px", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Company Name</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Owner</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Mobile</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Email</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>GST Number</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>City</th>
                <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {profilesList.length > 0 ? (
                profilesList.map((item, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: "#fff", height: "50px", transition: "background-color 0.2s" }}>
                    <td style={{ padding: "12px 16px", color: "#333", fontWeight: "600" }}>{item.company_name || "-"}</td>
                    <td style={{ padding: "12px 16px", color: "#555" }}>{item.owner_name || "-"}</td>
                    <td style={{ padding: "12px 16px", color: "#555" }}>{item.contact_no_1 || "-"}</td>
                    <td style={{ padding: "12px 16px", color: "#555" }}>{item.email || "-"}</td>
                    <td style={{ padding: "12px 16px", color: "#333" }}>{item.gst_number || "-"}</td>
                    <td style={{ padding: "12px 16px", color: "#555" }}>{item.city ? `${item.city}, ${item.state}` : "-"}</td>
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button 
                          onClick={() => handleEdit(item)} 
                          style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#eef2f7", color: "#5156be", border: "1px solid #d4d8ea", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "500" }}
                        >
                          <FiEdit2 size={12} /> Edit
                        </button>
                        <button style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#fef1f2", color: "#f46a6a", border: "1px solid #fbdcde", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "500" }}>
                          <FiTrash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ padding: "30px", textAlign: "center", color: "#74788d", fontSize: "14px" }}>
                    No company profiles found. Click "Add Company" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}