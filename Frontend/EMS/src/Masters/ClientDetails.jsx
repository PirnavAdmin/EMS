import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { PageSkeleton } from "../components/Skeletons";
 
function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
 
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
 
  useEffect(() => {
    if (!id) {
      setError("Invalid Client ID");
      setLoading(false);
      return;
    }
 
    const fetchClient = async () => {
      try {
        const response = await api.get(API_ENDPOINTS.masters.clients.byId(id));

        const data = response.data;
        setClient(data);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
 
    fetchClient();
  }, [id]);
 
  /* ================= UI STATES ================= */
 
  if (loading) {
    return (
      <div style={{ padding: "30px" }}>
        <PageSkeleton variant="form" formFields={6} formColumns={1} />
      </div>
    );
  }
 
  if (error) {
    return (
      <div style={{ padding: "30px" }}>
        <button onClick={() => navigate("/clients")}>
          ← Back
        </button>
        <h3 style={{ color: "red", marginTop: "20px" }}>
          {error}
        </h3>
      </div>
    );
  }
 
  if (!client) {
    return (
      <div style={{ padding: "30px" }}>
        <button onClick={() => navigate("/clients")}>
          ← Back
        </button>
        <p style={{ marginTop: "20px" }}>
          No client data found.
        </p>
      </div>
    );
  }
 
  /* ================= MAIN VIEW ================= */
 
  return (
    <div style={{ padding: "30px", maxWidth: "700px" }}>
      <button
        onClick={() => navigate("/clients")}
        style={{
          marginBottom: "20px",
          padding: "8px 14px",
          cursor: "pointer"
        }}
      >
        ← Back
      </button>
 
      <h2>{client.client_Name}</h2>
 
      <div className="client-details-copy" style={{ marginTop: "20px" }}>
        <p><strong>ID:</strong> {client.id}</p>
        <p><strong>Description:</strong> {client.description}</p>
        <p><strong>Location:</strong> {client.location}</p>
        <p><strong>Phone:</strong> {client.phone}</p>
        <p><strong>Email:</strong> {client.email}</p>
        <p><strong>Active Projects:</strong> {client.active_Projects}</p>
      </div>
    </div>
  );
}
 
export default ClientDetails;
 
