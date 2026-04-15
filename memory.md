# memory.md — Agent Working Memory
# ═══════════════════════════════════════════════════════════════
#
# !! MANDATORY !! — Any AI agent MUST read this file completely
# before taking any action in this codebase. No exceptions.
#
# After reading this file, read requirements.md before doing anything else.
# Entry point sequence: memory.md → requirements.md → /docs/architecture.md
#
# ═══════════════════════════════════════════════════════════════

## How to use this file

**For agents:**
1. Read the full file — do not skim
2. Check "Do not attempt again" sections before proposing any fix
3. Cross-reference with requirements.md for any decision you're about to make
4. Add an entry after every completed task, failed attempt, or architecture decision
5. Keep entries lean — log reasoning, not code. 5–10 lines per entry max

**For humans:**
- This file is the institutional memory of the project
- Review it when onboarding a new agent to a session
- Trim and archive entries when the file exceeds 200 lines

---

## Project: [PROJECT NAME]

| Field | Value |
|---|---|
| Requirements | `requirements.md` |
| Architecture | `/docs/architecture.md` |
| Wiki index | `/docs/wiki_index.md` |
| Tech stack | [fill in — e.g. Python/Flask, SQLite, Hugo] |
| Last updated | [date] |
| Last updated by | [agent or human] |

---

## Active Working Memory

*Newest entries at the top*

### [DATE] — Project initialized
**Type:** decision
**Summary:** Project memory initialized. No history yet.
**Lessons:** Start fresh. Read requirements.md before any action.

---

## Known Failure Modes — Do Not Attempt Again

*This section is critical. Agents must read it before proposing solutions.*

| Approach | Context | Why it failed | Alternative |
|---|---|---|---|
| [Example: Direct DB schema edit] | [Context] | [Broke migrations] | [Use Alembic migration] |

---

## Architecture Decisions Log

*Record irreversible or high-impact decisions here so they are never revisited without reason*

| Decision | Rationale | Date | Alternatives rejected |
|---|---|---|---|
| [e.g. SQLite over Postgres] | [Low ops overhead for MVP] | [date] | [Postgres — overkill for current scale] |

---

## Dependency Registry

*Track why each non-standard dependency was added*

| Package | Version | Purpose | Added on | Alternatives considered |
|---|---|---|---|---|
| [package] | [version] | [why] | [date] | [what was rejected and why] |

---

## Archived Learnings

*Older entries summarized here once Active Working Memory exceeds 200 lines*

[Nothing archived yet]

---

*memory.md is maintained by agents. Humans may edit but should not delete entries — mark outdated entries as [SUPERSEDED] instead.*
