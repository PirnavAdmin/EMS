import React from "react";
import { useLocation } from "react-router-dom";

import TicketForm from "./TicketForm";

function CreateTicket() {
  const location = useLocation();
  const basePath = location.pathname.startsWith("/employee/")
    ? "/employee/my-tickets"
    : "/admin/tickets";
  const role = location.pathname.startsWith("/employee/") ? "user" : "admin";

  return <TicketForm mode="create" role={role} basePath={basePath} />;
}

export default CreateTicket;

