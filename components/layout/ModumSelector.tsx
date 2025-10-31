import { useState } from "react";
import FreeGeneration from "../modums/FreeGeneration";

export default function ModumSelector({ apiKey }: { apiKey: string }) {
  const [active, setActive] = useState("free");

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setActive("free")} style={{ margin: "0 5px" }}>
          Free Generation
        </button>
      </div>

      {active === "free" && <FreeGeneration apiKey={apiKey} />}
    </div>
  );
}
