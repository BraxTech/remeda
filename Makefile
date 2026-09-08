# Entry points for the agentic-kit tooling, which runs `make lint` / `make test`
# from the repository root. packages/remeda/Makefile is the single source of
# truth for what each gate actually does -- it is what CI invokes -- so every
# target here is a plain forwarder and must never define its own recipe.

.PHONY: lint test e2e audit

lint:
	cd packages/remeda && $(MAKE) lint

test:
	cd packages/remeda && $(MAKE) test

e2e:
	cd packages/remeda && $(MAKE) e2e

audit:
	cd packages/remeda && $(MAKE) audit
