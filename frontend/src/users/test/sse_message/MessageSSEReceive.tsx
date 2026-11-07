import { useEffect, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";

function MessageSSEREcieve() {
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">(
    "connecting",
  );

  useEffect(() => {
    const controller = new AbortController();

    async function connectSSE() {
      try {
        await fetchEventSource("http://localhost:5000/api/sse/message/message-receive", {
          method: "GET",
          signal: controller.signal,
          async onopen(response) {
            if (response.ok) {
              setStatus("connected");
            } else {
              setStatus("error");
              throw new Error(`SSE connection failed: ${response.status}`);
            }
          },
          onmessage(event) {
            const data = JSON.parse(event.data);
            setMessages((prev) => [
              ...data.messages.map((item: { message: string }) => item.message),
              ...prev,
            ]);
          },
          onerror(error) {
            setStatus("connecting");
            throw error;
          },
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus("error");
          console.error("SSE connection failed:", error);
        }
      }
    }

    connectSSE();
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-10 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-semibold">SSE Message Stream</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Status: {status} · {messages.length} messages
        </p>
        <ul className="space-y-2">
          {messages.map((message, index) => (
            <li key={`${index}-${message}`} className="rounded border border-zinc-800 p-3">
              {message}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export default MessageSSEREcieve;
