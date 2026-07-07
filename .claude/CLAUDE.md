# Project Instructions

This is a reusable **NestJS + Prisma backend starter** with a strict, layered, type-safe architecture designed for scale and maintainability.

## Non-negotiable rules

1. **Every file has exactly one job.** `*.controller.ts` = HTTP only · `*.service.ts` = business logic only · `*.repo.ts` = data access only · `*.module.ts` = DI wiring only · `*.dto.ts` = validation only. A file over ~150 lines of logic is doing too much — split it.
2. **Data access lives only in `common/repos/[domain].repo.ts`.** Nothing else touches Prisma. Ever.
3. **Layers flow one way:** Controller → Service → Repository → Prisma. A controller may NOT call a repo. A service may NOT touch `req`/`res`. A repo may NOT hold business logic.
4. **Services never return raw Prisma models.** Always return domain/response objects. Transform at the boundary.
5. **Single source of truth.** Models in `schema.prisma`, validation in DTOs, errors in `common/errors/`, auth in `modules/core/auth/`, enums in `common/enums/`. No duplication anywhere.
6. **Use the framework.** Prisma (not raw SQL), class-validator (not custom validators), Nest guards (not custom middleware), global interceptor (not ad-hoc wrappers). Don't hand-roll what Nest provides.
7. **No `any` in services.** Strict types everywhere. DTOs are the type source. Prisma generates the rest.
8. **No hardcoding.** Config, secrets, base URLs, magic numbers, role names, repeated literals — all live in env (`@nestjs/config`), `common/enums/`, or a constants file. Never inline.
9. **No dead code, stubs, or placeholders.** Delete unused code. Comments explain WHY, not what.

**Absolute imports via `@common/*` and `@lib/*`.** Never deep-relative (`../../../common/...`).

**This is the only architecture.** Follow it precisely. If you're unsure where something goes, the design is broken—re-read this instead of inventing new locations.

## Required patterns

| Layer | Responsibility | Rules |
|-------|---|---|
| **Controller** | Extract route params + body, call service, return result. Add `@UseGuards(JwtAuthGuard)` + `@Roles()` for protected routes. | No business logic. No Prisma. No direct repo calls. |
| **Service** | Accept DTOs, enforce business rules, throw `HttpException`s, call repo methods, return domain objects. | No raw Prisma models in responses. No `req`/`res` objects. Never throw `RepoError` directly. |
| **Repository** | Wrap Prisma calls in `try/catch`, rethrow as `RepoError`. Use `Prisma.[Model]GetPayload<>` for typed results. | No business logic. Prisma only. Data access only. |
| **DTO** | Use class-validator decorators for input validation at the boundary. `UpdateDto extends PartialType(CreateDto)`. | Type source for incoming data. Never used as response shape. |
| **Module** | Import dependencies, declare controller + service, export service if shared. | DI wiring only. |

## Folder Structure

| Route | Purpose |
|-------|---------|
| `/src/common/` | Shared infrastructure: repos, filters, guards, errors, enums, decorators, middleware. |
| `/src/common/repos/` | Data access layer. One `[domain].repo.ts` per entity. Prisma only. |
| `/src/common/errors/` | Error definitions and error filter. |
| `/src/common/enums/` | Constants and enums. Single source of truth. |
| `/src/common/decorators/` | Custom decorators (auth, roles, etc.). |
| `/src/lib/` | Pure utility functions and helpers. No NestJS dependencies. |
| `/src/modules/core/` | Domain-specific modules. One folder per domain with `dto/`, `*.service.ts`, `*.controller.ts`, `*.module.ts`. |
| `/src/modules/core/auth/` | Authentication logic. Already implemented. Extend, don't reinvent. |

## Workflow: Add a new domain

1. Add model to `schema.prisma` → run `prisma migrate dev --name <name>`.
2. Create `common/repos/[domain].repo.ts` (Prisma queries) → register in `repo.module.ts`.
3. Create `modules/core/[domain]/`: `dto/` (create + update), `[domain].service.ts`, `[domain].controller.ts`, `[domain].module.ts`.
4. Import the module in `app.module.ts`.

---

## File rules

- **Kebab-case filenames matching the export:** `user.service.ts` → `UserService`, `create-user.dto.ts` → `CreateUserDto`.
- **Co-locate by domain** under `modules/core/<domain>/`. Shared infra stays in `common/`. Pure helpers in `lib/`.
- **Add packages with `pnpm add`.** Never hand-edit `package.json`.

## Error & response handling

- Throw typed errors anywhere: Nest exceptions in services, `RepoError` in repos.
- `common/filters/http-exception.filter.ts` transforms every error into standard HTTP shape.
- `common/interceptors/response.interceptor.ts` standardizes every success response: `{ status, data, message }`.
- Never build ad-hoc response wrappers or swallow errors without the filter.

## Pre-merge checklist

1. `pnpm type-check` clean (`tsc --noEmit` — no type errors).
2. `pnpm lint` clean.
3. `pnpm build` succeeds.
4. No `any` in services, no `console.log`, no dead code or stubs.
5. No hardcoded config, secrets, or magic values (all in env, enums, or constants).
6. Reused existing repos, guards, filters, and the global interceptor. Nothing reinvented.
7. Followed the layer contracts. Matched the `users` module pattern exactly.

**Tech stack:** NestJS · Prisma + PostgreSQL · class-validator / class-transformer · @nestjs/jwt + passport · @nestjs/swagger · Jest. Auth logic is in `modules/core/auth/` — extend it, never reinvent.

Workflow: Analyze → Plan → Implement
