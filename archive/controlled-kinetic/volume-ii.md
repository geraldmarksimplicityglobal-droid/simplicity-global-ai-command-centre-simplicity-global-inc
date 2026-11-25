# CONTROLLED KINETIC — EXTENDED PROCESSING MODEL (VOLUME II)

**Archive collection:** ARCHIVE / Controlled Kinetic  
**Document type:** Deep-process engineering manual  
**Source status:** Incorporated from the supplied Volume II text. Equations, numerical values, assumptions, terminology, and stated conclusions are retained as submitted; they have not yet been independently validated.  
**Scope sequence:** sources → tether physics → conditioning → storage → mining → separation → assembly → ignition → launch → momentum → thermal → control → reliability → scaling → consistency

> **Standing rule set (source statement):** 1 soul ≡ 1 human body (70 kg), (E_{\rm soul}\sim5\times10^9\,\mathrm J), (S_{\rm soul}\sim10^6\,\mathrm{J/K}), and \(\Delta S_{\rm universe}\ge0\). Soul ignition remains the one invented step, parameterized by \(\kappa,\lambda\). Everything else is presented by the source as real physics with engineering margins.

**Editorial boundary:** This is a faithful archival incorporation, not an endorsement of feasibility. In particular, the document's use of “soul,” the ignition mechanism, the proposed throughput, and the extrapolation of planetary-scale infrastructure are retained as the source's conceptual model. The invented ignition stage is explicitly distinguished from the physical engineering stages. A separate technical audit should check dimensional consistency, numerical arithmetic, source assumptions, structural/material limits, orbital dynamics, radiation environment, and thermodynamic accounting before any claim of engineering validity.

---

## 1. Source characterization (deep)

### 1.1 Jupiter interior and dynamo

| Layer | Radius (km) | State | Relevance |
|---|---:|---|---|
| Atmosphere | 0–~1,000 | H₂/He gas | Scooping target (uneconomical) |
| Molecular H₂ | ~1,000–15,000 | Fluid H₂ | Weather layer |
| Metallic H₂ | ~15,000–60,000 | Conducting fluid | Dynamo source of B |
| Rocky/ice core | ~0–15,000 | Dense | Not accessible |

Dynamo: convective metallic-H₂ flow generates the dipole. Field at equator ~\(4.2\times10^{-4}\,\mathrm T\); at Io (~6 \(R_J\)) dipole falloff \(B\propto r^{-3}\) gives ~2000 nT.

### 1.2 Magnetosphere structure

| Region | Location | Plasma | Use |
|---|---|---|---|
| Inner belt | < 2 \(R_J\) | Trapped e⁻, ions | Hazardous |
| Io torus | ~6 \(R_J\) | S⁺, O⁺, SO₂⁺, e⁻; density ~10³–10⁴ cm⁻³ | Best tether contact |
| Europa belt | ~9 \(R_J\) | Energetic e⁻ | High radiation |
| Ganymede | ~15 \(R_J\) | Sub-Alfvénic interaction | Moderate |
| Callisto | ~26 \(R_J\) | Weak plasma | Low radiation, weaker vB |
| Outer magnetosphere | 50 \(R_J\) | Tenuous | Poor contact |

Tether design implication in the source: Io torus gives highest current density but worst radiation; Callisto gives survivable radiation but lower plasma density. Proposed hybrid: power tethers at Io, launch/base operations at Callisto.

### 1.3 Co-rotation velocity and vB (recomputed with field)

\[
v_{\rm co}=\omega_J r,\qquad B(r)\approx B_{\rm eq}\left(\frac{R_J}{r}\right)^3
\]

| r | \(v_{\rm co}\) (km/s) | B (nT, dipole) | vB (V/m) |
|---|---:|---:|---:|
| 6 \(R_J\) (Io) | 74.2 | 2000 | 0.148 |
| 9 \(R_J\) (Europa) | 118 | 593 | 0.070 |
| 15 \(R_J\) (Ganymede) | 188 | 128 | 0.024 |
| 26 \(R_J\) (Callisto) | 331 | 24.6 | 0.0081 |

