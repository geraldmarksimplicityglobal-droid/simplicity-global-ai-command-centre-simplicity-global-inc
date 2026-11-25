# CONTROLLED KINETIC — VOLUME II ENGINEERING EXTENSION A

**Archive collection:** ARCHIVE / Controlled Kinetic  
**Relationship:** Companion to [Volume II](volume-ii.md); does not replace or silently edit it.  
**Purpose:** Extend the original architecture with explicit system boundaries, corrected arithmetic examples, physical coupling requirements, sizing equations, uncertainty controls, and a verification programme.  
**Status:** Engineering analysis draft. Numerical examples are screening calculations, not a validated design or proof of feasibility.

## A.1 Document-control rules

1. Volume II remains the preserved source manuscript.
2. This extension labels source statements, independent arithmetic checks, physical-model requirements, and speculative assumptions separately.
3. A corrected calculation in this extension does not alter the original source value.
4. No numerical performance claim is a design guarantee without a defined operating point, geometry, boundary conditions, uncertainty interval, and validation evidence.
5. The “soul” and “ignition” terminology is retained as conceptual language. The model does not establish that a soul is a measurable physical entity or that the proposed ignition process exists.

## A.2 System boundary and accounting convention

The original ledger combines source extraction, body assembly, ignition, launch, and heat rejection. For a consistent engineering ledger, define a control volume around the complete facility and use one declared accounting interval.

Let:

- (E_{s}): energy crossing into the facility from each external source;
- (E_{out}): useful energy and exported energy crossing out;
- (E_{stored,0}, E_{stored,1}): stored energy at the start and end;
- (Q_{out}): heat rejected across the boundary;
- (W_{loss}): energy dissipated internally and ultimately rejected as heat;
- (E_{feed}): chemical, thermal, kinetic, and gravitational energy carried by incoming feedstock;
- (E_{export}): energy carried away by outgoing matter, radiation, and payloads.

A first-law ledger is:

[
sum E_s + E_{feed} + E_{stored,0}
=
E_{out}+E_{export}+Q_{out}+E_{stored,1}
]

This is an accounting identity, not a performance equation. Do not count a stored-energy discharge once as a source and again as newly generated energy. Do not count the same conversion loss both in a stage efficiency and again as a separate waste-heat term.

For a chain of serial conversion stages:

[
E_{delivered}=E_{source}prod_{i=1}^{n}eta_i
]

[
E_{source}=rac{E_{delivered}}{prod_ieta_i}
]

The phrase “2× overhead” is only an approximation. It corresponds to an overall efficiency of 0.5; it is not a universal safety factor. If the stated stage efficiencies multiply to 0.3, the required input is 3.33 times delivered energy; at 0.7 it is 1.43 times.

For entropy, use the entropy balance for the declared control volume:

[
Delta S_{CV}=int rac{delta Q}{T_b}+sum S_{in}-sum S_{out}+S_{gen}
]

where (T_b) is the local boundary temperature for heat transfer and (S_{gen}ge0) for an irreversible process. A single expression (Q/T_{sink}) is only valid when the rejected heat and sink temperature are sufficiently well-defined. (Qge TDelta S) is not a general substitute for the full entropy balance.

## A.3 Electrodynamic tether: corrected screening calculation

### A.3.1 Motional field is relative-motion dependent

The local motional electric field in the tether frame is governed by the relative velocity between the conductor and the plasma:

[
mathbf E_m=(mathbf v_{tether}-mathbf v_{plasma})	imesmathbf B
]

The scalar estimate (vB) applies only when the relative velocity is perpendicular to the magnetic field. For an extended tether, orientation and local field variation matter:

[
mathcal E=int_{tether}(mathbf v_{rel}	imesmathbf B)cdot dmathbf l
]

The simple expression (mathcal E=vBL) is a special-case upper-level estimate, not a complete circuit model.

At Io's orbital distance, the source uses approximately 74.2 km/s for rigid corotation and approximately 17.3 km/s for Io's orbital speed. For a tether moving with Io, a first-order azimuthal relative-speed estimate is therefore about 56.9 km/s, not 74.2 km/s. With the source's approximate 2,000 nT field:

[
E_mapprox56.9\,000\times2\times10^{-6}
approx0.114\;V/m
]

For a perfectly aligned 100 km active length, this gives a nominal open-circuit EMF of approximately 11.4 kV. Actual voltage depends on orientation, plasma flow, field geometry, current closure, and the tether's orbit and attitude.

### A.3.2 The source's power arithmetic discrepancy

Using the source's own stated (vB=0.148\;V/m) and (L=100\;km):

[
mathcal E=0.148\times100\,000=14\,800\;V
]

