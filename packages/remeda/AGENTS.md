# AGENTS.md — <PROJECT NAME>

<!-- Keep this file under 100 lines. It is read at the start of every agent session.
     If a rule doesn't change agent behavior, delete it. -->

## What this is
<One sentence: what the project does and who it's for.>

## Run it
```
<install command>        # e.g. uv sync / npm install
<test command>           # e.g. make test
<lint command>           # e.g. make lint
<dev/run command>        # e.g. make run
```

## Exercise it end-to-end (REQUIRED before reporting done)
<!-- The agent must run this and paste the output/screenshot into the PR Evidence section.
     Unit tests passing is NOT sufficient. -->
```
<e2e command>            # e.g. make e2e  /  python -m router_lite.eval
```
Done means: tests green AND the E2E command above ran AND its output is attached.

## Conventions
- Language/tooling: <e.g. Python 3.12, uv, pytest, ruff, mypy strict>
- Style: <e.g. small pure functions; no module-level side effects; type hints everywhere>
- Tests: write the failing test first (red → green → refactor). One vertical slice at a time.
- Commits: conventional commits (`feat:`, `fix:`, `chore:`), one logical change per commit.
- Branches: `<type>/<short-slug>`; never commit directly to `main`.
- Files as interface: decisions → `docs/specs/<slug>.decisions.md`, spec → `docs/specs/<slug>.md`.

## Tool output discipline
- Never print an unbounded response: pipe API/registry JSON through `jq '.field'` or a python one-liner; `LIMIT`
  every exploratory SQL; `| head -50` anything unknown. Prefer `--json` flags, then filter.
- When a tool reports a page (`count: 15 of 2934`, `rows: 50 (capped)`), the *total* answers "how many", not the page.
- On a hard error, check the error class before retrying; a 404 or blocked host will not fix itself on a hint.
- Choosing how to reach a new service (API vs CLI vs AXI vs MCP)? Use `/agent-tool-interface-routing`.

## Escalate to a human (stop and ask) when
- The change alters user-visible behavior not described in the spec.
- Two reasonable designs exist and the spec doesn't pick one.
- A test must be deleted or weakened to pass.
- Anything touches auth, money, data deletion, or an external API contract.
Otherwise: decide, note the decision in the PR, and keep going.

## Known mistakes (append one line per agent mistake, same day)
<!-- Format: `- YYYY-MM-DD: <what went wrong> → <rule>` -->
- 2026-09-08: added a root `Makefile` without checking whether one already existed deeper in the tree; `packages/remeda/Makefile` did, and is what CI runs, so the root copy was a weaker duplicate that dropped `prettier --check`, knip, and the test-inclusive typecheck → search the whole tree for an existing target or config before adding one at the root; if it exists, forward to it rather than restating it.
- 2026-09-08: wrote `test.prop` callbacks as concise arrow bodies, so each returned the `expect()` value and fast-check read every property as failed → give fast-check predicates block bodies that return nothing.
- 2026-09-08: typed a lazy-pipe test mock as `(x: number)` when the stage after `sliding` actually receives windows; it passed only because the assertion was that the mock is never called → type a pipe-stage mock to that stage's real input, not the array's element type.

## Non-goals / do not touch
- <e.g. do not edit `eval/cases.json` — it is the frozen evaluator>
- <e.g. no new dependencies without noting why in the PR>

## Standards
- Code: follow `docs/STANDARDS.md` (core rules + language profiles). Security: follow `docs/SECURITY.md`.
- `make lint` enforces the measurable parts; the reviewer enforces the rest. Never suppress a linter rule without a comment naming why.
