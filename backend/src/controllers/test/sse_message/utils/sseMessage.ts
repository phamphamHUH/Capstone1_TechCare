import type { Response } from "express";

// Set stores the Response object for every client connected to our SSE endpoint.
// Each Response object represents one client's open HTTP connection.
// We use a Set so we can add and remove connected clients.
const clients = new Set<Response>(); //  Client is a collection of response

// This function registers a client when it connects to our SSE endpoint.
export function addClient(res: Response) {
    // Save this client's Response object in our Set.
    // We can use this object later to send data through its open connection.
    clients.add(res);

    // The "close" event runs when this client's connection closes.
    // For example, the user closes the browser or leaves the page.
    res.on("close", () => {
        // Remove the disconnected client so we don't try to send data to it.
        clients.delete(res);
    });
}

// This function sends data to every client currently connected to SSE.
// "data: unknown" means this function accepts data of any type,
// but TypeScript requires us to handle it safely.
export function sendSSE(data: unknown) {
    // Loop through every connected client's Response object.
    for (const client of clients) { // loops trhogh eachh client like multicast
        // Convert the JavaScript object into a JSON string.
        // SSE requires messages to use the "data:" field.
        // The two newline characters (\n\n) tell the browser that
        // this SSE event has ended and can now be processed.
        client.write(`data: ${JSON.stringify(data)}\n\n`);
    }
}



/////////// ------  TESTING FOR UNICAST ------------------------------
const specifiedClients = new Map<string, Response>();

export function addSpecifiedClient(userId: string, res: Response) {
    specifiedClients.set(userId, res);
}

export function sendSSEToUser(userId: string, data: unknown) {
    const specifiedClient = specifiedClients.get(userId);

    if (specifiedClient) {
        specifiedClient.write(`data: ${JSON.stringify(data)}\n\n`);
    }
}