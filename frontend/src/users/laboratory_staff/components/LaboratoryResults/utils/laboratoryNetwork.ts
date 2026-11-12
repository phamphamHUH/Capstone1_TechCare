import { isAxiosError } from "axios";

function waitForReconnect(delay: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Loading was cancelled.", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, delay);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}

// Only use for reads. Never automatically repeat save, start, or release actions.
export async function retryLaboratoryRead<T>(
  read: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try {
      return await read();
    } catch (error) {
      if (
        signal?.aborted ||
        !isAxiosError(error) ||
        error.code !== "ERR_NETWORK" ||
        error.response
      )
        throw error;
      if (attempt === 2) {
        throw new Error(
          "Could not connect to the laboratory service. Please try again.",
          { cause: error },
        );
      }
      await waitForReconnect((attempt + 1) * 1000, signal);
    }
  }
}
