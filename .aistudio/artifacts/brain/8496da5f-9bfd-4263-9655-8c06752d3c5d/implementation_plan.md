# GIGGLE — Party Game Suite: Three New Modules

Complete integration of three flagship party game modules into the GIGGLE party gaming platform: **Who's Most Likely To?**, **Would You Rather?**, and **Guess the Emoji**. Designed for exactly 4 players sharing one smartphone passed between turns, with TV casting/mirroring support, privacy shields, sound effects, and 200+ original handcrafted questions/puzzles per game.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following gameplay mechanics and display options have been aligned based on user clarification:

- **Who's Most Likely To? Scoring**: Points are awarded directly to whoever receives the most votes in each round (+100 pts per winner, ties split/shared).
- **TV Mirroring & Screen Experience**: Unified big-screen presentation designed for mirroring a phone to a TV or viewing on a shared laptop. Includes a fast QR Code generator modal allowing one player to scan and open the session on their phone to pass around. High-contrast room-scale presentation scales seamlessly for TV view.
- **Guess the Emoji Input Mode & Hints**: Supports both 4 Multiple-Choice option buttons and an optional direct text entry mode. Puzzles feature an interactive hint system where revealing a hint deducts 25 points from the potential 125-point round credit (100 pts base + 25 pts no-hint bonus).
- **Secret Turn Privacy Protocol**: Foolproof pass-the-phone handoff flow ("Pass to Player X" -> "Tap when ready" -> private choice -> "Choice locked! Pass to Player Y") to ensure secrets are never leaked to the TV or other players until all 4 have voted.

---

### 1. Overview & Core Concept

- **What It Does**: A vibrant, fast-paced party game hub housing 3 full multiplayer games. Four players enter or pick their profiles once, then pass a single smartphone in secret turn rotations while mirroring to a TV or laptop screen for group laughs.
- **Target Audience & Persona**: Friends, families, roommates, and party hosts hanging out in person around a television or living room table.
- **Key Value**: Zero installation, zero accounts, zero complex lobby codes. Pick 4 avatars, pass 1 phone, and enjoy instant living-room party gaming with high replayability.

---

### 2. User Experience & Visual Design

#### Visual Identity & Theme
- **GIGGLE Pastel Color System**:
  - Pink: `#F9DCE9` (accent highlights, playful badges)
  - Lavender: `#E5DDFB` (cards, secondary player tokens)
  - Mint: `#D9F2E7` (success, correct reveals, choice badges)
  - Baby Blue: `#DCEEFF` (active turns, navigation surfaces)
  - Butter Yellow: `#FFF0CC` (attention, hints, high-score awards)
  - Cream: `#FFF9F1` (warm background canvas)
  - Deep Charcoal: `#1E1B2E` (high contrast legible text, meeting WCAG AA standards)
- **Zero-Pill & Metadata Discipline**: Unboxed category and question metadata separated with subtle dots (`·`), clean rounded structural cards ($r = 24\text{px}$), and tactile buttons with 3D press feel (`active:translate-y-0.5`).
- **Cute Player Avatars & Profiles**: 4 persistent player slots with customizable names, vibrant pastel colors, and expressive animal/character avatars (Bunny, Bear, Fox, Panda, Cat, Duck, Frog, Koala).
- **Sound & Confetti FX**: Web Audio API synthesized audio (cheerful chimes on correct guesses, dramatic whoosh on reveals, tick-tock countdown, victory fanfares) and full-screen confetti bursts on round winners.

#### Step-by-Step User Flows
1. **GIGGLE Lobby & Player Roster**:
   - 4-player setup bar with quick name edit, avatar selection, and total session scores.
   - Game selector grid featuring the 3 game modules with colorful preview cards, category tags, and instant start.
   - Header with TV Mirror guide, audio toggle, and QR Code share modal.
2. **Game 1 — Who's Most Likely To?**:
   - Big TV prompt card displaying the question prominently.
   - Player 1 handoff screen ("Pass phone to Maya", "Tap to unlock").
   - Secret voting grid showing all 4 player cards; Maya taps one player secretly.
   - Confirmation veil: "Vote submitted! Pass to Liam".
   - Repeat for Players 2, 3, and 4.
   - TV Reveal: Dramatic countdown reveal, vote tallies on each player avatar, winner crowned with celebration animation, points tallied.
