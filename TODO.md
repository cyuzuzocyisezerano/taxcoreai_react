# TaxCoreAI Implementation TODO

## Priority 1 — Security (server-side RBAC + audit-denial logging)
- [ ] Add RBAC authorization middleware on the backend.
- [ ] Map role permissions (Admin/Officer/Auditor/Supervisor) to protected endpoints.
- [x] Enforce permissions on mutating/sensitive reads for taxpayers + documents endpoints.
- [x] Log all permission denials to audit logs with action type (PERMISSION_DENIED).


## Priority 2 — Audit/Compliance coverage
- [x] Ensure login doesn’t fail with HTTP 500 if audit logging/storage fails.
- [ ] Ensure all critical actions log audit entries: taxpayer create/update, document upload/update/delete, workflow transitions/approvals.
- [ ] Include identifiers (taxpayer TIN, document id, workflow id) and before/after summary in audit details.


## Priority 3 — Search/Document enhancements
- [ ] Expand search filters to include uploadedAt/date and keywords more consistently.
- [ ] Add basic metadata support for categorization and versioning (if not present).

## Priority 4 — Workflow/Notifications
- [ ] Make workflow lifecycle states explicit and enforce approval permissions.
- [ ] Emit notifications when workflow status changes (and when missing docs/flags exist, if present).

## Priority 5 — Analytics/Reporting
- [ ] Ensure dashboard/report numbers are computed from stored data.
- [ ] Validate AI assistant route integration with stored prompts/data.

