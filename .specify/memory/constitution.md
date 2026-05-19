<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR — adds a new principle (VI. Testing Discipline) and
materially expands the Development Workflow & Quality Gates section with a
test gate. No backward-incompatible removal or redefinition of prior
principles.

Modified principles:
- I. Type Safety & Code Quality (unchanged)
- II. Architectural Boundaries (unchanged)
- III. Security by Default (unchanged)
- IV. User-Visible Quality (unchanged)
- V. Conventional Workflow & Modular Code (unchanged)

Added principles:
- VI. Testing Discipline (Vitest + React Testing Library)

Modified sections:
- Development Workflow & Quality Gates: added test-suite and coverage gate,
  husky/lint-staged pre-commit, and GitHub Actions CI requirement.

Added sections:
- None (Testing requirements consolidated into Principle VI + Quality Gates).

Removed sections:
- None.

Templates requiring updates:
- ✅ .specify/templates/plan-template.md — generic Constitution Check;
  no edits required (gate references this file dynamically).
- ✅ .specify/templates/spec-template.md — no constitution-specific edits.
- ✅ .specify/templates/tasks-template.md — already supports OPTIONAL test
  tasks; constitution now makes them MANDATORY for AirVision. The /speckit-
  tasks command MUST treat tests as required for this project. No template
  file edit needed (the template's "OPTIONAL" wording is generic and the
  constitution overrides at project scope).
- ✅ Command files (.claude/skills/speckit-*/) — no agent-specific
  references requiring genericization.

Follow-up TODOs:
- None. All placeholders resolved with concrete values.
-->

# AirVision Constitution

AirVision is a portfolio-grade fullstack web application: a real-time
environmental-monitoring dashboard. The product UI is Spanish (MVP); the
codebase (identifiers, comments, commit messages) is English. This
constitution governs technical decisions, code conventions, and quality
gates. It is binding on all contributors and all generated artifacts.

## Core Principles

### I. Type Safety & Code Quality

TypeScript MUST be configured in strict mode across the entire frontend
(`"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`). The
type `any` is prohibited in application code; use `unknown` and narrow, or
declare a precise type. ESLint and Prettier MUST be configured and MUST run
clean before merge. Naming conventions are non-negotiable:

- Database tables and columns (Supabase / PostgreSQL): `snake_case`.
- React components: `PascalCase`, one component per file, file name
  matching the component name.
- Custom hooks: `useDescriptiveName.ts` camelCase with the `use` prefix.
- Identifiers and code comments: English.

**Rationale**: This is a portfolio project — code that recruiters and peers
will read. Strict typing and consistent naming are the cheapest, most
visible markers of professional discipline and they prevent entire classes
of runtime bugs before they ship.

### II. Architectural Boundaries (Frontend ↛ External APIs)

The frontend MUST NOT call third-party APIs (including OpenAQ) directly.
All external data ingestion MUST flow through Supabase Edge Functions
(Deno) which write to PostgreSQL; the frontend consumes data only via
Supabase client (REST + Realtime subscriptions). All Supabase access from
the frontend MUST be encapsulated in custom hooks under `src/hooks/`;
React components MUST NOT import the Supabase client directly. State
shared across unrelated components uses Zustand; component-local state
uses React hooks.

**Rationale**: A single, enforced data path keeps secrets server-side,
enables caching/rate-limiting in one place, lets us swap the upstream
provider without touching UI, and keeps components free of fetching logic
so they remain easy to test and reuse.

### III. Security by Default (RLS & Secret Hygiene)

Row Level Security (RLS) MUST be enabled on every table in the Supabase
schema — no exceptions. Policy rules:

- Public read-only tables (e.g., `stations`, `readings`): `SELECT`
  permitted without authentication; `INSERT`/`UPDATE`/`DELETE` denied to
  anon and authenticated roles (writes happen only via the service-role
  key inside Edge Functions).
- User-scoped tables (e.g., `favorites`, `alerts`): all operations
  gated by `auth.uid() = user_id`.

Secrets MUST live in environment variables (`.env`) which MUST be listed
in `.gitignore` and never committed. The Supabase `service_role` key MUST
NOT be exposed to the frontend bundle or any client-side code — it is
permitted only inside Edge Functions. The frontend uses the `anon` key.

