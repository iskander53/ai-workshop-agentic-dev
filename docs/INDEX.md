# Entity index

Registry of every entity and its current pipeline stage. The architect adds a row when an entity is spec'd; QA flips it to **merged** on merge.

**Stages:** `spec` (architect) · `testing` (tester) · `building` (dev) · `qa` · `merged`

| Entity | Description | Stage | Branch | Updated |
|--------|-------------|-------|--------|---------|
| auth | Registration & login — core + React UI + node:http API, end-to-end | testing | entity/auth | 2026-06-15 |