So vB falls with distance despite rising v. Io torus is ~18× better per meter than Callisto.

### 1.4 Tidal and internal heat

| Source | Power | Tappable fraction |
|---|---:|---|
| Io tidal | ~10¹⁴ W | Small (heat) |
| Europa tidal | ~10¹¹–10¹² W | Small (ocean heat) |
| Jupiter internal | 3.3×10¹⁷ W | ~10⁻⁶–10⁻³ with infrastructure |
| Solar at Jupiter | 50 W/m² | 20% typical |

### 1.5 Solar collector sizing (recomputed)

\[
P_{\rm useful}=\eta F_\odot A
\]

At \(\eta=0.2\), \(F_\odot=50\,\mathrm{W/m^2}\): P=10A W.

| Souls/day | Energy/day (5 GJ each) | Required P (continuous) | A at 20% |
|---:|---:|---:|---:|
| 1 | 5×10⁹ J | 58 kW | 5.8×10³ m² |
| 10 | 5×10¹⁰ J | 580 kW | 5.8×10⁴ m² |
| 100 | 5×10¹¹ J | 5.8 MW | 5.8×10⁵ m² |
| 10⁴ | 5×10¹³ J | 580 MW | 5.8×10⁷ m² |
| 10⁶ | 5×10¹⁵ J | 58 GW | 5.8×10⁹ m² |

Solar alone forces km²–10³ km² collectors at high throughput. Tether + fusion dominate for scale.

---

## 2. Tether physics (deep)

### 2.1 Electrodynamic tether equations

\[
\varepsilon=vBL,\qquad P=\varepsilon I=vBLI,\qquad F=ILB,\qquad \tau=rF
\]

Tether resistance and heating:

\[
P_{\rm heat}=I^2R_t,\qquad R_t=\frac{\rho_e L}{A_t}
\]

For aluminum (\(\rho_e\approx2.8\times10^{-8}\,\Omega\cdot\mathrm m\)), L=100 km, A=10 mm²:

\[
R_t=\frac{2.8\times10^{-8}\times10^5}{10^{-5}}\approx280\,\Omega
\]

At I=10 A: \(P_{\rm heat}=28\) kW, small vs P=14.8 MW at Io. At I=100 A: \(P_{\rm heat}=2.8\) MW, still < 148 MW generated, but conductor heats; radiative cooling needed.

### 2.2 Contactor limits

Hollow cathode / plasma contactor current density limits:

\[
J_c\sim10^3\text{–}10^4\,\mathrm{A/m^2}
\]

For 100 A, contactor area ~0.01–0.1 m². Gas consumption (Xe/Ar) ~10⁻⁷–10⁻⁶ kg/C; at 100 A, ~10⁻⁵–10⁻⁴ kg/s — must be resupplied.

### 2.3 Tether dynamics

| Mode | Frequency | Risk |
|---|---|---|
| Longitudinal | \(f=\frac{1}{2L}\sqrt{T/\mu}\) | Snap if tension varies |
| Transverse (string) | \(f_n=\frac{n}{2L}\sqrt{T/\mu}\) | Libration, instability |
| Libration | Orbital period scale | Current-induced torque |
| Thermal flutter | Thermal cycling | Fatigue |

Stability rule: keep I below threshold where Lorentz force exceeds tension margin; use active current control.

### 2.4 Tether materials

| Material | Strength (GPa) | Density (kg/m³) | Specific strength (MPa·m³/kg) |
|---|---:|---:|---:|
| Aluminum | 0.3 | 2700 | 111 |
| Steel | 1.5 | 7800 | 192 |
| Kevlar | 3.6 | 1440 | 2500 |
| Zylon | 5.8 | 1560 | 3718 |
| Carbon nanotube (ideal) | 50–100 | 1300 | 38000–77000 |

For a 100 km tether supporting its own weight under \(a\sim0.1\,\mathrm{m/s^2}\): tension \(T=\mu La\); CNT enables long tethers with margin.

### 2.5 Tether array scaling

