import { useMemo, useState } from 'react'
import { api, type DocumentItem } from '../lib/api'

type Props = {
  onUploaded: (doc: DocumentItem) => void
}

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const MAX_BYTES = 10 * 1024 * 1024

export function UploadDocumentWidget({ onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [taxpayerTin, setTaxpayerTin] = useState('')
  const [docType, setDocType] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const fileSummary = useMemo(() => {
    if (!file) return null
    const kb = Math.round(file.size / 1024)
    return `${file.name} • ${kb} KB`
  }, [file])

  async function handleUpload() {
    setError(null)
    if (!file) {
      setError('Please select a file')
      return
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only PDF, PNG, JPEG are supported')
      return
    }

    if (file.size > MAX_BYTES) {
      setError('File too large (max 10MB)')
      return
    }

    // Ensure we always send the field names backend expects
    // backend expects multipart fields:
    // - file (the binary)
    // - title (string)
    // - taxpayerTin (optional)
    // - type (optional)
    const form = new FormData()
    form.append('file', file)
    form.append('title', file.name)
    if (taxpayerTin.trim()) form.append('taxpayerTin', taxpayerTin.trim())
    if (docType.trim()) form.append('type', docType.trim())

    try {
      setUploading(true)
      setProgress(0)

      const res = await api.uploadDocumentWithProgress(form, (pct) => setProgress(pct))
      onUploaded(res.document)

      setFile(null)
      setTaxpayerTin('')
      setDocType('')
      setProgress(null)
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
      setProgress(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-lg font-semibold">Upload document</div>
      <div className="mt-2 text-sm text-gray-600">
        Upload PDF or image (max 10MB). Optionally attach taxpayer TIN and document type.
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
          <input
            className="w-full text-sm"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {fileSummary && <div className="text-xs text-gray-500 mt-2">{fileSummary}</div>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Taxpayer TIN (optional)</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={taxpayerTin}
            onChange={(e) => setTaxpayerTin(e.target.value)}
            placeholder="e.g. 100000001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type (optional)</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            placeholder="e.g. VAT"
          />
        </div>

        {progress !== null && (
          <div>
            <div className="w-full bg-gray-100 rounded h-2 overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs text-gray-700 mt-2">{progress}%</div>
          </div>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            className="px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
            onClick={() => {
              if (uploading) return
              setFile(null)
              setTaxpayerTin('')
              setDocType('')
              setProgress(null)
              setError(null)
            }}
            disabled={uploading}
          >
            Clear
          </button>
          <button
            className="px-4 py-2 rounded bg-gradient-to-r from-teal-500 to-teal-600 text-white font-medium disabled:opacity-60"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}

