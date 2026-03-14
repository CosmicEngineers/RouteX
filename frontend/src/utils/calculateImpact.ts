// Pure utility: derives all KPI metrics from a real OptimizationResponse.
// Uses a hard baseline cost representing a naive "nearest-port" strategy.

export const MANUAL_BASELINE_CR = 3.14;
const GLOW_THRESHOLD_CR = 2.70;

export interface OptimizationSummary {
  total_trips?: number;
  total_routes: number;
  hpcl_transportation_cost_cr?: number;
  total_cost_cr: number;
  total_volume_mt: number;
  total_demand_mt: number;
  satisfied_demand_mt: number;
  demand_satisfaction_percentage: number;
  unsatisfied_ports?: string[];
}

export interface OptimizationResponseForImpact {
  summary: OptimizationSummary;
  optimization_status?: string;
}

export interface ImpactMetrics {
  totalCostCr: number;
  savingsCr: number;
  savingsPct: number;
  demandPct: number;
  totalVolumeMt: number;
  tripCount: number;
  baselineCr: number;
  /** Tailwind class to apply — 'glow-cyan' when cost < threshold */
  costGlowClass: string;
  isOptimal: boolean;
}

export function calculateImpact(
  response: OptimizationResponseForImpact | null
): ImpactMetrics {
  if (!response) {
    return {
      totalCostCr: 0,
      savingsCr: 0,
      savingsPct: 0,
      demandPct: 0,
      totalVolumeMt: 0,
      tripCount: 0,
      baselineCr: MANUAL_BASELINE_CR,
      costGlowClass: '',
      isOptimal: false,
    };
  }

  const { summary, optimization_status } = response;
  const totalCostCr =
    summary.hpcl_transportation_cost_cr ?? summary.total_cost_cr;
  const savingsCr = Math.max(0, MANUAL_BASELINE_CR - totalCostCr);
  const savingsPct =
    MANUAL_BASELINE_CR > 0
      ? (savingsCr / MANUAL_BASELINE_CR) * 100
      : 0;

  const isOptimal = ['optimal', 'feasible'].includes(
    (optimization_status ?? '').toLowerCase()
  );

  return {
    totalCostCr,
    savingsCr: parseFloat(savingsCr.toFixed(4)),
    savingsPct: parseFloat(savingsPct.toFixed(1)),
    demandPct: summary.demand_satisfaction_percentage,
    totalVolumeMt: summary.total_volume_mt,
    tripCount: summary.total_trips ?? summary.total_routes,
    baselineCr: MANUAL_BASELINE_CR,
    costGlowClass: totalCostCr < GLOW_THRESHOLD_CR ? 'glow-cyan' : '',
    isOptimal,
  };
}
