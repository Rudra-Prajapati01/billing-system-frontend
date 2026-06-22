import React, { useState, useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";
import apiClient from "./services/apiClient";

function App() {
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    const verifySession = async () => {
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        const response = await apiClient.get("/auth/me");
        if (response.data.success) {
          // Sync user info
          const isLocal = !!localStorage.getItem("token");
          if (isLocal) {
            localStorage.setItem("user", JSON.stringify(response.data.user));
          } else {
            sessionStorage.setItem("user", JSON.stringify(response.data.user));
          }
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        // The apiClient response interceptor handles auth cleanup automatically
      } finally {
        setCheckingAuth(false);
      }
    };

    verifySession();
  }, []);

  if (checkingAuth) {
    return (
      <div style={spinnerStyles.container}>
        <div style={spinnerStyles.spinner}></div>
        <p style={spinnerStyles.text}>Verifying session, please wait...</p>
      </div>
    );
  }

  return <AppRoutes />;
}

const spinnerStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f6fa",
    fontFamily: "'Inter', sans-serif"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid rgba(81, 86, 190, 0.15)",
    borderRadius: "50%",
    borderTopColor: "#5156be",
    animation: "spinApp 1s linear infinite",
  },
  text: {
    marginTop: "16px",
    fontSize: "14px",
    color: "#74788d",
    fontWeight: "500"
  }
};

// Inject animation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes spinApp {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default App;