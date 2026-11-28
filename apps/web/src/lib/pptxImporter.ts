/**
 * pptxImporter.ts — Client-Side .PPTX -> Editable Whiteboard Objects Importer (V8)
 *
 * Uses `jszip` + browser DOMParser to read `ppt/slides/slideN.xml` and extract
 * slide headings and text boxes directly into editable `BoardObject` events.
 */
import JSZip from 'jszip';

export interface ImportedSlideBlock {
  slideNumber: number;
  texts: string[];
}

export async function parsePptxFile(file: File | ArrayBuffer): Promise<ImportedSlideBlock[]> {
  const zip = await JSZip.loadAsync(file);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      return na - nb;
    });

  const parser = new DOMParser();
  const slides: ImportedSlideBlock[] = [];

  for (let i = 0; i < slideNames.length; i++) {
    const xmlStr = await zip.files[slideNames[i]].async('string');
    const doc = parser.parseFromString(xmlStr, 'application/xml');
    const textNodes = Array.from(doc.getElementsByTagName('a:t'));
    const texts = textNodes
      .map((n) => (n.textContent ?? '').trim())
      .filter((t) => t.length > 0);
    slides.push({ slideNumber: i + 1, texts });
  }

  return slides;
}
