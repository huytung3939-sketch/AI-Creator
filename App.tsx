import { useState } from "react";
import ApiKeyInput from "./components/layout/ApiKeyInput";
import ModumSelector from "./components/layout/ModumSelector";
import Footer from "./components/layout/Footer";

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h1>🌟 AI Nano Banana Studio</h1>
      {!apiKey ? <ApiKeyInput onSubmit={setApiKey} /> : <ModumSelector apiKey={apiKey} />}
      <Footer />
    </div>
  );
}