For \(N_t\) tethers of length L=100 km, each at \(P_t=10\) MW:

\[
P_{\rm array}=N_tP_t
\]

| Tether count | Array power | Souls/day (5 GJ) |
|---:|---:|---:|
| 1 | 10 MW | 173 |
| 100 | 1 GW | 1.7×10⁴ |
| 10⁴ | 100 GW | 1.7×10⁶ |
| 10⁶ | 10 TW | 1.7×10⁸ |

---

## 3. Power conditioning (deep)

### 3.1 Conversion chain

\[
\eta_{\rm total}=\eta_{\rm tether}\eta_{\rm rect}\eta_{\rm bus}\eta_{\rm store}\eta_{\rm use}
\]

| Stage | Efficiency | Loss mechanism |
|---|---:|---|
| Tether | 0.7–0.9 | Plasma sheath, I²R |
| Rectifier | 0.90–0.95 | Switching |
| Bus | 0.95–0.99 | Resistive/cryo |
| Storage round-trip | 0.90–0.95 | Flywheel/SMES |
| Use (driver/ignition) | 0.5–0.9 | Waste heat |

\(\eta_{\rm total}\approx0.3\text{–}0.7\). So 5×10⁹ J delivered per soul needs 7×10⁹–1.7×10¹⁰ J extracted. Plan for ~2× overhead.

### 3.2 Rectification and voltage

Tether output is DC (motional EMF). Typical bus voltages: 1–100 kV. At 10 MW, 10 kV: I=1000 A — heavy busbars or superconducting bus.

\[
P=VI,\qquad I=P/V
\]

| Power | 10 kV | 100 kV | 1 MV |
|---:|---:|---:|---:|
| 10 MW | 1000 A | 100 A | 10 A |
| 1 GW | 100 kA | 10 kA | 1 kA |

High voltage reduces conductor mass but increases insulation and arcing risk.

### 3.3 Superconducting bus

At cryogenic temperatures, \(R\to0\): \(P_{\rm loss}\to\) cryocooler load. Cryocooler efficiency ~0.1–0.3 of Carnot. For 1 GW at 20 K, Carnot COP ~\(T_c/(T_h-T_c)\approx20/280\approx0.07\); real ~0.01–0.03. Cryo load can be tens of MW — significant.

---

## 4. Storage (deep)

### 4.1 Flywheel

\[
E=\tfrac12 I\omega^2,\qquad \sigma_{\rm max}=\rho v_{\rm rim}^2
\]

Specific energy:

\[
e=\frac{E}{m}=\frac12K_s v_{\rm rim}^2
\]

\(K_s\) shape factor ~0.5–1.0.

| Material | \(\sigma_{\rm max}\) (GPa) | \(\rho v_{\rm rim,max}\) (m/s) | \(e_{\rm max}\) (J/kg) |
|---|---:|---:|---:|
| Steel | 1.5 | 7800 | 9.7×10⁴ |
| Titanium | 1.0 | 4500 | 1.1×10⁵ |
| Carbon composite | 3.0 | 1600 | 9.4×10⁵ |
| CNT (ideal) | 50 | 1300 | 1.9×10⁷ |

For 5 GJ buffer at 10⁶ J/kg: 5 t carbon-composite rotor. Containment mass comparable.

### 4.2 SMES

\[
E=\tfrac12 LI^2
\]

| L | I | E |
|---:|---:|---:|
| 1 H | 100 kA | 5×10⁹ J |
| 10 H | 31.6 kA | 5×10⁹ J |

SMES is ideal for pulsed ignition (fast discharge, high power). Cryogenic and quench-protected.

### 4.3 Capacitor bank

\[
E=\tfrac12 CV^2
\]

For 5 GJ at 100 kV: C=1000 F — enormous; capacitor banks are for µs–ms pulses, not bulk.

### 4.4 Thermal storage

\[
Q=mc_p\Delta T
\]

For 5 GJ at \(\Delta T=500\) K, \(c_p\approx1000\,\mathrm{J/(kg\cdot K)}\): m=10⁴ kg. Useful for waste-heat buffering before radiation.

