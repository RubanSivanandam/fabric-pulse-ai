// src/contexts/FilterContext.tsx - FIXED: Hierarchical Filter Logic
import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface FilterState {
  unitCodes: string[];
  floorNames: string[];
  lineNames: string[];
  operations: string[];
  
  selectedUnit: string | null;
  selectedFloor: string | null;
  selectedLine: string | null;
  selectedOperation: string | null;
  
  loading: {
    units: boolean;
    floors: boolean;
    lines: boolean;
    operations: boolean;
  };
}

type FilterAction = 
  | { type: 'SET_UNIT_CODES'; payload: string[] }
  | { type: 'SET_FLOOR_NAMES'; payload: string[] }
  | { type: 'SET_LINE_NAMES'; payload: string[] }
  | { type: 'SET_OPERATIONS'; payload: string[] }
  | { type: 'SELECT_UNIT'; payload: string | null }
  | { type: 'SELECT_FLOOR'; payload: string | null }
  | { type: 'SELECT_LINE'; payload: string | null }
  | { type: 'SELECT_OPERATION'; payload: string | null }
  | { type: 'SET_LOADING'; payload: { key: keyof FilterState['loading']; value: boolean } }
  | { type: 'RESET_FILTERS' };

const initialState: FilterState = {
  unitCodes: [],
  floorNames: [],
  lineNames: [],
  operations: [],
  selectedUnit: null,
  selectedFloor: null,
  selectedLine: null,
  selectedOperation: null,
  loading: {
    units: false,
    floors: false,
    lines: false,
    operations: false,
  },
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_UNIT_CODES':
      return { ...state, unitCodes: action.payload };
    
    case 'SET_FLOOR_NAMES':
      return { ...state, floorNames: action.payload };
    
    case 'SET_LINE_NAMES':
      return { ...state, lineNames: action.payload };
    
    case 'SET_OPERATIONS':
      return { ...state, operations: action.payload };
    
    case 'SELECT_UNIT':
      return {
        ...state,
        selectedUnit: action.payload,
        selectedFloor: null,
        selectedLine: null,
        selectedOperation: null,
        floorNames: [],
        lineNames: [],
        operations: [],
      };
    
    case 'SELECT_FLOOR':
      return {
        ...state,
        selectedFloor: action.payload,
        selectedLine: null,
        selectedOperation: null,
        lineNames: [],
        operations: [],
      };
    
    case 'SELECT_LINE':
      return {
        ...state,
        selectedLine: action.payload,
        selectedOperation: null,
        operations: [],
      };
    
    case 'SELECT_OPERATION':
      return {
        ...state,
        selectedOperation: action.payload,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };
    
    case 'RESET_FILTERS':
      return initialState;
    
    default:
      return state;
  }
}

const FilterContext = createContext<{
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  loadUnitCodes: () => Promise<void>;
  loadFloorNames: (unitCode: string) => Promise<void>;
  loadLineNames: (unitCode: string, floorName: string) => Promise<void>;
  loadOperations: (unitCode: string, floorName: string, lineName: string) => Promise<void>;
} | null>(null);

export function FilterContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(filterReducer, initialState);

  const loadUnitCodes = async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'units', value: true } });
    try {
      const response = await fetch('/api/rtms/filters/units');
      const data = await response.json();
      if (data.status === 'success') {
        dispatch({ type: 'SET_UNIT_CODES', payload: data.data });
      }
    } catch (error) {
      console.error('Failed to load unit codes:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'units', value: false } });
    }
  };

  const loadFloorNames = async (unitCode: string) => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'floors', value: true } });
    try {
      const response = await fetch(`/api/rtms/filters/floors?unit_code=${encodeURIComponent(unitCode)}`);
      const data = await response.json();
      if (data.status === 'success') {
        dispatch({ type: 'SET_FLOOR_NAMES', payload: data.data });
      }
    } catch (error) {
      console.error('Failed to load floor names:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'floors', value: false } });
    }
  };

  const loadLineNames = async (unitCode: string, floorName: string) => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'lines', value: true } });
    try {
      const response = await fetch(
        `/api/rtms/filters/lines?unit_code=${encodeURIComponent(unitCode)}&floor_name=${encodeURIComponent(floorName)}`
      );
      const data = await response.json();
      if (data.status === 'success') {
        dispatch({ type: 'SET_LINE_NAMES', payload: data.data });
      }
    } catch (error) {
      console.error('Failed to load line names:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'lines', value: false } });
    }
  };

  const loadOperations = async (unitCode: string, floorName: string, lineName: string) => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'operations', value: true } });
    try {
      const response = await fetch(
        `/api/rtms/filters/operations?unit_code=${encodeURIComponent(unitCode)}&floor_name=${encodeURIComponent(floorName)}&line_name=${encodeURIComponent(lineName)}`
      );
      const data = await response.json();
      if (data.status === 'success') {
        dispatch({ type: 'SET_OPERATIONS', payload: data.data });
      }
    } catch (error) {
      console.error('Failed to load operations:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'operations', value: false } });
    }
  };

  // Load unit codes on mount
  useEffect(() => {
    loadUnitCodes();
  }, []);

  return (
    <FilterContext.Provider
      value={{
        state,
        dispatch,
        loadUnitCodes,
        loadFloorNames,
        loadLineNames,
        loadOperations,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterContextProvider');
  }
  return context;
}
