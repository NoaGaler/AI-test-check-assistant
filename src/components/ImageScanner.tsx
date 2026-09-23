import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Camera,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  FileText,
  RefreshCw,
  PenTool,
  Eraser,
  Trash2,
  CheckCircle2,
  FileCheck,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Play
} from 'lucide-react';
import { SAMPLE_EXAM_PAPERS, generateHandwrittenPaperImage } from '../utils/samplePapers';
import { SampleExamPaper } from '../types';
import { convertPdfToImageDataUrls, ConvertedPdfPage } from '../utils/pdfToImage';

interface UploadedFileInfo {
  name: string;
  sizeStr: string;
  mimeType: string;
  dataUrl: string;
}

interface ImageScannerProps {
  onGradeImage: (imageDataUrl: string, mimeType: string) => Promise<void>;
  isGrading: boolean;
  activeSampleId: string | null;
  onSelectSample: (sample: SampleExamPaper | null) => void;
  onSourceChange?: (type: 'uploaded' | 'sample' | 'camera' | 'drawn', name?: string) => void;
}

export const ImageScanner: React.FC<ImageScannerProps> = ({
  onGradeImage,
  isGrading,
  activeSampleId,
  onSelectSample,
  onSourceChange,
}) => {
  const [currentImageData, setCurrentImageData] = useState<string | null>(null);
  const [currentMimeType, setCurrentMimeType] = useState<string>('image/png');
  const [paperSource, setPaperSource] = useState<'sample' | 'uploaded' | 'camera' | 'drawn'>('sample');
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);

  // PDF-specific multi-page and conversion states
  const [pdfPages, setPdfPages] = useState<ConvertedPdfPage[]>([]);
  const [pdfCurrentPage, setPdfCurrentPage] = useState<number>(1);
  const [isPdfConverting, setIsPdfConverting] = useState<boolean>(false);
  const [pdfConversionError, setPdfConversionError] = useState<string | null>(null);
  const [isPdfSource, setIsPdfSource] = useState<boolean>(false);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [activeTab, setActiveTab] = useState<'upload' | 'samples' | 'camera' | 'draw'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Drawing canvas state
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawTool, setDrawTool] = useState<'pen' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState('#1e3a8a');

  // Camera video ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // On first mount, also prepare the default sample in the background for quick demo if clicked
  const sampleCache = useRef<Record<string, string>>({});

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Handle sample selection
  const handleSelectSample = async (sample: SampleExamPaper) => {
    onSelectSample(sample);
    setPaperSource('sample');
    setIsPdfSource(false);
    setPdfPages([]);
    setPdfCurrentPage(1);
    setPdfConversionError(null);
    onSourceChange?.('sample', sample.student_name);

    if (sampleCache.current[sample.id]) {
      setCurrentImageData(sampleCache.current[sample.id]);
    } else {
      const dataUrl = await generateHandwrittenPaperImage(sample);
      sampleCache.current[sample.id] = dataUrl;
      setCurrentImageData(dataUrl);
    }
    setCurrentMimeType('image/png');
    setZoom(1);
    setRotation(0);
  };

  // Handle page switching in multi-page PDFs
  const handleSelectPdfPage = (pageNum: number) => {
    if (pageNum < 1 || pageNum > pdfPages.length) return;
    const targetPage = pdfPages[pageNum - 1];
    if (targetPage) {
      setPdfCurrentPage(pageNum);
      setCurrentImageData(targetPage.dataUrl);
      setCurrentMimeType('image/png');
    }
  };

  // Handle real file selection (PDF / JPG / PNG / WebP)
  const handleFileUpload = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name);

    if (!isImage && !isPdf) {
      alert('Please select a valid image file (PNG, JPG, WebP) or PDF document (.pdf).');
      return;
    }

    const sizeStr = formatFileSize(file.size);

    if (isPdf) {
      setIsPdfConverting(true);
      setPdfConversionError(null);
      setActiveTab('upload');
      setPaperSource('uploaded');
      setIsPdfSource(true);
      onSelectSample(null);
      onSourceChange?.('uploaded', file.name);

      try {
        // Convert PDF pages to high-resolution image data URLs via pdfjs-dist
        const converted = await convertPdfToImageDataUrls(file, 5, 2.0);
        setPdfPages(converted.pages);
        setPdfCurrentPage(1);
        setCurrentImageData(converted.firstPageDataUrl);
        setCurrentMimeType('image/png'); // Converted to crisp image data URL for native canvas rendering

        const fileInfo: UploadedFileInfo = {
          name: file.name,
          sizeStr: `${sizeStr} · ${converted.numPages} Page${converted.numPages > 1 ? 's' : ''}`,
          mimeType: 'application/pdf',
          dataUrl: converted.firstPageDataUrl,
        };

        setUploadedFile(fileInfo);
        setZoom(1);
        setRotation(0);
        setBrightness(100);
        setContrast(100);
      } catch (err: any) {
        console.error('Error rendering PDF with pdfjs-dist:', err);
        setPdfConversionError(
          err?.message || 'Failed to render PDF preview canvas. Please ensure the PDF is valid.'
        );
      } finally {
        setIsPdfConverting(false);
      }
      return;
    }

    // Standard image files (PNG, JPG, WebP)
    setIsPdfSource(false);
    setPdfPages([]);
    setPdfCurrentPage(1);
    setPdfConversionError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const mime = file.type || (file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

      const fileInfo: UploadedFileInfo = {
        name: file.name,
        sizeStr,
        mimeType: mime,
        dataUrl: result,
      };

      setUploadedFile(fileInfo);
      setCurrentImageData(result);
      setCurrentMimeType(mime);
      setPaperSource('uploaded');
      setActiveTab('upload');
      onSelectSample(null);
      onSourceChange?.('uploaded', file.name);

      // Reset viewer controls
      setZoom(1);
      setRotation(0);
      setBrightness(100);
      setContrast(100);
    };

    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Trigger system file browser
  const triggerFileBrowser = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Camera handling
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please check browser permissions.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const fileInfo: UploadedFileInfo = {
        name: `camera_snapshot_${Date.now()}.jpg`,
        sizeStr: 'Camera Photo',
        mimeType: 'image/jpeg',
        dataUrl,
      };
      setUploadedFile(fileInfo);
      setCurrentImageData(dataUrl);
      setCurrentMimeType('image/jpeg');
      setPaperSource('camera');
      onSelectSample(null);
      onSourceChange?.('camera', 'Camera Photo');
      stopCamera();
      setActiveTab('upload');
    }
  };

  // Drawing Canvas setup
  const initDrawingCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw notebook paper base
    ctx.fillStyle = '#faf8f2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Soft blue horizontal lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#c4daf1';
    for (let y = 60; y < canvas.height - 20; y += 32) {
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.lineTo(canvas.width - 15, y);
      ctx.stroke();
    }

    // Left red margin
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#e8a5a5';
    ctx.beginPath();
    ctx.moveTo(110, 0);
    ctx.lineTo(110, canvas.height);
    ctx.stroke();

    // Guided text
    ctx.fillStyle = '#64748b';
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText('Line 1: Student Name:', 125, 42);
    ctx.fillText('Line 2: Student Email:', 125, 74);
    ctx.fillText('Line 3+: Handwritten Python solution (isValid with stack):', 125, 106);
  }, []);

  useEffect(() => {
    if (activeTab === 'draw') {
      setTimeout(initDrawingCanvas, 50);
    }
  }, [activeTab, initDrawingCanvas]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (drawTool === 'eraser') {
      ctx.save();
      ctx.fillStyle = '#faf8f2';
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = penColor;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const saveDrawnPaper = () => {
    if (!drawingCanvasRef.current) return;
    const dataUrl = drawingCanvasRef.current.toDataURL('image/png');
    const fileInfo: UploadedFileInfo = {
      name: `scribble_paper_${Date.now()}.png`,
      sizeStr: 'Hand-drawn Paper',
      mimeType: 'image/png',
      dataUrl,
    };
    setUploadedFile(fileInfo);
    setCurrentImageData(dataUrl);
    setCurrentMimeType('image/png');
    setPaperSource('drawn');
    onSelectSample(null);
    onSourceChange?.('drawn', 'Scribbled Paper');
    setActiveTab('upload');
  };

  // Submit image to parent handler
  const handleTriggerGrade = () => {
    if (!currentImageData) {
      triggerFileBrowser();
      return;
    }
    onGradeImage(currentImageData, currentMimeType);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full shadow-xs">
      {/* Hidden File Input for Native OS Dialog */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
        accept="application/pdf, image/*"
        className="hidden"
      />

      {/* Top Source Switcher Tabs & Quick Upload Button */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-2.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Direct File Picker Trigger Button */}
          <button
            onClick={triggerFileBrowser}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-xs transition-colors"
            title="Upload a PDF document or image from your computer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Scan (PDF / Image)</span>
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

          {/* Source Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
            <button
              onClick={() => {
                stopCamera();
                setActiveTab('upload');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'upload'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Current Scan</span>
              {uploadedFile && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              onClick={() => {
                stopCamera();
                setActiveTab('samples');
                // If switching to samples and no sample selected yet, select sample 0
                if (!activeSampleId && SAMPLE_EXAM_PAPERS.length > 0) {
                  handleSelectSample(SAMPLE_EXAM_PAPERS[0]);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'samples'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Mock Samples (4)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('camera');
                startCamera();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'camera'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>

            <button
              onClick={() => {
                stopCamera();
                setActiveTab('draw');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'draw'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Scribble</span>
            </button>
          </div>
        </div>

        {/* View adjustments toolbar (Zoom / Rotate) */}
        {activeTab !== 'camera' && activeTab !== 'draw' && currentImageData && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((prev) => Math.max(0.6, prev - 0.15))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-md transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-slate-500 font-mono w-9 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((prev) => Math.min(2.0, prev + 0.15))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-md transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-md transition-colors"
              title="Rotate Paper 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setBrightness(100);
                setContrast(100);
              }}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-md transition-colors"
              title="Reset View"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Samples Selector Sub-Bar (only shown if user clicks Samples tab) */}
      {activeTab === 'samples' && (
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Benchmark Mock Samples (For Testing Grading Tiers)
            </span>
            <button
              onClick={triggerFileBrowser}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              <span>Or Upload Real Image File</span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SAMPLE_EXAM_PAPERS.map((sample) => {
              const isSelected = activeSampleId === sample.id;
              const tierBadge =
                sample.tier === 'perfect'
                  ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                  : sample.tier === 'minor'
                  ? 'border-amber-300 text-amber-800 bg-amber-50'
                  : 'border-rose-300 text-rose-800 bg-rose-50';

              return (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className={`text-left p-2 rounded-lg border transition-all text-xs flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-900 truncate">
                    {sample.student_name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {sample.expected_score_range}
                  </div>
                  <div
                    className={`mt-1.5 text-[10px] px-1.5 py-0.5 rounded border inline-block w-fit ${tierBadge}`}
                  >
                    {sample.tier === 'perfect'
                      ? '100% Stack'
                      : sample.tier === 'minor'
                      ? 'Minor Flaw'
                      : 'Fatal Error'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Scanner Canvas / Viewport */}
      <div className="relative flex-1 bg-slate-100/70 overflow-auto flex flex-col items-center justify-center min-h-[420px] p-4">
        {/* TAB: Camera Snapshot Mode */}
        {activeTab === 'camera' && (
          <div className="flex flex-col items-center justify-center w-full max-w-md bg-black rounded-lg overflow-hidden shadow-lg p-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full aspect-[4/3] object-cover rounded bg-black"
            />
            <div className="flex items-center gap-3 mt-3 pb-1">
              <button
                onClick={capturePhoto}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium flex items-center gap-2 shadow-xs transition-colors"
              >
                <Camera className="w-4 h-4" />
                Capture Exam Paper
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  setActiveTab('upload');
                }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* TAB: Interactive Handwritten Scribble Canvas */}
        {activeTab === 'draw' && (
          <div className="flex flex-col items-center w-full max-w-xl">
            <div className="bg-white border border-slate-200 rounded-lg p-2 mb-2 w-full flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDrawTool('pen')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs ${
                    drawTool === 'pen'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" /> Pen
                </button>
                <button
                  onClick={() => setDrawTool('eraser')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs ${
                    drawTool === 'eraser'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" /> Eraser
                </button>
                <button
                  onClick={initDrawingCanvas}
                  className="flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-900 text-xs"
                  title="Clear Paper"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              </div>

              <button
                onClick={saveDrawnPaper}
                className="px-3 py-1 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 text-xs shadow-xs"
              >
                Use Scribbled Paper
              </button>
            </div>

            <canvas
              ref={drawingCanvasRef}
              width={800}
              height={950}
              onMouseDown={startDraw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onMouseMove={draw}
              className="w-full max-h-[500px] border border-slate-300 shadow-md rounded cursor-crosshair object-contain bg-[#faf8f2]"
            />
          </div>
        )}

        {/* TAB: Upload Scan - When NO image is loaded yet in upload tab */}
        {activeTab === 'upload' && !currentImageData && !isPdfConverting && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 max-w-lg w-full text-center transition-all bg-white shadow-xs ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/40 ring-4 ring-indigo-100 scale-[1.01]'
                : 'border-slate-300 hover:border-indigo-400'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-xs">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-base font-semibold text-slate-900">
              Upload Exam Paper (PDF or Image)
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              Upload a real PDF document or image scan (PNG, JPG, WebP) from your computer. PDF pages are converted via pdfjs-dist for crisp interactive preview and direct Gemini OCR grading.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={triggerFileBrowser}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Select PDF or Image from Computer</span>
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-400">
              <span>Supports PDF, JPG, PNG, WebP</span>
              <span>·</span>
              <span>Page 1 Auto-Rendered</span>
              <span>·</span>
              <span>Direct Gemini Vision API</span>
            </div>
          </div>
        )}

        {/* Loading state during PDF conversion */}
        {isPdfConverting && (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm max-w-md w-full text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 animate-pulse">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Converting PDF Pages</h4>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
              Rendering Page 1 into a high-resolution preview canvas via pdfjs-dist for interactive inspection and grading...
            </p>
          </div>
        )}

        {/* Error state if PDF conversion failed */}
        {pdfConversionError && (
          <div className="flex flex-col items-center justify-center p-8 bg-rose-50 rounded-xl border border-rose-200 max-w-md w-full text-center shadow-xs">
            <AlertCircle className="w-8 h-8 text-rose-600 mb-2" />
            <h4 className="text-sm font-semibold text-rose-900">PDF Preview Error</h4>
            <p className="text-xs text-rose-700 mt-1 max-w-xs">{pdfConversionError}</p>
            <button
              onClick={triggerFileBrowser}
              className="mt-4 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-medium shadow-xs transition-colors"
            >
              Select Another File
            </button>
          </div>
        )}

        {/* Document / Image Preview Area (When a file is loaded, either uploaded, sample, camera, or draw) */}
        {activeTab !== 'camera' && activeTab !== 'draw' && currentImageData && !isPdfConverting && (
          <div className="flex flex-col items-center w-full">
            {/* Uploaded File Info Banner with Grade Exam button */}
            {paperSource === 'uploaded' && uploadedFile && (
              <div className="mb-3 w-full max-w-2xl bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                    isPdfSource
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}>
                    {isPdfSource ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <FileCheck className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1.5">
                      <span className="truncate">{uploadedFile.name}</span>
                      {isPdfSource && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-mono text-[9px] font-bold">
                          PDF Page {pdfCurrentPage}/{pdfPages.length || 1}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span>{uploadedFile.sizeStr}</span>
                      <span>·</span>
                      <span className={`font-medium ${
                        isPdfSource ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        {isPdfSource
                          ? 'PDF Canvas Ready (Rendered via pdfjs-dist)'
                          : 'Image Scan Ready'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={triggerFileBrowser}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    Change File
                  </button>
                  {/* Grade Exam Trigger Button in Upload Banner */}
                  <button
                    type="button"
                    onClick={handleTriggerGrade}
                    disabled={isGrading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-md shadow-xs transition-colors"
                  >
                    {isGrading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Grading...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Grade Exam</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* PDF Preview Top Toolbar (shows page count and quick page switcher) */}
            {isPdfSource && pdfPages.length > 0 && (
              <div className="w-full max-w-2xl mb-2 flex items-center justify-between bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span className="font-semibold text-slate-800">PDF Preview</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600 font-medium">Page {pdfCurrentPage} of {pdfPages.length}</span>
                  {pdfPages.length > 1 && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleSelectPdfPage(pdfCurrentPage - 1)}
                        disabled={pdfCurrentPage <= 1}
                        className="p-1 border border-slate-200 hover:bg-slate-100 rounded disabled:opacity-40 disabled:hover:bg-transparent"
                        title="Previous Page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-700" />
                      </button>
                      <button
                        onClick={() => handleSelectPdfPage(pdfCurrentPage + 1)}
                        disabled={pdfCurrentPage >= pdfPages.length}
                        className="p-1 border border-slate-200 hover:bg-slate-100 rounded disabled:opacity-40 disabled:hover:bg-transparent"
                        title="Next Page"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTriggerGrade}
                    disabled={isGrading}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded text-xs font-semibold shadow-xs transition-colors"
                    title="Grade this PDF exam submission"
                  >
                    {isGrading ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Grading...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Grade Exam</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* High-Resolution Interactive Canvas Display (Displays both converted PDF pages and image scans) */}
            <div
              className="transition-transform duration-150 ease-out origin-center select-none"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                filter: `brightness(${brightness}%) contrast(${contrast}%)`,
              }}
            >
              <img
                src={currentImageData}
                alt="Exam Paper Script"
                className="max-h-[580px] max-w-full rounded-lg shadow-md border border-slate-300 object-contain bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {paperSource === 'uploaded' && uploadedFile ? (
            <span className={`font-medium flex items-center gap-1.5 ${
              isPdfSource ? 'text-rose-700' : 'text-emerald-700'
            }`}>
              {isPdfSource ? (
                <FileText className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>
                {isPdfSource
                  ? `PDF converted & ready: ${uploadedFile.name} (Page ${pdfCurrentPage}/${pdfPages.length || 1})`
                  : `Real image ready: ${uploadedFile.name} (${uploadedFile.sizeStr})`}
              </span>
            </span>
          ) : paperSource === 'sample' && activeSampleId ? (
            <span className="text-slate-600">
              Benchmark Mock Sample selected · Switch to &quot;Upload Scan&quot; for real PDF / image files.
            </span>
          ) : (
            <span>OCR extracts Line 1 (Name), Line 2 (Email), and Python bracket logic.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!currentImageData ? (
            <button
              onClick={triggerFileBrowser}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Choose PDF / Image to Grade</span>
            </button>
          ) : (
            <button
              onClick={handleTriggerGrade}
              disabled={isGrading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all ${
                isGrading
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] shadow-indigo-200'
              }`}
              title="Run grading on the uploaded file"
            >
              {isGrading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Grading Exam...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Grade Exam</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
