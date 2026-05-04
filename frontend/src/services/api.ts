import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Append Z to naive ISO datetime strings so the browser treats them as UTC
function addUtcSuffix(obj: any): any {
  if (typeof obj === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj) && !obj.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(obj)) {
    return obj + "Z";
  }
  if (Array.isArray(obj)) return obj.map(addUtcSuffix);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const k in obj) out[k] = addUtcSuffix(obj[k]);
    return out;
  }
  return obj;
}

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object") {
      response.data = addUtcSuffix(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
