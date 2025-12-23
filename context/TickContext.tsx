import React, { createContext, useContext, useEffect, useState } from "react";

const TickContext = createContext<number>(0);

export const useTick = () => useContext(TickContext);

export const TickProvider = ({ children }: { children: React.ReactNode }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return <TickContext.Provider value={tick}>{children}</TickContext.Provider>;
};
