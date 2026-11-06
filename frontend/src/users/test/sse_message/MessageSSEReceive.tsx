import { useEffect, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";

function MessageSSEREcieve() {
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">(
    "connecting"
  );
  useEffect(() => {
    // Create a controller that can cancel the SSE request.
    const controller = new AbortController();

    async function connectSSE() {
      try {
        await fetchEventSource(
          "http://localhost:5000/api/sse/stream-sse", // First argument: URL
          {
            // Second argument: options object (key-value pairs)

            method: "GET", // Key: method | Value: "GET"

            headers: { // Key: headers | Value: HTTP request headers
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },

            signal: controller.signal, // Key: signal | Value: AbortSignal

            async onopen(response) { // Key: onopen | Value: callback function
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

            onerror(error) { // Key: onerror | Value: callback function
              setStatus("connecting");
              throw error;
            },
          }
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus("error");
          console.error("SSE connection failed:", error);
        }
      }
    }

    connectSSE();

    // Cleanup function: runs when the component unmounts.
    return () => {
      controller.abort(); // Cancels the SSE request.
    };
  }, []);

  const statusStyles = {
    connecting: "bg-amber-400/10 text-amber-400 ring-amber-400/20",
    connected: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20",
    error: "bg-red-400/10 text-red-400 ring-red-400/20",
  };

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-10 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            Developer Tools
            <span>/</span>
            Real-time Events
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                SSE Message Stream
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Monitor server-sent events in real time.
              </p>
            </div>

            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${statusStyles[status]}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${status === "connected"
                  ? "animate-pulse bg-emerald-400"
                  : status === "error"
                    ? "bg-red-400"
                    : "animate-pulse bg-amber-400"
                  }`}
              />
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </header>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <div>
              <h2 className="text-sm font-medium text-zinc-100">Incoming messages</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Events received from the SSE endpoint
              </p>
            </div>

            <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 font-mono text-xs text-zinc-300">
              {messages.length} messages
            </span>
          </div>

          <div className="max-h-[520px] min-h-64 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-6 w-6 text-zinc-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 18v.01M8.5 15.5a5 5 0 0 1 7 0M5 12a10 10 0 0 1 14 0M2 8.5a14 14 0 0 1 20 0"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-zinc-300">
                  Waiting for events
                </p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-500">
                  Messages will appear here when the server sends an SSE event.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800/80">
                {messages.map((message, index) => (
                  <li
                    key={`${index}-${message}`}
                    className="flex gap-4 px-5 py-4 transition-colors hover:bg-zinc-800/30"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                        Event {messages.length - index}
                      </p>
                      <p className="break-words text-sm leading-6 text-zinc-200">
                        {message}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="border-t border-zinc-800 px-5 py-3">
            <p className="font-mono text-xs text-zinc-500">
              GET /api/sse/stream-sse
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}

export default MessageSSEREcieve;