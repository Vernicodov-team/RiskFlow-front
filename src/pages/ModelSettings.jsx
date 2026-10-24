import { useEffect } from "react";
import { useRealtime } from "../hooks/useRealtime";

function ModelSettings() {
  const { refreshVersion } = useRealtime();

  useEffect(() => {
    console.log(
      "ModelSettings обновился:",
      refreshVersion,
    );
  }, [refreshVersion]);

  return (
    <section>
      <h1>Настройка модели</h1>
    </section>
  );
}

export default ModelSettings;