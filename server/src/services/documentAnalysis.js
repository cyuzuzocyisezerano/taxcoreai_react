import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import modelAdapter from './modelAdapter.js'

const PDF_PARSE_TIMEOUT_MS = Number(process.env.PDF_PARSE_TIMEOUT_MS || 8000)
const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS || 15000)
const ANALYSIS_TIMEOUT_MS = Number(process.env.ANALYSIS_TIMEOUT_MS || 25000)
const MIN_TEXT_LENGTH = 50

function withTimeout(promiseFactory, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error(`[analysis] ${label} timed out after ${timeoutMs}ms`)
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    Promise.resolve()
      .then(promiseFactory)
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

// Extract selectable text from PDF
async function extractSelectableTextFromPdf(filePath) {
  console.log(`[analysis] extracting selectable text from PDF`)
  try {
    const data = fs.readFileSync(filePath)
    const res = await withTimeout(() => pdfParse(data), PDF_PARSE_TIMEOUT_MS, 'pdf-parse')
    const text = (res?.text || '').trim()
    console.log(`[analysis] PDF selectable text length=${text.length}`)
    return text
  } catch (err) {
    console.error('[analysis] extractSelectableTextFromPdf failed', err?.message || err)
    return ''
  }
}

// Use OCR on PDF pages converted to images
async function extractTextFromPdfViaOcr(filePath) {
  console.log(`[analysis] extracting text from PDF via OCR`)
  try {
    // Try to use pdf2image if available, otherwise skip
    // For now, we'll just return empty and rely on direct PDF extraction or fallback
    console.log('[analysis] PDF OCR via pdf2image not yet implemented')
    return ''
  } catch (err) {
    console.error('[analysis] extractTextFromPdfViaOcr failed', err?.message || err)
    return ''
  }
}

// OCR from image file
async function extractTextFromImage(filePath) {
  console.log(`[analysis] extracting text from image via OCR ${filePath}`)
  try {
    const { createWorker } = await withTimeout(async () => import('tesseract.js'), OCR_TIMEOUT_MS, 'tesseract import')
    const worker = createWorker()
    await withTimeout(() => worker.load(), OCR_TIMEOUT_MS, 'tesseract load')
    await withTimeout(() => worker.loadLanguage('eng'), OCR_TIMEOUT_MS, 'tesseract loadLanguage')
    await withTimeout(() => worker.initialize('eng'), OCR_TIMEOUT_MS, 'tesseract initialize')
    const result = await withTimeout(() => worker.recognize(filePath), OCR_TIMEOUT_MS, 'tesseract recognize')
    await withTimeout(() => worker.terminate(), OCR_TIMEOUT_MS, 'tesseract terminate')
    const text = (result?.data?.text || '').trim()
    console.log(`[analysis] OCR completed; textLength=${text.length}`)
    return text
  } catch (err) {
    console.error('[analysis] extractTextFromImage failed', err?.message || err)
    return ''
  }
}

// Read plain text file
function extractTextFromPlainText(filePath) {
  console.log(`[analysis] reading plain text file`)
  try {
    const text = fs.readFileSync(filePath, 'utf-8').trim()
    console.log(`[analysis] text file read; length=${text.length}`)
    return text
  } catch (err) {
    console.error('[analysis] extractTextFromPlainText failed', err?.message || err)
    return ''
  }
}

// Main document text extraction with intelligent fallback
export async function extractText(filePath) {
  console.log(`[analysis] extractText.start ${filePath}`)
  const ext = path.extname(filePath || '').toLowerCase()

  let text = ''

  try {
    if (ext === '.pdf') {
      // Try selectable text first
      text = await extractSelectableTextFromPdf(filePath)
      
      // If extracted text is too short, assume it's a scanned PDF and try OCR
      if (text.length < MIN_TEXT_LENGTH) {
        console.log('[analysis] PDF has minimal selectable text; attempting OCR fallback')
        const ocrText = await extractTextFromPdfViaOcr(filePath)
        if (ocrText.length > text.length) {
          text = ocrText
        }
      }
    } else if (['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp'].includes(ext)) {
      text = await extractTextFromImage(filePath)
    } else if (['.txt', '.md'].includes(ext)) {
      text = extractTextFromPlainText(filePath)
    }

    console.log(`[analysis] extractText.complete length=${text.length}`)
    return text
  } catch (err) {
    console.error('[analysis] extractText failed', err?.message || err)
    return ''
  }
}

// Primary analyze function: extract text, call model, return full analysis
export async function analyzeDocument(filePath) {
  console.log(`[analysis] analyzeDocument.start ${filePath}`)
  let text = ''
  let analysis = {}

  try {
    // Extract text
    text = await extractText(filePath)
    console.log(`[analysis] text extracted; length=${text.length}`)

    // Call model adapter for full analysis (including Claude)
    analysis = await withTimeout(
      () => modelAdapter.analyzeText(text || ''),
      ANALYSIS_TIMEOUT_MS,
      'modelAdapter.analyzeText',
    )
    console.log(`[analysis] model analysis complete`)

    return {
      text: text || null,
      summary: analysis?.summary || null,
      documentType: analysis?.doc_type || null,
      classification: analysis?.classification || { type: 'Unknown', confidence: 0 },
      keyFields: analysis?.key_fields || {},
      complianceFlags: analysis?.compliance_flags || [],
      riskLevel: analysis?.risk_level || 'unknown',
      recommendations: analysis?.recommended_actions || [],
      analyzedAt: new Date().toISOString(),
      model: analysis?.model || 'heuristic',
    }
  } catch (err) {
    console.error('[analysis] analyzeDocument failed', err?.message || err)
    return {
      text: text || null,
      summary: null,
      documentType: null,
      classification: { type: 'Unknown', confidence: 0 },
      keyFields: {},
      complianceFlags: [],
      riskLevel: 'unknown',
      recommendations: [],
      analyzedAt: new Date().toISOString(),
      model: 'heuristic',
      error: err?.message || 'Analysis failed',
    }
  }
}

export default { analyzeDocument, extractText }
