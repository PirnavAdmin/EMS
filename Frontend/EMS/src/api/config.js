const API_ORIGIN = (
    import.meta.env.VITE_API_ORIGIN ||
    // "https://trimestral-flusteredly-patrice.ngrok-free.dev"
    //  "https://cabbage-dramatic-majesty.ngrok-free.dev"
    //  "https://marian-undeported-shanon.ngrok-free.dev"
    "https://hrms.pirnav.com"
).replace(/\/+$/, "");

export const SERVER_URL = API_ORIGIN;
export const BASE_URL = `${API_ORIGIN}/api`;