Thus the ideal electrical power before internal losses is:

| Current | Ideal (P=\mathcal EI) | Tether ohmic heating at (R=280\;\Omega) |
|---:|---:|---:|
| 10 A | 148 kW | 28 kW |
| 100 A | 1.48 MW | 2.8 MW |

The Volume II statements “14.8 MW at 10 A” and “148 MW at 100 A” are each 100 times too high for the stated 14.8 kV EMF. Also, at 100 A the simple 280-ohm conductor loss (2.8 MW) exceeds the stated 1.48 MW ideal generated power. That operating point cannot deliver positive net electrical power under this simplified resistance assumption.

At the relative-speed screening estimate of 11.4 kV, the ideal values become 114 kW at 10 A and 1.14 MW at 100 A. These are still not net deliverable power: plasma collection/emission, contactor, leads, converters, thermal limits, and tether dynamics must be included.

### A.3.3 Required distributed model

A credible tether model must resolve, at minimum:

- local (B(s,t)), plasma density, species, temperature, and bulk velocity;
- tether position, attitude, orbital velocity, and structural deformation;
- distributed current (I(s)) and potential (V(s));
- electron collection and emission/return-current closure;
- conductor resistivity as a function of temperature and radiation damage;
- plasma sheath and contactor voltage drops;
- Joule heating, radiative cooling, and thermal expansion;
- Lorentz force distribution and coupled orbital/attitude dynamics.

A bare tether behaves as a plasma-collecting conductor, not simply as a battery with a fixed voltage. Published tether reviews discuss sheath physics, current collection, heating, bowing, breaking, and arcing; see the references in A.10.

## A.4 Jovian environment: operating envelope, not a single number

The Io plasma torus is dynamic. Density, temperature, composition, centrifugal-equator position, and plasma velocity vary with longitude, local time, and Jovian rotation. A tether performance model must therefore use a time-dependent environment rather than one constant density and one rigid-corotation speed.

Jupiter's plasma disc also does not remain in perfect rigid corotation at all radii. Observational and modeling work reports corotation breakdown in the middle magnetosphere, with details dependent on radius and sector. Consequently, the Volume II extrapolation of (v_{co}=omega_Jr) to Callisto is not a defensible plasma-relative velocity estimate.

The design environment should contain:
1. a nominal state;
2. a low-density / low-relative-speed power case;
3. a high-density / high-current collection case;
4. a high-radiation electronics case;
5. a plasma variability and transient case;
6. an off-nominal safe-mode state.

Callisto's relative advantage is a substantially more distant orbital environment and lower trapped-particle exposure than the inner moons, not zero radiation or zero plasma. Habitat shielding, electronics shielding, surface operations, and external tether systems require separate dose budgets.

## A.5 Launch and momentum: separate the local escape problem from the mission trajectory

The ideal kinetic energy of a 70 kg payload at 3 km/s is:

[
E_k=\frac12(70)(3000)^2=3.15\times10^8\;J
]

At 70% electrical-to-payload efficiency, the idealized input is:

[
E_{in}=\frac{3.15\times10^8}{0.7}
\approx4.50\times10^8\;J
]

This arithmetic is consistent with the Volume II table. It does not establish that 3 km/s produces the required mission trajectory.

A launch design must separately calculate:

- Callisto surface escape speed and local rotation;
- Callisto's orbital velocity around Jupiter;
- launch azimuth and direction in the moon's orbital frame;
- Jupiter-centered transfer orbit and desired periapsis/apoapsis;
- moon and planet gravity losses;
- finite-duration acceleration and track geometry;
- atmospheric/exosphere interaction where relevant;
- payload acceleration tolerance and structural loads;
- post-launch targeting and navigation corrections.

The required launch velocity is a vector sum in the appropriate reference frame. A scalar “3 km/s from Callisto” is insufficient to establish escape plus a chosen Jovian or heliocentric transfer.

For a constant-acceleration mass driver:

[
a=\frac{v^2}{2L},\qquad t=\frac{v}{a}=\frac{2L}{v}
]

For 3 km/s over 10 km, (a=450\;m/s^2), about 46 g. At a 10 g acceleration ceiling, the ideal track length is at least:

[
L=\frac{v^2}{2a}
=\frac{(3000)^2}{2(98.1)}
\approx45.9\;km
]

This ignores jerk limits, end effects, magnetic gap, switching, structural deflection, and payload restraint.

For repeated payload launches, momentum must be tracked as a vector and by subsystem:

[
Deltamathbf p_{payload}=mDeltamathbf v
]

