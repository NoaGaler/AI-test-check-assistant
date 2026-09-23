import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface ConvertedPdfPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export interface ConvertedPdfResult {
  numPages: number;
  pages: ConvertedPdfPage[];
  firstPageDataUrl: string;
}

/**
 * Converts a PDF (given as File, Blob, ArrayBuffer, or base64 DataURL)
 * into high-resolution image data URLs using pdfjs-dist.
 */
export async function convertPdfToImageDataUrls(
  pdfSource: File | Blob | ArrayBuffer | string,
  maxPages: number = 5,
  scale: number = 2.0 // 2x scale for clear OCR and crisp rendering of handwritten text
): Promise<ConvertedPdfResult> {
  let arrayBuffer: ArrayBuffer;

  if (typeof pdfSource === 'string') {
    // If it's a data URL or base64 string
    const base64Data = pdfSource.includes(';base64,')
      ? pdfSource.split(';base64,')[1]
      : pdfSource.replace(/^data:[^;]+;base64,/, '');

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    arrayBuffer = bytes.buffer;
  } else if (pdfSource instanceof Blob || pdfSource instanceof File) {
    arrayBuffer = await pdfSource.arrayBuffer();
  } else {
    arrayBuffer = pdfSource;
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://unpkg.com/pdfjs-dist@' + pdfjsLib.version + '/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pagesToConvert = Math.min(numPages, maxPages);
  const pages: ConvertedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= pagesToConvert; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      continue;
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Fill background with clean white for scanned exam legibility
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    };

    await page.render(renderContext).promise;

    const dataUrl = canvas.toDataURL('image/png', 0.95);
    pages.push({
      pageNumber: pageNum,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
    });
  }

  if (pages.length === 0) {
    throw new Error('No pages could be extracted from the PDF.');
  }

  return {
    numPages,
    pages,
    firstPageDataUrl: pages[0].dataUrl,
  };
}
