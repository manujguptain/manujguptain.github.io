---
title: "Triple-Hop Network Audit: Catching Micro-Outages with a Custom Monitor"
date: 2026-03-30
tags: ["python", "networking", "vibe-coding", "labs"]
summary: "My connection kept dropping — short blips, 5 to 50 seconds. Too short for a speed test to catch. So I built something that could."
draft: false
---

## The Problem

My connection kept dropping. Not full outages — just short blips, anywhere between 5 and 50 seconds. Enough to kill a video call mid-sentence. Enough to drop a remote SSH session. But never long enough to show up on a standard speed test.

The harder part: my home network has three distinct hops before you reach the internet.

- **Hop 1** — Laptop → Mesh Node
- **Hop 2** — Mesh Node → Main Router
- **Hop 3** — Main Router → ISP

A generic connectivity checker just tells me I went offline. It doesn't tell me *where* the break happened. Was it the Mesh? The Router? Or the ISP? That's the question I actually needed answered.

---

## What I Built

A lightweight Python dashboard that pings all three hops simultaneously, every couple of seconds, and logs everything to a local database. When a drop happens, it applies simple logic to figure out the point of failure and labels it in the log.

The dashboard runs locally and shows:

- Real-time latency graph across all three hops
- Automated root cause label on each outage — Mesh, Router, or ISP
- 24-hour outage log with timestamps and duration
- Running totals: outage count and cumulative downtime

Nothing fancy. It does exactly what I needed, nothing more.

{{< figure src="/images/lab/Mar_2026/Netwrok_Audit_Graph.png" caption="Live dashboard — two ISP-sourced outages in the 24h window. Total packet loss: 0.02%." >}}

In my case, the failure log confirmed the ISP was the problem both times. The Mesh and the Router stayed up; only Hop 3 went dark. That's exactly the kind of evidence you need before calling your ISP — instead of just saying "my internet drops sometimes."

---

## How I Built It

I didn't Google for an existing tool. I didn't spend time on Stack Overflow. I described what I needed — the network topology, the three hops, the root cause logic, the dashboard requirements — to Gemini. About 20 minutes later, I had working code.

I want to be clear about what that process actually looks like. It's not just typing "build me a network monitor." You still have to think clearly about the problem. I specified what each hop represented, what should count as an outage, what the dashboard needed to show. The AI handled the implementation. I handled the thinking about the problem.

That distinction matters. The barrier isn't writing code anymore. The barrier is being clear about what you actually need.

---

## The Bigger Point: Personal Software

We are entering an era of personal software. Everyone will have more custom tools, built specifically for their setup, their workflow, their exact problem — not a generic tool that almost fits.

In the past month alone, I've written more code than in the previous few years combined. Most of it I haven't published anywhere. It's just running in the background — automating things, tracking things, solving specific problems I had. About 10% of what I build ends up on GitHub. The rest is personal infrastructure.

This is what changes when the cost of building software drops to near zero. You stop settling for a tool that 80% solves your problem. You just describe the other 20% and get it built.

The implication isn't that software engineers disappear. It's that software *explodes*. Far more of it, far more specific to each person's situation, and far less of it ever gets sold as a product — because it doesn't need to. It just needs to work for you.

---

**Source code:** [github.com/manujguptain/NetworkOutageMonitor](https://github.com/manujguptain/NetworkOutageMonitor)

Clone it, set your three IPs in the config block at the top, run `python app.py` and open `localhost:5000`.