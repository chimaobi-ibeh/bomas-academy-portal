import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
  type RGB,
} from "pdf-lib";
import logoDataUri from "@/assets/bomas-logo.jpg?inline";

/** A4 in PDF points. */
export const A4 = { w: 595.28, h: 841.89 };

export const C = {
  black: rgb(0.08, 0.08, 0.1),
  ink: rgb(0.06, 0.16, 0.45), // parent answers: dark blue "pen" ink
  red: rgb(0.82, 0.12, 0.14),
  blue: rgb(0.1, 0.33, 0.62),
  blueDark: rgb(0.05, 0.2, 0.42),
  teal: rgb(0.11, 0.47, 0.6),
  tealDark: rgb(0.07, 0.36, 0.48),
  yellow: rgb(0.98, 0.8, 0.05),
  officeBlue: rgb(0.48, 0.71, 0.93),
  grey: rgb(0.45, 0.45, 0.48),
  line: rgb(0.15, 0.15, 0.18),
  white: rgb(1, 1, 1),
  navy: rgb(0.11, 0.16, 0.36),
  gold: rgb(0.85, 0.66, 0.2),
  cream: rgb(0.98, 0.97, 0.94),
};

export type Fonts = {
  reg: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  serifBold: PDFFont;
};

const fontCache = new WeakMap<PDFDocument, Promise<Fonts>>();

/** Embeds the standard fonts once per document. */
export function loadFonts(doc: PDFDocument): Promise<Fonts> {
  let fonts = fontCache.get(doc);
  if (!fonts) {
    fonts = (async () => ({
      reg: await doc.embedFont(StandardFonts.Helvetica),
      bold: await doc.embedFont(StandardFonts.HelveticaBold),
      italic: await doc.embedFont(StandardFonts.HelveticaOblique),
      boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
      serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
    }))();
    fontCache.set(doc, fonts);
  }
  return fonts;
}

function dataUriBytes(uri: string) {
  const b64 = uri.slice(uri.indexOf(",") + 1);
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function embedLogo(doc: PDFDocument) {
  return doc.embedJpg(dataUriBytes(logoDataUri));
}

/** Embeds a JPEG or PNG by sniffing its bytes. Returns null for anything else. */
export async function embedPhoto(doc: PDFDocument, bytes?: Uint8Array | null) {
  if (!bytes || bytes.length < 8) return null;
  try {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes);
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
  } catch {
    return null;
  }
  return null;
}

/**
 * Standard PDF fonts only cover Latin-1 (WinAnsi). Accents are stripped (e.g. "Ọ" -> "O")
 * and anything else unprintable becomes "?", so a stray emoji can never break generation.
 */
export function pdfSafe(input: unknown): string {
  const s = String(input ?? "")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[\r\n\t]+/g, " ");
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) {
      out += ch;
      continue;
    }
    const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (base === "") continue; // a lone combining accent
    out += base && [...base].every((b) => b.charCodeAt(0) <= 0xff) ? base : "?";
  }
  return out;
}

/** Nigeria is UTC+1 all year (WAT, no daylight saving). */
const WAT_OFFSET_MS = 60 * 60 * 1000;

function parts(iso: string, dateOnly: boolean) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // A plain YYYY-MM-DD (e.g. a date of birth) is a calendar date: no time zone shift.
  const t = dateOnly ? d : new Date(d.getTime() + WAT_OFFSET_MS);
  return {
    dd: String(t.getUTCDate()).padStart(2, "0"),
    mm: String(t.getUTCMonth() + 1).padStart(2, "0"),
    yyyy: t.getUTCFullYear(),
    hh: String(t.getUTCHours()).padStart(2, "0"),
    min: String(t.getUTCMinutes()).padStart(2, "0"),
  };
}

/** dd/mm/yyyy, in Nigerian time for timestamps. */
export function formatDate(iso?: string | null) {
  if (!iso) return "";
  const p = parts(iso, /^\d{4}-\d{2}-\d{2}$/.test(iso));
  return p ? `${p.dd}/${p.mm}/${p.yyyy}` : String(iso);
}

/** dd/mm/yyyy hh:mm WAT */
export function formatDateTime(iso?: string | null) {
  if (!iso) return "";
  const p = parts(iso, false);
  return p ? `${p.dd}/${p.mm}/${p.yyyy} ${p.hh}:${p.min} WAT` : String(iso);
}

export type Overflow = { label: string; value: string };