**Rationale**: A public Supabase URL plus a leaked service-role key is a
total compromise of the database. RLS is the last line of defense if the
anon key is exfiltrated. These rules are cheap to follow and catastrophic
to skip.

### IV. User-Visible Quality (Portfolio-Grade UX)

The product is in Spanish (MVP) and MUST look polished. Every interactive
view MUST handle three states explicitly: loading, error, and empty —
each with informative copy in Spanish (no raw stack traces, no blank
screens, no spinners without context). The UI MUST be responsive
mobile-first with a minimum supported width of 360px; layouts MUST be
verified at 360px, tablet, and desktop breakpoints before merge. UI is
built with Tailwind CSS and shadcn/ui primitives; charts use Recharts;
maps use Leaflet via `react-leaflet`. A `README.md` MUST be maintained at
the repository root with project overview, setup instructions, and
screenshots.

**Rationale**: This project exists to be shown. Loading flicker, broken
mobile layouts, and missing empty states are the difference between
"impressive" and "abandoned side project" for the audience this codebase
is built for.

### V. Conventional Workflow & Modular Code

Commits MUST follow Conventional Commits (`feat:`, `fix:`, `chore:`,
`docs:`, `refactor:`, `test:`, `style:`). Each React component MUST live
in its own file. All Supabase queries, mutations, and Realtime
subscriptions MUST be wrapped in a custom hook — components consume the
hook, never the Supabase client. Feature work happens on branches
following the project's branch-naming conventions (see Spec Kit
workflows); merges to `main` require the work to satisfy this
constitution.

**Rationale**: Convention beats configuration. Predictable commits feed a
clean changelog; one-component-per-file keeps diffs reviewable; hooks-as-
data-layer keeps the rendering tree pure and testable.

### VI. Testing Discipline

Tests are non-negotiable for AirVision. The frameworks are **Vitest** for
the test runner and **React Testing Library** for component tests. Every
implementation task MUST ship with its corresponding tests in the same
change (no "tests in a follow-up PR"). Tests MUST be **co-located** with
the file they test, sharing the same basename plus `.test.ts(x)`:

- `src/utils/airQuality.ts` → `src/utils/airQuality.test.ts`
- `src/components/auth/LoginForm.tsx` → `src/components/auth/LoginForm.test.tsx`
- `src/hooks/useStations.ts` → `src/hooks/useStations.test.ts`

**Minimum coverage**: 70% line coverage on business logic — that is,
files under `src/hooks/`, `src/utils/`, and `src/stores/`. UI-only
components without logic are exempt from the threshold but still SHOULD
have at least a smoke render test.

**Test taxonomy** (what each layer MUST cover):

1. **Unit tests** (Vitest, no DOM, no network):
   - Pure calculation functions: air-quality level classification against
     WHO thresholds, date formatting, pollutant value formatting.
   - Zustand stores (`authStore`, `dashboardStore`): assert that each
     action transitions state correctly.
   - Utility modules (`utils.ts`, `constants.ts`).

2. **Integration tests** (React Testing Library + Vitest, DOM, **mocked**
   Supabase):
   - Form components (`LoginForm`, `RegisterForm`, `AlertForm`): render,
     simulate user input, assert the correct callback / mutation is
     invoked with the expected arguments.
   - Data-display components (`StationPopup`, `ChartPanel`,
     `FavoritesList`, `AlertList`): render with mock data and assert the
     correct fields appear.
   - Supabase-aware hooks (`useStations`, `useReadings`, `useFavorites`,
     `useAlerts`): mock the Supabase client with `vi.mock()`, assert that
     the correct queries are issued and that error paths are handled.
   - Integration tests MUST NOT hit a real Supabase instance.

3. **End-to-end tests** (Playwright): **Out of scope for the MVP.** A
   post-MVP feature will introduce Playwright with flows for
   register/login, map navigation, adding a favorite, and creating an
   alert. Do not add E2E tooling or tests during the MVP.

**Rationale**: Tests written alongside the code being shipped catch
regressions while the author's mental model is still hot, document
intended behavior for future-me and future-reviewers, and give recruiters
a tangible signal of engineering rigor — three properties this project
explicitly trades on.

## Technology Stack

The stack below is locked for the MVP. Substitutions require a
constitution amendment (see Governance).

- **Frontend**: React 18+, Vite, TypeScript (strict mode).
- **UI**: Tailwind CSS, shadcn/ui component library.
- **Visualization**: Recharts for charts; Leaflet (`react-leaflet`) for
  geospatial views.
