# V1 scoring model

Each zone/time-window forecast starts with a baseline score, then applies transparent modifiers.

## Baseline inputs

- day of week
- time window
- zone
- month/season

## Long-range modifiers

These can be known weeks or months ahead:

- Karnataka public holiday
- school holiday
- holiday tomorrow / yesterday
- long weekend
- festival period
- month-end / year-end behavioural effects where evidence exists

## Near-term modifiers

These are added only when current information becomes available:

- rain forecast / heavy rain warning
- roadworks / lane closures
- rallies / protests / VIP movement
- major sports / concert / exhibition events
- metro disruption
- flooding / waterlogging risk
- accidents or emergency advisories

## Traffic shadow

Events can affect periods before and after their nominal date. Example: a Friday holiday can reduce some Thursday morning commuting while increasing Thursday evening outbound traffic and Sunday evening inbound traffic.

Each modifier therefore has:

- affected zones
- affected time windows
- direction if relevant
- start/end time
- score delta
- confidence
- explanation
- source

## Confidence

Confidence is separate from risk. A long-range weekday/holiday forecast may have medium confidence; a near-term forecast enriched with weather and official traffic advisories can have higher confidence.

## Principle

No Google Maps scraping and no hidden black-box prediction in V1. The system should always be able to explain why a score changed.
