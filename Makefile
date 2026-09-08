# Entry points for the agentic-kit tooling (ship.sh expects `make lint`,
# `make test`, and `make e2e`). These delegate to the npm scripts, which stay
# the source of truth -- nothing here duplicates their configuration.
#
# `vitest run` is spelled out for the type and property projects because their
# npm scripts omit `run` and would drop into watch mode under a TTY.

.PHONY: lint test e2e build

lint:
	cd packages/remeda && npm run lint

test:
	cd packages/remeda && npm run check
	cd packages/remeda && npx vitest run --coverage --project runtime
	cd packages/remeda && npx vitest run --project types

e2e:
	cd packages/remeda && npx vitest run --project prop
	cd packages/remeda && npm run build