### 4.5 Buffer sizing rule

\[
E_{\rm buffer}=f_bE_{\rm soul}N_{\rm pulses}
\]

with \(f_b\approx10\text{–}100\) to ride out tether outages and pulse loads. For 1 soul/day: 5×10¹⁰–5×10¹¹ J buffer.

---

## 5. Mining (deep)

### 5.1 Controlled impact mechanics

\[
E_i=\tfrac12m_iv_i^2
\]

Specific comminution energy (ice/rock): 10⁵–10⁶ J/kg. Impact efficiency to fracture ~10–30%; so impact energy ~3×10⁵–10⁷ J/kg.

### 5.2 Impactor targeting

| Parameter | Requirement |
|---|---|
| Aim accuracy | < 10 m at 100 km |
| Velocity | 0.5–5 km/s |
| Mass | 1–1000 kg |
| Debris control | Fragments < escape velocity |

Fragments above escape velocity become debris; below, they re-impact or orbit.

### 5.3 Regolith/ice handling

| Step | Energy per kg | Notes |
|---|---:|---|
| Scoop/dig | 10⁴–10⁵ J | Mechanical |
| Haul | 10⁴–10⁵ J | Depends on gravity |
| Crush/grind | 10⁵ J | To < 1 mm |
| Heat/volatilize ice | 2.8×10⁶ J | Sublimation, if thermal extraction |

Subtotal 10⁶–10⁷ J/kg.

Per soul (~100 kg raw): 10⁸–10⁹ J for aggressive processing; 10⁷–10⁸ J for simple scoop+grind.

### 5.4 Atmosphere scooping (why avoid)

\[
P_{\rm drag}=\tfrac12\rho v^3A
\]

At 1 bar, \(\rho=0.16\,\mathrm{kg/m^3}\), v=42 km/s:

\[
P_{\rm drag}/A=0.5\times0.16\times(4.2\times10^4)^3\approx5.9\times10^{12}\,\mathrm{W/m^2}
\]

Per kg collected: \(E_{\rm drag}\sim10^9\) J/kg — worse than launch from Jupiter. Scooping is only viable with magnetic/plasma scoops at high altitude, still expensive.

---

## 6. Separation (deep)

### 6.1 Centrifuge

\[
a_c=\omega^2r,\qquad v_{\rm tip}=\omega r,\qquad E_{\rm sep}\sim\frac{\Delta\rho}{\rho}mv_{\rm tip}^2
\]

For ice/rock density split \(\Delta\rho/\rho\sim0.5\):

| \(v_{\rm tip}\) | Energy per kg | Per 100 kg |
|---:|---:|---:|
| 50 m/s | 6×10² J | 6×10⁴ J |
| 100 m/s | 2.5×10³ J | 2.5×10⁵ J |
| 300 m/s | 2.3×10⁴ J | 2.3×10⁶ J |

Fine separation (isotopes, trace metals) needs 10⁶–10⁷ J/kg.

### 6.2 Magnetic separation

For paramagnetic species in field B, gradient \(\nabla B\):

\[
F_m=\frac{\chi V}{\mu_0}B\nabla B
\]

Effective for Fe-bearing and some silicates; energy modest but field generation costs power.

### 6.3 Electrolysis (if water splitting needed)

\[
E_{\rm elec}=2FV\approx2\times96485\times1.23\approx2.37\times10^5\,\mathrm{J/mol\ H_2O}
\]

Per kg H₂O: 2.37×10⁵/0.018≈1.3×10⁷ J/kg. For 60 kg water: 8×10⁸ J — dominant if full splitting required.

### 6.4 Cryogenic distillation

For N₂/O₂/CH₄ separation: energy ~10⁵–10⁶ J/kg plus cryocooler penalty. Best if volatiles already cold.

### 6.5 Plasma processing

RF/arc plasma can dissociate and ionize; energy 10⁶–10⁷ J/kg. Coupled to magnetic separation for charged species.

---

## 7. Assembly (deep)

