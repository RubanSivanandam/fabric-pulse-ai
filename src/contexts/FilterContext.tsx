import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchHierarchy } from "../services/APIClient";

export interface FilterState {
  unitCode: string | null;
  floorName: string | null;
  lineName: string | null;
  operation: string | null;
}

export interface FilterContextType {
  state: {
    unitCodes: string[];
    floors: string[];
    lines: string[];
    newOperSeqs: string[];
  };
  selectedUnit: string;
  selectedFloor: string;
  selectedLine: string;
  selectedOper: string;
  setSelectedUnit: (u: string) => void;
  setSelectedFloor: (f: string) => void;
  setSelectedLine: (l: string) => void;
  setSelectedOper: (o: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterContextProvider({ children }: { children: React.ReactNode }) {
  const [unitCodes, setUnitCodes] = useState<string[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [newOperSeqs, setNewOperSeqs] = useState<string[]>([]);

  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedOper, setSelectedOper] = useState("");

  // Load UnitCodes
  useEffect(() => {
    fetchHierarchy("unitcode")
      .then((res) => setUnitCodes(res.values || []))
      .catch((err) => console.error("Failed to load unit codes:", err));
  }, []);

  // Load Floors when Unit changes
  useEffect(() => {
    if (!selectedUnit) return setFloors([]);
    fetchHierarchy("floorname", { unit_code: selectedUnit })
      .then((res) => setFloors(res.values || []))
      .catch((err) => console.error("Failed to load floors:", err));
  }, [selectedUnit]);

  // Load Lines when Floor changes
  useEffect(() => {
    if (!selectedFloor) return setLines([]);
    fetchHierarchy("linename", { unit_code: selectedUnit, floor_name: selectedFloor })
      .then((res) => setLines(res.values || []))
      .catch((err) => console.error("Failed to load lines:", err));
  }, [selectedFloor, selectedUnit]);

  // Load Operations when Line changes
  useEffect(() => {
    if (!selectedLine) return setNewOperSeqs([]);
    fetchHierarchy("newoperseq", {
      unit_code: selectedUnit,
      floor_name: selectedFloor,
      line_name: selectedLine,
    })
      .then((res) => setNewOperSeqs(res.values || []))
      .catch((err) => console.error("Failed to load operations:", err));
  }, [selectedLine, selectedFloor, selectedUnit]);

  return (
    <FilterContext.Provider
      value={{
        state: { unitCodes, floors, lines, newOperSeqs },
        selectedUnit,
        selectedFloor,
        selectedLine,
        selectedOper,
        setSelectedUnit,
        setSelectedFloor,
        setSelectedLine,
        setSelectedOper,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within a FilterContextProvider");
  return ctx;
}
