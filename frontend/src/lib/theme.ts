export type Theme = "light" | "dark" | "system";

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");
let current: Theme = "light";
let listening = false;

function paint() {
  const dark = current === "dark" || (current === "system" && darkQuery().matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

/** Applies a theme to the whole UI. "system" follows the OS setting live. */
export function applyTheme(theme: Theme) {
  current = theme;
  paint();
  if (!listening) {
    listening = true;
    darkQuery().addEventListener("change", () => current === "system" && paint());
  }
}

/** The signed-in account's saved theme; light when nobody is signed in. */
export function readSessionTheme(): Theme {
  try {
    const theme = JSON.parse(sessionStorage.getItem("user") || "{}").theme;
    return theme === "dark" || theme === "system" ? theme : "light";
  } catch {
    return "light";
  }
}