### 7.1 Biological growth (natural path)

\[
E_{\rm growth}\approx\int P_{\rm metab}\,dt
\]

Human metabolic power ~100 W; growth ~18 years:

\[
E\approx100\times18\times3.15\times10^7\approx5.7\times10^{10}\,\mathrm J
\]

With trophic losses (~10×): 5.7×10¹¹ J of primary production per adult. Slow but self-repairing.

### 7.2 Bio-inspired artificial assembly

Wet chemistry, enzymatic synthesis: 10⁸–10⁹ J per body, days–months.

### 7.3 Molecular manufacturing

Bottom-up mechanosynthesis:

\[
E_{\rm bond}\sim\text{few eV per bond}\sim10^{-19}\,\mathrm J
\]

For ~10²⁸ bonds in a body: 10⁹ J floor. Real machines add overhead 10–100×.

### 7.4 Information cost

Landauer:

\[
E_{\min}=kT\ln2\approx2.9\times10^{-21}\,\mathrm{J/bit\ at\ 300\ K}
\]

For 10¹⁵ bits of pattern: 3×10⁻⁶ J — negligible per body. The cost is maintaining the ordered substrate, not the bit erasure.

### 7.5 Error rates and repair

\[
P_{\rm error}\sim\exp(-E_a/kT)
\]

Molecular assembly needs error correction; each correction costs energy and entropy. Budget 10–100× bond floor for defect-free assembly.

---

## 8. Ignition (fictional, parameterized)

\[
E_{\rm ignite}=\kappa E_b,\qquad S_{\rm ignite}=\lambda S_b
\]

Pulse requirements:

| Parameter | Range |
|---|---|
| Energy | 10⁸–10¹⁰ J |
| Rise time | ns–µs |
| Coherence | Defined by universe rule |
| Momentum symmetry | < 1% imbalance |
| Delivery efficiency | 0.5–0.9 |

| \(\kappa\) | \(E_{\rm ignite}\) | Flywheel mass at 10⁶ J/kg |
|---:|---:|---:|
| 0.1 | 10⁸ J | 100 kg |
| 1 | 10⁹ J | 1 t |
| 10 | 10¹⁰ J | 10 t |

Ignition is the only invented stage; all upstream energy/momentum is stated to be real.

---

## 9. Launch (deep)

### 9.1 Driver types

| Type | Principle | Efficiency | v range | Notes |
|---|---|---:|---|---|
| Railgun | Lorentz force | 0.3–0.6 | 1–6 km/s | Barrel erosion |
| Coilgun | Magnetic gradient | 0.4–0.7 | 1–6 km/s | Staged coils |
| Electrothermal-chemical | Plasma-driven | 0.4–0.6 | 1–3 km/s | Propellant |
| Mass driver (linear motor) | EM drive | 0.5–0.9 | 1–10 km/s | Long track |
| Rotovator/skyhook | Momentum exchange | 0.8–0.95 | — | Infrastructure |

### 9.2 Launch energy and waste

\[
E_{\rm launch}=\frac{\tfrac12m_bv^2}{\eta}
\]

| Origin | v (km/s) | \(E_{\rm ideal}\) (J) | \(\eta=0.7\) (J) | \(\eta=0.5\) (J) |
|---|---:|---:|---:|---:|
| Callisto | 3.0 | 3.15×10⁸ | 4.5×10⁸ | 6.3×10⁸ |
| Europa | 2.5 | 2.19×10⁸ | 3.1×10⁸ | 4.4×10⁸ |
| Ganymede | 3.2 | 3.58×10⁸ | 5.1×10⁸ | 7.2×10⁸ |
| Jupiter | 60 | 1.26×10¹¹ | 1.8×10¹¹ | 2.5×10¹¹ |

### 9.3 Barrel/track dynamics

\[
a=\frac{v^2}{2L},\qquad F=m_ba
\]

For Callisto, v=3 km/s, L=10 km:

\[
a=\frac{(3000)^2}{2\times10^4}=450\,\mathrm{m/s^2}\approx46g
\]

