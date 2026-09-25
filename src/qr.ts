import QRCode from "qrcode";

/** Публичный адрес сайта для QR. Задаётся VITE_PUBLIC_URL (свой сервер), иначе текущий origin */
export const PUBLIC_URL = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.replace(/\/$/, "") ??
  `${location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}`;

export const objectUrl = (id: string) => `${PUBLIC_URL}/#/o/${id}`;
export const routeUrl = (id: string) => `${PUBLIC_URL}/#/r/${id}`;

export async function qrCanvas(url: string, size = 180): Promise<HTMLCanvasElement> {
  const c = document.createElement("canvas");
  await QRCode.toCanvas(c, url, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1f1f1dff", light: "#00000000" },
  });
  c.classList.add("qr");
  return c;
}
