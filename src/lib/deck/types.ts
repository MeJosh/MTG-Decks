export interface PrintingReference {
  set: string;
  collectorNumber: string;
}

export interface DeckEntry {
  quantity: number;
  name: string;
  printing?: PrintingReference;
  line: number;
}

export interface ParsedDeck {
  mainboard: DeckEntry[];
  sideboard: DeckEntry[];
}
