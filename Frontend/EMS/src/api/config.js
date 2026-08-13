const API_ORIGIN = (
    import.meta.env.VITE_API_ORIGIN ||
    "https://cabbage-dramatic-majesty.ngrok-free.dev"
).replace(/\/+$/, "");
 
export const SERVER_URL = API_ORIGIN;
export const BASE_URL = `${API_ORIGIN}/api`;
 
 
 
 