import { useEffect } from "react";
import { useRealtime } from "../hooks/useRealtime";

function CustomerCard() {
  const { refreshVersion } = useRealtime();

  useEffect(() => {
    console.log(
      "CustomerCard обновился:",
      refreshVersion,
    );
  }, [refreshVersion]);

  return (
    <section>
      <h1>Карточка клиента</h1>
    </section>
  );
}

export default CustomerCard;