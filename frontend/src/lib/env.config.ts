export const ENV = {
    VITE_API_BASE_URL: normalizeApiBaseUrl(
        import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "",
    ),
};

function normalizeApiBaseUrl(value: string) {
    const trimmed = value.trim().replace(/\/+$/, "");
    return trimmed.replace(/\/api$/, "");
}
