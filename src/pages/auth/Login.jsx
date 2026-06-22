import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiLock, FiUser, FiAlertCircle } from "react-icons/fi";
import apiClient from "../../services/apiClient";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Front-end validations
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post("/auth/login", {
        username: username.trim(),
        password: password.trim(),
      });

      if (response.data.success) {
        const { token, user } = response.data;
        const selectedCompanyId = user.company_id || "";

        if (rememberMe) {
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(user));
          localStorage.setItem("selectedCompanyId", selectedCompanyId);
          // Clear session storage to avoid duplication
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
        } else {
          sessionStorage.setItem("token", token);
          sessionStorage.setItem("user", JSON.stringify(user));
          localStorage.setItem("selectedCompanyId", selectedCompanyId);
          // Clear local storage to avoid duplication
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }

        navigate("/dashboard");
      } else {
        setError(response.data.message || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to connect to the server. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{hoverStyles}</style>
      
      <div style={styles.card}>
        {/* Brand/Logo Header */}
        <div style={styles.logoHeader}>
          <div style={styles.logoIcon}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
              <circle cx="12" cy="12" r="10" fill="#5156be" />
              <path
                d="M7 14.5 12 8l5 6.5"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <h2 style={styles.logoText}>Biling SaaS</h2>
        </div>

        {/* Welcome Section */}
        <div style={styles.welcomeSection}>
          <h3 style={styles.welcomeTitle}>Welcome Back !</h3>
          <p style={styles.welcomeSubtitle}>Sign in to continue to your billing console.</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={styles.alertContainer}>
            <FiAlertCircle style={styles.alertIcon} />
            <span style={styles.alertText}>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={styles.form}>
          {/* Username Input Group */}
          <div style={styles.inputGroup}>
            <label htmlFor="username" style={styles.label}>
              Username
            </label>
            <div style={styles.inputWrapper}>
              <FiUser style={styles.inputIcon} />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                style={styles.input}
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Password Input Group */}
          <div style={styles.inputGroup}>
            <div style={styles.labelRow}>
              <label htmlFor="password" style={styles.label}>
                Password
              </label>
            </div>
            <div style={styles.inputWrapper}>
              <FiLock style={styles.inputIcon} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={styles.input}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={loading}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div style={styles.rememberRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={styles.checkbox}
                disabled={loading}
              />
              Remember me
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-btn"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.spinnerWrapper}>
                <span className="spinner"></span> Logging in...
              </span>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        {/* Footer info */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            © {new Date().getFullYear()} Billing SaaS. Crafted with premium UI.
          </p>
        </div>
      </div>
    </div>
  );
}

// Inline CSS styles
const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f6fa",
    fontFamily: "'Inter', sans-serif",
    padding: "20px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
    border: "1px solid #e8ecf0",
    width: "100%",
    maxWidth: "460px",
    padding: "40px",
    display: "flex",
    flexDirection: "column",
  },
  logoHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "30px",
  },
  logoIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0,
  },
  welcomeSection: {
    textAlign: "center",
    marginBottom: "28px",
  },
  welcomeTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#495057",
    marginBottom: "6px",
    margin: 0,
  },
  welcomeSubtitle: {
    fontSize: "13px",
    color: "#74788d",
    margin: 0,
  },
  alertContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#fde8e8",
    border: "1px solid #fbd5d5",
    borderRadius: "8px",
    padding: "12px 16px",
    marginBottom: "20px",
    color: "#9b1c1c",
  },
  alertIcon: {
    flexShrink: 0,
  },
  alertText: {
    fontSize: "13px",
    fontWeight: "500",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#495057",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "#adb5bd",
  },
  input: {
    width: "100%",
    padding: "12px 16px 12px 42px",
    fontSize: "14px",
    color: "#495057",
    backgroundColor: "#ffffff",
    border: "1px solid #ced4da",
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
  },
  eyeButton: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    color: "#74788d",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  rememberRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "2px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#74788d",
    cursor: "pointer",
  },
  checkbox: {
    accentColor: "#5156be",
    width: "15px",
    height: "15px",
  },
  submitBtn: {
    backgroundColor: "#5156be",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease-in-out",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  footer: {
    marginTop: "35px",
    textAlign: "center",
  },
  footerText: {
    fontSize: "12px",
    color: "#74788d",
    margin: 0,
  },
};

// CSS styles to inject via tag for animations and active pseudo-classes
const hoverStyles = `
  .login-btn:hover {
    background-color: #4348a3 !important;
  }
  .login-btn:active {
    transform: translateY(1px);
  }
  input:focus {
    border-color: #5156be !important;
    box-shadow: 0 0 0 3px rgba(81, 86, 190, 0.15) !important;
  }
  .spinner {
    width: 16px;
    height: 16px;
    border: 2.2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #ffffff;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