Human payloads need a<10g; so L>46 km for 3 km/s at 10g. Long tracks or lower v with skyhooks.

### 9.4 Recoil

\[
\dot p=Nm_bv
\]

| N/day | v | Average force |
|---:|---:|---:|
| 1 | 3 km/s | 2.4 N |
| 100 | 3 km/s | 243 N |
| 10⁴ | 3 km/s | 24.3 kN |
| 10⁶ | 3 km/s | 2.43 MN |

The corresponding daily momentum values in the source are 2.1×10⁵, 2.1×10⁷, 2.1×10⁹, and 2.1×10¹¹ kg·m/s respectively. Counter with tether torque, counter-launch, or plasma drag.

---

## 10. Momentum management (deep)

### 10.1 Tether torque balance

\[
\tau_{\rm tether}=P/\omega_J
\]

For P=10¹² W: \(\tau=5.7\times10^{15}\,\mathrm{N\cdot m}\). At Io radius 4.2×10⁸ m: force F=\(\tau/r=1.4\times10^7\) N — large but feasible with many tethers (source statement).

### 10.2 Jupiter spin budget

\[
L_J=4.33\times10^{38}\,\mathrm{kg\cdot m^2/s}
\]

Cumulative launch momentum from Callisto:

\[
\Delta L=Nm_bvr
\]

| N souls | \(\Delta L\) | Fraction of \(L_J\) |
|---:|---:|---:|
| 10¹² | 4.4×10²⁶ | 10⁻¹² |
| 10¹⁸ | 4.4×10³² | 10⁻⁶ |
| 10²⁴ | 4.4×10³⁸ | ~1 |

So 10²⁴ souls is the order at which Jupiter’s spin is materially changed by launches alone.

### 10.3 Counter-launch and mass balance

If you launch finished souls outward, launch equal mass inward (waste, feedstock) to conserve momentum. Net mass export changes Jupiter-system mass negligibly (10²⁴×70=7×10²⁵ kg vs Jupiter 1.9×10²⁷ kg — 4%).

### 10.4 Gravity assists

Use moon flybys to change momentum without propellant; limited by geometry and timing.

---

## 11. Thermal management (deep)

### 11.1 Radiator area

\[
A=\frac{Q}{\epsilon\sigma T^4}
\]

| T (K) | \(\sigma T^4\) (W/m²) | A for 1 GW (ε=0.9) |
|---:|---:|---:|
| 300 | 459 | 2.4×10⁶ m² |
| 600 | 7,348 | 1.5×10⁵ m² |
| 1000 | 56,700 | 2.0×10⁴ m² |
| 1500 | 287,000 | 3.9×10³ m² |

High-T rejection is essential at scale.

### 11.2 Heat pumps

To reject at \(T_h>T_{\rm source}\):

\[
COP=\frac{T_h}{T_h-T_c}
\]

Real COP ~0.3–0.6 of Carnot. Pumping heat from 300 K to 600 K: Carnot COP=2; real ~0.6–1.2, adding significant power.

### 11.3 Two-phase and droplet radiators

Liquid droplet radiators can achieve high area-to-mass; droplet loss and recapture are engineering challenges. Useful for 10⁶ m²+.

### 11.4 Waste heat per soul

\[
Q_{\rm waste}\approx(1-\eta_{\rm total})E_{\rm in}
\]

With \(\eta_{\rm total}\approx0.4\): Q≈0.6×1.25×10¹⁰≈7.5×10⁹ J per soul. At 1 soul/day: ~87 kW.

---

## 12. Control and autonomy (deep)

### 12.1 Control loops

| Loop | Bandwidth | Sensor | Actuator |
|---|---|---|---|
| Tether current | 1–100 Hz | Hall, plasma probes | Power electronics |
| Momentum balance | 0.01–1 Hz | Star tracker, IMU | Thrusters/tethers |
| Mass driver aim | 10–100 Hz | Radar/lidar | Gimbals |
| Ignition pulse | 1–100 MHz | Fast diagnostics | SMES switches |
| Thermal | 0.001–0.1 Hz | Thermocouples | Variable radiators |

