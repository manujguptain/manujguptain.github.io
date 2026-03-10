---
title: "Precision Modeling: A Digital Twin for STM32H7 ADC Metrology"
date: 2026-03-10
draft: false
comments: true
summary: "Modeling 16-bit SAR ADC behavior to achieve Class 0.2/0.5 metering accuracy before hardware implementation."
categories: ["Embedded Systems", "Metrology"]
tags: ["STM32H7", "ADC", "Digital Twin", "IEC-62053", "embedded", "simulation"]
---

Before you spin a PCB or write a line of firmware, you should know whether your hardware choices will meet your accuracy targets. For industrial metering this is not a nice-to-have — it is the difference between a design that passes certification and one that doesn't.

This is what the digital twin is for.

---

### What we are building

This is a browser-based simulation of the STM32H7's internal 16-bit SAR (Successive Approximation Register) ADC, built specifically for metering and metrology applications.

The key word is *twin* — not just a clean mathematical model. The simulator replicates the hardware-level constraints that actually matter in a real design: Gaussian thermal noise, INL non-linearity, harmonic aliasing, and the DMA buffer transfer cycle. The goal is to give you a realistic picture of what the silicon will do with your signal before committing to any hardware decisions.

---

### The architecture

Here is how the simulation pipeline is structured, mirroring the actual data path inside the MCU:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIGNAL GENERATION ENGINE                      │
│                                                                  │
│   50Hz Fundamental                                               │
│   + 3rd Harmonic (150Hz) ──► Composite Analog Signal            │
│   + 5th Harmonic (250Hz)     (Ground Truth)                      │
└───────────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SILICON TWIN (ADC MODEL)                      │
│                                                                  │
│   Aliasing (fold-back above Nyquist)                             │
│   + Gaussian Thermal Noise (σ = 0.8mV) ──► Pre-Quant Voltage    │
│   + INL Error (2.5 LSB, voltage domain)                          │
│   + 16-bit Quantization (65535 levels)  ──► ADC Code            │
└───────────────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSPORT LAYER (DMA MODEL)                   │
│                                                                  │
│   Circular Buffer (1024 samples)                                 │
│   Half-Transfer → Full-Transfer cycle ──► Sample Buffer          │
└──────────────────────┬────────────────────────┬─────────────────┘
                       │                        │
                       ▼                        ▼
┌──────────────────────────────┐  ┌─────────────────────────────┐
│       METROLOGY ENGINE       │  │      SPECTRUM ENGINE        │
│                              │  │                             │
│  True RMS  = √(Σ(ideal²)/N) │  │  DFT on 256-sample window   │
│  Meas RMS  = √(Σ(digi²) /N) │  │  Frequency bins 1–64        │
│  → Error % → PASS / FAIL     │  │  → Harmonic peak display    │
└──────────────────────────────┘  └─────────────────────────────┘
```

Each stage maps to something real in the hardware. The signal generation engine is your sensor input. The silicon twin is the ADC peripheral with its physical non-idealities. The transport layer is your DMA configuration. The metrology engine is your firmware RMS calculation. Change any parameter and you see the effect on final error immediately.

---

### Why this matters before you build anything

In IEC 62053 metering, accuracy class defines the maximum allowable RMS error:

| Accuracy Class | Max Allowable Error | Typical Use |
|:---|:---|:---|
| Class 0.2 | ±0.2% | Utility / revenue metering |
| Class 0.5 | ±0.5% | Industrial metering |
| Class 1.0 | ±1.0% | Residential / general purpose |

Hitting these targets depends on how your sampling rate interacts with the harmonics present in the signal. Real-world grid signals are not clean sine waves — they contain 3rd and 5th harmonic distortion from non-linear loads like inverters and motor drives.

If your sampling rate drops below twice the frequency of a harmonic, that harmonic aliases — it folds back into the measurement bandwidth at a mirrored frequency. At critical sampling rates, a 250Hz 5th harmonic can alias directly onto the 50Hz fundamental, adding spurious energy to your RMS calculation and pushing you out of your target accuracy class.

**The metrological guardrail:** In this simulator, a warning triggers when sampling rate drops below 10x the highest harmonic frequency (2500Hz for a 250Hz 5th harmonic). This is the engineering safety factor required for stable RMS integration in certified metering designs.

---

### Reading the simulator

The simulator has two panels and three metric displays.

**Waveform panel (left)** shows 100 samples from the full 1024-sample DMA buffer. Two signals are overlaid:

- **Blue line** — the digitised signal as it would appear in the DMA buffer, including aliasing, thermal noise, and INL distortion
- **Grey dashed line** — the ideal analog ground truth

At high sampling rates the two lines sit on top of each other. As you drag the sampling rate below the metrological guardrail, watch the blue line begin to warp and develop phase shifts relative to the grey line. That visual separation is harmonic energy folding back into the measurement bandwidth. The divergence happens abruptly at specific critical sampling rates — not gradually.

**Spectrum panel (right)** shows the frequency content of the digitised signal using a DFT computed on a 256-sample window. At a default sampling rate of 4kHz you can see all three harmonics as distinct peaks — the 50Hz fundamental, 150Hz 3rd harmonic, and 250Hz 5th harmonic. This is what a clean, well-sampled metrology signal looks like in the frequency domain.

Note that the FFT panel is most informative at higher sampling rates. At very low rates (below ~400Hz), the harmonic peaks alias to low frequencies and fall outside the visible bin range, so the spectrum appears empty even as the waveform panel clearly shows distortion. Use the waveform panel to observe aliasing behaviour; use the spectrum panel to verify clean harmonic separation at your target operating point.

**Three metric displays** sit below the panels:

- **True RMS Error (%)** — percentage difference between the ideal signal RMS and the digitised signal RMS, computed across the full 1024-sample buffer
- **Delta Error (V)** — the same difference expressed in absolute volts — this is the raw measurement error your firmware would report to the application layer
- **PASS / FAIL** — whether the current error is within the selected IEC 62053 accuracy class

---

### Answering real design questions

Some questions you can answer before touching hardware:

*"My grid typically runs at 20% THD. If I sample at 4kHz with a 16-bit ADC, can I guarantee Class 0.5?"*

*"At what sampling rate does aliasing actually start visibly distorting my waveform?"*

*"My DMA buffer is constrained by available RAM. Does reducing to 512 samples affect my RMS stability?"*

Run the scenarios in the simulator. The error percentage and PASS/FAIL status give you a defensible answer backed by the actual signal math — before a single line of C code is written or a PCB is ordered.

---

### What the model includes and what it doesn't

**Included:**
- Correct harmonic aliasing via Nyquist fold-back
- Gaussian thermal noise (Box-Muller, σ = 0.8mV — realistic for STM32H7 noise floor)
- INL non-linearity (2.5 LSB amplitude, applied in voltage domain before quantization)
- 16-bit quantization with correct VREF = 3.3V
- DMA half-transfer / full-transfer cycle visualisation
- Metrological oversampling guardrail (triggers below 2500Hz)
- DFT spectrum display on 256-sample window (harmonic peak visualisation)
- Delta Error (V) — absolute RMS difference alongside percentage error

**Not included (future roadmap):**
- Higher order harmonics (7th, 9th) — significant in some industrial environments
- ADC conversion time model — clock-dependent sampling limits
- DNL (Differential Non-Linearity) — individual code width variation
- True ping-pong DMA buffer with concurrent CPU processing simulation

---

### [Try the Live ADC Simulator →](/tools/stm32h7-adc-simulator)