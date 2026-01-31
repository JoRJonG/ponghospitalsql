---
name: my-skill
description: Comprehensive operational guide and skill definitions for the Pong Hospital project.
---

# Pong Hospital Project Skill (Professional Guide)

This skill file serves as the definitive operational manual for the Pong Hospital project. It encapsulates standardized workflows, security protocols, and development guidelines to ensure consistency and reliability across the codebase.

## 1. Skill Overview & Context
This skill provides automated and semi-automated workflows for:
-   **Code Quality Assurance**: Linting, type checking, and standard enforcement.
-   **Security Compliance**: Vulnerability auditing, API security verification, and secure configuration.
-   **Development Standards**: Component creation templates and architectural guidelines.
-   **Deployment Readiness**: Pre-flight checks for HostAtom deployment.

## 2. Prerequisites
Before executing these skills, ensure the following environment state:
-   **Node.js Environment**: Active LTS version.
-   **Database Access**: MySQL service running and accessible via configured credentials.
-   **Dependencies**: `npm install` has been run recently.

## 3. Core Workflows (SOPs)

### 3.1 Development Workflow
Standard procedure for feature implementation and code changes.

-   **Code Quality Check**
    - [ ] Run `npm run lint` to enforce ESLint rules.
    - [ ] Run `npm run type-check` (if available) to verify TypeScript types.
    - [ ] Verify no console logs or debugger statements are left in production code.

-   **Component Creation Protocol**
    1.  Target Directory: `src/components` (Use subdirectories for feature-specific components).
    2.  Naming Convention: **PascalCase** for filenames and components (e.g., `PatientCard.tsx`).
    3.  Styling: Exclusive use of **Tailwind CSS**. No inline styles or separate CSS files unless strictly necessary.
    4.  Structure: Use the project's standard Functional Component template.

### 3.2 Security Assurance Protocol
**CRITICAL**: Must be performed before any release or major merge.

#### Dependency Management
- [ ] **Vulnerability Audit**: Run `npm audit` to identify high-severity CVEs.
- [ ] **Version Compliance**: Verify React/Next.js versions prevent known vulnerabilities (Ref: CVE-2025-55182).

#### API & Backend Security
- [ ] **Injection Prevention**: Confirm all new SQL queries use parameterized inputs. **NO string concatenation** in SQL command strings.
- [ ] **Input Sanitization**: specific middleware (`server/middleware/security.js`) must be active for public endpoints.
- [ ] **Rate Limiting**: Ensure rate limits are configured for high-risk endpoints (e.g., Login, Registration).
- [ ] **Data Exposure**: Check that API responses (especially Errors) do not leak stack traces or internal paths.

### 3.3 Database Operations
- [ ] **Connection Check**: Verify MySQL connection pool status before batch operations.
- [ ] **Backup**: Ensure a recent `.sql` dump exists before running destructive migrations.

## 4. Project Standards & Architecture

### 4.1 Tech Stack Constraints
-   **Frontend**: React (TypeScript), Tailwind CSS.
-   **Backend**: Node.js, Express, MySQL.
-   **Infrastructure**: HostAtom (Production).

### 4.2 Architectural Rules
-   **Agent Directory**: Do not manually edit `e:\sql\ponghospitalsql\.agent` content unless updating skills.
-   **Secrets Management**: strict adherence to `.env` usage. Never commit secrets to Git.

## 5. Troubleshooting Guide

| Issue | Potential Cause | Resolution Step |
| :--- | :--- | :--- |
| `EMFILE: too many open files` | Watcher limit exceeded | Restart dev server / check file watchers. |
| `MySQL: Connection lost` | Pool timeout / Net error | Check VPN/Database service status. |
| `Tailwind styles not applying` | JIT mode caching | Delete `.next/cache` or restart build process. |

---
> **Maintainer Note**: Update this file whenever new standard procedures or security requirements are introduced.
