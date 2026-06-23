const API_ORIGIN = (
  import.meta.env.VITE_API_ORIGIN ||
  "https://hrms.pirnav.com"
).replace(/\/+$/, "");
 
export const SERVER_URL = API_ORIGIN;
export const BASE_URL = `${API_ORIGIN}/api`;
 
 
