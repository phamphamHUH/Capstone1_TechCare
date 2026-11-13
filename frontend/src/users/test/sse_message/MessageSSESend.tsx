import api from "#lib/axios";
import { useState, type FormEvent } from "react";

function SSESend() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim() || loading) return;

    try {
      setLoading(true);
      const response = await api.post("/api/sse/send-sse", {
        message: message.trim(),
      });
      console.log(response.data.message);
      setMessage("");
    } catch (error) {
      console.error("Error sending SSE message:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-10 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-semibold">Send SSE Message</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Submit a message to the practice SSE endpoint.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type a message"
            rows={4}
            disabled={loading}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3"
          />
          <button
            type="submit"
            disabled={!message.trim() || loading}
            className="rounded-md bg-sky-500 px-4 py-2 disabled:opacity-40"
          >
            {loading ? "Sending..." : "Send message"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default SSESend;
