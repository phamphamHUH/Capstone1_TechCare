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
            console.error("Error sending message:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#09090b] px-4 py-10 text-zinc-100 sm:px-6">
            <div className="mx-auto max-w-3xl">
                <header className="mb-8">
                    <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
                        <span className="h-2 w-2 rounded-full bg-indigo-400" />
                        Developer Tools
                        <span>/</span>
                        Real-time Events
                    </div>

                    <h1 className="text-3xl font-semibold tracking-tight">
                        Send SSE Message
                    </h1>

                    <p className="mt-2 text-sm text-zinc-400">
                        Submit a message to the server and broadcast it to connected clients.
                    </p>
                </header>

                <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
                    <div className="border-b border-zinc-800 px-5 py-4">
                        <h2 className="text-sm font-medium">New message</h2>
                        <p className="mt-1 text-xs text-zinc-500">
                            Your message will be sent through the API.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 p-5">
                        <div className="space-y-2">
                            <label
                                htmlFor="message"
                                className="text-sm font-medium text-zinc-300"
                            >
                                Message
                            </label>

                            <textarea
                                id="message"
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                placeholder="Type your message here..."
                                rows={4}
                                disabled={loading}
                                className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 disabled:opacity-50"
                            />
                            <p className="text-right text-xs text-zinc-500">
                                {message.length} characters
                            </p>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-4">
                            <span className="font-mono text-xs text-zinc-500">
                                POST /api/sse/send
                            </span>

                            <button
                                type="submit"
                                disabled={!message.trim() || loading}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {loading ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            className="h-4 w-4"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"
                                            />
                                        </svg>
                                        Send message
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </main>
    );
}

export default SSESend;