/**
 * Drawing surface with a top-left coordinate system (y grows downwards, like the paper form),
 * so layouts can be written in the same order the form is read.
 */
export class Sheet {
  readonly overflow: Overflow[];
  constructor(
    readonly page: PDFPage,
    readonly f: Fonts,
    overflow: Overflow[] = [],
  ) {
    this.overflow = overflow;
  }

  private Y(top: number) {
    return A4.h - top;
  }

  text(
    str: string,
    x: number,
    top: number,
    o: { size?: number; font?: PDFFont; color?: RGB; align?: "left" | "center" | "right" } = {},
  ) {
    const size = o.size ?? 10;
    const font = o.font ?? this.f.bold;
    const s = pdfSafe(str);
    const w = font.widthOfTextAtSize(s, size);
    const dx = o.align === "center" ? -w / 2 : o.align === "right" ? -w : 0;
    this.page.drawText(s, { x: x + dx, y: this.Y(top), size, font, color: o.color ?? C.black });
    return w;
  }

  width(str: string, size = 10, font = this.f.bold) {
    return font.widthOfTextAtSize(pdfSafe(str), size);
  }

  line(x1: number, top1: number, x2: number, top2 = top1, thickness = 0.7, color = C.line) {
    this.page.drawLine({
      start: { x: x1, y: this.Y(top1) },
      end: { x: x2, y: this.Y(top2) },
      thickness,
      color,
    });
  }

  rect(
    x: number,
    top: number,
    w: number,
    h: number,
    o: { fill?: RGB; border?: RGB; borderWidth?: number } = {},
  ) {
    this.page.drawRectangle({
      x,
      y: this.Y(top + h),
      width: w,
      height: h,
      color: o.fill,
      borderColor: o.border,
      borderWidth: o.border ? (o.borderWidth ?? 0.8) : 0,
    });
  }

  ellipse(cx: number, cTop: number, rx: number, ry: number, color = C.ink, thickness = 0.9) {
    this.page.drawEllipse({
      x: cx,
      y: this.Y(cTop),
      xScale: rx,
      yScale: ry,
      borderColor: color,
      borderWidth: thickness,
    });
  }

  image(img: PDFImage, x: number, top: number, w: number, h: number) {
    this.page.drawImage(img, { x, y: this.Y(top + h), width: w, height: h });
  }

  /** Fits an image inside a box, keeping its proportions and centring it. */
  imageContain(img: PDFImage, x: number, top: number, w: number, h: number) {
    const r = Math.min(w / img.width, h / img.height);
    const iw = img.width * r;
    const ih = img.height * r;
    this.image(img, x + (w - iw) / 2, top + (h - ih) / 2, iw, ih);
  }

  /** Square tick box; draws a tick when checked. `top` is the box's top edge. */
  box(x: number, top: number, checked = false, size = 8.5) {
    this.rect(x, top, size, size, { border: C.black, borderWidth: 0.9, fill: C.white });
    if (checked) {
      this.page.drawSvgPath(`M 1.6 4.6 L 3.6 6.8 L 7.4 1.6`, {
        x,
        y: this.Y(top),
        borderColor: C.ink,
        borderWidth: 1.6,
        scale: size / 8.5,
      });
    }
  }

  /**
   * Writes a parent's answer on a ruled line. Shrinks long answers down to `minSize`; if it
   * still does not fit, prints as much as fits and sends the full text to the continuation sheet.
   */
  answer(
    value: string,
    x: number,
    baselineTop: number,
    maxWidth: number,
    o: { size?: number; minSize?: number; label?: string; font?: PDFFont } = {},
  ) {
    const v = pdfSafe(value).trim();
    if (!v || maxWidth <= 4) return;
    const font = o.font ?? this.f.reg;
    let size = o.size ?? 9.5;
    const min = o.minSize ?? 6.5;
    while (size > min && font.widthOfTextAtSize(v, size) > maxWidth) size -= 0.25;
    if (font.widthOfTextAtSize(v, size) <= maxWidth) {
      this.text(v, x, baselineTop - 1.5, { size, font, color: C.ink });
      return;
    }
    const marker = " (see continuation sheet)";
    let cut = v;
    while (cut.length > 1 && font.widthOfTextAtSize(cut + "..." + marker, size) > maxWidth) {
      cut = cut.slice(0, -1);
    }
    this.text(cut.trimEnd() + "..." + marker, x, baselineTop - 1.5, { size, font, color: C.ink });
    if (o.label) this.overflow.push({ label: o.label, value: v });
  }

