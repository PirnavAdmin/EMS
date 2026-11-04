import React from "react";
import { useLocation, useParams } from "react-router-dom";

import TicketForm from "./TicketForm";

function EditTicket() {
  const { ticketId } = useParams();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/employee/")
    ? "/employee/my-tickets"
    : "/admin/tickets";
  const role = location.pathname.startsWith("/employee/") ? "user" : "admin";

  return (
    <TicketForm
      mode="edit"
      role={role}
      basePath={basePath}
      ticketId={ticketId}
    />
  );
}

export default EditTicket;