3. **Game 2 — Would You Rather?**:
   - Big split Choice A vs Choice B cards on the TV.
   - Pass-the-phone handoff for each player to choose Scenario A or B privately.
   - TV Reveal: Simultaneous reveal showing each player's avatar sliding onto Option A or B, calculated percentages (e.g. 75% vs 25% or 50/50 tie), popular choice trophy, and discussion prompts.
4. **Game 3 — Guess the Emoji**:
   - Big emoji combination card (e.g., `🌧️ + 🌈` or `🍕 + ❤️`).
   - Category, difficulty rating, and optional hint button (-25 pts penalty).
   - Turn-based guess or simultaneous pass-the-phone where each player picks their answer.
   - Reveal screen displaying the real answer, who answered correctly, and points awarded (+100 for correct, +25 if no hint was used).
   - Round summary & scoreboard.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Session Persistence**
  - *Chosen Approach*: React state synchronized with `localStorage`.
  - *Why*: Eliminates server dependencies, latency, and login friction. 4 players can refresh or switch games without losing names, avatars, or accumulated scores.
- **Decision 2: 200+ Curated Data Stores**
  - *Chosen Approach*: Comprehensive, handcrafted TypeScript data files for all 3 games with categorization, difficulty levels, and curated child/family-friendly humor.
  - *Why*: Guarantees zero runtime loading failures, no external network calls, no duplicate questions per session, and instant offline-ready responsiveness.
- **Decision 3: Pass-The-Phone Privacy Veil**
  - *Chosen Approach*: Dedicated "Handoff Curtain" with a physical "Ready to Vote" button and auto-clearing selection screens.
  - *Why*: Prevents players sitting around the mirrored TV from accidentally seeing previous answers before the big dramatic reveal.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GIGGLE PARTY APP CONTAINER                      │
│   (Header: Brand, TV Mode Toggle, QR Code Modal, Sound FX Toggle)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                               │
    ▼                                                               ▼
┌────────────────────────┐                                ┌─────────────────────┐
│   GLOBAL PARTY STATE   │                                │   VIEW ROUTER       │
│ - 4 Players & Avatars  │                                │ - Home / Lobby      │
│ - Session Leaderboard  │                                │ - Who's Most Likely │
│ - Sound Settings       │                                │ - Would You Rather  │
│ - TV / Handheld Mode   │                                │ - Guess the Emoji   │
└───────────┬────────────┘                                └──────────┬──────────┘
            │                                                        │
            ▼                                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           GAME STATE MACHINE                                  │
│                                                                               │
│  [Instructions/Settings] ──► [TV Question Screen] ──► [Handoff Curtain]       │
│                                                             │                 │
│  [Next Round / Finish]   ◄── [TV Results Reveal]  ◄── [Secret Choice Vote]   │
└───────────────────────────────────────────────────────────────────────────────┘
```

#### Complete Content Inventory (200+ Original Items Per Game)
- **Who's Most Likely To?**: 200+ original questions across 7 categories:
  - Friendship, Funny Situations, School Life, Future Predictions, Personality, Random Situations, Everyday Life.
- **Would You Rather?**: 200+ original scenario dilemmas across 8 categories:
  - Funny, Difficult Choices, Friendship, Food, Travel, School, Fantasy, Entertainment.
- **Guess the Emoji**: 200+ original emoji puzzles across 8 categories:
  - Movies, Cartoons, Food, Animals, Objects, Famous Phrases, Music, Everyday Expressions.
  - Each with emoji icons, correct answer, 3 distractors, hint text, and difficulty level.

---

### Verification & Quality Assurance Plan

1. **Compilation & Linting**: Co-execute `compile_applet` and `lint_applet` to ensure zero TypeScript errors and full Tailwind v4 compliance.
2. **Gameplay Testing with 4 Players**:
   - Run complete 4-player vote cycle in *Who's Most Likely To?* and verify point additions.
   - Run complete 4-player choice cycle in *Would You Rather?* with 50/50 and 75/25 splits.
   - Run complete 4-player guess cycle in *Guess the Emoji* with hint penalty tracking.
3. **Responsive & Mirroring Checks**:
   - Verify phone viewport (pass-the-phone handoff curtain, comfortable touch targets).
   - Verify TV / Big Screen mode scaling (legibility from 10 feet away).
