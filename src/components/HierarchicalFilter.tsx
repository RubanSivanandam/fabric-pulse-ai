import React from "react";

export interface HierarchicalFilterProps {
  filters: {
    unitCode: string | null;
    floorName: string | null;
    lineName: string | null;
    operation: string | null;
  };
  setFilters: React.Dispatch<
    React.SetStateAction<{
      unitCode: string | null;
      floorName: string | null;
      lineName: string | null;
      operation: string | null;
    }>
  >;
  availableOptions: {
    unitCodes: string[];
    floors: string[];
    lines: string[];
    newOperSeqs: string[];
  };
}

export const HierarchicalFilter: React.FC<HierarchicalFilterProps> = ({
  filters,
  setFilters,
  availableOptions,
}) => {
  return (
    <div className="flex gap-4 flex-wrap p-4 bg-gray-800 rounded-lg">
      {/* Unit */}
      <select
        value={filters.unitCode ?? ""}
        onChange={(e) => setFilters((f) => ({ ...f, unitCode: e.target.value || null }))}
      >
        <option value="">All Units</option>
        {availableOptions.unitCodes.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>

      {/* Floor */}
      <select
        value={filters.floorName ?? ""}
        onChange={(e) => setFilters((f) => ({ ...f, floorName: e.target.value || null }))}
      >
        <option value="">All Floors</option>
        {availableOptions.floors.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      {/* Line */}
      <select
        value={filters.lineName ?? ""}
        onChange={(e) => setFilters((f) => ({ ...f, lineName: e.target.value || null }))}
      >
        <option value="">All Lines</option>
        {availableOptions.lines.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>

      {/* Operation */}
      <select
        value={filters.operation ?? ""}
        onChange={(e) => setFilters((f) => ({ ...f, operation: e.target.value || null }))}
      >
        <option value="">All Operations</option>
        {availableOptions.newOperSeqs.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
};
