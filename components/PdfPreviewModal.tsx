'use client'

interface PdfPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string
  fileName: string
}

export default function PdfPreviewModal({ isOpen, onClose, pdfUrl, fileName }: PdfPreviewModalProps) {
  if (!isOpen) return null

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = fileName
    link.click()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{fileName}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다운로드
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
        
        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            title={fileName}
            sandbox="allow-same-origin allow-scripts allow-popups allow-downloads"
          />
        </div>
      </div>
    </div>
  )
}
