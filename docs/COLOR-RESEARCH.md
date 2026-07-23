# Campus Coffee — Color Research & Palette System

> Research date: 2026-07-23. Companion to [ADDICTION-RESEARCH.md](ADDICTION-RESEARCH.md).
> Every pairing below is WCAG-verified (contrast ratios computed, all pass AA — receipts in each table).

---

## TL;DR — The Recommendation

**Keep the dark-roast base. Expand the accents into a "canteen counter" system: four soft drink-inspired pastels — Rose Milk (baby pink), Chai Spice (red), Pista (light green), Burnt Honey — one per feature, never more than one per screen.** Add a **Cream Ticket** light palette for share cards, reveals, and marketing artifacts. This is 2026-trend-correct (pastels are the year's wave), scientifically right for dark UIs (desaturated accents are Material's own guidance), strategically differentiated (dating apps all fight in saturated red-orange), and grounded in Campus Coffee's own world instead of generic trend colors.

---

## PART I — What the Research Says

### 1. Pastels are the 2026 color wave — but only the *grounded* kind reads premium

- Soft pastels — baby pink, mint, butter yellow, baby blue — are the dominant 2026 direction across fashion and branding; "light, dainty pastel tones on track to be everywhere by spring 2026."
- **"Soft-tech pastels"** is the specific 2026 *app* trend: washed pinks, misty lavenders, gentle greens — "soothing enough for wellness brands yet polished enough for modern interfaces."
- **Pantone's 2026 Color of the Year is Cloud Dancer (11-4201) — a soft white.** First white ever chosen; the signal is calm, minimal, "a blank canvas." This validates a cream/paper companion palette.
- "Matcha Mochi" (muted sage/mint + creamy off-whites + true black) and butter yellow ("Pale Banana") are named 2026 palettes — pista green and burnt honey sit exactly in this zone.
- Key premium insight from the research: *"Because pastels are tinted with white, they tend to look airy and premium — especially when combined with generous spacing."* Pastel ≠ childish; **saturated-pastel-everywhere** is childish. Pastel accents on disciplined dark = premium.

### 2. The science of color on dark backgrounds

- Material Design's dark-theme guidance: **use desaturated (pastel) accents on dark surfaces** — saturated colors visually vibrate against dark and fail accessibility. This is exactly why the canteen accents are pastels, not neons.
- The **60-30-10 rule**: ~60% dominant (dark roast), ~30% secondary (raised surfaces/cream text), ~10% accent — and the accent must mean "take action here." If accent color appears in decoration, it loses its signal.
- **Spotify discipline**: signature color used *exclusively* for interactive elements — that exclusivity is what builds the color-action association.
- Premium dark reference: **CRED** — India's benchmark for "whispers luxury, doesn't scream." Dark theme, restrained neutrals, color used surgically. Campus Coffee's dark roast base is the same play with warmth instead of fintech coldness.

### 3. The competitive color map (why this differentiates)

| App | Color territory | Signal |
|---|---|---|
| Tinder | Saturated red-orange flame | Urgency, volume, dopamine |
| Hinge | Ink/typographic minimal | Seriousness |
| Bumble | Yellow | Optimistic outlier |
| BeReal | Black & white | Anti-design authenticity |
| **Campus Coffee** | **Dark roast + drink pastels** | **Warm, premium, real-world** |

- Research on pink vs red in dating contexts: **red triggers passion + urgency but too much reads aggressive/threatening; pink conveys warmth and connection** — less pursuit, more invitation. Baby pink for Blind Coffee (the anonymous, gentle feature) and chai red kept in *small doses* for Coffee Date is exactly the right psychological split.
- Nobody in the social/dating space owns soft pink + pista green on warm dark. This palette is claimable territory.

---

## PART II — The Concept: *The Palette Is the Canteen Menu*

The distinctive move (not a trend-board paste-job): **neutrals come from the roast, accents come from the drinks at an Indian campus canteen counter.** Every color has a name a MUJ student instantly recognizes:

- **Rose Milk** — baby pink → **Blind Coffee** (soft, anonymous, flirty; pink-not-red psychology)
- **Chai Spice** — muted red → **Coffee Date** (warmth + a hint of urgency; already locked in brand)
- **Pista** — light green → **Library Partner** (calm, focus, matcha-trend adjacent)
- **Burnt Honey** — amber → **Mess Partner** (food, warmth; already locked in brand)

