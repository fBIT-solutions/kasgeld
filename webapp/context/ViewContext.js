"use client";
import { createContext, useContext, useState } from "react";

const ViewContext = createContext();

export function ViewProvider({ children }) {
  const [view, setView] = useState(null);
  return (
    <ViewContext.Provider value={{ view, setView }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  return useContext(ViewContext);
}
