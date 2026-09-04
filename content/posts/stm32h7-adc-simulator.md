---
title: "ADC Digital Twin & Metering Lab"
date: 2026-03-10
description: "High-precision STM32H7 ADC simulator with harmonic distortion and CSV export."
layout: "single"
aliases: ["/tools/stm32h7-adc-simulator/"]
---

This tool models the behavior of a 16-bit SAR ADC integrated with a DMA controller. It is designed to help engineers validate metrology algorithms (like RMS or FFT) against quantization noise and harmonic interference.

### Key Features:
* **Harmonic Distortor:** Inject 3rd and 5th harmonics to test THD resilience.
* **Accuracy Class Check:** Real-time compliance monitoring for Class 0.2, 0.5, and 1.0.
* **Data Export:** Generate synthetic 16-bit datasets for offline C/Python analysis.

{{< stm32h7_adc_sim >}}

---
**Looking for the technical deep-dive?** Read the full analysis in the [ADC Digital Twin Note](/notes/stm32h7-adc-digital-twin/).
