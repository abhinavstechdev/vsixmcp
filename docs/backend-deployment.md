# Optional Laravel backend deployment

The backend is optional and is not implemented in the current scaffold. This document records deployment constraints for a future Laravel API.

## Requirements to verify on the host

- Supported PHP version (target PHP 8.3+).
- Composer.
- PostgreSQL access and credentials.
- HTTPS/TLS and a valid certificate.
- Writable Laravel cache, session, and log directories.
- A configured document root pointing at Laravel's `public/` directory.
- A deployment process that does not expose `.env`, source files, or database backups.

Do not assume that a shared-hosting account can run persistent Node.js processes. The VS Code extension should perform local editor and workspace operations itself.

## Deployment checklist for a future backend

1. Provision a separate test database and least-privilege database user.
2. Configure environment variables outside the web root.
3. Set `APP_DEBUG=false` in production.
4. Configure application key and authentication settings securely.
5. Run migrations only after checking the target database and taking a backup.
6. Verify authentication, authorization, ownership checks, input validation, rate limits, and health endpoint behavior.
7. Test TLS, CORS, and session/token revocation.
8. Confirm logs redact credentials and sensitive source context.
9. Deploy only after explicit authorization and a rollback plan.

No live deployment or production data change has been performed.
