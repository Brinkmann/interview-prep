import mammoth from "mammoth";
import { extractImages, extractText, getDocumentProxy } from "unpdf";

export type CvFormat = "pdf" | "docx";

export interface ParsedCv {
  text: string;
  // Embedded images are dropped. A CV image is most often a photo, so any image is
  // logged as a removed photo (AT-01).
  imageCount: number;
}

export class UnreadableCvError extends Error {
  constructor() {
    super("CV file could not be read");
    this.name = "UnreadableCvError";
  }
}

export function formatFromPath(path: string): CvFormat | null {
  const ext = path.toLowerCase().split(".").pop();
  return ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : null;
}

// Step 2 of the pipeline: plain text only. Never logs the content.
export async function parseCv(bytes: Uint8Array, format: CvFormat): Promise<ParsedCv> {
  try {
    const parsed = format === "pdf" ? await parsePdf(bytes) : await parseDocx(bytes);
    if (!parsed.text.trim()) throw new UnreadableCvError();
    return parsed;
  } catch (err) {
    if (err instanceof UnreadableCvError) throw err;
    throw new UnreadableCvError();
  }
}

async function parsePdf(bytes: Uint8Array): Promise<ParsedCv> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  let imageCount = 0;
  for (let page = 1; page <= pdf.numPages; page++) {
    imageCount += (await extractImages(pdf, page)).length;
  }
  return { text, imageCount };
}

async function parseDocx(bytes: Uint8Array): Promise<ParsedCv> {
  const buffer = Buffer.from(bytes);
  let imageCount = 0;
  // Converting to HTML is the only way mammoth reports images; the HTML is discarded.
  await mammoth.convertToHtml({ buffer }, {
    convertImage: mammoth.images.imgElement(async () => {
      imageCount++;
      return { src: "" };
    }),
  });
  const { value } = await mammoth.extractRawText({ buffer });
  return { text: value, imageCount };
}
