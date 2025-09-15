import React from 'react';
import { Select } from '../ui/select';
import { FilterOptions, FilterState } from '../../types';

interface OperationFilterProps {
  filterOptions: FilterOptions;
  filterState: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  loading?: boolean;
}

export const OperationFilter: React.FC<OperationFilterProps> = ({
  filterOptions,
  filterState,
  onFilterChange,
  loading = false,
}) => {
  return (
    <div className="operation-filter">
      <div className="filter-grid">
        <div className="filter-item">
          <label htmlFor="unit-select" className="filter-label">
            Unit Code
          </label>
          <Select
            value={filterState.unitCode}
            onValueChange={(value) => onFilterChange({ unitCode: value })}
            options={filterOptions.units.map((unit) => ({ value: unit, label: unit }))}
            placeholder="Select Unit..."
            loading={loading}
            emptyMessage="No units available"
            disabled={loading}
          />
        </div>

        <div className="filter-item">
          <label htmlFor="floor-select" className="filter-label">
            Floor Name
          </label>
          <Select
            value={filterState.floorName}
            onValueChange={(value) => onFilterChange({ floorName: value })}
            options={filterOptions.floors.map((floor) => ({ value: floor, label: floor }))}
            placeholder={filterState.unitCode ? "Select Floor..." : "Select Unit first..."}
            loading={loading}
            emptyMessage={filterState.unitCode ? "No floors available" : "Select Unit first"}
            disabled={loading || !filterState.unitCode}
          />
        </div>

        <div className="filter-item">
          <label htmlFor="line-select" className="filter-label">
            Line Name
          </label>
          <Select
            value={filterState.lineName}
            onValueChange={(value) => onFilterChange({ lineName: value })}
            options={filterOptions.lines.map((line) => ({ value: line, label: line }))}
            placeholder={filterState.floorName ? "Select Line..." : "Select Floor first..."}
            loading={loading}
            emptyMessage={filterState.floorName ? "No lines available" : "Select Floor first"}
            disabled={loading || !filterState.floorName}
          />
        </div>

        <div className="filter-item">
          <label htmlFor="operation-select" className="filter-label">
            Operation
          </label>
          <Select
            value={filterState.operation}
            onValueChange={(value) => onFilterChange({ operation: value })}
            options={filterOptions.operations.map((op) => ({ value: op, label: op }))}
            placeholder="Select Operation..."
            loading={loading}
            emptyMessage="No operations available"
            disabled={loading}
          />
        </div>
      </div>

      {/* Active Filters Display */}
      {(filterState.unitCode || filterState.floorName || filterState.lineName || filterState.operation) && (
        <div className="active-filters">
          <span className="active-filters-label">Active Filters:</span>
          {filterState.unitCode && (
            <span className="filter-tag">
              Unit: {filterState.unitCode}
              <button
                onClick={() => onFilterChange({ unitCode: null })}
                className="filter-tag-remove"
                aria-label="Remove unit filter"
              >
                ×
              </button>
            </span>
          )}
          {filterState.floorName && (
            <span className="filter-tag">
              Floor: {filterState.floorName}
              <button
                onClick={() => onFilterChange({ floorName: null })}
                className="filter-tag-remove"
                aria-label="Remove floor filter"
              >
                ×
              </button>
            </span>
          )}
          {filterState.lineName && (
            <span className="filter-tag">
              Line: {filterState.lineName}
              <button
                onClick={() => onFilterChange({ lineName: null })}
                className="filter-tag-remove"
                aria-label="Remove line filter"
              >
                ×
              </button>
            </span>
          )}
          {filterState.operation && (
            <span className="filter-tag">
              Operation: {filterState.operation}
              <button
                onClick={() => onFilterChange({ operation: null })}
                className="filter-tag-remove"
                aria-label="Remove operation filter"
              >
                ×
              </button>
            </span>
          )}
          <button
            onClick={() => onFilterChange({ 
              unitCode: null, 
              floorName: null, 
              lineName: null, 
              operation: null 
            })}
            className="clear-all-filters"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};
