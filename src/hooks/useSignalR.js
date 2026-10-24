import { useEffect, useState } from "react";
import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

function useSignalR(hubUrl) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState("");
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => {
    if (!hubUrl) {
      setConnectionError("Не указан адрес SignalR Hub.");
      return undefined;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    function handleDataChanged(message) {
      setLastMessage(
        typeof message === "string"
          ? message
          : "Данные обновлены",
      );
    }

    connection.on("dataChanged", handleDataChanged);

    connection.onreconnecting(() => {
      setIsConnected(false);
      setConnectionError("Соединение с сервером восстанавливается...");
    });

    connection.onreconnected(() => {
      setIsConnected(true);
      setConnectionError("");
    });

    connection.onclose((error) => {
      setIsConnected(false);

      if (error) {
        setConnectionError("SignalR-соединение закрыто.");
      }
    });

    async function startConnection() {
      try {
        if (connection.state === HubConnectionState.Disconnected) {
          await connection.start();

          setIsConnected(true);
          setConnectionError("");

          console.log("SignalR подключён");
        }
      } catch (error) {
        setIsConnected(false);
        setConnectionError(
          "Не удалось подключиться к SignalR.",
        );

        console.error("Ошибка SignalR:", error);
      }
    }

    startConnection();

    return () => {
      connection.off("dataChanged", handleDataChanged);
      connection.stop();
    };
  }, [hubUrl]);

  return {
    isConnected,
    lastMessage,
    connectionError,
  };
}

export default useSignalR;