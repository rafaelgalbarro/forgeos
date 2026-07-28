# Value Recommendations

## Types

`CONTINUE`, `VALIDATE_FIRST`, `BUILD_LESS`, `LAUNCH`, `INVEST_MORE`, `REDUCE_INVESTMENT`, `PIVOT`, `PAUSE`, `MERGE`, `REUSE_ASSET`, `CLOSE`, `ESCALATE_FOR_REVIEW`

## Fields

reason, evidence, confidence, expected benefit, cost, risk, reversibility, approval requirement.

## Hard gate

`PAUSE`, `PIVOT`, `MERGE`, `CLOSE` always `requiresApproval = true` and start as `PENDING_APPROVAL`.

`ApproveValueRecommendation` returns `{ approved: true, autoExecuted: false }`.

Approval **never** auto-executes irreversible actions.
