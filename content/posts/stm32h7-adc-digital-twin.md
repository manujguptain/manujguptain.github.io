---
title: "Rapid Prototyping: A Digital Twin for STM32H7 ADC Metrology"
date: 2026-03-10
draft: false
comments: true
summary: "Before you spin a PCB, you should know whether your hardware choices will meet your accuracy targets. Here is a look at how I used AI to rapidly build a digital twin of the STM32H7 ADC to visualize these constraints."
categories: ["Embedded Systems", "AI Prototyping"]
tags: ["stm32", "digital-twin", "metrology", "simulation", "gemini"]
aliases: ["/lab/stm32h7-adc-digital-twin/"]
---

Before you spin a PCB or write a line of firmware, you should know whether your hardware choices will meet your accuracy targets. For industrial metering, this is not a nice-to-have—it is the difference between a design that passes certification and one that doesn’t.

Historically, modeling these constraints took weeks of mathematical mapping and coding. I wanted to test the waters and see how fast I could build a working, interactive model using modern AI tools. 

### A Quick Disclaimer on the Data
*This project is designed as an indicative Proof of Concept (POC). The goal here is to demonstrate the "art of the possible" regarding rapid embedded system visualization using AI. Because the focus was on speed, many of the specific technical details, register behaviors, and physical noise parameters were suggested by Gemini as a coding copilot. I have not manually cross-referenced every single parameter against the official STMicroelectronics datasheet to verify what is 100% true or false. Please treat the underlying data as illustrative, structural simulation rather than a production-verified reference.*

---

### What We Built
This is a browser-based simulation of the STM32H7’s internal 16-bit SAR (Successive Approximation Register) ADC, built specifically for metering and metrology applications.

The key word is **twin**—not just a clean mathematical model. The simulator attempts to replicate the hardware-level constraints that actually matter in a real design: Gaussian thermal noise, INL non-linearity, harmonic aliasing, and the DMA buffer transfer cycle. 

The architecture mirrors the actual data path inside the MCU:
1. **Signal Generation Engine:** Your simulated grid sensor input.
2. **The Silicon Twin:** The ADC peripheral with its physical non-idealities injected.
3. **Transport Layer:** The simulated DMA configuration.
4. **Metrology Engine:** Your firmware RMS calculation.

Change any parameter on the fly, and you see the effect on the final error immediately.

### Why This Matters Before You Build Anything
In IEC 62053 metering, accuracy class defines the maximum allowable RMS error:

| Accuracy Class | Max Allowable Error | Typical Use |
| :--- | :--- | :--- |
| **Class 0.2** | ±0.2% | Utility / revenue metering |
| **Class 0.5** | ±0.5% | Industrial metering |
| **Class 1.0** | ±1.0% | Residential / general purpose |

Hitting these targets depends heavily on how your sampling rate interacts with the harmonics present in the signal. Real-world grid signals are not clean sine waves—they contain 3rd and 5th harmonic distortion from non-linear loads like inverters and motor drives.

If your sampling rate drops below twice the frequency of a harmonic, that harmonic aliases—it folds back into the measurement bandwidth at a mirrored frequency. At critical sampling rates, a 250Hz 5th harmonic can alias directly onto the 50Hz fundamental, adding spurious energy to your RMS calculation and pushing you out of your target accuracy class.

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


### Answering Real Design Questions
The value of a digital twin—even an indicative one—is the ability to answer architectural questions before touching hardware:
* *"My grid typically runs at 20% THD. If I sample at 4kHz with a 16-bit ADC, can I theoretically guarantee Class 0.5?"*
* *"At what sampling rate does aliasing actually start visibly distorting my waveform?"*

The fact that we can now conceptualize, draft, and spin up a complex visual simulator in record time using AI completely changes the game for early-stage prototyping.



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

### [Try the Live ADC Simulator →](/labs/stm32h7-adc-simulator/)
