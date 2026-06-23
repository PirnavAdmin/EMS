const API_ORIGIN = (
  import.meta.env.VITE_API_ORIGIN ||
  "http://16.112.124.216:5007"
).replace(/\/+$/, "");
 
export const SERVER_URL = API_ORIGIN;
export const BASE_URL = `${API_ORIGIN}/api`;
 
 
