import { jsPDF } from "jspdf";
import type { ThemeId } from "./score";

export const THEME_META: Record<
  ThemeId,
  { paper: string; ink: string; muted: string; texture: string | null; name: string }
> = {
  parchment: {
    name: "Parchment",
    paper: "#efe4c9",
    ink: "#2c2419",
    muted: "#6a5c4a",
    texture: "/textures/parchment.jpg",
  },
  manuscript: {
    name: "Manuscript",
    paper: "#e4cba0",
    ink: "#2a1d12",
    muted: "#6b4e32",
    texture: "/textures/manuscript.jpg",
  },
  vellum: {
    name: "Press",
    paper: "#f6f1e6",
    ink: "#1c1a16",
    muted: "#5c574c",
    texture: "/textures/vellum.jpg",
  },
  night: {
    name: "Lampblack",
    paper: "#1c1814",
    ink: "#ead9b8",
    muted: "#b09a78",
    texture: null,
  },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("texture"));
    img.src = src;
  });
}

export async function svgElementToCanvas(
  svg: SVGSVGElement,
  theme: ThemeId,
  scale = 2,
): Promise<HTMLCanvasElement> {
  const meta = THEME_META[theme];
  const w = svg.viewBox.baseVal.width || svg.clientWidth;
  const h = svg.viewBox.baseVal.height || svg.clientHeight;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = meta.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (meta.texture) {
    try {
      const tex = await loadImage(meta.texture);
      ctx.globalAlpha = theme === "vellum" ? 0.55 : 0.72;
      ctx.drawImage(tex, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    } catch {
      /* color fill is enough */
    }
  }
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
  return canvas;
}

export async function exportPng(svg: SVGSVGElement, theme: ThemeId, filename: string) {
  const canvas = await svgElementToCanvas(svg, theme, 2.4);
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

export async function exportPdf(svg: SVGSVGElement, theme: ThemeId, filename: string) {
  const canvas = await svgElementToCanvas(svg, theme, 2);
  const img = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const maxW = pw - margin * 2;
  const maxH = ph - margin * 2;
  const ratio = canvas.width / canvas.height;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  const x = (pw - w) / 2;
  const y = (ph - h) / 2;
  pdf.setFillColor(THEME_META[theme].paper);
  pdf.rect(0, 0, pw, ph, "F");
  pdf.addImage(img, "JPEG", x, y, w, h);
  pdf.save(filename);
}
