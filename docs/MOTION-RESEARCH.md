# Campus Coffee — Motion & Haptics Research: The Feel System

> Research date: 2026-07-23. Companion to [ADDICTION-RESEARCH.md](ADDICTION-RESEARCH.md) and [COLOR-RESEARCH.md](COLOR-RESEARCH.md).
> Scope: what makes app motion feel premium and alive to Gen Z, the science of "juice," the haptic grammar Apple standardized, the real state of web haptics in 2026, and the complete Campus Coffee motion spec.

---

## TL;DR — The Five Findings

1. **"Juice" is the word for what youths love — and it comes from game design, not UX.** Juice = small, tuned feedback effects (pop, shake, squash, hit-stop) that make every interaction feel alive. It's why Duolingo feels like a game: confetti on completion, characters that react, celebrations at every small win. Duolingo's DAUs grew 10× since 2019 on the back of exactly this.
2. **The 2026 motion trend is *purposeful minimal*, not flashy.** Every animation must communicate something (state, causality, weight). System-wide motion tokens — one consistent physics for the whole app — is the professional move. Gratuitous animation reads AI-generated/chapri; restraint reads premium.
3. **The physics rulebook is settled science:** micro-interactions 80–150ms, standard transitions 200–300ms, hero moments 300–400ms; ease-out for 80% of cases (never ease-in); springs with low bounce for touch response; animate transform/opacity ONLY (60fps guaranteed; width/margin animation drops to 30fps jank).
4. **Haptics have a grammar (Apple standardized it): impact (light/medium/heavy), notification (success/warning/error), selection (tick).** The three design laws: harmony (feel = look = sound), utility (only meaningful moments), sparingness (constant buzzing = users disable it). **Web reality check: Android Chrome supports `navigator.vibrate` natively; iOS Safari finally has paths in 2026** — an iOS 18+ switch-element trick and polyfills (`ios-vibrator-pro-max`), click-gated since iOS 18.4. Haptics must be progressive enhancement; the visual juice carries the feel alone when vibration is unavailable.
5. **One celebration moment, fully spent.** Tinder's full-screen "It's a Match" is the canonical proof: "a memorable celebration moment separates the products we love from the products we tolerate." Campus Coffee's equivalent is **the Blind Coffee reveal** — it gets the entire juice budget. Everything else stays quiet and disciplined.

---

# PART I — The Science: Why Motion Is Retention

- **Amplified feedback = felt competence.** Game juice works because it makes the consequence of every action *bigger than the action* — tap a button, feel a thunk. The brain reads amplified feedback as agency and skill, which is intrinsically rewarding (the same loop ADDICTION-RESEARCH describes for variable rewards — juice is the delivery vehicle).
- **Celebrations are the dopamine payout.** Duolingo's confetti and badge animations are the *visible form* of the micro-reward; streaks increase commitment by 60%, and 7-day streak users are 3.6× likelier to stay long-term. The animation isn't decoration on the reward — to the user's brain, the animation *is* the reward.
- **Peak-end applies to motion.** A session remembered by its peak (the reveal melt) and its end (the stamp thunk on a booked token) is a session that gets repeated. Design the last animation of every flow as carefully as the first.
- **Motion communicates causality.** 2026 guidance: motion has evolved from decoration into "an intelligent layer of communication" — where things come from, what caused what, what's alive in the background. A token that *pours in* from the drop tells the story "this just arrived for you" without a single word.

# PART II — The Juice Toolkit (translated from games to Campus Coffee)

| Game technique | What it is | Campus Coffee translation |
|---|---|---|
| **Pop / squash & stretch** | Elements compress on impact, overshoot on release | `.press` scale-down (have it) + spring overshoot on release for token accepts |
| **Screen shake** | Micro-jitter conveys physical force | The **stamp thunk**: rubber stamp slams onto the token, card jitters 1–2px once. Used ONLY for stamps |
| **Hit-stop** | Freeze 3–5 frames at the moment of impact so the brain registers it | The **reveal**: blur melt *pauses* ~120ms at 90% before the face fully clears — the held breath |
| **Particles** | Confetti/sparks on wins | Steam wisps (have it) + a single burst of steam-and-cream particles on match — never generic confetti; it's *our* physics |
| **Trails & anticipation** | Wind-up before action | Countdown to 9PM drop: the last 3 seconds tick with growing scale pulses — anticipation is the dopamine phase |
| **Sound** (optional, later) | The pop/thunk audio layer | A soft stamp thunk + cup clink; muted by default on web, but harmony (feel=look=sound) says design for it eventually |

**The Juice Law (from game design, verbatim):** juice must echo the core of the product. Campus Coffee's core is *paper tokens, rubber stamps, and a canteen counter* — so every effect must feel mechanical-paper-physical (thunk, tear, punch, pour), never digital-glossy (glows, neon trails, bounces without weight).

