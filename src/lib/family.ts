export type FamilyMember = {
  id: string;
  name: string;
  born: number;
  died?: number;
  color: string;
};

export const START_YEAR = 1988;
export const END_YEAR = 2026;

export const family: FamilyMember[] = [
  { id: "urszula", name: "Urszula", born: 1945, died: 2022, color: "#A3A3A3" },
  { id: "herbert", name: "Herbert", born: 1943, died: 2012, color: "#A3A3A3" },
  { id: "iwona", name: "Iwona", born: 1967, color: "#858585" },
  { id: "adrian", name: "Adrian", born: 1988, color: "#3478C5" },
  { id: "ola", name: "Ola", born: 1988, color: "#BB889E" },
  { id: "manfred", name: "Manfred", born: 1964, died: 2026, color: "#858585" },
  { id: "helga", name: "Helga", born: 1938, died: 1999, color: "#A3A3A3" },
  { id: "franz", name: "Franz", born: 1936, color: "#A3A3A3" },
  { id: "niko", name: "Niko", born: 2015, color: "#729BC3" },
  { id: "timo", name: "Timo", born: 2019, color: "#85B6B8" },
];

export const events = {
  wedding: 2012,
  nikoBorn: 2015,
  timoBorn: 2019,
};