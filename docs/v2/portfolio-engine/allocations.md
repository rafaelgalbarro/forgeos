# Resource Allocations — Program 6110

Types: `AI_EXECUTION`, `TOKEN_BUDGET`, `MONETARY_BUDGET`, `BUILD_WORKER`, `PREVIEW_SANDBOX`, `DEPLOYMENT_SLOT`, `RESEARCH_CAPACITY`, `HUMAN_REVIEW`, `STORAGE`, `SHARED_SERVICE`

States: `AVAILABLE`, `RESERVED`, `IN_USE`, `EXHAUSTED`, `BLOCKED`, `RELEASED`

Each allocation tracks: `portfolioId`, `ventureId`, `resourceType`, `limit`, `used`, `reserved`, `available`, `period`, `status`, `policy`, `updatedAt`.

No real money or payments.
