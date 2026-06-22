import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");

  if (!token || !userStr) {
    // Clear any partial session details to prevent state sync issues
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  let user = null;
  try {
    user = JSON.parse(userStr);
  } catch (error) {
    console.error("Error parsing user session data:", error);
    return <Navigate to="/login" replace />;
  }

  // Force active check (if the user object in session has inactive, block access)
  if (user && user.status === "Inactive") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  // If page requires SuperAdmin privileges and current user is not SuperAdmin, redirect to dashboard
  if (adminOnly && user.role !== "SuperAdmin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
