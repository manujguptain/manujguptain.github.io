---
title: "What LabVIEW Taught Me in 2005 That Made AI Feel Familiar"
date: 2026-02-27
draft: false
comments: true
tags: ["ai", "engineering", "labview", "automation", "career", "tools"]
---

When people talk about AI feeling like a revolution, I get it. The speed, the way you just describe what you want and something working comes out the other end — it really is impressive.

But honestly, for me it also feels like something I have seen before. And I think I know why.

### 2005, a Turbine Monitoring System, and One Integration Block

Early in my career I spent a lot of time with MATLAB, Simulink, and LabVIEW. LabVIEW was the one that stuck — mostly because I figured it out myself on a live project, which I think is why it left such a strong impression.

For anyone who hasn't used it, LabVIEW is a graphical programming environment. Instead of writing code you build logic visually, connecting blocks that represent functions and data flows. To a traditional programmer it probably looks like a toy. It is not.

What I liked about it was simple. It got out of the way. Libraries were handled, syntax wasn't a thing, and if something broke you could literally see where the flow had gone wrong. You could focus on the actual problem rather than fighting the tool.

I was building a predictive monitoring system for industrial turbines at the time. Tracking signals, spotting trends, flagging early indicators of failure. We were working with a university and a PhD student there had written a sophisticated prediction algorithm — impressive work, genuinely.

My job was not to rewrite it. It was to integrate it.

LabVIEW let me drop that external code — whether it was compiled C or a MATLAB script, to be honest I can't remember exactly after all these years — directly into my visual logic as a block. I wired the inputs in, connected the outputs to my dashboard, and it worked.

In 2005 that was honestly quite something. Cutting-edge research sitting inside a practical engineering system, and I didn't have to unpick someone else's specialist work to make it happen. I could stay focused on what I was actually there to solve — the signals, the integration, the failure modes. The tool handled the rest.

### Twenty Years Later

Over the past year or so I have been running a bunch of personal coding and automation projects — all with AI as a collaborator. Apps Script pipelines for auditing my cloud storage. Home automation scripts that just run quietly in the background. This website, manujg.com, which I built over a single weekend. And quite a few more — there is always something on the go, usually starting from a small problem I got tired of dealing with manually.

Honestly the pattern is exactly the same as LabVIEW.

I come in knowing what I want — the architecture, the edge cases, how it should behave. AI handles the first pass. I review it, fix what doesn't work, adjust until it does what I actually need. The gap between having an idea and having something working has shrunk to a point that still catches me off guard sometimes.

Different technology. Same dynamic.

### The Tool is Only Half of It

That turbine system worked not just because LabVIEW was good — it worked because I understood signal processing well enough to know if the outputs actually made sense. I could look at what the algorithm was producing and tell whether it reflected reality. That judgment came from the domain, not from the tool.

AI is no different. If you can't tell when the output is confidently wrong, you'll just build something broken faster. But if you have that domain knowledge, AI becomes a genuine accelerant. That much I'd say without hesitation.

### One Thing I'd Tell Anyone Earlier in Their Career

Think in systems before you think in syntax.

What is the problem, really. What does a good solution look like. How does it behave when things go wrong. Does it scale or does it fall apart under load. These are the questions that matter.

What language it gets written in, which library handles a specific function, how the API works — those are implementation details. Important to get right, but not the thing that separates someone who can build from someone who can lead.

LabVIEW pushed me to think this way early because the visual nature of it forced you to see the system before you got into the detail. AI is doing the same thing now, just in a different way — if you can describe what you want clearly and precisely, the how largely sorts itself out.

The tools will keep changing. Thinking clearly about problems won't go out of date. That's the thing worth investing in.