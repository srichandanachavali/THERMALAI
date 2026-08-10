import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Every request carries the JWT so protected endpoints authenticate. Attached
// centrally so callers can't forget the header and get a silent 401.
const client = axios.create({ baseURL: BASE_URL });
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("thermalai_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 means the token is missing/expired — clear it and bounce to login so
// the user isn't left staring at a silently failing page.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("thermalai_token");
      localStorage.removeItem("token");
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export const getReactors = async () => {
  const response = await client.get("/reactors");
  return response.data;
};

export const getReactorById = async (id) => {
  const response = await client.get(`/reactors/${id}`);
  return response.data;
};

export const getReactorHistory = async (id) => {
  const response = await client.get(`/reactors/${id}/history`);
  return response.data;
};

export const getAlerts = async () => {
  const response = await client.get("/alerts");
  return response.data;
};

export const resolveAlert = async (id) => {
  const response = await client.put(`/alerts/${id}/resolve`);
  return response.data;
};

export const simulateRunaway = async (reactorId) => {
  const response = await client.post(`/simulate/${reactorId}`);
  return response.data;
};
