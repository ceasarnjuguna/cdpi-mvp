# CDPI-MVP

**Cross-Domain Policy Integration Tool**

Automated network policy verification and synthesis for hybrid-cloud environments.

*Master's Research Project — ISR6890A — USIU-Africa — 2026*

## What it does

Detects policy conflicts between on-premises Cisco IOS ACLs and AWS Security Groups,
then auto-generates corrected configuration files for both domains.

## Run locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Run tests

```bash
npm test
```

## Deploy

Connect this repo to Vercel. Zero configuration required.

## Demo scenarios

Three pre-built scenarios load without any config files:

- **Shadow Rule** — Cisco permits TCP 443, AWS silently blocks it (CRITICAL)
- **Asymmetric Boundary** — Cisco denies a subnet, AWS has no corresponding restriction (HIGH)
- **Clean Config** — Policies are consistent, zero conflicts expected (true-negative validation)

## Tech stack

Next.js 14 · TypeScript · Tailwind CSS · React Flow · Zod · Vitest
