import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import useSignalR from "../hooks/useSignalR";

const RealtimeContext = createContext(null);

const SIGNALR_URL =
  import.meta.env.VITE_SIGNALR_URL ||
  "http://localhost:5094/hubs/dashboard";

export function RealtimeProvider({ children }) {
  const [refreshVersion, setRefreshVersion] = useState(0);

  const {
    isConnected,
    lastMessage,
    connectionError,
  } = useSignalR(SIGNALR_URL);

  useEffect(() => {
    if (!lastMessage) {
      return;
    }

    setRefreshVersion((currentVersion) => currentVersion + 1);
  }, [lastMessage]);

  const contextValue = useMemo(
    () => ({
      isConnected,
      lastMessage,
      connectionError,
      refreshVersion,
    }),
    [
      isConnected,
      lastMessage,
      connectionError,
      refreshVersion,
    ],
  );

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error(
      "useRealtime должен использоваться внутри RealtimeProvider",
    );
  }

  return context;
}