[
Deltamathbf p_{facility}+
Deltamathbf p_{moon}+
Deltamathbf p_{Jupiter}+
Deltamathbf p_{payload}+
Deltamathbf p_{exhaust}=0
]

The facility cannot simply “counter-launch” mass without specifying where the counter-mass goes and how its trajectory exchanges momentum with the moon/Jupiter system.

## A.6 Thermal design: radiator temperature is not process temperature

For an idealized radiator:

[
Q=\epsilon\sigma A F_v(T_r^4-T_{space}^4)
]

where (F_v) represents effective view factor and (T_r) is radiator surface temperature. The simplified (A=Q/(\epsilon\sigma T^4)) assumes a large cold radiative environment, unobstructed view, and a uniform radiator temperature.

A real thermal architecture must specify:
- heat source temperature and allowable operating range;
- coolant inlet/outlet temperatures and mass flow;
- heat exchanger effectiveness and pressure drop;
- radiator emissivity, degradation, and surface contamination;
- view factors to Jupiter, moons, spacecraft, and other warm structures;
- radiator orientation, eclipse exposure, and solar/Jovian infrared loading;
- pump and cryocooler electrical loads;
- micrometeoroid puncture tolerance and isolation zones;
- heat rejection during startup, standby, faults, and peak pulse recovery.

The radiator area table is therefore a blackbody screening estimate, not a complete radiator mass or area estimate.

## A.7 Scaling and uncertainty discipline

The source throughput table extrapolates linearly from one soul-scale unit. Linear scaling is valid only if the underlying resource, infrastructure, and operating constraints remain independent and proportional. In practice, tether interactions, plasma depletion/perturbation, thermal view-factor congestion, debris risk, current-return paths, material supply, and launch scheduling can create nonlinear constraints.

Every top-level result should carry:
- nominal value;
- lower and upper bound;
- confidence/uncertainty basis;
- dominant sensitivity parameters;
- evidence class (measured, modeled, extrapolated, assumed, or fictional);
- validation method and responsible subsystem.

Use parameter sweeps or Monte Carlo analysis only after distributions and correlations are justified. Do not assign arbitrary probability distributions to unknowns merely to produce a confidence interval.

A preliminary sensitivity set should include:

| Subsystem | Dominant variables | Required output |
|---|---|---|
| Tether power | (B,v_{rel},L,I,R(T)), plasma collection | Net power and stable operating envelope |
| Contactor | plasma state, emission current, propellant flow | Current closure and consumable rate |
| Structure | tensile strength, flaw population, thermal cycling | Lifetime and failure probability |
| Storage | specific energy, containment mass, cycle life | Usable energy and safe discharge rate |
| Mining | target composition, impact coupling, fragment velocities | Recoverable feedstock per joule |
| Separation | feed composition, purity, process yield | Energy per kg of qualified output |
| Assembly | yield, defect rate, repair rate, energy per operation | Qualified-body yield and cycle time |
| Launch | trajectory vector, acceleration, efficiency | Payload delivery probability and recoil |
| Thermal | waste heat, radiator temperature, view factor | Area, mass, pump power, and fault margin |

## A.8 Verification programme and stage gates

No integrated megastructure should be treated as one first-build project. Validate the physics and interfaces in progressively larger, independently testable steps.

| Gate | Test article / analysis | Pass evidence | Stop condition |
|---|---|---|---|
| G0 — Requirements | System boundary, units, data dictionary, safety case | Signed requirement baseline and traceable equations | Undefined units or contradictory ledgers |
| G1 — Environment | Validated Jovian plasma/field model | Reproducible time- and location-dependent environment | No defensible plasma-relative velocity model |
| G2 — Circuit | Laboratory tether/plasma-contact test | Measured current-voltage and net power curves | No stable current closure or unacceptable arcing |
| G3 — Thermal | Coupled electrical/thermal model and test | Temperatures within qualified limits | Thermal runaway or insufficient rejection |
| G4 — Structure | Deployment and fatigue test article | Structural margin under combined loads | Unstable deployment, fracture, or uncontrollable oscillation |
| G5 — Dynamics | Hardware-in-loop tether/orbit simulation | Stable control over bounded disturbances | Unrecoverable attitude/orbit divergence |
| G6 — Storage | Contained full-cycle representative module | Verified usable energy, cycle life, fault containment | Uncontained failure or unsafe discharge |
| G7 — Mining/separation | Small-scale representative feedstock pilot | Measured mass yield, purity, energy, waste | Uncontrolled ejecta or unclosed material balance |
| G8 — Assembly | Non-human-relevant test substrate | Reproducible yield and quantified defect rates | Unbounded defect accumulation |
| G9 — Launch | Instrumented inert payload demonstration | Verified trajectory, acceleration, recoil, and debris control | Unsafe debris or unacceptable momentum imbalance |
| G10 — Integrated demo | Reduced-scale end-to-end test | All ledgers close within predeclared uncertainty | Any unaccounted energy, mass, momentum, or thermal flow |

