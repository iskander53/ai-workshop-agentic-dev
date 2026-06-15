# Entity index

Registry of every entity and its current pipeline stage. The architect adds a row when an entity is spec'd; QA flips it to **merged** on merge.

**Stages:** `spec` (architect) · `testing` (tester) · `building` (dev) · `qa` · `merged`

| Entity | Description | Stage | Branch | Updated |
|--------|-------------|-------|--------|---------|
| auth | User registration & login (unique login, securely-hashed password) | testing | entity/auth | 2026-06-15 |
