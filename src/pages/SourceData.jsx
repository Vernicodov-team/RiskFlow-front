import { useEffect } from "react";
import { useRealtime } from "../hooks/useRealtime";

function SourceData() {
  const { refreshVersion } = useRealtime();

  useEffect(() => {
    console.log(
      "SourceData обновился:",
      refreshVersion,
    );
  }, [refreshVersion]);

  return (
    <section>
      <h1>Данные</h1>
    </section>
  );
}

export default SourceData;