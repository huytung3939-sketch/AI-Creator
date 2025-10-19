"use client";

import { useState, useEffect } from "react";
import { generateText } from "./lib/geminiClient";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  
  // Tự động nhớ key đã lưu
  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_key");
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem("gemini_key", apiKey);
    alert("Đã lưu API Key!");
  };

  const handleRun = async () => {
    const output = await generateText(apiKey, prompt);
    setResult(output);
  };

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>Gemini AI Web App</h1>

      <input
        type="password"
        placeholder="Nhập API Key của bạn..."
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          border: "1px solid #ccc",
          borderRadius: 6,
          marginBottom: 10,
        }}
      />

      <button onClick={handleSaveKey} style={{ padding: "8px 16px" }}>
        💾 Lưu API Key
      </button>

      <textarea
        placeholder="Nhập prompt..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{
          width: "100%",
          height: 120,
          marginTop: 15,
          padding: 10,
          border: "1px solid #ccc",
          borderRadius: 6,
        }}
      />

      <button
        onClick={handleRun}
        style={{
          padding: "10px 20px",
          marginTop: 10,
          background: "#0070f3",
          color: "#fff",
          borderRadius: 6,
          border: "none",
        }}
      >
        🚀 Gửi Prompt
      </button>

      {result && (
        <div
          style={{
            marginTop: 20,
            background: "#f6f8fa",
            padding: 15,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
          }}
        >
          <h3>Kết quả:</h3>
          <p>{result}</p>
        </div>
      )}
    </main>
  );
}