  /**
   * Label followed by a ruled line to `endX`, with the answer written on the line.
   * Returns the x where the line started.
   */
  field(
    label: string,
    value: string,
    x: number,
    top: number,
    endX: number,
    o: { size?: number; font?: PDFFont; answerSize?: number; overflowLabel?: string; gap?: number } = {},
  ) {
    const size = o.size ?? 10;
    const font = o.font ?? this.f.bold;
    const w = label ? this.text(label, x, top, { size, font }) : 0;
    const start = x + w + (label ? (o.gap ?? 2) : 0);
    this.line(start, top + 1.2, endX, top + 1.2);
    this.answer(value, start + 3, top, endX - start - 5, {
      size: o.answerSize,
      label: o.overflowLabel ?? label.replace(/[:?]\s*$/, ""),
    });
    return start;
  }

  /** Wraps text into lines that fit `maxWidth`. */
  wrap(str: string, maxWidth: number, size: number, font: PDFFont) {
    const words = pdfSafe(str).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) <= maxWidth || !cur) cur = next;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /** Multi-line answer written across several ruled lines. */
  answerLines(value: string, x: number, firstTop: number, gap: number, lines: number, width: number, label: string) {
    const v = pdfSafe(value).trim();
    if (!v) return;
    const size = 9.5;
    const wrapped = this.wrap(v, width - 6, size, this.f.reg);
    if (wrapped.length <= lines) {
      wrapped.forEach((l, i) => this.text(l, x + 3, firstTop + i * gap - 1.5, { size, font: this.f.reg, color: C.ink }));
      return;
    }
    const small = this.wrap(v, width - 6, 7.5, this.f.reg);
    if (small.length <= lines) {
      small.forEach((l, i) => this.text(l, x + 3, firstTop + i * gap - 1.5, { size: 7.5, font: this.f.reg, color: C.ink }));
      return;
    }
    small.slice(0, lines).forEach((l, i) => {
      const last = i === lines - 1;
      this.text(last ? `${l.slice(0, Math.max(0, l.length - 26))}... (see continuation sheet)` : l, x + 3, firstTop + i * gap - 1.5, {
        size: 7.5,
        font: this.f.reg,
        color: C.ink,
      });
    });
    this.overflow.push({ label, value: v });
  }

  /** "Signed electronically" mark written on a signature line. */
  esign(name: string, x: number, baselineTop: number, maxWidth: number) {
    const label = `${pdfSafe(name)} (signed electronically)`;
    let size = 9.5;
    while (size > 6 && this.f.italic.widthOfTextAtSize(label, size) > maxWidth) size -= 0.25;
    this.text(label, x, baselineTop - 1.5, { size, font: this.f.italic, color: C.ink });
  }
}

/** Appends a continuation sheet listing every answer that did not fit on the form. */
export function addContinuationSheet(
  doc: PDFDocument,
  f: Fonts,
  title: string,
  reference: string,
  items: Overflow[],
) {
  if (items.length === 0) return;
  let page = doc.addPage([A4.w, A4.h]);
  let s = new Sheet(page, f);
  let top = 60;
  const header = () => {
    s.text("BOMAS ACADEMY", 50, top, { size: 16, font: f.bold, color: C.blue });
    s.text(`${title}: continuation sheet`, 50, top + 20, { size: 11, font: f.bold });
    s.text(`Application reference ${reference}`, 545, top, { size: 8, font: f.reg, color: C.grey, align: "right" });
    s.line(50, top + 30, 545, top + 30, 0.8);
    top += 52;
  };
  header();
  for (const item of items) {
    const lines = s.wrap(item.value, 495, 9.5, f.reg);
    if (top + 16 + lines.length * 13 > A4.h - 50) {
      page = doc.addPage([A4.w, A4.h]);
      s = new Sheet(page, f);
      top = 60;
      header();
    }
    s.text(item.label, 50, top, { size: 9.5, font: f.bold });
    top += 14;
    for (const l of lines) {
      s.text(l, 50, top, { size: 9.5, font: f.reg, color: C.ink });
      top += 13;
    }
    top += 8;
  }
}

/** Small footer used on generated pages so a printed copy can be traced to its application. */
export function footer(s: Sheet, reference: string, note = "Completed online") {
  s.text(`${note} | Ref ${reference}`, A4.w / 2, A4.h - 8, {
    size: 6,
    font: s.f.reg,
    color: C.grey,
    align: "center",
  });
}
