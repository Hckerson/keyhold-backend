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
9. **No dead code, stubs, or placeholders.** Delete unused code.
10. **No comments in code. Ever.** If you need a comment to explain what the code does, the abstraction is wrong. The only exception: explain WHY the code exists when it contradicts normal patterns or implements a specific workaround—and include a ticket/issue reference. Comments that describe WHAT the code does are dead weight.
11. **No inline type/lint rule suppression without explicit approval.** Never use `// @ts-expect-error`, `// @ts-ignore`, `// eslint-disable`, `as any`, `as unknown`, or similar. Each suppression masks a design problem or framework limitation that must be visible. **If a rule conflicts with your implementation:**
    - Document it in a code comment block explaining the exact reason and framework/constraint involved
    - Flag it explicitly to the user for approval before committing
    - This violation will fail the pre-merge checklist
    - **Examples of suppressions that need approval:** require imports for non-ESM packages, type assertions when Prisma inference fails, unsafe member access on third-party `any` types

**Absolute imports via `@common/*` and `@lib/*`.** Never deep-relative (`../../../common/...`).

**This is the only architecture.** Follow it precisely. If you're unsure where something goes, the design is broken—re-read this instead of inventing new locations.

---

## Core Principle: Derive, Never Reconstruct

If a library or framework generates a type, schema, validation result, or query shape, use that derived output directly. Examples: Prisma `GetPayload<>`, Zod `infer`, class-validator DTO output, NestJS guards, global interceptor results.

Never replace a derived artifact with `any`, `Record<>`, `as` assertions, or hand-written parallel types. If you need a smaller shape, derive it via framework helpers or standard TypeScript utilities (`Pick`, `Omit`), not ad hoc object literals.

**When you encounter a new framework tool:** First check whether it produces a derived type, schema, result shape, or validation outcome. If it does, use that output directly and avoid manual reconstruction with `any`, `Record<>`, `as` assertions, or parallel hand-written types.

| Derived artifact        | Source → Use                                               | ✅ Do                                                            | ❌ Don't                                   |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| **Prisma query result** | `.findUnique({ include: { plan: true } })` → typed payload | Use `Prisma.SubscriptionGetPayload<{ include: { plan: true } }>` | Cast to `any` or `Record<>`                |
| **Zod schema**          | `schema` → validated input + inferred type                 | Use `z.infer<typeof schema>`                                     | Duplicate the type by hand                 |
| **class-validator DTO** | Decorated DTO → validated request object                   | Accept the validated DTO in the service                          | Re-validate the same fields in the service |
| **NestJS guards**       | `@UseGuards(JwtAuthGuard)` → authenticated request         | Call the service after the guard passes                          | Hand-roll auth checks in the service       |
| **Global interceptor**  | `return data` from controller → wrapped response           | Return the domain object directly                                | Build `{ status, data, message }` manually |

## Required patterns

| Layer | Responsibility | Rules |
|-------|---|---|
| **Controller** | Extract route params + body, call service, return result. Add `@UseGuards(JwtAuthGuard)` + `@Roles()` for protected routes. | No business logic. No Prisma. No direct repo calls. |
| **Service** | Accept DTOs, enforce business rules, throw `HttpException`s, call repo methods, return domain objects. | No raw Prisma models in responses. No `req`/`res` objects. Never throw `RepoError` directly. Business logic, filtering, aggregation, composition — all here. |
| **Repository** | **ONLY** wrap the 10 Prisma-native methods in `try/catch`, rethrow as `RepoError`. Use `Prisma.[Model]GetPayload<>` for typed results. | Thin Prisma wrapper only. See "Repository Methods: Ironclad Rule" below. No custom domain methods. |
| **DTO** | Use class-validator decorators for input validation at the boundary. `UpdateDto extends PartialType(CreateDto)`. | Type source for incoming data. Never used as response shape. |
| **Module** | Import dependencies, declare controller + service, export service if shared. | DI wiring only. |

## Repository Methods: Ironclad Rule

**Repositories are ONLY thin wrappers around Prisma's 10 native methods.** No custom domain methods.

### ✅ Allowed repo methods (and ONLY these):
- `findUnique(params: T)` → `Prisma.[Model]GetPayload<T> | null`
- `findFirst(params: T)` → `Prisma.[Model]GetPayload<T> | null`
- `findMany(params: T)` → `Prisma.[Model]GetPayload<T>[]`
- `create(params: T)` → `Prisma.[Model]GetPayload<T>`
- `createMany(params)` → `Prisma.BatchPayload`
- `update(params: T)` → `Prisma.[Model]GetPayload<T>`
- `updateMany(params)` → `Prisma.BatchPayload`
- `delete(params: T)` → `Prisma.[Model]GetPayload<T>`
- `deleteMany(params)` → `Prisma.BatchPayload`
- `count(params?)` → `number`

### ❌ Forbidden (move to Service if needed):
- `findByResourceId()`, `findByActorId()`, `search()`, `findRecent()` — these are NOT Prisma methods
- `getStatistics()`, `getUserActivitySummary()`, `export()` — business logic, belongs in Service
- `findSensitiveActions()`, `findByDateRange()`, `findChanges()` — filtering & composition belong in Service
- Any method that applies domain logic, filtering beyond the params, or aggregation


---

## Folder Structure

| Route | Purpose |
|-------|---------|
| `/src/common/` | Shared infrastructure: repos, filters, guards, errors, enums, decorators, middleware. |
| `/src/common/repos/` | Data access layer. One `[domain].repo.ts` per entity. Prisma only. **Repos = thin wrappers around Prisma's 10 native methods only.** |
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
5. No comments in code (except WHY comments with ticket references). No inline type/lint rule suppressions (`// @ts-ignore`, `// eslint-disable`, `as any`, etc.).
6. No hardcoded config, secrets, or magic values (all in env, enums, or constants).
7. Reused existing repos, guards, filters, and the global interceptor. Nothing reinvented.
8. Followed the layer contracts. Matched the `users` module pattern exactly.

**Tech stack:** NestJS · Prisma + PostgreSQL · class-validator / class-transformer · @nestjs/jwt + passport · @nestjs/swagger · Jest. Auth logic is in `modules/core/auth/` — extend it, never reinvent.

Workflow: Analyze → Plan → Implement