**The discipline that keeps four accents premium-minimal: one accent family per screen.** A Library screen is roast + cream + pista only. The home screen is roast + cream, with each token carrying only its feature's stamp color. No screen ever mixes accent families. (This is the 60-30-10 rule + Spotify exclusivity, systematized.)

Semantic states reuse the same families — no new colors: success = Pista, error/destructive = Chai Spice, warning/pending = Burnt Honey. The palette stays at 4 accent families, total.

---

## PART III — The Palettes

### Palette A — "Dark Roast, Canteen Counter" (primary app theme) ★ RECOMMENDED

**Neutrals (the 60% + 30%):**

| Token | Hex | Role | Contrast on `#1A1310` |
|---|---|---|---|
| `roast-0` | `#1A1310` | App background (locked identity) | — |
| `roast-1` | `#231A15` | Cards / surfaces | — |
| `roast-2` | `#2D221B` | Raised elements, inputs | — |
| `hairline` | `#3A2C23` | Borders, token perforation lines | — |
| `cream` | `#F2E9DB` | Primary text | **15.25 : 1** ✓ |
| `latte` | `#C4B5A3` | Secondary text | **9.16 : 1** ✓ |
| `sediment` | `#8D7D6C` | Muted text, timestamps, serials | **4.62 : 1** ✓ |

**Accents (the 10% — each family: pastel for text/icons/outlines on dark, core for fills, stamp for cream-paper artifacts):**

| Family | Pastel (on dark) | Core (fills) | Stamp (on paper) | Feature |
|---|---|---|---|---|
| **Rose Milk** 🩷 | `#F5C1CB` (11.68:1 ✓) | `#E89AAB` (8.42:1 ✓) | `#B4485F` (4.64:1 ✓) | Blind Coffee |
| **Chai Spice** ❤️ | `#F2AC9C` (9.75:1 ✓) | `#E06A50` (5.55:1 ✓) | `#B03A24` (5.38:1 ✓) | Coffee Date |
| **Pista** 💚 | `#C8DBB2` (12.43:1 ✓) | `#A9C98F` (9.99:1 ✓) | `#546F45` (5.01:1 ✓) | Library Partner |
| **Burnt Honey** 🧡 | `#F0CE9A` (12.23:1 ✓) | `#DBA55E` (8.35:1 ✓) | `#875D26` (5.16:1 ✓) | Mess Partner |

Button text on any pastel or core fill: `ink #241812` — all eight combinations verified ≥ 5.2:1 ✓.

### Palette B — "Cream Ticket" (companion: share cards, reveal moments, Wrapped, marketing, waitlist page)

The mess-coupon made literal — and Pantone-2026-aligned (Cloud Dancer):

| Token | Hex | Role |
|---|---|---|
| `paper` | `#F8F1E5` | Ticket/card background |
| `paper-edge` | `#EDE2CF` | Perforation, aged edge |
| `ink` | `#241812` | Text on paper (15.40:1 ✓) |
| Stamp inks | the four `stamp` values above | Rubber-stamp marks, serials, "REDEEMED ☕" (all ≥ 4.6:1 ✓) |

Dark app, cream artifacts: the token cards *pop* against roast like a real coupon under canteen light — and share cards land on Instagram stories as warm paper objects, unmistakable in a feed of screenshots.

### Directions considered and rejected

| Direction | Why rejected |
|---|---|
| All-pastel light app (pink/mint surfaces everywhere) | Pastel *fields* read juvenile ("chapri" risk); pastels earn premium only as accents with space around them. Also collides with 2027 trend-decay — trends age fastest at full saturation of use |
| Monochrome black + one acid accent | The most common AI-generated "premium dark" look; cold, fintech-flavored, and wastes the 4-feature structure |
| Neon/cyber dark (magenta-cyan) | Gamer aesthetic, wrong emotional register for warmth + meeting people |
| Saturated red-orange (Tinder zone) | Crowded territory; urgency-aggression psychology fights the "get off your phone and meet someone" brand |

---

## PART IV — Usage Rules (what keeps it premium)

