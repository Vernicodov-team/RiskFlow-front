import { useEffect } from "react";
import { useRealtime } from "../hooks/useRealtime";

function Customers() {
  const { isConnected, refreshVersion } = useRealtime();

  useEffect(() => {
    console.log(
      "Customers: нужно обновить данные",
      refreshVersion,
    );
  }, [refreshVersion]);

  return (
    <section>
      <h1>Клиенты</h1>

      <p>
        SignalR:{" "}
        {isConnected ? "подключён" : "не подключён"}
      </p>

      <p>Версия обновления: {refreshVersion}</p>
    </section>
  );
}

export default Customers;