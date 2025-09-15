// src/components/HierarchicalFilter.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFilters } from "../contexts/FilterContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface LoadingFlags {
  units?: boolean;
  floors?: boolean;
  lines?: boolean;
  operations?: boolean;
}

interface HierarchicalFilterProps {
  unitCodes: string[];
  floorNames: string[];
  lineNames: string[];
  operations: string[];
  loading?: LoadingFlags;
  onChange?: (filters: {
    unitCode: string | null;
    floorName: string | null;
    lineName: string | null;
    operation: string | null;
  }) => void;
  showLabels?: boolean;
  className?: string;
}

export const HierarchicalFilter: React.FC<HierarchicalFilterProps> = ({
  unitCodes,
  floorNames,
  lineNames,
  operations,
  loading = {},
  onChange,
  showLabels = true,
  className = "",
}) => {
  const { state, dispatch } = useFilters();

  // extract selected filters from context state
  const filters = {
    unitCode: state.selectedUnit,
    floorName: state.selectedFloor,
    lineName: state.selectedLine,
    operation: state.selectedOperation,
  };

  // Local search state for filtering dropdown lists
  const [unitQuery, setUnitQuery] = useState("");
  const [floorQuery, setFloorQuery] = useState("");
  const [lineQuery, setLineQuery] = useState("");
  const [operationQuery, setOperationQuery] = useState("");

  // Notify parent when filters change
  const firstMountRef = useRef(true);
  useEffect(() => {
    if (firstMountRef.current) {
      firstMountRef.current = false;
      return;
    }
    if (onChange) {
      onChange(filters);
    }
  }, [filters.unitCode, filters.floorName, filters.lineName, filters.operation]);

  // Derived filtered lists
  const filteredUnits = useMemo(() => {
    if (!unitQuery) return unitCodes;
    return unitCodes.filter((u) => u.toLowerCase().includes(unitQuery.toLowerCase()));
  }, [unitCodes, unitQuery]);

  const filteredFloors = useMemo(() => {
    if (!floorQuery) return floorNames;
    return floorNames.filter((f) => f.toLowerCase().includes(floorQuery.toLowerCase()));
  }, [floorNames, floorQuery]);

  const filteredLines = useMemo(() => {
    if (!lineQuery) return lineNames;
    return lineNames.filter((l) => l.toLowerCase().includes(lineQuery.toLowerCase()));
  }, [lineNames, lineQuery]);

  const filteredOperations = useMemo(() => {
    if (!operationQuery) return operations;
    return operations.filter((o) => o.toLowerCase().includes(operationQuery.toLowerCase()));
  }, [operations, operationQuery]);

  // Handle dropdown changes
  const handleChange = (field: keyof typeof filters, value: string | null) => {
    if (field === "unitCode") {
      dispatch({ type: "SELECT_UNIT", payload: value });
    } else if (field === "floorName") {
      dispatch({ type: "SELECT_FLOOR", payload: value });
    } else if (field === "lineName") {
      dispatch({ type: "SELECT_LINE", payload: value });
    } else if (field === "operation") {
      dispatch({ type: "SELECT_OPERATION", payload: value });
    }
  };

  // Reset / Clear
  const handleClearAll = () => {
    dispatch({ type: "RESET_FILTERS" });
    setUnitQuery("");
    setFloorQuery("");
    setLineQuery("");
    setOperationQuery("");
  };

  const handleResetToFirst = () => {
    if (unitCodes.length > 0) {
      dispatch({ type: "SELECT_UNIT", payload: unitCodes[0] });
    }
  };

  // UI disable conditions
  const isUnitDisabled = Boolean(loading.units);
  const isFloorDisabled = !filters.unitCode || Boolean(loading.floors);
  const isLineDisabled = !filters.floorName || Boolean(loading.lines);
  const isOperationDisabled = !filters.lineName || Boolean(loading.operations);

  return (
    <div className={`hierarchical-filter space-y-3 ${className}`}>
      {/* Header with Clear/Reset */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-300">Hierarchical Filters</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearAll}
            className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleResetToFirst}
            className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Grid of dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* UNIT */}
        <div>
          {showLabels && <label className="block text-xs text-gray-400 mb-1">Unit</label>}
          <div className="relative flex gap-2">
            <input
              type="text"
              placeholder="Search units..."
              value={unitQuery}
              onChange={(e) => setUnitQuery(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-600 text-white p-2 rounded-l-md text-sm"
              disabled={isUnitDisabled}
            />
            <select
              value={filters.unitCode ?? ""}
              onChange={(e) => handleChange("unitCode", e.target.value || null)}
              disabled={isUnitDisabled}
              className="w-48 bg-gray-800 border border-gray-600 text-white p-2 rounded-r-md text-sm"
            >
              <option value="">{loading.units ? "Loading..." : "All Units"}</option>
              {filteredUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {isUnitDisabled && <LoadingSpinner className="absolute right-2 top-2 h-5 w-5" />}
          </div>
        </div>

        {/* FLOOR */}
        <div>
          {showLabels && <label className="block text-xs text-gray-400 mb-1">Floor</label>}
          <div className="relative flex gap-2">
            <input
              type="text"
              placeholder="Search floors..."
              value={floorQuery}
              onChange={(e) => setFloorQuery(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-600 text-white p-2 rounded-l-md text-sm"
              disabled={isFloorDisabled}
            />
            <select
              value={filters.floorName ?? ""}
              onChange={(e) => handleChange("floorName", e.target.value || null)}
              disabled={isFloorDisabled}
              className="w-48 bg-gray-800 border border-gray-600 text-white p-2 rounded-r-md text-sm"
            >
              <option value="">
                {!filters.unitCode ? "Select unit first" : loading.floors ? "Loading..." : "All Floors"}
              </option>
              {filteredFloors.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            {isFloorDisabled && loading.floors && <LoadingSpinner className="absolute right-2 top-2 h-5 w-5" />}
          </div>
        </div>

        {/* LINE */}
        <div>
          {showLabels && <label className="block text-xs text-gray-400 mb-1">Line</label>}
          <div className="relative flex gap-2">
            <input
              type="text"
              placeholder="Search lines..."
              value={lineQuery}
              onChange={(e) => setLineQuery(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-600 text-white p-2 rounded-l-md text-sm"
              disabled={isLineDisabled}
            />
            <select
              value={filters.lineName ?? ""}
              onChange={(e) => handleChange("lineName", e.target.value || null)}
              disabled={isLineDisabled}
              className="w-48 bg-gray-800 border border-gray-600 text-white p-2 rounded-r-md text-sm"
            >
              <option value="">
                {!filters.floorName ? "Select floor first" : loading.lines ? "Loading..." : "All Lines"}
              </option>
              {filteredLines.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            {isLineDisabled && loading.lines && <LoadingSpinner className="absolute right-2 top-2 h-5 w-5" />}
          </div>
        </div>

        {/* OPERATION */}
        <div>
          {showLabels && <label className="block text-xs text-gray-400 mb-1">Operation</label>}
          <div className="relative flex gap-2">
            <input
              type="text"
              placeholder="Search operations..."
              value={operationQuery}
              onChange={(e) => setOperationQuery(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-600 text-white p-2 rounded-l-md text-sm"
              disabled={isOperationDisabled}
            />
            <select
              value={filters.operation ?? ""}
              onChange={(e) => handleChange("operation", e.target.value || null)}
              disabled={isOperationDisabled}
              className="w-48 bg-gray-800 border border-gray-600 text-white p-2 rounded-r-md text-sm"
            >
              <option value="">
                {!filters.lineName ? "Select line first" : loading.operations ? "Loading..." : "All Operations"}
              </option>
              {filteredOperations.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            {isOperationDisabled && loading.operations && <LoadingSpinner className="absolute right-2 top-2 h-5 w-5" />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HierarchicalFilter;
