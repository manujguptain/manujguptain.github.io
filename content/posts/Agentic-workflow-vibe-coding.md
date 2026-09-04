---
title: "The Agentic Workflow I Actually Use for Big Codebases"
date: 2026-04-09
draft: false
comments: true
Summary: "Vibe coding works for scripts. It falls apart on large codebases. Here is the exact multi-file workflow I use to stop AI from hallucinating, looping, and burning tokens."
categories: ["Engineering Leadership", "Software Development", "AI"]
tags: ["vibe-coding", "ai-agents", "ci-cd", "software-architecture"]
aliases: ["/lab/agentic-workflow-vibe-coding/"]
---

This is the workflow I follow these days.

I have been building some large applications from scratch using AI, actual complex codebases, not just scripts or quick utilities. And honestly, the term vibe coding is a bit misleading. For something small, it is fine. For anything large, it falls apart pretty quickly.

I use several tools right now: Antigravity, Claude Code, Codex, Cursor, Windsurf, and OpenCode. The specific tool matters less than the core problem, which is the same across all of them.

The AI forgets the architecture. It hallucinates dependencies. And at some point, it will suggest the same broken fix it tried fifteen prompts ago, completely unaware it already tried this. You end up burning tokens, going in circles.

You have to actively manage it. Here is what I do.

---

### 1. `requirements.md` — the anchor

Chat history is not a reliable context. It degrades, and the AI starts drifting.

I keep a `requirements.md` in the root of every project covering the system objectives, core requirements, and architectural constraints. When the AI goes off in some direction I didn't ask for, I just say: *"Stop. Read `requirements.md` and realign."* No back and forth.

---

### 2. `tasks.md` — the roadmap

I use `tasks.md` for tracking what needs to be done, but its real value is making the AI pace itself.

Give it something complex and it will immediately try to write 800 lines across four files, hit its token limit halfway, and leave you with broken syntax. So I make it stop, break the work into small chunks, document those chunks in `tasks.md` first, and then implement only the first one. It seems like extra steps, but it saves a lot of time overall.

---

### 3. `memory.md` — the fix for AI amnesia

This is the one I find most useful.

AI has no memory of what didn't work. You hit a bug, it tries Solution A, that fails, it tries B, B fails, it comes back to A again as if nothing happened. So I maintain a `memory.md` that logs what has already been built, what approaches failed, and why. Every time something doesn't work, I prompt: *"That failed. Update `memory.md` with what we tried and why it broke."* Before any complex fix: *"Read `memory.md` before suggesting anything."*

Worth keeping this file trimmed. It can get large and start eating into your context window. Log the reasoning, not the full code attempts.

---

### 4. Model routing

Frontier models cost money. Running everything through Claude Opus or Gemini 3.1 Pro for every small change adds up.

I use the heavy models for the decisions — architecture, requirements, and breaking down complex problems. Once that's done, I switch to Gemini Flash for the smaller implementation chunks. You save a lot on tokens without losing quality where it actually matters.

---

### 5. Rules file — `.cursorrules` or `.windsurfrules`

The requirements file says what to build. The rules file says how — tech stack, forbidden libraries, and architectural constraints. Things like "don't touch the abstraction layer directly." Without this, the AI will happily pull in some random library you've never heard of to solve something that didn't need it.

I don't personally do TDD, so this file and the CI/CD pipeline are what keep the structure from drifting. If you do TDD, getting the AI to write failing tests before writing code is a good way to keep its output bounded.

---

### 6. CI/CD — because AI breaks things without noticing

A small change to a helper function can break something completely unrelated three folders away. The AI won't catch it.

Every commit runs the full test suite via GitHub Actions. If the build breaks, I revert, paste the error log back into the prompt, and start again. No exceptions on this — once you start letting broken commits pile up, the whole thing becomes very hard to untangle.

---

---

### 7. The wiki as entry point — something I am still figuring out

Karpathy posted something in early April 2026 — a system where an LLM compiles and maintains an interlinked wiki from raw source material. People implementing it reported session startup tokens dropping by around 90%, because instead of loading many raw files every session, the AI reads a compact compiled index instead.

I was already keeping a markdown file per project covering architecture, file structure, and key decisions. But I was using it as a reference, not as an entry point. That difference is real — reference means you read it occasionally, entry point means every session starts there before the AI does anything.

I am experimenting with this now. Whether the token savings carry over to a coding workflow the same way, I honestly don't know yet.

Even with all of this, the AI still goes wrong. Regularly.

A good chunk of my day is still typing things like: *"You are drifting. Read `requirements.md`, check `tasks.md`, log what just failed in `memory.md`."*

This workflow does not make AI autonomous. It just stops it from wasting your time in the ways it most commonly does. The actual work shifts from writing code to keeping the AI pointed at the right problem, which is a different skill and takes a while to get used to.
