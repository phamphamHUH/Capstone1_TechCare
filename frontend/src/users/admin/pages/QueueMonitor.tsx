
import React, { useEffect } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

function QueueMonitor() {

    useEffect(() => {
        const controller = new AbortController();

        async function connectSSE() {
            try {
                await fetchEventSource(
                    "http://localhost:5000/api/sse/stream-sse",
                    {
                        method: "GET",

                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },

                        signal: controller.signal,

                        async onopen(response) {
                            if (!response.ok) {
                                throw new Error(`HTTP error: ${response.status}`);
                            }

                            console.log("SSE Connected");
                        },

                        onmessage(event) {
                            const data = JSON.parse(event.data);
                            console.log("Received:", data);
                        },

                        onerror(error) {
                            console.error("SSE Error:", error);
                            throw error;
                        },
                    }
                );
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error("SSE connection failed:", error);
                }
            }
        }

        connectSSE();

        // Cleanup when component unmounts.
        return () => {
            controller.abort();
        };

    }, []);

    return (
        <div>QueueMonitor</div>
    );
}

export default QueueMonitor;
