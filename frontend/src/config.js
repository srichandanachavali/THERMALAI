const config = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
  ML_URL: process.env.REACT_APP_ML_URL || 'http://localhost:5001'
};

export default config;