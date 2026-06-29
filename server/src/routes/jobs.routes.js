import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { analysisQueue } from '../services/jobQueue.js'

const router = Router()

// Get job status by ID
router.get('/:jobId', authenticate, async (req, res, next) => {
  try {
    const { jobId } = req.params
    const job = await analysisQueue.getJob(jobId)

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    const state = await job.getState()
    const progress = job.progress()
    const result = state === 'completed' ? job.returnvalue : null
    const failedReason = state === 'failed' ? job.failedReason : null

    res.json({
      jobId: job.id,
      state,
      progress,
      result,
      failedReason,
      createdAt: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    })
  } catch (err) {
    next(err)
  }
})

// Get all jobs for a document
router.get('/document/:documentId', authenticate, async (req, res, next) => {
  try {
    const { documentId } = req.params
    
    // Search for jobs with this documentId in the data
    const jobs = await analysisQueue.getJobs(['waiting', 'active', 'completed', 'failed'], 0, 100)
    
    const documentJobs = jobs
      .filter(job => job.data.documentId === documentId)
      .map(job => ({
        jobId: job.id,
        state: job.getState(),
        progress: job.progress(),
        createdAt: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      }))

    res.json({ jobs: documentJobs })
  } catch (err) {
    next(err)
  }
})

export default router