# PART III — The Physics Rulebook (settled numbers)

- **Durations:** taps/toggles/chips **80–150ms** · standard transitions (cards, sheets, state changes) **200–300ms** · hero moments (page transitions, the reveal, celebrations) **300–400ms** (the reveal sequence may total ~1.2s as a composed sequence, but each beat obeys the rule). Anything over 400ms without narrative purpose reads sluggish.
- **Easing:** default **ease-out** — `cubic-bezier(0.4, 0, 0.2, 1)` (fast start = responsive, soft landing = natural). Playful overshoot for token arrivals: `cubic-bezier(0.34, 1.56, 0.64, 1)`. **Never ease-in for UI.** Springs: duration ~0.25s, bounce 0.1–0.2 for controls.
- **Performance:** animate **transform and opacity only** — they stay on the GPU compositor at 60fps even on the ₹8k Androids half the campus carries. Never animate width/height/margin/top (layout thrash, 30fps jank). `will-change` sparingly, only during the animation.
- **Accessibility:** `prefers-reduced-motion` kills all decorative motion (already wired in globals.css) — celebrations become instant state changes with color/stamp only. Haptics still fire (they're not motion).
- **Consistency:** one physics for the whole app via motion tokens (Part V). An app where every screen bounces differently reads cheap; one consistent weight reads engineered.

# PART IV — Haptics: The Grammar & The Web Reality

## 4.1 Apple's haptic grammar (the industry standard vocabulary)

- **Impact** — physical collision feedback: `light` (chip select), `medium` (button commit), `heavy`/`rigid`/`soft` (major completion).
- **Notification** — outcome feedback: `success` (tada-buzz), `warning`, `error` (double-buzz).
- **Selection** — the subtle tick for scrolling through options (pickers, sliders).

Three design laws (Apple WWDC guidance): **Harmony** — the haptic must match what the eye sees and the ear hears (a soft visual = a soft tap, never a harsh buzz). **Utility** — haptics only where they add meaning; reserve for significant moments. **Sparingness** — constant vibration numbs the hand and gets the feature (or app) turned off.

## 4.2 The web reality (Campus Coffee is a PWA — this is the constraint that matters)

| Platform | Support | Notes |
|---|---|---|
| **Android Chrome** | ✅ `navigator.vibrate(pattern)` | Full pattern arrays (`[40]`, `[30,40,30]`…). The majority of MUJ devices — this works today |
| **iOS Safari / PWA** | ⚠️ Partial, 2026 | No native Vibration API, but: (1) iOS 18+ fires a real haptic when a `<input type=checkbox switch>` label is programmatically clicked; (2) polyfills (`ios-vibrator-pro-max`, `ios-haptics`) wrap this; (3) since iOS 18.4 it's click-gated — must originate from a genuine user tap, grant expires ~1s | 
| **Desktop** | ❌ | No haptics; visual juice carries everything |

**Design consequence (the most important rule in this document):** haptics are **progressive enhancement**. Every haptic moment must have a visual twin that delivers the same feeling alone — the stamp *thunk* is 1px of screen shake + a shadow snap, and the vibration doubles it where available. Never design a moment whose feedback exists only in vibration.

## 4.3 The Campus Coffee haptic vocabulary

| Event | Haptic (Android pattern / iOS grammar) | Visual twin |
|---|---|---|
| Chip/segment select | `vibrate(10)` / selection tick | 100ms scale press |
| Primary button commit | `vibrate(20)` / impact-light | `.press` + shadow snap |
| Token accepted ("take the token") | `vibrate([30, 40, 30])` / impact-medium | Overshoot spring + stamp appears |
| **Stamp thunk** (booking, check-in, redeem) | `vibrate(45)` / impact-heavy | Stamp rotates in at 1.15× → 1.0, card jitters 1px, 250ms |
| Match / mutual "meet?" | `vibrate([35, 60, 35, 60, 70])` / notification-success | Celebration sequence (Part V) |
| **Reveal complete** | `vibrate([20, 30, 20, 30, 90])` / crescendo | The melt + hit-stop + face |
| Code error / token lapsed | `vibrate([50, 80, 50])` / notification-error | Chai-pastel shake 4px ×2, 200ms |
| OTP digit entry | none (would spam) | caret pulse only |
| Streak +1 | `vibrate([25, 50, 45])` / success | Flame pop, 300ms overshoot |

## 4.4 Drop-in helper (₹0, no library)

```ts
// lib/haptics.ts — progressive enhancement; silently no-ops where unsupported.
type Buzz = "tick" | "tap" | "take" | "thunk" | "success" | "reveal" | "error" | "streak";
const PATTERNS: Record<Buzz, number[]> = {
  tick: [10], tap: [20], take: [30, 40, 30], thunk: [45],
  success: [35, 60, 35, 60, 70], reveal: [20, 30, 20, 30, 90],
  error: [50, 80, 50], streak: [25, 50, 45],
};
export function buzz(kind: Buzz) {
  try { navigator.vibrate?.(PATTERNS[kind]); } catch { /* no haptics; visuals carry it */ }
}
// Call ONLY inside real user-gesture handlers (iOS 18.4+ gates on genuine taps).
// For iOS coverage later: add the ios-vibrator-pro-max polyfill or the
// checkbox-switch trick behind the same buzz() API — callers never change.
```

# PART V — The Campus Coffee Motion System (the spec)

## 5.1 Motion tokens (add to globals.css when implementing)

```css
:root {
  --dur-tap: 120ms;      /* chips, presses, toggles */
  --dur-std: 240ms;      /* cards, sheets, state changes */
  --dur-hero: 360ms;     /* page transitions, celebrations */
  --ease-out: cubic-bezier(0.4, 0, 0.2, 1);       /* default: 80% of motion */
  --ease-serve: cubic-bezier(0.34, 1.56, 0.64, 1); /* overshoot: things being served */
  --ease-settle: cubic-bezier(0.22, 1, 0.36, 1);   /* long decelerate: paper settling */
}
```

## 5.2 Signature moments (ranked by juice budget)

1. **THE REVEAL (Blind Coffee) — the entire celebration budget lives here.** Sequence (~1.4s total, each beat ≤400ms): rose-milk glow breathes behind the blurred selfie → blur melts on the *other person's* chosen curve → **hit-stop: 120ms hold at 90% clarity** (the held breath) → face clears with a 1.02× settle → name stamps on with the thunk (+ `buzz("reveal")` crescendo). This is the screen that gets screenshotted; it must feel like a movie beat. Build with CSS filter + transform (GPU-safe); consider Rive later only if a hand-drawn steam layer is wanted.
2. **The stamp thunk** — every booking/check-in/redeem ends with it: stamp scales 1.15→1.0 in 250ms `--ease-out`, card jitters 1px once, `buzz("thunk")`. This is the app's signature *ending* (peak-end: every completed flow ends on the same satisfying physical note — the mess-coupon actually getting stamped).
3. **Token pour-in / serve** — new tokens at the 9PM drop arrive with `--ease-serve` overshoot, staggered 60ms apart (dealt like coupons across a counter). Already half-built (`.pour-in`); add stagger + spring.
4. **The tear-off** — redeeming/lapsing: token tears along its perforation (clip-path splits at the dashed line, halves rotate ±3° and drift 8px, 360ms `--ease-settle`). Lapsed tokens tear *downward* and fade — loss made visible (loss aversion needs to be *felt*).
5. **Drop countdown** — final 3s: digits scale-pulse 1.0→1.06 per second; at zero, the counter flips like a canteen menu board and tokens deal in. Anticipation phase = dopamine phase.
6. **Streak flame** — +1: flame pops in with overshoot, number rolls (translateY digit roll, 300ms). At-risk state: flame flickers at 60% opacity — quiet, not nagging.
7. **Match / mutual "meet?"** — sub-celebration (below reveal): both tokens slide in and *clink* edge-to-edge with a 1px shake + steam particle puff, `buzz("success")`. 600ms total. Never full-screen confetti — that's the reveal's crown.

## 5.3 Restraint rules (what keeps it premium)

- **Juice budget:** one hero celebration per session peak (the reveal or a match — never both fully). Everything else: standard tier.
- **Motion = communication:** if an animation doesn't tell state, causality, or weight — cut it (2026 rule: purposeful minimal beats flashy).
- **Paper physics only:** thunk, tear, punch, pour, settle. No glows, no neon trails, no generic confetti, no bounces without weight.
- **The 400ms ceiling** on any single beat, no exceptions outside composed hero sequences.
- **Reduced motion:** every signature moment has a static twin (stamp appears, token appears, reveal cuts to clear + stamp). Already wired via `prefers-reduced-motion`.

# PART VI — Implementation Path (₹0 stack)

1. **Phase 1 (now, CSS-only):** motion tokens + stamp thunk + tear-off + serve stagger + countdown pulse — all pure CSS/`transform`/`clip-path`, zero dependencies, zero KB. Plus `lib/haptics.ts` (above).
2. **Phase 2 (when reveal ships):** the reveal sequence — CSS filter/transform composition; add **Motion** (motion.dev, the successor to Framer Motion, ~5KB mini build) only if orchestration in JS gets hairy.
3. **Phase 3 (optional, later):** Rive for a hand-crafted steam/flame character layer — Duolingo cut file sizes 15× moving to Rive and its state machines fit the streak flame; but its ~200KB WASM runtime says: only after traction, only if the flame becomes a mascot.
4. **iOS haptic polyfill:** add `ios-vibrator-pro-max` (or the switch-element trick) behind `buzz()` once real iPhone usage shows up in analytics — zero caller changes.

---

## Sources

**Trends & micro-interactions:** [UXPilot — Mobile App Design Trends 2026](https://uxpilot.ai/blogs/mobile-app-design-trends) · [Acodez — Micro-interactions & Motion Design 2026](https://acodez.in/micro-interactions-motion-design/) · [PrimoTech — Why Micro-interactions Matter More Than Ever](https://primotech.com/ui-ux-evolution-2026-why-micro-interactions-and-motion-matter-more-than-ever/) · [TechQware — Motion Design: What Users Expect](https://www.techqware.com/blog/motion-design-micro-interactions-what-users-expect) · [BricxLabs — Micro Animation Examples 2026](https://bricxlabs.com/blogs/micro-interactions-2025-examples)

**Physics & performance:** [SmoothUI — Animation Best Practices](https://smoothui.dev/docs/guides/animation-best-practices) · [Appy Pie — Timing & Easing Guide](https://www.appypie.com/blog/mobile-app-animation-guide) · [animations.dev — The Easing Blueprint](https://animations.dev/learn/animation-theory/the-easing-blueprint) · [Open Door Digital — Performant Web Animation](https://opendoordigital.dev/blog/web-animation-best-practices) · [Vercel Labs — Web Animation Design Skill](https://github.com/vercel-labs/open-agents/blob/main/.agents/skills/web-animation-design/SKILL.md)

**Juice & game feel:** [GameAnalytics — Squeezing More Juice Out of Your Game Design](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design) · [The Design Lab — Game Juice](https://thedesignlab.blog/2025/01/06/making-gameplay-irresistibly-satisfying-using-game-juice/) · [Blood Moon Interactive — Juice in Game Design](https://www.bloodmooninteractive.com/articles/juice.html) · [Valdemir D — Game Feel on the Web](https://valdemird.com/blog/game-feel-on-the-web/) · [HackRead — The Juice Factor](https://hackread.com/the-juice-factor-designing-game-feel/)

**Haptics:** [Apple WWDC21 — Practice Audio Haptic Design](https://developer.apple.com/videos/play/wwdc2021/10278/) · [Lofelt — 10 Things About Core Haptics](https://medium.com/lofelt/10-things-you-should-know-about-designing-for-apple-core-haptics-9219fdebdcaa) · [Maksim Po — Haptic Feedback in iOS](https://medium.com/@mi9nxi/haptic-feedback-in-ios-a-comprehensive-guide-6c491a5f22cb) · [VP0 — Haptic UI Guidelines for iOS](https://vp0.com/blogs/haptic-feedback-ui-design-guidelines-ios) · [eidinger — Haptics on Apple Platforms](https://blog.eidinger.info/haptics-on-apple-platforms)

**Web haptics reality:** [caniuse — navigator.vibrate](https://caniuse.com/mdn-api_navigator_vibrate) · [ios-vibrator-pro-max (polyfill)](https://github.com/samdenty/ios-vibrator-pro-max) · [tijnjh/ios-haptics](https://github.com/tijnjh/ios-haptics) · [Ionic — iOS 18 switch haptics issue](https://github.com/ionic-team/ionic-framework/issues/29942) · [Progressier — Vibration API PWA demo](https://progressier.com/pwa-capabilities/vibration-api) · [MDN BCD — vibrate on iOS discussion](https://github.com/mdn/browser-compat-data/issues/29166)

**Celebrations & gamification:** [HackerNoon — Tinder's Irresistible UX Choice](https://hackernoon.com/this-one-ux-choice-makes-tinder-irresistible-9acf38ee6efd) · [Pallavi Sharma — Tinder's Swipe UX Masterstroke](https://medium.com/design-bootcamp/why-tinders-swipe-interaction-was-a-ux-masterstroke-e583d5eddfd1) · [Bundu — Duolingo's Micro-interactions](https://medium.com/@Bundu/little-touches-big-impact-the-micro-interactions-on-duolingo-d8377876f682) · [StriveCloud — Duolingo Gamification](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo) · [Orizon — Duolingo's Gamification Secrets](https://www.orizon.co/blog/duolingos-gamification-secrets) · [Blake Crosley — Duolingo: Gamification as Design Language](https://blakecrosley.com/guides/design/duolingo)

**Animation runtimes:** [Callstack — Lottie vs Rive on Mobile](https://www.callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation) · [Rive — Rive as a Lottie Alternative](https://rive.app/blog/rive-as-a-lottie-alternative) · [PkgPulse — Lottie vs Rive vs CSS 2026](https://www.pkgpulse.com/guides/lottie-vs-rive-vs-css-animations-web-animation-formats-2026) · [LottieFiles — LottieFiles or Rive](https://lottiefiles.com/blog/lottie-animations/lottiefiles-or-rive)
