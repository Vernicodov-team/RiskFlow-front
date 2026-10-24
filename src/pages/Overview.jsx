import { useEffect } from "react";
import { useRealtime } from "../hooks/useRealtime";

function Overview() {
  const { isConnected, refreshVersion } = useRealtime();

  useEffect(() => {
    console.log("Overview обновился:", refreshVersion);
  }, [refreshVersion]);

  return (
    <section>
      <h1>Обзор</h1>
      <p>
        Соединение:{" "}
        {isConnected ? "активно" : "отсутствует"}
      </p>
    </section>
  );
}

export default Overview;