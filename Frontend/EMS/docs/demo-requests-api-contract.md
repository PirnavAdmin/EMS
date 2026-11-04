<!-- <!-- # Demo Requests API Contract

This contract describes the backend integration expected by the frontend. The
current frontend service stores records in browser `localStorage` and does not
send email. Production email delivery, threading, authorization, validation,
and soft deletion must be implemented by the backend.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/demo-requests` | Submit a demo request; notify Super Admin and optionally acknowledge the client |
| `GET` | `/api/demo-requests` | Fetch requests for authorized Super Admin users |
| `GET` | `/api/demo-requests/{id}` | Fetch one request including reply history |
| `POST` | `/api/demo-requests/{id}/reply` | Send a client email and persist the reply |
| `DELETE` | `/api/demo-requests/{id}` | Soft-delete a request |

## Status values

`Pending` is assigned at submission. A successful admin reply changes the
request to `Replied`. `Closed` is reserved for a future close/reopen workflow.
Deleted requests should be omitted from normal list responses while remaining
recoverable according to backend retention policy.

## Submit request

`POST /api/demo-requests`

```json
{
  "fullName": "Jordan Lee",
  "workEmail": "jordan.lee@example.com",
  "phoneNumber": "+1 555 010 2040",
  "companyName": "Northstar Group",
  "designation": "HR Director",
  "industry": "Professional Services",
  "companySize": "101-250 Employees",
  "interestedModules": ["Attendance", "Payroll"],
  "preferredDemoDate": "2027-01-15",
  "preferredTime": "14:30",
  "message": "Please include multi-location attendance."
}
```

Successful response (`201 Created`):

```json
{
  "id": "DR-20270115-000042",
  "status": "Pending",
  "submittedAt": "2027-01-01T10:20:30Z",
  "fullName": "Jordan Lee",
  "workEmail": "jordan.lee@example.com",
  "phoneNumber": "+1 555 010 2040",
  "companyName": "Northstar Group",
  "designation": "HR Director",
  "industry": "Professional Services",
  "companySize": "101-250 Employees",
  "interestedModules": ["Attendance", "Payroll"],
  "preferredDemoDate": "2027-01-15",
  "preferredTime": "14:30",
  "message": "Please include multi-location attendance.",
  "replies": []
}
```

The backend should notify the Super Admin with all submitted fields and a
secure link/action to the request. A client acknowledgement may use the
frontend-prepared subject/body in `src/services/demoRequestEmailTemplates.js`;
the backend owns delivery and templates in production.

## List and detail

`GET /api/demo-requests` should return an array of the response objects above,
ordered newest first. Pagination may be added with `page`, `pageSize`, `q`, and
`status` query parameters; a paged response can use `{ items, page, pageSize,
total }`.

`GET /api/demo-requests/{id}` returns one complete request, including:

```json
{
  "id": "DR-20270115-000042",
  "status": "Replied",
  "submittedAt": "2027-01-01T10:20:30Z",
  "replies": [
    {
      "id": "reply-0001",
      "subject": "Re: Demo Request - Northstar Group",
      "message": "Hello Jordan, ...",
      "sentAt": "2027-01-02T09:00:00Z"
    }
  ]
}
```

## Reply

`POST /api/demo-requests/{id}/reply`

```json
{
  "to": "jordan.lee@example.com",
  "subject": "Re: Demo Request - Northstar Group",
  "message": "Hello Jordan,\n\nThank you for reaching out...",
  "inReplyTo": null,
  "references": []
}
```

The backend must derive/verify the recipient from the stored request rather
than trust the browser's `to` value, deliver the message directly, and persist
provider message/thread IDs. Use those IDs for `In-Reply-To` and `References`
headers on subsequent replies to preserve email threading. Return the updated
request and reply:

```json
{
  "request": {
    "id": "DR-20270115-000042",
    "status": "Replied",
    "emailThreadId": "provider-thread-123"
  },
  "reply": {
    "id": "reply-0001",
    "subject": "Re: Demo Request - Northstar Group",
    "message": "Hello Jordan, ...",
    "sentAt": "2027-01-02T09:00:00Z",
    "deliveryStatus": "Sent"
  }
}
```

The frontend reply template is in
`src/services/demoRequestEmailTemplates.js`. It includes original request
context and thread references as integration-ready payload fields. Only a
successful backend delivery should update the status to `Replied`.

## Delete

`DELETE /api/demo-requests/{id}` should perform a soft delete and return
`204 No Content` (or `{ "id": "...", "deleted": true }`). Subsequent normal
list/detail requests should treat the request as unavailable.

## Error responses

Use a consistent JSON error envelope and appropriate HTTP status:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "The request contains invalid fields.",
  "errors": {
    "workEmail": ["Enter a valid work email."]
  },
  "traceId": "00-..."
}
```

Expected statuses include `400` for invalid fields, `401`/`403` for missing or
insufficient authorization, `404` for unknown/deleted IDs, `409` for duplicate
or conflicting operations, `429` for throttling, and `500`/`502` for unexpected
or email-provider failures. Email send failures must not be reported as a
successful reply or change request status.

## Replacing the mock service

Keep UI components calling the five functions in
`src/services/demoRequestService.js`. Replace their localStorage operations and
mock delay with calls through the app's configured HTTP client to the endpoints
above; keep the same returned data shape or normalize API responses in that
service. Do not put credentials, SMTP configuration, or direct email-provider
logic in the browser. -->
# Demo Requests API Contract