The fictional ignition stage is not a physical test gate unless and until it is given an independently testable, falsifiable definition. It must not be used to conceal missing energy, entropy, or momentum accounting in the real subsystems.

## A.9 Updated discrepancy register

| ID | Volume II item | Finding in this extension | Disposition |
|---|---|---|---|
| CK-001 | 14.8 MW at 10 A from 14.8 kV | Arithmetic gives 148 kW | Correct in derivative calculations; preserve source |
| CK-002 | 148 MW at 100 A from 14.8 kV | Arithmetic gives 1.48 MW | Correct in derivative calculations; preserve source |
| CK-003 | 100 A through 280 ohm tether | 2.8 MW ohmic loss exceeds 1.48 MW ideal source estimate | Operating point is infeasible under those simplified assumptions |
| CK-004 | (v=\omega_Jr) used as tether/plasma relative speed | Must subtract/resolve actual plasma bulk velocity and tether velocity vector | Replace with measured/modelled (mathbf v_{rel}) |
| CK-005 | Rigid corotation applied at Callisto | Middle/outer magnetosphere can be sub-corotational | Require local plasma model |
| CK-006 | (P/\omega_J) used as generic tether torque | Valid only for a specified spin-energy coupling at the relevant angular velocity | Derive torque from full angular-momentum exchange |
| CK-007 | Callisto 3 km/s called launch speed | Kinetic-energy arithmetic is valid; mission trajectory is not established | Perform vector trajectory analysis |
| CK-008 | (Q/T) entropy shorthand | Requires specified boundary and reservoir temperatures | Use entropy balance |
| CK-009 | Linear throughput extrapolation | Infrastructure interactions may be nonlinear | Add sensitivity and bottleneck analysis |
| CK-010 | Radiation dose as one orbital value | Dose depends on orbit, shielding, duration, particle spectrum, and component | Require environment-specific dose-depth analysis |

## A.10 Reference set for the physical background

These sources support selected background statements; they do not validate the complete Controlled Kinetic architecture or its throughput claims.

1. NASA, *NASA-HDBK-4002B*, space environment handbook. The Jupiter discussion identifies the magnetic-field tilt, rapid rotation, Io's plasma contribution, and time-varying plasma disc.  
   https://standards.nasa.gov/sites/default/files/standards/NASA/B/0/2022-06-07-NASA-HDBK-4002B-Approved.pdf

2. Sanmartín et al., *A review of electrodynamic tethers for science applications*, Plasma Sources Science and Technology (2010). Discusses bare tether current collection in magnetized plasma and the relevant tether physics.  
   https://doi.org/10.1088/0963-0252/19/3/034022

3. NASA Science, *Callisto Facts*. Provides Callisto's orbital distance, orbital period, and surface context.  
   https://science.nasa.gov/jupiter/jupiter-moons/callisto/facts/

4. *The Space Environment of Io and Europa*, Journal of Geophysical Research: Space Physics (2020). Reviews the plasma torus and moon–magnetosphere interactions.  
   https://doi.org/10.1029/2019JA027485

5. *Radial and Vertical Structures of Plasma Disk in Jupiter's Middle Magnetosphere* (2024). Reports Juno-based plasma-disc properties and corotation behavior between 10 and 40 Jupiter radii.  
   https://doi.org/10.1029/2024JA032715

6. *Juno Observations Set New Constraints on the Electrodynamic Interaction Between Io and Jupiter* (2024). Provides observational constraints on Io's electrodynamic interaction and Alfvén-wing currents.  
   https://doi.org/10.1029/2024JA032591

## A.11 Extension conclusion

Volume II's broad architecture is now accompanied by explicit accounting, tether-circuit, plasma-environment, trajectory, thermal, uncertainty, and verification requirements. The most immediate numerical correction is the factor-of-100 tether power arithmetic error in the 100 km / 14.8 kV example. The most important model correction is that tether voltage depends on the conductor's velocity relative to the local plasma, with circuit closure and distributed current collection—not simply Jupiter's rigid-corotation speed multiplied by field and length.

The architecture remains a conceptual systems model. Its high-level energy availability, throughput, materials, human-body assembly, and ignition assumptions remain unproven. The next technical release should be a traceable calculation workbook or executable model that derives every table from declared inputs and emits energy, mass, momentum, entropy, thermal, and uncertainty ledgers.
