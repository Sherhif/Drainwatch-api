# DrainWatch Frontend API Guide

This document is the frontend implementation guide for the DrainWatch API.

Swagger UI is available at:

```text
http://localhost:3000/api/v1/docs
```

API base URL:

```text
http://localhost:3000/api/v1
```

## Conventions

All normal responses are wrapped:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-07-11T19:53:15.138Z"
}
```

All errors use this shape:

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": ["phone_number must be a Ghana phone number in +233XXXXXXXXX format"]
  },
  "timestamp": "2026-07-11T19:53:15.138Z",
  "path": "/api/v1/auth/register"
}
```

Protected routes require:

```http
Authorization: Bearer <auth_token>
```

Phone numbers must use Ghana format:

```text
+233XXXXXXXXX
233XXXXXXXXX
```

The API normalizes `233XXXXXXXXX` to `+233XXXXXXXXX` before storing or looking up users.

Default currency is:

```text
GHS
```

## Enums

```ts
type UserRole = 'reporter' | 'worker' | 'sponsor' | 'admin';
type UserStatus = 'active' | 'suspended' | 'pending_verification';
type JobSeverity = 'minor' | 'moderate' | 'severe';
type JobStatus =
  | 'open'
  | 'funded'
  | 'claimed'
  | 'in_progress'
  | 'completed_pending_review'
  | 'approved'
  | 'paid'
  | 'disputed'
  | 'refunded'
  | 'partially_paid'
  | 'cancelled';
type TransactionType = 'collection' | 'disbursement' | 'refund';
type TransactionStatus = 'pending' | 'success' | 'failed';
type DisputeResolution = 'released' | 'partial' | 'rejected';
```

## Reusable Response Objects

### User

```json
{
  "id": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
  "full_name": "Ama Mensah",
  "phone_number": "+233501234567",
  "roles": ["reporter"],
  "moolre_wallet_ref": null,
  "rating": null,
  "status": "active",
  "created_at": "2026-07-11T19:53:15.138Z"
}
```

### Job Summary

Job list responses use this object without `status_history`, `transactions`, or `dispute`.

```json
{
  "id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
  "reporter_id": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
  "worker_id": null,
  "sponsor_id": null,
  "status": "open",
  "severity": "moderate",
  "description": "Drain beside the market is blocked with plastic waste.",
  "location_lat": 5.6037,
  "location_lng": -0.187,
  "report_photo_url": "https://example.com/report-photo.jpg",
  "report_photo_public_id": "drainwatch/report-photos/sample",
  "completion_photo_url": null,
  "completion_photo_public_id": null,
  "cost_amount": null,
  "currency": "GHS",
  "moolre_collection_ref": null,
  "moolre_disbursement_ref": null,
  "dispute_deadline": null,
  "created_at": "2026-07-11T19:53:15.138Z",
  "updated_at": "2026-07-11T19:53:15.138Z"
}
```

### Job Detail

Single job and lifecycle responses include audit and finance detail.

```json
{
  "id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
  "reporter_id": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
  "worker_id": "4fe3649e-010d-405a-9b32-88d7d670893c",
  "sponsor_id": "2bc819e4-5de7-4fe4-b42f-827f5e33ccf2",
  "status": "completed_pending_review",
  "severity": "moderate",
  "description": "Drain beside the market is blocked with plastic waste.",
  "location_lat": 5.6037,
  "location_lng": -0.187,
  "report_photo_url": "https://example.com/report-photo.jpg",
  "report_photo_public_id": "drainwatch/report-photos/sample",
  "completion_photo_url": "https://example.com/completion-photo.jpg",
  "completion_photo_public_id": "drainwatch/completion-photos/sample",
  "cost_amount": "120.00",
  "currency": "GHS",
  "moolre_collection_ref": "stub_collection_7d3f8e74",
  "moolre_disbursement_ref": null,
  "dispute_deadline": "2026-07-13T19:53:15.138Z",
  "created_at": "2026-07-11T19:53:15.138Z",
  "updated_at": "2026-07-11T20:40:15.138Z",
  "status_history": [
    {
      "id": "3af8d9e3-f929-47b6-82e3-9d4cbdd82246",
      "job_id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
      "from_status": "in_progress",
      "to_status": "completed_pending_review",
      "changed_by": "4fe3649e-010d-405a-9b32-88d7d670893c",
      "note": "Worker submitted completion proof",
      "created_at": "2026-07-11T20:40:15.138Z"
    }
  ],
  "transactions": [
    {
      "id": "d26e9d23-e573-4340-bf44-20b8f912a4a6",
      "job_id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
      "type": "collection",
      "amount": "120.00",
      "currency": "GHS",
      "moolre_reference": "stub_collection_7d3f8e74",
      "idempotency_key": "collection:7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
      "status": "success",
      "raw_response": {
        "mode": "stub"
      },
      "created_at": "2026-07-11T19:58:15.138Z"
    }
  ],
  "dispute": null
}
```

