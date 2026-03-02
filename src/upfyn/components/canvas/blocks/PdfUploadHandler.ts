// PDF text extraction and thumbnail generation using pdfjs-dist (lazy-loaded)

export type PdfExtractResult = {
  text: string;
  pageCount: number;
  thumbnail: string | null; // data URL of first page preview
};

export async function extractPdfText(file: File): Promise<PdfExtractResult> {
  try {
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source to bundled worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url,
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;

    // Extract text from up to first 10 pages to keep things fast
    const textParts: string[] = [];
    const maxPages = Math.min(pageCount, 10);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      textParts.push(pageText);
    }

    // Generate thumbnail of the first page
    let thumbnail: string | null = null;
    try {
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 0.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await firstPage.render({ canvasContext: ctx, viewport } as any).promise;
        thumbnail = canvas.toDataURL('image/png', 0.6);
      }
    } catch {
      // Thumbnail generation is optional — continue without it
    }

    return { text: textParts.join('\n\n'), pageCount, thumbnail };
  } catch (err) {
    return { text: '', pageCount: 0, thumbnail: null };
  }
}