- **State**: Zustand for cross-component state; React hooks for local
  state.
- **Backend**: Supabase — PostgreSQL, Auth (email + password), Realtime,
  Edge Functions (Deno runtime).
- **External data source**: OpenAQ v3 (air-quality API; free tier).
  Consumed only by Edge Functions, never by the frontend.
- **Testing**: Vitest (runner) + React Testing Library (component tests).
  Playwright deferred to a post-MVP feature.
- **Local quality automation**: Husky (git hooks) + lint-staged (run
  ESLint, Prettier, and affected Vitest tests on staged files at
  pre-commit).
- **CI**: GitHub Actions runs the full lint, type-check, and test suite
  on every push and pull request.
- **Deployment**: Vercel hosts the frontend; Supabase Cloud hosts the
  database, auth, realtime, and edge functions.

Authentication uses Supabase Auth with the email+password provider. The
frontend talks to Supabase using the public `anon` key only.

## Development Workflow & Quality Gates

The following gates MUST pass before any change merges to `main`. Every
gate is enforced both locally (pre-commit / pre-push) and in CI
(GitHub Actions); a local pass without CI confirmation is not sufficient.

1. **Build**: `npm run build` completes without errors.
2. **Type-check**: TypeScript compiles in strict mode with zero errors.
3. **Lint/format**: ESLint and Prettier report clean.
4. **Tests**: `npm run test` (Vitest) passes with zero failing specs.
   `npm run test:coverage` MUST show ≥70% line coverage on
   `src/hooks/`, `src/utils/`, and `src/stores/`. New code introduced in
   the change MUST ship with its co-located tests per Principle VI.
5. **Security review**: New tables ship with RLS enabled and policies
   defined; no new code path exposes the service-role key to the client;
   `.env` files remain ungitignored. Reviewer MUST confirm.
6. **Architectural review**: No frontend module imports a third-party
   data API directly; no component imports the Supabase client outside a
   hook.
7. **UX review**: New interactive views have explicit loading, error,
   and empty states, with Spanish copy, and render correctly at 360px.

**Required `package.json` scripts**:

- `"test": "vitest"` — interactive/watch test run.
- `"test:coverage": "vitest --coverage"` — coverage report used by gate 4.

**Pre-commit automation**: Husky installs a `pre-commit` hook that runs
lint-staged, which in turn runs ESLint --fix, Prettier --write, and
`vitest related --run` on staged files. Commits that fail the hook MUST
be fixed before retrying; bypassing with `--no-verify` is prohibited
except when explicitly authorized by the project owner.

**CI**: A GitHub Actions workflow MUST run lint, type-check, and the
full `vitest --run` suite (with coverage) on every push to any branch
and on every pull request. The workflow status is a required check for
merges to `main`.

Spec Kit commands (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`,
`/speckit-implement`, `/speckit-analyze`) operate within these gates;
their generated artifacts MUST be consistent with this constitution. In
particular, `/speckit-tasks` MUST emit test tasks alongside each
implementation task per Principle VI (the template's "OPTIONAL" wording
is overridden by this constitution for AirVision).

## Governance

This constitution supersedes ad-hoc conventions and informal preferences.
Where a code review, generated plan, or generated task conflicts with
this document, the constitution wins and the conflicting artifact MUST
be revised.

**Amendment procedure**: Amendments are proposed by editing
`.specify/memory/constitution.md` with a rationale in the commit message
(`docs: amend constitution to vX.Y.Z (...)`). The author MUST update the
Sync Impact Report at the top of the file and propagate changes to any
affected templates under `.specify/templates/`.

**Versioning policy** (semantic versioning applied to governance):

- **MAJOR**: Removal or backward-incompatible redefinition of a principle
  or governance rule.
- **MINOR**: Addition of a principle/section, or material expansion of
  binding guidance.
- **PATCH**: Clarifications, wording fixes, non-semantic refinements.

**Compliance review**: All PR reviewers MUST verify the merging change
satisfies the Quality Gates above. Complexity or deviations (e.g., a
short-lived exception to a principle) MUST be documented in the affected
plan's Complexity Tracking table with justification and a rejected
simpler alternative. Unjustified deviations block merge.

**Version**: 1.1.0 | **Ratified**: 2026-05-18 | **Last Amended**: 2026-05-18