This contract describes the backend integration expected by the frontend. The
current frontend service stores records in browser `localStorage` and does not
send email. Production email delivery, threading, authorization, validation,
and soft deletion must be implemented by the backend.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/demo-requests` | Submit a demo request; notify Super Admin and optionally acknowledge the client |
| `GET` | `/api/demo-requests` | Fetch requests for authorized Super Admin users |
| `GET` | `/api/demo-requests/{id}` | Fetch one request including reply history |
| `POST` | `/api/demo-requests/{id}/reply` | Send a client email and persist the reply |
| `DELETE` | `/api/demo-requests/{id}` | Soft-delete a request |

## Status values

`Pending` is assigned at submission. A successful admin reply changes the
request to `Replied`. `Closed` is reserved for a future close/reopen workflow.
Deleted requests should be omitted from normal list responses while remaining
recoverable according to backend retention policy.

## Submit request

`POST /api/demo-requests`

```json
{
  "fullName": "Jordan Lee",
  "workEmail": "jordan.lee@example.com",
  "phoneNumber": "+1 555 010 2040",
  "companyName": "Northstar Group",
  "designation": "HR Director",
  "industry": "Professional Services",
  "companySize": "101-250 Employees",
  "interestedModules": ["Attendance", "Payroll"],
  "preferredDemoDate": "2027-01-15",
  "preferredTime": "14:30",
  "message": "Please include multi-location attendance."
}
```

Successful response (`201 Created`):

```json
{
  "id": "DR-20270115-000042",
  "status": "Pending",
  "submittedAt": "2027-01-01T10:20:30Z",
  "fullName": "Jordan Lee",
  "workEmail": "jordan.lee@example.com",
  "phoneNumber": "+1 555 010 2040",
  "companyName": "Northstar Group",
  "designation": "HR Director",
  "industry": "Professional Services",
  "companySize": "101-250 Employees",
  "interestedModules": ["Attendance", "Payroll"],
  "preferredDemoDate": "2027-01-15",
  "preferredTime": "14:30",
  "message": "Please include multi-location attendance.",
  "replies": []
}
```

The backend should notify the Super Admin with all submitted fields and a
secure link/action to the request. A client acknowledgement may use the
frontend-prepared subject/body in `src/services/demoRequestEmailTemplates.js`;
the backend owns delivery and templates in production.

## List and detail

`GET /api/demo-requests` should return an array of the response objects above,
ordered newest first. Pagination may be added with `page`, `pageSize`, `q`, and
`status` query parameters; a paged response can use `{ items, page, pageSize,
total }`.

`GET /api/demo-requests/{id}` returns one complete request, including:

```json
{
  "id": "DR-20270115-000042",
  "status": "Replied",
  "submittedAt": "2027-01-01T10:20:30Z",
  "replies": [
    {
      "id": "reply-0001",
      "subject": "Re: Demo Request - Northstar Group",
      "message": "Hello Jordan, ...",
      "sentAt": "2027-01-02T09:00:00Z"
    }
  ]
}
```

## Reply

`POST /api/demo-requests/{id}/reply`

```json
{
  "to": "jordan.lee@example.com",
  "subject": "Re: Demo Request - Northstar Group",
  "message": "Hello Jordan,\n\nThank you for reaching out...",
  "inReplyTo": null,
  "references": []
}
```

The backend must derive/verify the recipient from the stored request rather
than trust the browser's `to` value, deliver the message directly, and persist
provider message/thread IDs. Use those IDs for `In-Reply-To` and `References`
headers on subsequent replies to preserve email threading. Return the updated
request and reply:

```json
{
  "request": {
    "id": "DR-20270115-000042",
    "status": "Replied",
    "emailThreadId": "provider-thread-123"
  },
  "reply": {
    "id": "reply-0001",
    "subject": "Re: Demo Request - Northstar Group",
    "message": "Hello Jordan, ...",
    "sentAt": "2027-01-02T09:00:00Z",
    "deliveryStatus": "Sent"
  }
}
```

The frontend reply template is in
`src/services/demoRequestEmailTemplates.js`. It includes original request
context and thread references as integration-ready payload fields. Only a
successful backend delivery should update the status to `Replied`.

## Delete

`DELETE /api/demo-requests/{id}` should perform a soft delete and return
`204 No Content` (or `{ "id": "...", "deleted": true }`). Subsequent normal
list/detail requests should treat the request as unavailable.

## Error responses

Use a consistent JSON error envelope and appropriate HTTP status:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "The request contains invalid fields.",
  "errors": {
    "workEmail": ["Enter a valid work email."]
  },
  "traceId": "00-..."
}
```

Expected statuses include `400` for invalid fields, `401`/`403` for missing or
insufficient authorization, `404` for unknown/deleted IDs, `409` for duplicate
or conflicting operations, `429` for throttling, and `500`/`502` for unexpected
or email-provider failures. Email send failures must not be reported as a
successful reply or change request status.

## Replacing the mock service

Keep UI components calling the five functions in
`src/services/demoRequestService.js`. Replace their localStorage operations and
mock delay with calls through the app's configured HTTP client to the endpoints
above; keep the same returned data shape or normalize API responses in that
service. Do not put credentials, SMTP configuration, or direct email-provider
logic in the browser.
