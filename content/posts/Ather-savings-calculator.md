---
title: "The Mileage Mismatch: A Thought on Ather's Savings Tracker"
date: 2026-03-13
draft: false
comments: true
summary: "Ather's savings tracker tells you how much you saved on petrol. It doesn't count what you spent keeping the scooter alive while parked. For occasional riders, that gap is the whole story."
categories: ["EV", "India"]
tags: ["ather", "electric-scooter", "ev", "india", "product-thinking"]
url: "/notes/ather-savings-calculator/"
aliases: ["/posts/ather-savings-calculator/"]
---

I own an Ather 450X and I ride it in Bengaluru. The range estimate is genuinely accurate — better than I expected honestly. But there's something about the savings tracker that's been bothering me for a while and I want to write it down.

The short version: the savings tracker only counts kilometres. It doesn't count the electricity you spend keeping the scooter alive while it's parked. For anyone who rides daily, this probably doesn't matter much. For anyone who uses the scooter a few times a week or travels for work — it's the whole story.

---

### What the tracker actually measures

The formula, as best as I can tell from how Ather reports their fleet numbers, is this:

**Kilometres travelled × (assumed petrol cost per km − assumed electricity cost per km)**

Ather's 2024 year-end data showed ₹6.2 billion in savings across 2.39 billion kilometres [¹]. That maths works only if savings track linearly with distance. Which means if you rode zero kilometres this month, the app shows zero electricity spent. 

The scooter doesn't agree.

---

### The idle drain problem

Ather scooters run background systems constantly — BMS, 4G telemetry, various connected features. Even when parked. The Ather community has been pretty consistent on this: somewhere between 3–5% of battery capacity lost per day while idle [²].

On the 3.7 kWh battery, 3% a day is roughly 111 Wh. A week parked is close to 1 kWh gone, without riding anywhere. You paid for that on your electricity bill. The savings tracker doesn't see it.

The practical problem I've actually experienced: come back after ten days of travel, scooter needs charging before you can ride. The whole "just get on and go" convenience disappears exactly when you need it. You're planning a charge before you can plan a ride. That's an annoying inversion for something marketed on convenience.

---

### Why petrol doesn't have this problem

Petrol mileage is a cleaner metric than people give it credit for. Litres purchased divided by kilometres ridden. The fuel doesn't drain while the scooter sits in the parking lot. Come back after two weeks, it starts, you ride.

There are idle costs with petrol too — the 12V battery, oil aging with time. But they're slow. The EV idle drain is measurable every single day the scooter isn't moving.

---

### What would actually fix this

The savings tracker should compare **total kWh drawn from the wall** — every charging session, including the ones that just topped up idle drain — against what the equivalent kilometres would have cost in petrol.

For a daily commuter this barely changes the numbers. For an occasional rider it's a completely different picture.

The hardware to do this already exists in the scooter. The BMS tracks energy flow. This is a product decision, not an engineering constraint. A smart energy monitoring plug (₹1,000–₹1,500) will give you the real number in the meantime — it logs actual kWh per session rather than inferring it from distance.

---

### Sources

[¹] Ather Energy 2024 fleet data — Autocar Professional, January 2025.  
https://www.autocarpro.in/news/ather-reports-239-billion-kilometres-covered-by-its-ev-users-in-2024-124671

[²] "Idle power consumption" thread, Ather Community Forum, July 2023.  
https://forum.atherenergy.com/t/idle-power-consumtion/173816

---

> *Disclaimer: I own an Ather 450X. The numbers here are indicative — idle drain varies by model, software version, temperature and usage. Personal observation, not an audit.*