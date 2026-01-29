import { useRef, useState, useCallback } from 'react';

interface FileAttachment {
  name: string;
  type: string;
  size: number;
  data: string;
}

interface FileUploadProps {
  onFilesSelected: (files: FileAttachment[]) => void;
  disabled?: boolean;
}

export function FileUpload({ onFilesSelected, disabled = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList) => {
    const files: FileAttachment[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Check file size (25MB limit)
      if (file.size > 25 * 1024 * 1024) {
        alert(`File "${file.name}" is too large (max 25MB)`);
        continue;
      }

      // Check file type
      const allowedTypes = [
        'image/',
        'application/pdf',
        'text/',
        'application/json',
        'application/javascript',
        'text/html',
        'text/markdown',
        'application/xml',
      ];

      const allowed = allowedTypes.some(t => file.type.startsWith(t));
      if (!allowed) {
        alert(`File type "${file.type}" is not supported`);
        continue;
      }

      // Convert to base64
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      files.push({
        name: file.name,
        type: file.type,
        size: file.size,
        data: dataUrl,
      });
    }

    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setUploading(true);
      await processFiles(files);
      setUploading(false);
    }
  }, [disabled, uploading, processFiles]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploading(true);
      await processFiles(files);
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [processFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && !uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, uploading]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,text/*,.json,.js,.ts,.tsx,.jsx,.html,.md,.xml"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />
      <button
        type="button"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled || uploading}
        className={`
          min-h-[44px] min-w-[44px] p-2 rounded-lg transition-all duration-200
          ${isDragging
            ? 'bg-primary-600 text-white scale-105'
            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
          }
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title="Attach files (images, PDFs, documents)"
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        )}
      </button>
    </>
  );
}
