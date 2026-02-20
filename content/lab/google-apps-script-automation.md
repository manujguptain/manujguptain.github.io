---
title: "I Built My Own Google Tasks Notification System Using AI"
date: 2026-02-20
draft: false
comments: true
tags: ["automation", "google-apps-script", "productivity", "gemini-ai", "google-tasks", "power-automate"]
---

Push notifications just don't work for important tasks. If you are driving, running errands, or simply focused on something else, it is way too easy to swipe an alert away and completely forget about it. That might be fine for a casual reminder to water the plants, but for things with hard deadlines—like paying a utility bill or making a time-sensitive phone call—missing a notification is a real problem.

Google Tasks is my go-to tool for managing personal to-dos. It is fast and syncs everywhere. But its native notification system relies entirely on those easy-to-miss push alerts. Miss the ping, and you are on your own.

I needed a reliable system that pushed task reminders directly into my Gmail—a place I actually check consistently. And instead of spending a weekend writing code from scratch, I used Gemini to help me build the whole thing in an afternoon.

### What I Built

The system works through two distinct workflows:

1. **Instant Alerts:** If a task has a specific time attached to it (e.g., "Call the dentist at 2:00 PM"), an email lands in my inbox the exact minute that time arrives.
2. **The Morning Digest:** Every day at 8:00 AM, I get a single HTML summary email covering everything overdue, everything due today, and a heads-up for tomorrow. Color-coded, clean, and scannable in under 30 seconds.

Everything runs on Google Apps Script — no external servers, completely free, and entirely in the background.

### The Architecture & Flow

Here is how the system is wired together:

```text
┌─────────────────────────────────────────────┐
│              Google Tasks API               │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│         Google Apps Script Engine           │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  ⏱ Every 1 Minute                    │   │
│  │  Instant Alert                       │   │
│  │  Scans for time-specific tasks due   │   │
│  │  right now → sends immediate email   │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  🌅 Every Morning at 8 AM            │   │
│  │  Daily Digest                        │   │
│  │  Aggregates overdue + today +        │   │
│  │  tomorrow → sends summary email      │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  🧹 Every Night at 3 AM              │   │
│  │  Cleanup Routine                     │   │
│  │  Removes completed tasks from        │   │
│  │  memory → keeps system healthy       │   │
│  └──────────────────────────────────────┘   │
│                                             │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│                  Gmail                      │
│   Instant Alert Email / Morning Digest      │
└─────────────────────────────────────────────┘
```

### The Logic Behind Each Part

#### The Instant Alert

This trigger runs every 60 seconds and checks whether any task has a specific due time that falls within the last minute.

The tricky part was avoiding duplicate emails if the script runs slightly late or the system hiccups. I explained this to Gemini and it suggested giving the script a "memory" using state management and a concurrency lock. The script now stores the exact timestamp of its last successful run and tags each notified task with a "done" flag. The lock makes sure two instances can never run simultaneously and flood my inbox.

#### The Daily Digest

The morning email is structured for quick triage, not just a raw data dump. Tasks are sorted into three visual buckets: <span style="color: #d93025; font-weight: bold;">🔴 Overdue</span>, <span style="color: #188038; font-weight: bold;">🟢 Due Today</span>, and <span style="color: #1a73e8; font-weight: bold;">🔵 Due Tomorrow</span>.

<span style="background-color: #e8f0fe; padding: 2px 6px; border-radius: 4px; color: #1a73e8; font-weight: bold;">⏱️ Time-sensitive tasks</span> get a distinct highlight. Any notes attached to a task are preserved in a shaded block below the title, and the task list name is a clickable link that opens Google Tasks directly.

The goal was simple: open this email over morning coffee, scan it in 20 seconds, and know exactly what needs attention that day.

#### The Cleanup Routine

A common problem with scripts that track state is that their memory grows forever. If the system remembered every task it ever notified me about, it would eventually crash. To fix this, a "janitor" function runs at 3:00 AM — it finds tasks I've marked as completed and removes them from the script's memory. The system stays lean and runs indefinitely without any manual intervention.

### Where Gemini Came In

I had a clear picture of what I wanted — the three-trigger structure, the email layout, the triage logic. What I didn't want to do was spend hours debugging API syntax and wrestling with HTML email quirks.

I used Gemini as a pair-programmer throughout. I'd describe a problem in plain English — *"I need the script to not send the same email twice if it gets delayed"* — and Gemini would introduce the right concept and write the code to make it work. When the email subject line showed garbled characters on my phone because of an emoji, Gemini immediately diagnosed it and fixed it with a Base64 encoding solution. When I wanted the email to render cleanly on mobile, it handled the single-column HTML layout.

The back-and-forth felt genuinely useful. I stayed focused on the logic and experience, Gemini handled the implementation details. The whole thing went from idea to deployed in a few hours.

### Taking It to Work

After running this successfully for about six months, I realised the core idea — a consolidated morning brief delivered straight to your inbox — was exactly what I needed at work too.

I kept the two systems separate since it's a work environment, but took the same architectural pattern and rebuilt it in Microsoft Power Automate. It now aggregates my assigned tasks from MS Planner, Microsoft Loop, and other tools, and sends a unified morning digest to my work email every day. Same concept, different ecosystem — turns out the logic translates whether you're tracking dentist appointments or project deliverables.

### The Takeaway

I now get clean, reliable emails for both my personal tasks and work commitments. I haven't missed a critical task since I set these up.

More than the tool itself, this process showed me how useful AI can be as a working partner rather than just a search engine. What could have been a frustrating weekend of Googling Stack Overflow answers turned into a genuinely enjoyable afternoon project. If you're thinking about building something similar or have questions about the setup, drop a comment below.