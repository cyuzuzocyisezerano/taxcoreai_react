import { analyzeDocument } from './documentAnalysis.js'
import { loadDb, saveDb } from '../data/store.js'
import { createNotification } from '../routes/notifications.routes.js'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

let queueError = null
let QueueCtor = null

try {
  const bullModule = await import('bull')
  QueueCtor = bullModule.default
} catch (err) {
  queueError = err
  console.warn('Bull queue unavailable, using synchronous analysis fallback:', err.message)
}

function createQueue() {
  if (!QueueCtor) return null

  try {
    const queue = new QueueCtor('document analysis', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 3600,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      },
    })

    queue.on('error', (err) => {
  queueError = err

  console.error('========== QUEUE ERROR ==========')
  console.error(err)
  console.error('message:', err?.message)
  console.error('stack:', err?.stack)
  console.error('===============================')
})

    queue.process(async (job) => {
      const { documentId, filePath, fileName } = job.data

      try {
        await job.progress(10)
        const analysis = await analyzeDocument(filePath)
        await job.progress(90)

        return {
          documentId,
          fileName,
          analysis,
          completedAt: new Date().toISOString(),
        }
      } catch (error) {
        console.error(`Analysis job failed for document ${documentId}:`, error)
        throw error
      }
    })

    queue.on('completed', async (job, result) => {
      console.log(`Job ${job.id} completed for document ${result.documentId}`)

      try {
        const db = await loadDb()
        const doc = db.documents.find((d) => d.id === result.documentId)
        if (doc) {
          doc.analysis = result.analysis
          doc.analysisStatus = 'completed'
          doc.status = 'Analyzed'
          await saveDb(db)
          console.log(`Document ${result.documentId} updated with analysis results`)

          const supervisor = (db.users || []).find((user) => user.role === 'Supervisor')
          if (supervisor) {
            await createNotification({
              type: 'document_analysis_complete',
              title: 'Document ready for archive approval',
              message: `${doc.title || 'A document'} has finished analysis and is ready for supervisor approval before archival.`,
              userId: supervisor.id,
              category: 'document',
              priority: 'high',
              metadata: {
                documentId: doc.id,
                documentTitle: doc.title,
                taxpayerTin: doc.taxpayerTin || null,
              },
              actionUrl: `/documents/${doc.id}`,
            })
          }
        }
      } catch (err) {
        console.error(`Failed to update document ${result.documentId}:`, err)
      }
    })

    queue.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err.message)
    })

    queue.on('progress', (job, progress) => {
      console.log(`Job ${job.id} is ${progress}% complete`)
    })

    return queue
  } catch (err) {
    queueError = err
    console.warn('Falling back to synchronous document analysis because the queue could not be created:', err.message)
    return null
  }
}

// Disable Bull/Redis for local development
export const analysisQueue = null

export async function runAnalysisSynchronously({ documentId, filePath, fileName }) {
  const analysis = await analyzeDocument(filePath)
  const db = await loadDb()
  const doc = db.documents.find((d) => d.id === documentId)
  if (doc) {
    doc.analysis = analysis
    doc.analysisStatus = 'completed'
    doc.status = 'Analyzed'
    await saveDb(db)
  }
  return { documentId, fileName, analysis, completedAt: new Date().toISOString() }
}

export async function canUseQueue() {
  return false
}

export default analysisQueue