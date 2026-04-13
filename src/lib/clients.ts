export interface Client {
  id: string;
  label: string;
  meliAccount?: string;   // accountId en lib/meli.ts
  meliSellerId?: string;
  amazonRegions?: string[];
  active: boolean;
}

export const CLIENTS: Client[] = [
  {
    id: "unit1",
    label: "UNIT 1",
    meliAccount: undefined,
    meliSellerId: undefined,
    amazonRegions: ["US", "EU", "UK"],
    active: true,
  },
  {
    id: "filhos",
    label: "FILHOS",
    meliAccount: "filhos",
    meliSellerId: "106311635",
    amazonRegions: [],
    active: true,
  },
  {
    id: "ugo",
    label: "UGO",
    meliAccount: "ugo",
    meliSellerId: "3119303942",
    amazonRegions: [],
    active: true,
  },
  {
    id: "holiherb",
    label: "Holiherb",
    meliAccount: undefined,
    meliSellerId: undefined,
    amazonRegions: ["US", "EU"],
    active: true,
  },
];

export function getClient(id: string): Client | undefined {
  return CLIENTS.find((c) => c.id === id);
}
