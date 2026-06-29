import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''
const MODEL_TIMEOUT_MS = Number(process.env.MODEL_TIMEOUT_MS || 10000)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const taxcoreAiScript = path.join(__dirname, '..', '..', 'python', 'taxcore_ai.py')
const defaultPythonScript = path.join(__dirname, '..', '..', 'models', 'predict.py')

function withTimeout(promiseFactory, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error(`[modelAdapter] ${label} timed out after ${timeoutMs}ms`)
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

function heuristicClassify(text) {
  if (!text || !text.length) return { type: 'Unknown', confidence: 0.0 }
  const t = text.toLowerCase()
  if (t.includes('vat') || t.includes('value added')) return { type: 'VAT Return', confidence: 0.92 }
  if (t.includes('income tax') || t.includes('payroll')) return { type: 'Income Tax', confidence: 0.8 }
  if (t.includes('invoice')) return { type: 'Invoice', confidence: 0.88 }
  return { type: 'Other', confidence: 0.5 }
}

// Call taxcore_ai.py for full analysis via Claude
function callTaxCoreAi(text) {
  return new Promise((resolve) => {
    if (!CLAUDE_API_KEY) {
      console.warn('[modelAdapter] CLAUDE_API_KEY not set; skipping taxcore_ai')
      return resolve(null)
    }

    if (!fs.existsSync(taxcoreAiScript)) {
      console.warn('[modelAdapter] taxcore_ai.py not found')
      return resolve(null)
    }

    console.log('[modelAdapter] launching taxcore_ai.py analyze-doc')

    // Create a temp file with the text (use system temp dir for cross-platform compatibility)
    const tmpBaseDir = process.env.TEMP || process.env.TMP || '/tmp'
    const tmpDir = path.join(tmpBaseDir, `taxcoreai-${Date.now()}`)
    const tmpFile = path.join(tmpDir, 'text.txt')

    try {
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
      fs.writeFileSync(tmpFile, text)
    } catch (err) {
      console.error('[modelAdapter] failed to create temp file', err?.message || err)
      return resolve(null)
    }

    const child = spawn('python', [taxcoreAiScript, 'analyze-doc', '--file', tmpFile], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CLAUDE_API_KEY },
    })
    let out = ''
    let err = ''
    let settled = false

    const finish = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      } catch (cleanErr) {
        console.warn('[modelAdapter] failed to clean temp dir', cleanErr?.message || cleanErr)
      }
      resolve(value)
    }

    const timer = setTimeout(() => {
      console.error(`[modelAdapter] taxcore_ai timed out after ${MODEL_TIMEOUT_MS}ms`)
      try {
        child.kill('SIGTERM')
      } catch (killErr) {
        console.warn('[modelAdapter] failed to kill taxcore_ai', killErr?.message || killErr)
      }
      finish(null)
    }, MODEL_TIMEOUT_MS)

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (d) => {
      out += d.toString()
    })
    child.stderr.on('data', (d) => {
      err += d.toString()
      console.warn('[modelAdapter] taxcore_ai stderr:', d.toString())
    })
    child.on('error', (error) => {
      console.error('[modelAdapter] taxcore_ai spawn error', error?.message || error)
      finish(null)
    })
    child.on('close', (code, signal) => {
      console.log(`[modelAdapter] taxcore_ai closed code=${code} signal=${signal}`)
      if (code !== 0) {
        console.error('[modelAdapter] taxcore_ai exited non-zero', err)
        finish(null)
        return
      }
      try {
        const parsed = JSON.parse(out || '{}')
        console.log('[modelAdapter] taxcore_ai returned', { has_summary: !!parsed.summary, has_doc_type: !!parsed.doc_type, has_error: !!parsed.error })
        if (parsed.error) {
          console.warn('[modelAdapter] taxcore_ai error:', parsed.error)
          finish(null)
        } else {
          finish(parsed)
        }
      } catch (e) {
        console.error('[modelAdapter] failed to parse taxcore_ai output', e?.message || e, out.substring(0, 200))
        finish(null)
      }
    })
  })
}

