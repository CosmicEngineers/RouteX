'use client';

import React from 'react';
import { FileCsv, FileText, FilePdf } from 'phosphor-react';
import { OptimizationResult } from './HPCLDashboard';

interface ExportButtonsProps {
  result: OptimizationResult | null;
  resultId: string;
}

export function ExportButtons({ result, resultId }: ExportButtonsProps) {
  const exportToCSV = () => {
    if (!result || !result.selected_routes) return;

    // Create CSV content
    const headers = ['Vessel', 'Loading Port', 'Discharge Ports', 'Volume (MT)', 'Cost (₹)', 'Transit Days', 'EEOI'];
    const rows = result.selected_routes.map((route: Record<string, unknown>) => {
      const values = [
        route.Tanker || route.vessel_id || '',
        route['Loading Port'] || route.loading_port || '',
        (route['Discharge Ports'] || route.discharge_ports || []) as string[] | string,
        route['Volume (MT)'] || route.cargo_mt || 0,
        route['Cost (₹ Cr)'] || ((route.cost as number) / 10000000) || 0,
        route['Transit Days'] || route.trip_days || 0,
        route['EEOI (gCO2/ton-nm)'] || route.eeoi || 0
      ];
      return values.map(v => typeof v === 'object' && Array.isArray(v) ? v.join(' → ') : String(v));
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hpcl_optimization_${resultId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    if (!result) return;

    const exportData = {
      result_id: resultId,
      timestamp: new Date().toISOString(),
      summary: {
        total_cost: result.total_cost,
        fleet_utilization: result.fleet_utilization,
        demand_satisfaction_rate: result.demand_satisfaction_rate,
        selected_routes_count: result.selected_routes?.length || 0
      },
      routes: result.selected_routes
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hpcl_optimization_${resultId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    // For now, we'll create a simple text-based PDF report
    // In production, you'd use a library like jsPDF or pdfmake
    
    alert('PDF export will generate an executive summary report. Coming soon!');
    
    // Placeholder for PDF generation
    // const doc = new jsPDF();
    // doc.text('HPCL Fleet Optimization Report', 10, 10);
    // doc.save(`hpcl_report_${resultId}.pdf`);
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={exportToCSV}
        className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 hover:bg-green-500/20 transition-all"
      >
        <FileCsv size={16} weight="duotone" />
        <span className="font-medium">Export CSV</span>
      </button>

      <button
        onClick={exportToJSON}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-300 hover:bg-blue-500/20 transition-all"
      >
        <FileText size={16} weight="duotone" />
        <span className="font-medium">Export JSON</span>
      </button>

      <button
        onClick={exportToPDF}
        className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/20 transition-all"
      >
        <FilePdf size={16} weight="duotone" />
        <span className="font-medium">Export PDF</span>
      </button>
    </div>
  );
}
