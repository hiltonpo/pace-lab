import { useEffect, useState } from "react";
import { SHARED_VERSION } from "@pace-lab/shared";

type Health = { status: string; shared: string; ts: string };

export function App() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(console.error);
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 32 }}>
      <h1>pace lab</h1>
      <p>shared version (from frontend): {SHARED_VERSION}</p>
      <p>backend health: {health ? JSON.stringify(health) : "loading..."}</p>
    </div>
  );
}