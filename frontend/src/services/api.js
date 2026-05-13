import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const getReactors = async () => {
  const response = await axios.get(`${BASE_URL}/reactors`);
  return response.data;
};

export const getReactorById = async (id) => {
  const response = await axios.get(`${BASE_URL}/reactors/${id}`);
  return response.data;
};

export const getReactorHistory = async (id) => {
  const response = await axios.get(`${BASE_URL}/reactors/${id}/history`);
  return response.data;
};

export const getAlerts = async () => {
  const response = await axios.get(`${BASE_URL}/alerts`);
  return response.data;
};

export const resolveAlert = async (id) => {
  const response = await axios.put(`${BASE_URL}/alerts/${id}/resolve`);
  return response.data;
};
