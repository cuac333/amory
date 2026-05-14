import axios from "axios";

const SERVER_BASE = "http://47.108.186.1/amory";

const api = axios.create({
  baseURL: `${SERVER_BASE}/api`,
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

// Resolve relative image paths (e.g. /uploads/images/xxx) to absolute server URLs
function resolveImageUrls(obj: any): any {
  if (Array.isArray(obj)) return obj.map(resolveImageUrls);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const k in obj) {
      if ((k === "photo_url" || k === "image_url" || k === "avatar_url") && typeof obj[k] === "string" && obj[k].startsWith("/")) {
        out[k] = SERVER_BASE + obj[k];
      } else {
        out[k] = resolveImageUrls(obj[k]);
      }
    }
    return out;
  }
  return obj;
}

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object") {
      response.data = resolveImageUrls(addUtcSuffix(response.data));
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
