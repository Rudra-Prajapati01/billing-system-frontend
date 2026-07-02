import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
export const SERVER_URL = API_BASE_URL.replace("/api", "");

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (
        status === 401 ||
        data?.code === "USER_INACTIVE" ||
        data?.code === "TOKEN_INVALID" ||
        data?.code === "COMPANY_INACTIVE"
      ) {
        // Clear auth data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("selectedCompanyId");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        
        // Redirect if not already on login
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