## Auth Endpoints

### Register

```http
POST /auth/register
Content-Type: application/json
```

Request body:

```json
{
  "full_name": "Ama Mensah",
  "phone_number": "+233501234567",
  "roles": ["reporter"]
}
```

Alternative single-role request:

```json
{
  "full_name": "Kwame Worker",
  "phone_number": "+233501234568",
  "role": "worker"
}
```

Successful response:

```json
{
  "success": true,
  "data": {
    "message": "OTP sent",
    "phone_number": "+233501234567",
    "user": {
      "id": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
      "full_name": "Ama Mensah",
      "phone_number": "+233501234567",
      "roles": ["reporter"],
      "moolre_wallet_ref": null,
      "rating": null,
      "status": "pending_verification",
      "created_at": "2026-07-11T19:53:15.138Z"
    },
    "otp_code": "123456"
  },
  "timestamp": "2026-07-11T19:53:15.138Z"
}
```

Notes:
- Use `roles` for multi-role accounts.
- Use `role` only as a shortcut.
- `roles` wins if both `roles` and `role` are provided.
- Registration does not return `auth_token`.
- The frontend must call `POST /auth/verify-otp` after registration.
- In production, `otp_code` is omitted from the response.

### Login

```http
POST /auth/login
Content-Type: application/json
```

Request body:

```json
{
  "phone_number": "233501234567"
}
```

Successful response in development:

```json
{
  "success": true,
  "data": {
    "message": "OTP sent",
    "phone_number": "+233501234567",
    "otp_code": "123456"
  },
  "timestamp": "2026-07-11T19:53:15.138Z"
}
```

Successful response in production:

```json
{
  "success": true,
  "data": {
    "message": "OTP sent",
    "phone_number": "+233501234567"
  },
  "timestamp": "2026-07-11T19:53:15.138Z"
}
```

Rate limit:
- 3 requests per minute.
- OTP cannot be requested again within 30 seconds for the same phone number.

### Verify OTP

```http
POST /auth/verify-otp
Content-Type: application/json
```

Request body:

```json
{
  "phone_number": "233501234567",
  "otp_code": "123456"
}
```