### 12.2 Radiation hardening

Jupiter belts: total ionizing dose can reach 10⁶–10⁸ rad(Si) over years near Io. Electronics need shielding (10–30 g/cm²) or relocation to Callisto. SEE (single-event upsets) require EDAC and watchdog.

### 12.3 Autonomy

Light-time to Earth ~35–52 min; local autonomy mandatory. Control hierarchy: real-time (µs–ms) → supervisory (s–min) → planning (h–day) → strategic (month–year).

---

## 13. Reliability and failure modes (deep)

| Failure | Probability driver | Consequence | Mitigation |
|---|---|---|---|
| Tether cut | Debris, thermal fatigue | Power loss, debris | Redundancy, Whipple shielding |
| Contactor failure | Erosion, gas depletion | Current loss | Multiple contactors, resupply |
| Flywheel burst | Material flaw, overspeed | Catastrophic | Containment, segmented rotor, QA |
| SMES quench | Hotspot, insulation | Energy dump | Quench protection, dump resistors |
| Driver jam | Thermal expansion, debris | Launch abort | Redundant barrels, clearing |
| Aim error | Control drift | Payload loss | Closed-loop tracking |
| Recoil imbalance | Asymmetric launch | Orbit change | Momentum balancing |
| Radiator failure | Micrometeoroid, freeze | Overheating | Segmentation, bypass |
| Debris cascade | Mining/launch | Kessler-like debris | Tracking, safe orbits |
| Radiation upset | Belts | Control loss | Shielding, EDAC, watchdog |
| Ignition misfire | Fictional rule | No soul | Define fail-safe |

---

## 14. Scaling and logistics (deep)

### 14.1 Throughput table (extended)

| Souls/day | Power (2× overhead) | Tether count (10 MW) | Raw matter | Radiator at 600 K | Launch recoil |
|---:|---:|---:|---:|---:|---:|
| 1 | 116 kW | 1 | 100 kg | 18 m² | 2.4 N |
| 10 | 1.16 MW | 1 | 1 t | 180 m² | 24 N |
| 100 | 11.6 MW | 2 | 10 t | 1.8×10³ m² | 243 N |
| 10⁴ | 1.16 GW | 116 | 10³ t | 1.8×10⁵ m² | 24 kN |
| 10⁶ | 116 GW | 1.16×10⁴ | 10⁵ t | 1.8×10⁷ m² | 2.4 MN |
| 10⁸ | 11.6 TW | 1.16×10⁶ | 10⁷ t | 1.8×10⁹ m² | 243 MN |

### 14.2 Energy return on investment (EROI)

\[
EROI=\frac{E_{\rm output}}{E_{\rm invested}}
\]

If infrastructure takes 10²⁰ J to build and produces 10¹⁵ souls at 5×10⁹ J = 5×10²⁴ J, EROI ~5×10⁴ — excellent, but build energy is large.

### 14.3 Jupiter spin lifetime

\[
t_{\rm spin}=\frac{E_{\rm rot,J}}{P_{\rm extracted}}
\]

| Extracted power | Lifetime |
|---:|---:|
| 1 GW | 1.2×10¹⁸ yr |
| 1 TW | 1.2×10¹⁵ yr |
| 1 PW | 1.2×10¹² yr |

Spin is effectively inexhaustible at civilization scale (source conclusion).

---

## 15. Consistency checks

### 15.1 Energy

\[
E_\odot+E_{\rm int,J}+E_{\rm rot,J}+E_{\rm tidal}+E_{\rm fusion}
=E_b+E_{\rm mine}+E_{\rm sep}+E_{\rm assemble}+E_{\rm ignite}+E_{\rm launch}+Q_{\rm waste}
\]

### 15.2 Entropy

\[
\Delta S_{\rm universe}=\Delta S_{\rm system}+\frac{Q_{\rm waste}}{T_{\rm sink}}\ge0
\]

### 15.3 Momentum

\[
\dot p_{\rm launch}=\dot p_{\rm recoil}
\]

