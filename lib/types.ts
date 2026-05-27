export type Client = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
};

export type ApprovalStatus = "submitted" | "under_review" | "approved" | "rejected";

export type RevenueClose = {
  id: string;
  client_id: string;
  close_month: string;
  version: number;
  is_current: boolean;
  rollover_from_previous: number;
  rollover_to_next: number;
  discounts: number;
  net_usage: number;
  expected_total: number;
  submitted_by: string;
  submitted_at: string;
  notes: string | null;
  // Approval workflow
  approval_status: ApprovalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  // Joined / computed
  submitted_by_name?: string;
  change_count?: number;
};

export type CloseChange = {
  id: string;
  revenue_close_id: string;
  client_id: string;
  close_month: string;
  changed_by: string;
  changed_at: string;
  prev_rollover_from_previous: number;
  prev_rollover_to_next: number;
  prev_discounts: number;
  prev_net_usage: number;
  prev_expected_total: number;
  new_rollover_from_previous: number;
  new_rollover_to_next: number;
  new_discounts: number;
  new_net_usage: number;
  new_expected_total: number;
  reason: string | null;
  changed_by_name?: string;
  client_name?: string;
};

export type BilledAmount = {
  id: string;
  client_id: string;
  close_month: string;
  billed_total: number;
  entered_by: string;
  entered_at: string;
  updated_at: string;
  variance_reason: string | null;
};

export type MonthData = {
  month: string;
  close: RevenueClose | null;
  billed: BilledAmount | null;
};

export type ClientWithStatus = Client & {
  current_month_close: RevenueClose | null;
  last_variance: number | null;
};
