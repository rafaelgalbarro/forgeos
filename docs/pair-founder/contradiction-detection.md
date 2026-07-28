# Contradiction Detection

## Categories detected

| Category | Example |
|----------|---------|
| Pricing vs goals | Low price + high profitability |
| Budget vs scope | 70% budget cut + full enterprise scope |
| Timeline vs complexity | 2-week launch + complex enterprise app |
| Market vs strategy | B2C input after B2B decisions |
| Over-engineered architecture | K8s/microservices in UNDERSTAND phase |
| Expensive acquisition | Paid ads with bootstrap budget |
| Ignored legal risk | Regulated sector + "ignore legal" |
| Exit strategy conflict | Bootstrap input with VC exit path |

## CEO communication format

Each contradiction includes:

- **Contradiction**: what conflicts
- **Impact**: business consequence
- **Alternative**: proposed path
- **Required decision**: question for founder

No private reasoning or chain-of-thought is exposed.

## Test cases

See [test-cases.md](./test-cases.md) for documented handlers A–E.

Implementation: `lib/pair-founder/contradiction-detector.ts`

## Reply reframing

`reframeReplyForContradictions()` prepends high-severity contradictions to CEO reply before sending. Ensures coherence with venture memory via `replyContradictsMemory()`.
