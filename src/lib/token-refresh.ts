const parsedWindow = Number(process.env.NEXT_PUBLIC_TOKEN_REFRESH_WINDOW_MS);

export const TOKEN_REFRESH_WINDOW_MS =
  Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : 5 * 60 * 1000;

export const TOKEN_REFRESH_MIN_DELAY_MS = 30 * 1000;
