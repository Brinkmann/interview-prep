import { Document, ImageRun, Packer, Paragraph } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";

// A synthetic CV with every category AT-01 names: a photo, a date of birth, a health
// line and an ethnicity statement, plus a job title that must survive.
export const CV_LINES = [
  "Jane Citizen",
  "Date of Birth: 12 March 1985",
  "Gender: Female",
  "Nationality: New Zealander",
  "Health and Safety Coordinator, Fonterra, 2019 to 2024",
  "Cut lost-time injuries from 14 to 3 a year by redesigning site inductions.",
  "I have type 1 diabetes, which is well managed.",
  "As a proud Maori woman I bring cultural insight to every team.",
];

// 1x1 PNG standing in for a headshot.
const PNG = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
));

export async function cvPdf(withPhoto = true): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  if (withPhoto) page.drawImage(await doc.embedPng(PNG), { x: 480, y: 720, width: 80, height: 100 });
  CV_LINES.forEach((line, i) => page.drawText(line, { x: 40, y: 800 - i * 20, size: 11, font }));
  return doc.save();
}

export async function cvDocx(withPhoto = true): Promise<Uint8Array> {
  const children = [
    ...(withPhoto ? [new Paragraph({ children: [new ImageRun({ type: "png", data: PNG, transformation: { width: 80, height: 100 } })] })] : []),
    ...CV_LINES.map((text) => new Paragraph(text)),
  ];
  const doc = new Document({ sections: [{ children }] });
  return new Uint8Array(await Packer.toBuffer(doc));
}