// Call fallback predict.py for trained ML classification
function callPredictPy(text) {
  return new Promise((resolve) => {
    const scriptPath = defaultPythonScript
    const scriptExists = scriptPath ? fs.existsSync(scriptPath) : false
    if (!scriptExists) {
      console.log('[modelAdapter] predict.py not available')
      return resolve(null)
    }

    console.log('[modelAdapter] launching predict.py')

    const child = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    let settled = false

    const finish = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }

    const timer = setTimeout(() => {
      console.warn(`[modelAdapter] predict.py timed out after ${MODEL_TIMEOUT_MS}ms`)
      try {
        child.kill('SIGTERM')
      } catch (killErr) {
        console.warn('[modelAdapter] failed to kill predict.py', killErr?.message || killErr)
      }
      finish(null)
    }, MODEL_TIMEOUT_MS)

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (d) => (out += d.toString()))
    child.stderr.on('data', (d) => (err += d.toString()))
    child.on('error', (error) => {
      console.warn('[modelAdapter] predict.py spawn error', error?.message || error)
      finish(null)
    })
    child.on('close', (code) => {
      if (code !== 0) {
        console.warn('[modelAdapter] predict.py exited non-zero', err)
        finish(null)
        return
      }
      try {
        const parsed = JSON.parse(out || '{}')
        console.log('[modelAdapter] predict.py returned', parsed)
        finish(parsed)
      } catch (e) {
        console.warn('[modelAdapter] failed to parse predict.py output', e?.message || e)
        finish(null)
      }
    })

    try {
      child.stdin.write(JSON.stringify({ text }))
      child.stdin.end()
    } catch (e) {
      console.warn('[modelAdapter] failed to write to predict.py stdin', e?.message || e)
      finish(null)
    }
  })
}

// Full analysis: Claude → predict.py → heuristic
export async function analyzeText(text) {
  console.log('[modelAdapter] analyzeText.start', { textLength: text?.length || 0 })

  try {
    // Try taxcore_ai (Claude) first
    const claudeResult = await withTimeout(() => callTaxCoreAi(text), MODEL_TIMEOUT_MS + 2000, 'taxcore_ai')
    if (claudeResult && !claudeResult.error) {
      console.log('[modelAdapter] analyzeText using Claude result')
      return {
        ...claudeResult,
        model: 'claude',
        classification: claudeResult.classification || heuristicClassify(text),
      }
    }

    // Fall back to predict.py (trained ML)
    const predictResult = await withTimeout(() => callPredictPy(text), MODEL_TIMEOUT_MS, 'predict.py')
    if (predictResult) {
      console.log('[modelAdapter] analyzeText using predict.py result')
      return {
        classification: predictResult,
        model: 'trained-ml',
        summary: null,
        doc_type: predictResult?.type || 'Unknown',
        key_fields: {},
        compliance_flags: [],
        risk_level: 'unknown',
        recommended_actions: [],
      }
    }

    // Fall back to heuristic
    const heuristic = heuristicClassify(text)
    console.log('[modelAdapter] analyzeText using heuristic fallback')
    return {
      classification: heuristic,
      model: 'heuristic',
      summary: null,
      doc_type: heuristic?.type || 'Unknown',
      key_fields: {},
      compliance_flags: [],
      risk_level: 'unknown',
      recommended_actions: [],
    }
  } catch (err) {
    console.error('[modelAdapter] analyzeText failed', err?.message || err)
    const heuristic = heuristicClassify(text)
    return {
      classification: heuristic,
      model: 'heuristic',
      summary: null,
      doc_type: heuristic?.type || 'Unknown',
      key_fields: {},
      compliance_flags: [],
      risk_level: 'unknown',
      recommended_actions: [],
    }
  }
}

// Legacy: simple text classification (kept for backward compatibility)
export async function classifyText(text) {
  console.log('[modelAdapter] classifyText (legacy) start')
  try {
    const result = await analyzeText(text)
    return result?.classification || heuristicClassify(text)
  } catch (err) {
    console.error('[modelAdapter] classifyText failed', err?.message || err)
    return heuristicClassify(text)
  }
}

export default { analyzeText, classifyText }
