export type DepartmentId =
  | "ceo"
  | "research"
  | "product"
  | "ux"
  | "cto"
  | "marketing"
  | "finance"
  | "legal"
  | "operations";

export type DepartmentStatus = "working" | "waiting" | "blocked" | "pending";

export interface DepartmentState {
  id: DepartmentId;
  label: string;
  status: DepartmentStatus;
  statusLabel: string;
  detail: string;
}

export interface HeadquartersSnapshot {
  departments: DepartmentState[];
  activeCount: number;
  waitingCount: number;
}