1. **One accent family per screen.** Feature screens use their drink only. Mixed contexts (home, passbook) show accents only inside token stamps, never in chrome.
2. **Accent = action or identity, never decoration.** Buttons, active states, stamps, streak flames. Backgrounds, dividers, icons-at-rest stay neutral.
3. **Ratio discipline:** ~90% of any screen is roast neutrals + cream text. If a screenshot looks colorful, it's wrong.
4. **No gradients** except one sanctioned moment: the Blind Coffee reveal (rose-milk pastel bleeding through the blur as it melts). One movie moment, everywhere else flat color.
5. **Pastel for glow, core for touch, stamp for paper.** Pastels are text/icons/outlines on dark; cores are the fill of the one primary button per screen; stamps live only on cream artifacts.
6. **States:** hover = core at 92% opacity; pressed = stamp value; focus ring = pastel at 40% opacity, 2px offset; disabled = sediment at 40%.
7. **Never introduce a fifth family.** New needs map to existing families or stay neutral.

## PART V — Drop-in tokens

```css
:root {
  /* neutrals — dark roast */
  --roast-0: #1A1310;  --roast-1: #231A15;  --roast-2: #2D221B;
  --hairline: #3A2C23;
  --cream: #F2E9DB;  --latte: #C4B5A3;  --sediment: #8D7D6C;
  --ink: #241812;

  /* rose milk — blind coffee */
  --rosemilk-pastel: #F5C1CB;  --rosemilk-core: #E89AAB;  --rosemilk-stamp: #B4485F;
  /* chai spice — coffee date (+ error/destructive) */
  --chai-pastel: #F2AC9C;  --chai-core: #E06A50;  --chai-stamp: #B03A24;
  /* pista — library partner (+ success) */
  --pista-pastel: #C8DBB2;  --pista-core: #A9C98F;  --pista-stamp: #546F45;
  /* burnt honey — mess partner (+ warning/pending) */
  --honey-pastel: #F0CE9A;  --honey-core: #DBA55E;  --honey-stamp: #875D26;

  /* cream ticket — artifacts */
  --paper: #F8F1E5;  --paper-edge: #EDE2CF;
}
```

---

## Sources

[Who What Wear — Pastels: the big 2026 trend](https://www.whowhatwear.com/fashion/pastel-color-trend) · [Envato — 2026 color trends & soft-tech pastels](https://elements.envato.com/learn/color-trends) · [Envato — Mobile app color scheme trends 2026](https://elements.envato.com/learn/color-scheme-trends-in-mobile-app-design) · [VistaPrint — Color Trends 2026 (Matcha Mochi, Pale Banana)](https://www.vistaprint.com/hub/color-trends) · [Time — Pantone 2026: Cloud Dancer](https://time.com/7338176/pantone-color-of-the-year-2026/) · [Artnet — Pantone's divisive 2026 pick](https://news.artnet.com/art-world/pantone-color-of-the-year-white-2724115) · [Hype4 — The 60-30-10 rule in UI](https://hype4.academy/articles/design/60-30-10-rule-in-ui) · [sixtythirtyten — Dark-mode 60-30-10 with CSS variables](https://www.sixtythirtyten.co/blog/60-30-10-dark-mode-color-palette-css) · [Mockplus — Dark mode UI design](https://www.mockplus.com/blog/post/dark-mode-ui-design) · [T. Hercules — Designing accessible dark mode](https://medium.com/@tundehercules/designing-effective-dark-mode-interfaces-17f38ecea2e9) · [UXPin — Color psychology & app schemes](https://www.uxpin.com/studio/blog/color-schemes-for-apps/) · [iDateMedia — Dating brand color psychology (pink vs red)](https://idatemedia.com/how-to-choose-your-brand-color-scheme/) · [LogoCrafter — Dating app logo/color analysis](https://www.logocrafter.app/blog/best-dating-app-logos) · [Mobbin — Tinder brand palette](https://mobbin.com/colors/brand/tinder) · [UX Planet — CRED's NeoPOP design system](https://uxplanet.org/thoughts-on-creds-ui-revamp-apr-2022-6d2b4dcfcfc6) · [StudioKrew — CRED: premium + gamification](https://studiokrew.com/blog/cred-fintech-app-success-story/)
