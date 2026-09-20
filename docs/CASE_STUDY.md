# Case Study — Innovation Portfolio Radar

**Repository:** [innovation-portfolio-radar](https://github.com/Freddricklogan/innovation-portfolio-radar) · **Live demo:** [freddricklogan.github.io/innovation-portfolio-radar](https://freddricklogan.github.io/innovation-portfolio-radar/) · **Author:** Freddrick Logan

---

## 1. Who has this problem

Anyone responsible for a portfolio of things that might not work: a provost's innovation fund, a teaching-and-learning centre, a workforce board seeding pilots, a corporate innovation office. In my own work it is the initiatives around Elevate — advising nudges, employer credential wallets, micro-internships — each with a sponsor, a budget ask, and a different amount of evidence. The problem is not generating initiatives. It is stopping them.

## 2. The problem, as a scenario

An innovation fund's quarterly review, eight initiatives on the agenda. A micro-internship marketplace has been in discovery for eleven months; one of four hypotheses held, but the sponsor is well liked. A peer-mentoring pilot tested seven hypotheses and two held; students like it. An alumni skills-graph idea has had no work for fourteen months and nobody has said so. Meanwhile the advising-nudges pilot has five of six hypotheses holding and an expected value seven times its next-stage cost, waiting on the same committee. Everything gets funded a little; nothing is killed or scaled.

## 3. What it costs to leave it alone

Money spread across everything is money spent on nothing in particular; the initiative that deserved scale gets the same increment as the one that should have stopped. The larger cost is cultural: a committee that never kills teaches sponsors that evidence does not matter, and the next proposals are written accordingly. I will not attach a figure — it is the fund's own budget, and the sample is illustrative — but the shape is common enough that three-horizons and stage-gate reviews were invented to fix it, and are usually applied as vocabulary rather than rules.

## 4. The approach, and the alternative I rejected

I built a console in which every initiative carries a horizon, a stage, money committed and asked for, an assessed upside and probability, months in stage, and hypotheses tested and held. An ordered gate decides: kill when the evidence rate is below a stated line once enough hypotheses are tested; hold when stale or thin on evidence; scale when, at pilot or later, expected value clears a stated multiple of next-stage cost; otherwise fund. Every decision prints its reason. Next-stage spend rolls up by horizon against a target mix so drift shows as a gap. Thresholds and mix are editable; every gate re-evaluates when they change.

The alternative I rejected was a scoring matrix — weighted criteria, a total, a ranking. It is what most funds use, and it lets a popular initiative with weak evidence outrank an unpopular one with strong evidence, because "sponsor commitment" is always a criterion. An ordered rule with evidence first cannot be lobbied, only argued with in the open — which is the point.

## 5. What the code does today

Real: option-value scoring, the ordered gate with editable thresholds and printed rationale, the horizon-mix roll-up on next-stage spend against a target, the radar, and CSV import and export with validation. All of it is strict-mode TypeScript with unit tests, separated from a rendering layer that builds the page through `textContent` only.

Simulated: the portfolio. The eight initiatives, probabilities, upsides and hypothesis counts are an illustrative sample of a university innovation fund; the page says so.

Worth knowing: "option value" here is expected value minus next-stage cost — a transparent proxy for the leverage of the next dollar, stated on screen, not a real-options valuation. Probabilities and upsides are the assessor's estimates and the tool does not calibrate them; it makes the consequence of an estimate visible immediately.

## 6. Evidence

Measured in continuous integration and a headless-browser smoke test of the built site: 12 unit tests passing across two files, 100% statement coverage over the pure modules, type-checked ESLint and `tsc --noEmit` clean, HTML validation clean, CodeQL and dependency scanning enabled. The gate is tested at its boundaries — an evidence rate exactly at the kill line survives, a value ratio exactly at the scale line scales, nine months in stage is not stale, ten is — and the order kill → hold → scale is asserted. In the browser: zero console errors; the sample gates 2 scale, 3 fund, 1 hold, 2 kill with $395,000 of next-stage spend and H1 at 51% against a 70% target; the tour records 3 of 8 hypotheses on the credential wallet and its gate flips from fund to kill; a 25% kill line brings kills to zero and scale to three; a target mix not summing to 100% is refused. No horizontal scroll at 400 pixels.

## 7. What it would take to run this in production

For one fund the static page is the review: bring the CSV, decide in the room. As an institutional process it would need a persistent register behind sign-in with an audit trail of gate decisions; a hypothesis log per initiative so the evidence rate is recorded rather than typed; committee-adopted, versioned thresholds; and a link from "fund" and "scale" to the budget system so the decision moves money. Weeks of engineering, with the threshold conversation the part that matters.

## 8. Limits and next steps

No history, so gates are a snapshot; no dependencies between initiatives; no cost of delay; probabilities and upsides uncalibrated. Next: a dated hypothesis log so evidence is a trend, a second-assessor mode for probability and upside, and a fund-size constraint so the gates say what fits.

## 9. Who should look at this

**Hiring manager:** evidence that I turn a strategy framework into an explicit rule, test its boundaries, and show where the money moves.
**Consulting client:** a way to run an innovation review where the evidence makes the kill decision — bring your initiatives as CSV.
**Engineer:** read `src/scoring.ts` for the ordered gate and the mix roll-up; `tests/scoring.test.ts` holds the boundary cases.
