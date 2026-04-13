"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CLIENTS, type Client } from "./clients";

interface ClientContextValue {
  client: Client;
  setClientId: (id: string) => void;
  clients: Client[];
}

const ClientContext = createContext<ClientContextValue>({
  client: CLIENTS[0],
  setClientId: () => {},
  clients: CLIENTS,
});

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedClient") ?? CLIENTS[0].id;
    }
    return CLIENTS[0].id;
  });

  const setClientId = (id: string) => {
    setClientIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedClient", id);
    }
  };

  const client = CLIENTS.find((c) => c.id === clientId) ?? CLIENTS[0];

  return (
    <ClientContext.Provider value={{ client, setClientId, clients: CLIENTS }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  return useContext(ClientContext);
}