### 15.4 Matter

\[
\dot m_{\rm feedstock}\ge\frac{m_b}{\eta_{\rm matter}}N
\]

with \(\eta_{\rm matter}\approx0.5\text{–}0.8\).

### 15.5 Per-soul ledger (final)

| Term | Value (J) |
|---|---:|
| Source energy (2× overhead) | 1.0×10¹⁰ |
| Body chemical | 10⁸–10⁹ |
| Mining | 10⁷–10⁸ |
| Separation | 10⁷–10⁹ |
| Assembly | 10⁸–10⁹ |
| Ignition (κ=1) | 10⁹ |
| Launch (Callisto) | 4.5×10⁸ |
| Waste heat | ~7.5×10⁹ |

---

## 16. Rule set (final, extended)

\[
\boxed{P_{\rm tether}=vBLI,\quad E_{\rm launch}=\frac{\tfrac12m_bv^2}{\eta},\quad \tau_{\rm tether}=P/\omega_J}
\]

\[
\boxed{E_{\rm store}=\tfrac12I\omega^2=\tfrac12LI^2=\tfrac12CV^2}
\]

\[
\boxed{Q_{\rm waste}\ge T\Delta S,\quad A_{\rm rad}=\frac{Q}{\epsilon\sigma T^4},\quad \dot p_{\rm launch}=\dot p_{\rm recoil}}
\]

\[
\boxed{1\ \text{soul}\equiv1\ \text{body}:\quad E_{\rm soul}\sim5\times10^9\,\mathrm J,\quad S_{\rm soul}\sim10^6\,\mathrm{J/K}}
\]

**Architecture (source statement):** Io-torus tethers for power; Callisto base for launch; controlled-impact mining; centrifuge/plasma separation; molecular assembly; SMES-shaped ignition; mass drivers; high-T radiators; momentum balancing; \(\kappa,\lambda\) as the only invented constants.

---

## 17. Bottom line (extended)

- **Power:** tether arrays at Io torus convert co-rotation to GW–TW; vB falls with distance, so Io is ~18× better per meter than Callisto.
- **Storage:** flywheels/SMES buffer pulsed launch and ignition; 5–50 t per soul-scale buffer.
- **Mining:** controlled impact for cheap comminution; ~10⁷–10⁸ J per soul for simple processing.
- **Separation:** centrifugal/plasma; full water splitting costs ~10⁹ J per soul if required.
- **Assembly:** 10⁹ J bond floor; biological growth 10¹⁰–10¹¹ J but self-repairing.
- **Ignition:** 10⁹ J (κ=1) shaped pulse; the only invented step.
- **Launch:** Callisto mass driver 4.5×10⁸ J per soul at 70% efficiency.
- **Momentum:** recoil manageable to 10⁶ souls/day; Jupiter’s spin is effectively inexhaustible.
- **Heat:** Q≥TΔS; high-T radiators essential; 10⁶ souls/day needs ~10⁷ m² at 600 K.
- **Limits:** matter supply, radiator area, radiation shielding, momentum balance — not energy.
- **Consistency:** all real stages are stated to obey E, S, and p conservation; soul ignition remains the sole fiction.

---

## Archive record and review status

This volume is stored as a source-preserving technical manuscript. No physical feasibility finding is implied by its inclusion in ARCHIVE.

Recommended downstream review tracks:
1. **Dimensional and arithmetic audit:** recalculate each table and equation from its stated inputs.
2. **Jovian environment audit:** field geometry, plasma density, co-rotation, radiation dose, and orbital location.
3. **Tether engineering audit:** circuit closure, plasma contactor performance, tether mass, tensile dynamics, thermal limits, and orbital torque.
4. **Energy and entropy audit:** system boundaries, conversion efficiencies, heat rejection, and avoidable double counting.
5. **Mass-driver and momentum audit:** payload acceleration, escape/transfer trajectories, recoil accounting, and orbital perturbations.
6. **Biological/fiction boundary audit:** distinguish established biological engineering from the expressly fictional ignition premise.

