# OVERLOAD Commercial Readiness Plan

**Objective:** turn OVERLOAD from a useful beta PWA into a dependable, differentiated strength-training product with a repeatable path to paid customers.

**Commercial target:** 500 paying annual subscribers at a proposed A$69.99/year, equivalent to A$34,995 gross annual recurring revenue before platform fees, taxes, refunds and operating costs. This is a planning target, not a forecast or guarantee.

## Positioning

OVERLOAD should own a clear lane: a serious strength and physique training system that connects training, nutrition, recovery and progression. Its advantage should be practical coaching grounded in the user's own logged history, not generic AI chat.

The product promise:
- Plan and log serious training without friction.
- Understand progression, workload and consistency.
- Connect nutrition and recovery to training decisions.
- Get useful, explainable coaching suggestions while retaining control of the plan and data.

## Non-negotiable product principles

1. Preserve the existing local-storage key `apexProtocolData_v1`, record shapes and import/export compatibility until a tested migration is ready.
2. Keep workout logging and core app use available offline.
3. Never put AI-provider secrets, payment secrets or privileged database credentials in client code.
4. Make AI features opt-in, explain data use, minimise context sent, and require user approval before changing programmes, targets or records.
5. Do not market deterministic rules as generative AI. Clearly label rules-based guidance and AI-generated coaching.
6. Treat workout, nutrition and recovery history as sensitive personal information. Provide clear export and deletion controls before cloud accounts are launched.

## Workstreams and release gates

### A. Reliability and trust — first priority

- Run the existing automated tests and fix failures before feature work.
- Verify production install, offline launch, update prompts and service-worker cache behaviour on iPhone Safari, Android Chrome and desktop.
- Test backup export, valid restore, malformed restore rejection and pre-restore safety backup using disposable profiles.
- Resolve version drift between app HTML, manifest references, service-worker cache name, version metadata and beta feedback metadata.
- Review third-party scripts; pin dependencies and use Subresource Integrity where supported, or vendor a reviewed copy.
- Review Content Security Policy and remove unsafe allowances incrementally without breaking the current app.
- Publish a plain-language privacy notice and beta limitations.

**Gate:** no known critical data-loss defect; backup/restore and update tests pass; release version is consistent; limitations are disclosed.

### B. Product value and retention

- Improve first-run onboarding so a new user can create a programme and log a first workout quickly.
- Make the next useful action obvious on the home screen.
- Strengthen progression insights: exercise history, rep/load PRs, estimated strength trends and programme adherence.
- Add useful programme templates and editable progression rules without silently changing saved plans.
- Improve nutrition workflows around repeat meals, food-log copy/prefill and reliable source attribution.
- Keep coaching recommendations specific, evidence-grounded in the user's records, and transparent about missing data.
- Collect feedback through a small, structured beta cohort.

**Gate:** testers can complete core tasks without help; no recurring critical usability issue; early users return and log repeatedly.

### C. Genuine AI coaching

- Keep the deterministic coaching engine as the reliable offline baseline.
- Build a provider-neutral server-side AI adapter; never call a paid AI provider directly with secrets from the browser.
- Start with bounded use cases: weekly progress review, exercise substitution ideas, programme explanation and nutrition-pattern feedback.
- Send only the minimum relevant context for the selected task; do not send the full data store by default.
- Validate structured responses, enforce timeouts and quotas, and fall back to deterministic guidance when unavailable.
- Display what data was used, distinguish fact from suggestion, and let the user dismiss or correct advice.
- Require explicit confirmation before saving any AI-proposed change.

**Gate:** privacy and security review complete; outputs are schema-validated and tested against missing, contradictory and malformed records; deterministic fallback works; costs per active user are measured.

### D. Commercial foundations

- Validate willingness to pay with beta interviews and a simple pricing test before building a complex billing system.
- Test the proposed A$9.99 monthly and A$69.99 annual options; make the annual saving clear without hiding cancellation terms.
- Decide whether a one-time purchase is a limited lifetime licence to the current offline feature set, while ongoing AI/cloud services require a subscription. Do not promise unlimited future AI usage for a one-off fee.
- Choose a payment provider and implement server-side entitlement verification, webhook signature checks, idempotency, refunds and cancellation handling.
- Add account, entitlement, support and deletion flows only when the cloud service is ready.
- Publish terms, privacy notice, refund/cancellation information and contact/support details. Obtain appropriate Australian legal and tax advice before public sale.

**Gate:** test purchases, renewals, cancellations, refunds and entitlement expiry work; users can understand exactly what is included; recurring service costs are covered by pricing.

### E. Beta acquisition and conversion

- Recruit 20–25 strength-training users for a focused first cohort, then expand to 100 after the first release gate.
- Ask testers to complete defined missions: install, create a programme, log sessions, record nutrition, review progress and export a backup.
- Track only consented, privacy-reviewed product metrics. Initial measures: activation, first workout completed, weekly active users, workouts logged per active user, week-4 retention, paid conversion, churn and support burden.
- Interview active users and people who stop using the app; fix repeated friction before buying ads.
- Use creator partnerships and gym communities only after retention and onboarding are credible.

**Gate:** evidence of repeat use and willingness to pay, not just downloads or sign-ups.

## Commercial scorecard

| Stage | Target | Why it matters |
|---|---:|---|
| Closed beta | 20–25 testers | Find critical defects quickly |
| Expanded beta | 100 testers | Validate onboarding and repeat use |
| Paid validation | First 25 paying users | Prove willingness to pay |
| Early traction | 100 paying users | Establish conversion and retention |
| Growth target | 500 annual subscribers | A$34,995 gross annual recurring revenue at A$69.99/year |

At A$69.99/year, 500 annual subscribers produce A$34,995 gross ARR before taxes, fees, refunds and costs. Any business valuation based on this revenue should be treated as an illustrative scenario, not a guaranteed multiple.

## Immediate execution order

1. Audit and verify the current release, automated tests, data protection and deployment.
2. Fix the highest-risk reliability and release consistency issues.
3. Improve first-run onboarding and the first-workout experience.
4. Define the AI coaching data contract, privacy boundary, cost controls and deterministic fallback.
5. Recruit and learn from the first 20–25 testers.
6. Build paid entitlements only after the product's recurring value and service costs are understood.

## What not to do yet

- Do not spend heavily on advertising before retention and paid conversion are demonstrated.
- Do not add cloud sync before per-user authorization, conflict handling, deletion and recovery are tested.
- Do not expose AI or payment credentials in frontend code.
- Do not claim medical, injury-prevention or guaranteed physique outcomes.
- Do not treat downloads, waitlist entries or free beta users as paying customers.
