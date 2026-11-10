import app from "./app.js";
import { connectNeon, syncSchema } from "./config/db.js";
import { ENV } from "./config/env.js";
// import { initializeWebSocket } from "./websocket.js";
import { closeAllQueueStreams } from "./services/queue-sse/index.js";
import { closeAllNotificationStreams } from "./services/notification-sse/index.js";

// IMPORTANT: Render needs process.env.PORT

async function initializeServer() {
  try {
    await connectNeon();

    if (ENV.IS_PRODUCTION) {
      console.log(
        "IS_PRODUCTION:",
        ENV.IS_PRODUCTION,
        typeof ENV.IS_PRODUCTION,
      );
      await syncSchema(); // only turn this on if you want the schema to sync the database // don't turn this on while editing the db
    }

    const server = app.listen(ENV.PORT, () => {
      console.log(`Server is up and running on http://localhost:${ENV.PORT}`);
    });
    // initializeWebSocket(server);

    // When Render deploys (or you press Ctrl+C) the server is told to stop.
    // The Queue Monitor connections never end by themselves, so we close them
    // first. If we don't, server.close() waits on them forever.
    const shutdown = (signal: string) => {
      console.log(`${signal} received, closing live streams...`);
      closeAllQueueStreams();
      closeAllNotificationStreams();
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Error initializing server:", error);
    process.exit(1);
  }
}

await initializeServer();
