/**
 * mis_api.js – Dedicated API helpers for MIS Phase 1 endpoints.
 *
 * All functions return the axios promise so callers can use .then()/.catch()
 * or async/await with useEffect.
 */
import api from "../../api";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const misDashboardSummary = (period_type = "daily") =>
  api.get("/mis/dashboard/summary", { params: { period_type } });

export const misDashboardHistory = (period_type = "daily", limit = 30) =>
  api.get("/mis/dashboard/summary/history", { params: { period_type, limit } });

export const misTriggerSync = (days_back = 90) =>
  api.post("/mis/dashboard/sync", { days_back });

// ─── Revenue ─────────────────────────────────────────────────────────────────

export const misRevenueTrend = (period_type = "monthly", limit = 12) =>
  api.get("/mis/revenue/trend", { params: { period_type, limit } });

export const misRevenueByEvent = (sort_by = "revenue", limit = 10) =>
  api.get("/mis/revenue/by-event", { params: { sort_by, limit } });

export const misRevenueKpi = () => api.get("/mis/revenue/kpi");

export const misRevenueGrowth = () => api.get("/mis/revenue/growth");

// ─── Event Analytics ─────────────────────────────────────────────────────────

export const misEventPerformance = (params = {}) =>
  api.get("/mis/events/performance", { params });

export const misEventPerformanceDetail = (event_id) =>
  api.get(`/mis/events/performance/${event_id}`);

export const misEventRankings = (sort_by = "revenue", top = 10, status) =>
  api.get("/mis/events/rankings", { params: { sort_by, top, status } });

export const misEventSummaryByStatus = () =>
  api.get("/mis/events/summary-by-status");

// ─── Ticket Analytics ────────────────────────────────────────────────────────

export const misTicketTrendGlobal = (days = 30) =>
  api.get("/mis/tickets/trend", { params: { days } });

export const misTicketTrendPerEvent = (event_id, days = 90) =>
  api.get(`/mis/tickets/trend/${event_id}`, { params: { days } });

export const misTicketVelocity = (top = 10) =>
  api.get("/mis/tickets/velocity", { params: { top } });

export const misTicketFastSelling = (threshold = 70, limit = 10) =>
  api.get("/mis/tickets/fast-selling", { params: { threshold, limit } });
