---
name: nodejs-backend-best-practices
description: Best practices and guidelines for building robust Node.js backend services specifically tailored for the ponghospitalsql project. Enforces MVC pattern, Joi validation, mysql2, and existing security middlewares.
---

# Node.js Backend Best Practices (ponghospitalsql)

When working on Node.js backend tasks in this project, adhere to the following best practices which are tailored to the existing architecture in the `server/` directory.

## 1. Architectural Pattern: Routes -> Controllers -> Models
The backend is structured inside the `server/` directory. Keep logic separated accordingly:
- **Routes (`server/routes/`)**: Define Express endpoints and attach appropriate middlewares (security, validation, auth) before passing to the controller.
- **Controllers (`server/controllers/`)**: Handle incoming HTTP requests, extract parameters, perform business logic, call Models, and return the HTTP response.
- **Models (`server/models/`)**: Handle all database access logic. Use this layer to wrap SQL queries. Do not put raw SQL queries directly inside Controllers.

## 2. Database & Validation
- **Database (mysql2)**: The project uses raw queries with `mysql2` (e.g., via `server/database.js`). Always use parameterized queries or prepared statements to prevent SQL Injection. DO NOT concatenate strings to form SQL queries.
- **Validation (Joi)**: Always validate incoming payloads (`req.body`, `req.query`, `req.params`) using **Joi** before processing. Ensure that invalid data is rejected early.

## 3. Security Middlewares
The project has robust security already configured in `app_mysql.js`. When adding new routes, ensure they comply with the standard:
- Ensure rate limiting (`apiLimiter`) and bot blockers (`botBlocker`) are respected.
- Use `xssSanitizer` middleware for any endpoints that accept HTML content (or other text inputs that might be rendered as HTML).
- Ensure authentication middlewares (like JWT checks) are applied to protected routes.

## 4. Error Handling & Logging
- **Logging (Winston)**: Do not use `console.log`, `console.warn`, or `console.error` in production logic. Import and use the centralized logger from `server/utils/logger.js`.
- **Error Responses**: Return standardized JSON error responses to the client (e.g., `{ error: "Message" }`). Use proper HTTP status codes (400 for Bad Request, 401 for Unauthorized, 403 for Forbidden, 404 for Not Found, 500 for Internal Server Error).

## 5. Testing & Verification
- Unit testing frameworks (like Jest) are currently not configured.
- When writing or updating backend code, verify the logic meticulously and perform manual testing (e.g., using Postman, Swagger, or frontend integration) to ensure edge cases are handled correctly before deploying.

## Example Project Structure
```text
server/
├── controllers/       # Business logic and request handling
├── middleware/        # Security, Auth, Validation (Joi)
├── models/            # Database access layer (mysql2)
├── routes/            # API endpoints mapping
├── utils/             # Helpers (e.g. logger.js)
├── database.js        # DB Connection setup
└── app_mysql.js       # Main Express Application setup
```
