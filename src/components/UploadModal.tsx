import { useState, useRef } from 'react'
import { api, type DocumentItem } from '../lib/api'

interface Props {
  visible: boolean
  onClose: () => void
  onUploaded: (doc: DocumentItem) => void
}

export function UploadModal({ visible, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [tin, setTin] = useState('')
  const [docType, setDocType] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const uploadingRef = useRef(false)

  if (!visible) return null

  async function handleUpload() {
    if (!file) return setError('Please select a file')
    setError(null)
    // client validation
    const allowed = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowed.includes(file.type)) return setError('Only PDF, PNG, JPEG are supported')
    if (file.size > 10 * 1024 * 1024) return setError('File too large (max 10MB)')

    const form = new FormData()
    form.append('file', file)
    form.append('title', file.name)
    if (tin) form.append('taxpayerTin', tin)
    if (docType) form.append('type', docType)

    try {
      uploadingRef.current = true
      setProgress(0)
      const res = await api.uploadDocumentWithProgress(form, (pct) => setProgress(pct))
      onUploaded(res.document)
      setFile(null)
      setTin('')
      setDocType('')
      setProgress(null)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
      setProgress(null)
    } finally {
      uploadingRef.current = false
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">Upload Document</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="p-4">
          <label className="block mb-3">
            <div className="text-sm font-medium text-gray-700 mb-2">File</div>
            <input className="w-full text-sm" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && <div className="text-xs text-gray-500 mt-2">{file.name} • {(file.size / 1024 | 0)} KB</div>}
          </label>

          <label className="block mb-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Taxpayer TIN (optional)</div>
            <input className="w-full border rounded px-3 py-2 text-sm" value={tin} onChange={(e) => setTin(e.target.value)} placeholder="e.g. 100000001" />
          </label>

          <label className="block mb-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Document Type (optional)</div>
            <input className="w-full border rounded px-3 py-2 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)} placeholder="e.g. VAT" />
          </label>

          {progress !== null && (
            <div className="mt-3">
              <div className="w-full bg-gray-100 rounded h-2 overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-xs text-gray-700 mt-2">{progress}%</div>
            </div>
          )}

          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        </div>

        <footer className="px-4 py-3 border-t flex justify-end gap-2">
          <button className="px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={onClose} disabled={uploadingRef.current}>Cancel</button>
          <button className="px-4 py-2 rounded bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium" onClick={handleUpload} disabled={uploadingRef.current}>Upload</button>
        </footer>
      </div>
    </div>
  )
}

export default UploadModal