Successful response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
      "full_name": "Ama Mensah",
      "phone_number": "+233501234567",
      "roles": ["reporter"],
      "moolre_wallet_ref": null,
      "rating": null,
      "status": "active",
      "created_at": "2026-07-11T19:53:15.138Z"
    },
    "auth_token": "<jwt>"
  },
  "timestamp": "2026-07-11T19:53:15.138Z"
}
```

This endpoint is shared by both registration and login:
- For a pending user, successful verification changes `status` from `pending_verification` to `active`.
- For an active user, successful verification logs the user in.

Rate limit:
- 5 requests per minute.

Development note:
- While `OTP_BYPASS_ENABLED=true`, any 6 digit numeric OTP passes verification for an existing user.
- Production must use the real OTP and should set `OTP_BYPASS_ENABLED=false`.

### Current User

```http
GET /auth/me
Authorization: Bearer <auth_token>
```

Successful response:

```json
{
  "success": true,
  "data": {
    "id": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
    "full_name": "Ama Mensah",
    "phone_number": "+233501234567",
    "roles": ["reporter"],
    "moolre_wallet_ref": null,
    "rating": null,
    "status": "active",
    "created_at": "2026-07-11T19:53:15.138Z"
  },
  "timestamp": "2026-07-11T19:53:15.138Z"
}
```

## Job Endpoints

All job endpoints require a bearer token.

### Create Job

Role required:

```text
reporter
```

```http
POST /jobs
Authorization: Bearer <reporter_token>
Content-Type: application/json
```

JSON request body:

```json
{
  "lat": 5.6037,
  "lng": -0.187,
  "severity": "moderate",
  "description": "Drain beside the market is blocked with plastic waste.",
  "report_photo_url": "https://example.com/report-photo.jpg"
}
```

Multipart request:

```http
POST /jobs
Authorization: Bearer <reporter_token>
Content-Type: multipart/form-data
```

Multipart fields:

```text
lat=5.6037
lng=-0.187
severity=moderate
description=Drain beside the market is blocked with plastic waste.
photo=<file>
```

When `photo=<file>` is provided, the backend uploads it to Cloudinary and stores the returned `secure_url` in `report_photo_url`.

Successful response:

```json
{
  "success": true,
  "data": {
    "id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
    "reporter_id": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
    "worker_id": null,
    "sponsor_id": null,
    "status": "open",
    "severity": "moderate",
    "description": "Drain beside the market is blocked with plastic waste.",
    "location_lat": 5.6037,
    "location_lng": -0.187,
    "report_photo_url": "https://res.cloudinary.com/example/image/upload/v123/drainwatch/report-photos/report.jpg",
    "report_photo_public_id": "drainwatch/report-photos/report",
    "completion_photo_url": null,
    "completion_photo_public_id": null,
    "cost_amount": null,
    "currency": "GHS",
    "moolre_collection_ref": null,
    "moolre_disbursement_ref": null,
    "dispute_deadline": null,
    "created_at": "2026-07-11T19:53:15.138Z",
    "updated_at": "2026-07-11T19:53:15.138Z",
    "status_history": [
      {
        "id": "3af8d9e3-f929-47b6-82e3-9d4cbdd82246",
        "job_id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
        "from_status": null,
        "to_status": "open",
        "changed_by": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
        "note": "Job reported",
        "created_at": "2026-07-11T19:53:15.138Z"
      }
    ],
    "transactions": [],
    "dispute": null
  },
  "timestamp": "2026-07-11T19:53:15.138Z"
}
```

### List Jobs

```http
GET /jobs
Authorization: Bearer <auth_token>
```

Optional query params:

```text
status=open
severity=moderate
near_lat=5.6037
near_lng=-0.187
radius=5
sponsor_id=me
worker_id=me
reporter_id=me
```

Nearby filtering requires all three values together:

```text
near_lat
near_lng
radius
```

Example:

```http
GET /jobs?status=funded&near_lat=5.6037&near_lng=-0.187&radius=10
Authorization: Bearer <worker_token>
```

Successful response:

```json
{
  "success": true,
  "data": [
    {
      "id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
      "reporter_id": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
      "worker_id": null,
      "sponsor_id": "2bc819e4-5de7-4fe4-b42f-827f5e33ccf2",
      "status": "funded",
      "severity": "moderate",
      "description": "Drain beside the market is blocked with plastic waste.",
      "location_lat": 5.6037,
      "location_lng": -0.187,
      "report_photo_url": "https://example.com/report-photo.jpg",
      "completion_photo_url": null,
      "cost_amount": "120.00",
      "currency": "GHS",
      "moolre_collection_ref": "stub_collection_7d3f8e74",
      "moolre_disbursement_ref": null,
      "dispute_deadline": null,
      "created_at": "2026-07-11T19:53:15.138Z",
      "updated_at": "2026-07-11T19:58:15.138Z"
    }
  ],
  "timestamp": "2026-07-11T19:53:15.138Z"
}
```

### Get Job Detail

```http
GET /jobs/:id
Authorization: Bearer <auth_token>
```

Successful response:

```json
{
  "success": true,
  "data": {
    "id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
    "reporter_id": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
    "worker_id": null,
    "sponsor_id": null,
    "status": "open",
    "severity": "moderate",
    "description": "Drain beside the market is blocked with plastic waste.",
    "location_lat": 5.6037,
    "location_lng": -0.187,
    "report_photo_url": "https://example.com/report-photo.jpg",
    "completion_photo_url": null,
    "cost_amount": null,
    "currency": "GHS",
    "moolre_collection_ref": null,
    "moolre_disbursement_ref": null,
    "dispute_deadline": null,
    "created_at": "2026-07-11T19:53:15.138Z",
    "updated_at": "2026-07-11T19:53:15.138Z",
    "status_history": [],
    "transactions": [],
    "dispute": null
  },
  "timestamp": "2026-07-11T19:53:15.138Z"
}
```

### Fund Job

Role required:

```text
sponsor
```

Allowed state:

```text
open -> funded
```

```http
POST /jobs/:id/fund
Authorization: Bearer <sponsor_token>
Content-Type: application/json
```

Request body:

```json
{
  "amount": 120,
  "currency": "GHS"
}
```

Successful response:

```json
{
  "success": true,
  "data": {
    "id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
    "reporter_id": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
    "worker_id": null,
    "sponsor_id": "2bc819e4-5de7-4fe4-b42f-827f5e33ccf2",
    "status": "funded",
    "severity": "moderate",
    "description": "Drain beside the market is blocked with plastic waste.",
    "location_lat": 5.6037,
    "location_lng": -0.187,
    "report_photo_url": "https://example.com/report-photo.jpg",
    "completion_photo_url": null,
    "cost_amount": "120.00",
    "currency": "GHS",
    "moolre_collection_ref": "stub_collection_7d3f8e74",
    "moolre_disbursement_ref": null,
    "dispute_deadline": null,
    "created_at": "2026-07-11T19:53:15.138Z",
    "updated_at": "2026-07-11T19:58:15.138Z",
    "status_history": [],
    "transactions": [],
    "dispute": null
  },
  "timestamp": "2026-07-11T19:58:15.138Z"
}
```

Rate limit:
- 5 requests per minute.

### Claim Job

Role required:

```text
worker
```

Allowed state:

```text
funded -> claimed
```

```http
POST /jobs/:id/claim
Authorization: Bearer <worker_token>
```

Request body: none.

Successful response: wrapped `Job Detail` with `status` set to `claimed` and `worker_id` set to the current worker.

### Start Job

Role required:

```text
worker
```

Allowed state:

```text
claimed -> in_progress
```

Only the assigned worker can start the job.

```http
POST /jobs/:id/start
Authorization: Bearer <worker_token>
```

Request body:

```json
{}
```

Successful response: wrapped `Job Detail` with `status` set to `in_progress`.

### Complete Job

Role required:

```text
worker
```

Allowed state:

```text
in_progress -> completed_pending_review
```

Only the assigned worker can complete the job.

```http
POST /jobs/:id/complete
Authorization: Bearer <worker_token>
Content-Type: application/json
```

JSON request body:

```json
{
  "completion_photo_url": "https://example.com/completion-photo.jpg"
}
```

Multipart request:

```http
POST /jobs/:id/complete
Authorization: Bearer <worker_token>
Content-Type: multipart/form-data
```

Multipart fields:

```text
completion_photo=<file>
```

When `completion_photo=<file>` is provided, the backend uploads it to Cloudinary and stores the returned `secure_url` in `completion_photo_url`.

Successful response: wrapped `Job Detail` with:

```json
{
  "status": "completed_pending_review",
  "completion_photo_url": "https://res.cloudinary.com/example/image/upload/v123/drainwatch/completion-photos/completion.jpg",
  "completion_photo_public_id": "drainwatch/completion-photos/completion",
  "dispute_deadline": "2026-07-13T19:53:15.138Z"
}
```

The real response contains the full job object, not only these fields.

### Approve Job

Role required:

```text
sponsor
```

Allowed state:

```text
completed_pending_review -> approved -> paid
```

Only the funding sponsor can approve. Approval triggers worker payout.

```http
POST /jobs/:id/approve
Authorization: Bearer <sponsor_token>
```

Request body:

```json
{}
```

Successful response: wrapped `Job Detail` with `status` set to `paid` when payout succeeds.

Rate limit:
- 10 requests per minute.

### Dispute Job

Role required:

```text
sponsor
```

Allowed state:

```text
completed_pending_review -> disputed
```

Only the funding sponsor can dispute. Disputes must be submitted before `dispute_deadline`.

```http
POST /jobs/:id/dispute
Authorization: Bearer <sponsor_token>
Content-Type: application/json
```

Request body:

```json
{
  "reason": "The drain was only partially cleared and still blocks water flow."
}
```

Successful response: wrapped `Job Detail` with:

```json
{
  "status": "disputed",
  "dispute": {
    "id": "6f1d1c85-4848-469a-91b5-14f021a50d5c",
    "job_id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
    "raised_by": "2bc819e4-5de7-4fe4-b42f-827f5e33ccf2",
    "reason": "The drain was only partially cleared and still blocks water flow.",
    "resolution": null,
    "resolved_by": null,
    "note": null,
    "created_at": "2026-07-11T21:00:15.138Z",
    "updated_at": "2026-07-11T21:00:15.138Z",
    "resolved_at": null
  }
}
```

The real response contains the full job object, not only these fields.

### Cancel Job

Roles allowed:

```text
reporter
admin
```

Allowed state:

```text
open -> cancelled
```

Only the reporter who created the job, or an admin, can cancel it.

```http
POST /jobs/:id/cancel
Authorization: Bearer <reporter_or_admin_token>
```

Request body:

```json
{}
```

Successful response: wrapped `Job Detail` with `status` set to `cancelled`.

## Admin Dispute Endpoints

All admin dispute endpoints require:

```text
admin
```

### List Open Disputes

```http
GET /admin/disputes
Authorization: Bearer <admin_token>
```

Successful response:

```json
{
  "success": true,
  "data": [
    {
      "id": "6f1d1c85-4848-469a-91b5-14f021a50d5c",
      "job_id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
      "raised_by": "2bc819e4-5de7-4fe4-b42f-827f5e33ccf2",
      "reason": "The drain was only partially cleared and still blocks water flow.",
      "resolution": null,
      "resolved_by": null,
      "note": null,
      "created_at": "2026-07-11T21:00:15.138Z",
      "updated_at": "2026-07-11T21:00:15.138Z",
      "resolved_at": null,
      "job": {
        "id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
        "reporter_id": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
        "worker_id": "4fe3649e-010d-405a-9b32-88d7d670893c",
        "sponsor_id": "2bc819e4-5de7-4fe4-b42f-827f5e33ccf2",
        "status": "disputed",
        "severity": "moderate",
        "description": "Drain beside the market is blocked with plastic waste.",
        "location_lat": 5.6037,
        "location_lng": -0.187,
        "report_photo_url": "https://example.com/report-photo.jpg",
        "completion_photo_url": "https://example.com/completion-photo.jpg",
        "cost_amount": "120.00",
        "currency": "GHS",
        "moolre_collection_ref": "stub_collection_7d3f8e74",
        "moolre_disbursement_ref": null,
        "dispute_deadline": "2026-07-13T19:53:15.138Z",
        "created_at": "2026-07-11T19:53:15.138Z",
        "updated_at": "2026-07-11T21:00:15.138Z"
      },
      "photos": {
        "report_photo_url": "https://example.com/report-photo.jpg",
        "completion_photo_url": "https://example.com/completion-photo.jpg"
      },
      "status_history": [],
      "transactions": []
    }
  ],
  "timestamp": "2026-07-11T21:00:15.138Z"
}
```

### Resolve Dispute

```http
POST /admin/disputes/:id/resolve
Authorization: Bearer <admin_token>
Content-Type: application/json
```

Release full amount to worker:

```json
{
  "resolution": "released",
  "note": "After photo confirms the job was completed."
}
```

Refund sponsor:

```json
{
  "resolution": "rejected",
  "note": "Completion proof does not show the work was done."
}
```

Partially pay worker:

```json
{
  "resolution": "partial",
  "partial_amount": 80,
  "note": "Most of the work was done, but part of the drain remains blocked."
}
```

Resolution outcomes:

```text
released -> job status paid
rejected -> job status refunded
partial -> job status partially_paid
```

Successful response: wrapped admin dispute object with updated `resolution`, `resolved_by`, `note`, `resolved_at`, final job status, status history, and transactions.

Rate limit:
- 10 requests per minute.

## Demo Endpoint

Demo seed is disabled in production.

### Seed Demo Data

```http
POST /demo/seed
```

Request body:

```json
{}
```

Successful response:

```json
{
  "success": true,
  "data": {
    "users": {
      "reporter": {
        "id": "1f03c7e5-4e8e-4e2f-98e9-6c61f68a2dc7",
        "full_name": "Demo Reporter",
        "phone_number": "+233500000001",
        "roles": ["reporter"],
        "moolre_wallet_ref": null,
        "rating": null,
        "status": "active",
        "created_at": "2026-07-11T19:53:15.138Z",
        "auth_token": "<reporter_jwt>"
      },
      "sponsor": {
        "id": "2bc819e4-5de7-4fe4-b42f-827f5e33ccf2",
        "full_name": "Demo Sponsor",
        "phone_number": "+233500000002",
        "roles": ["sponsor"],
        "moolre_wallet_ref": null,
        "rating": null,
        "status": "active",
        "created_at": "2026-07-11T19:53:15.138Z",
        "auth_token": "<sponsor_jwt>"
      },
      "worker": {
        "id": "4fe3649e-010d-405a-9b32-88d7d670893c",
        "full_name": "Demo Worker",
        "phone_number": "+233500000003",
        "roles": ["worker"],
        "moolre_wallet_ref": null,
        "rating": null,
        "status": "active",
        "created_at": "2026-07-11T19:53:15.138Z",
        "auth_token": "<worker_jwt>"
      },
      "admin": {
        "id": "8da5b941-a506-49c1-b119-aebf31cc03e7",
        "full_name": "Demo Admin",
        "phone_number": "+233500000004",
        "roles": ["admin"],
        "moolre_wallet_ref": null,
        "rating": null,
        "status": "active",
        "created_at": "2026-07-11T19:53:15.138Z",
        "auth_token": "<admin_jwt>"
      }
    },
    "jobs": {
      "open_job_id": "7d3f8e74-b74a-4c59-8b1a-8e64db8a7fb1",
      "funded_job_id": "fddfeef2-d9a7-4b66-9b82-4b9875b47592",
      "completed_pending_review_job_id": "9998f239-71a6-461b-bbb6-c05d269742dc"
    }
  },
  "timestamp": "2026-07-11T19:53:15.138Z"
}
```

## Health Endpoint

```http
GET /health
```

Request body: none.

Successful response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "DrainWatch API",
    "version": "0.0.1",
    "environment": "development"
  },
  "timestamp": "2026-07-11T19:53:15.138Z"
}
```

## Frontend State Machine Summary

Use these transitions to enable or hide UI actions:

```text
open -> funded | cancelled
funded -> claimed
claimed -> in_progress
in_progress -> completed_pending_review
completed_pending_review -> approved | disputed
approved -> paid
disputed -> paid | refunded | partially_paid
```

UI role mapping:

```text
reporter: create job, cancel own open job
sponsor: fund open job, approve completed job, dispute completed job
worker: claim funded job, start assigned job, complete assigned job
admin: list disputes, resolve disputes, cancel open job
```

## Common Frontend Handling

For `401 UNAUTHORIZED`, clear the stored token and route to login.

For `403 FORBIDDEN`, keep the token but hide or disable the unauthorized action.

For `400 BAD_REQUEST`, show `error.message`; if `error.details` is an array, render each validation message.

For `409 CONFLICT`, retry may be appropriate after a short delay because the job may already be updating.

For `429 TOO_MANY_REQUESTS`, show a cooldown message and disable the triggering button temporarily.
