# Async Document Analysis Implementation

This document describes the async document analysis system with OCR support, job queuing, and real-time UI updates.

## Overview

The document analysis pipeline has been converted from synchronous to asynchronous using Redis + Bull queue. This allows:
- Non-blocking document uploads
- Progress tracking and notifications
- Retry logic for failed analyses
- OCR support for scanned images
- Integration with trained ML models

## Architecture

```
┌─────────────┐
│   Upload    │
│  Document   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Express Route      │
│  (documents.routes) │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Bull Queue         │
│  (Redis Backend)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Job Processor      │
│  (jobQueue.js)      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Document Analysis  │
│  Service            │
│  (documentAnalysis) │
└──────┬──────────────┘
       │
       ├──► PDF Text Extraction (pdf-parse)
       ├──► OCR (tesseract.js) for images
       └──► ML Model Classification
              (server/python/ml/)
```

## Components

### 1. Model Wrapper (`server/models/predict.py`)

Replaced the example heuristic script with a wrapper that:
- Attempts to use trained ML models from `server/python/ml/`
- Falls back to heuristic classification if models unavailable
- Maintains backward compatibility with existing interface

**Usage:**
```bash
echo '{"text": "VAT return for March 2024"}' | python server/models/predict.py
```

### 2. OCR Support (`server/src/services/documentAnalysis.js`)

Added OCR capabilities using tesseract.js:
- Supports PNG, JPG, JPEG, BMP, TIFF, WEBP
- Dynamic import to avoid hard dependency
- Graceful fallback if tesseract not available

**Supported formats:**
- PDF: Text extraction via pdf-parse
- Images: OCR via tesseract.js
- Other: Returns empty text

### 3. Job Queue (`server/src/services/jobQueue.js`)

Bull queue configuration:
- **Queue Name:** `document analysis`
- **Redis URL:** Configurable via `REDIS_URL` env var
- **Retry Policy:** 3 attempts with exponential backoff (2s delay)
- **Job Cleanup:** 
  - Completed jobs: 100 jobs or 24 hours
  - Failed jobs: 7 days

**Job Data Structure:**
```javascript
{
  documentId: string,
  filePath: string,
  fileName: string
}
```

**Job Result Structure:**
```javascript
{
  documentId: string,
  fileName: string,
  analysis: {
    text: string | null,
    classification: { type: string, confidence: number },
    analyzedAt: string,
    model: string
  },
  completedAt: string
}
```

### 4. Job Status API (`server/src/routes/jobs.routes.js`)

New endpoints:

#### GET `/api/jobs/:jobId`
Get status of a specific job.

**Response:**
```json
{
  "jobId": "1",
  "state": "completed",
  "progress": 100,
  "result": { ... },
  "failedReason": null,
  "createdAt": 1708500000000,
  "processedOn": 1708500001000,
  "finishedOn": 1708500005000
}
```

**States:** `waiting`, `active`, `completed`, `failed`, `delayed`

#### GET `/api/jobs/document/:documentId`
Get all jobs for a specific document.

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "1",
      "state": "completed",
      "progress": 100,
      "createdAt": 1708500000000,
      "processedOn": 1708500001000,
      "finishedOn": 1708500005000
    }
  ]
}
```

### 5. Frontend Integration

#### API Methods (`src/lib/api.ts`)

Added two new methods:

```typescript
// Get job status
getJobStatus(jobId: string): Promise<JobStatus>

// Get all jobs for a document
getDocumentJobs(documentId: string): Promise<{ jobs: JobInfo[] }>
```

#### Document Detail Page (`src/pages/DocumentDetail.tsx`)

Enhanced with:
- **Job Status Polling:** Polls every 2 seconds while job is active
- **Progress Bar:** Visual progress indicator
- **Status Badges:** Color-coded status (Queued/Processing/Completed/Failed)
- **Analysis Display:** Shows classification, confidence, extracted text
- **Auto-refresh:** Reloads document data when job completes

**UI States:**
- ⏳ Queued (yellow)
- ⚙️ Processing (blue) with progress bar
- ✅ Completed (green) - shows analysis
- ❌ Failed (red) - shows error message

#### CSS Styles (`src/pages/AdminDashboard.css`)

Added styles for:
- `.analysis-section` - Analysis results container
- `.analysis-card` - Individual analysis cards
- `.classification-badge` - Document type badge
- `.extracted-text` - OCR extracted text display
- `.job-status` - Job status indicator
- `.progress-bar` - Progress indicator

## Setup Instructions

### 1. Install Dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
npm install
```

### 2. Install Redis

**Windows (using WSL2 or Docker):**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install Redis on WSL2
sudo apt-get install redis-server
redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

### 3. Configure Environment

Create `server/.env`:
```env
PORT=3001
JWT_SECRET=your-secret-key-here
CLIENT_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgres://user:password@localhost:5432/taxcoreai
```

### 4. Install Tesseract (Optional, for OCR)

**Windows:**
Download from: https://github.com/UB-Mannheim/tesseract/wiki

**macOS:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

**Note:** Tesseract.js can work without system tesseract installation using its bundled worker, but system installation improves accuracy.

### 5. Install Python ML Dependencies (Optional)

If using trained models:
```bash
cd server/python
pip install -r requirements.txt
```

### 6. Run the Application

**Development (both client and server):**
```bash
npm run dev:all
```

**Or separately:**
```bash
# Terminal 1 - Client
npm run dev

# Terminal 2 - Server
npm run dev:server
```

## Usage Flow

### Upload Document

1. User uploads document via UI
2. Server saves file and creates document record with `status: "Uploaded"`
3. Analysis job is queued with Bull
4. Document record updated with `analysisJobId` and `status: "Processing"`
5. Response returned immediately to user

### Job Processing

1. Bull worker picks up job from queue
2. Progress updated to 10%
3. Document analysis begins:
   - Extract text (PDF or OCR)
   - Classify using ML model or heuristics
4. Progress updated to 90%
5. Job completes, result stored
6. Document updated with analysis results
7. Status changed to "Analyzed"

### UI Polling

1. Document detail page checks for `analysisJobId`
2. If present, starts polling `/api/jobs/:jobId` every 2 seconds
3. Displays progress bar and status
4. When job completes, reloads document to show analysis
5. Polling stops automatically

## API Changes

### Modified Endpoints

#### POST `/api/documents`
**Before:** Synchronous analysis, blocking response
**After:** Returns immediately with `analysisJobId`, analysis queued

**New Response Fields:**
```json
{
  "document": {
    "id": "doc-123",
    "title": "VAT Return",
    "status": "Processing",
    "analysisJobId": "1",
    // ... other fields
  }
}
```

### New Endpoints

- `GET /api/jobs/:jobId` - Get job status
- `GET /api/jobs/document/:documentId` - Get document jobs

## TypeScript Types

### DocumentAnalysis
```typescript
interface DocumentAnalysis {
  text: string | null;
  classification: {
    type: string;
    confidence: number;
  };
  analyzedAt: string;
  model: string;
}
```

### DocumentItem (Updated)
```typescript
interface DocumentItem {
  id: string;
  title: string;
  type: string;
  taxpayerName?: string;
  taxpayerTin?: string;
  uploadedAt?: string;
  fileName?: string;
  status?: string;
  analysis?: DocumentAnalysis;      // NEW
  analysisJobId?: string;           // NEW
}
```

## Monitoring

### Queue Statistics

Monitor queue health:
```javascript
import { analysisQueue } from './services/jobQueue.js';

// Get waiting jobs count
const waiting = await analysisQueue.getWaitingCount();

// Get active jobs count
const active = await analysisQueue.getActiveCount();

// Get completed jobs count
const completed = await analysisQueue.getCompletedCount();

// Get failed jobs count
const failed = await analysisQueue.getFailedCount();
```

### Logs

The system logs:
- Job creation: `Job {id} added to queue for document {documentId}`
- Job progress: `Job {id} is {progress}% complete`
- Job completion: `Job {id} completed for document {documentId}`
- Job failure: `Job {id} failed: {error}`
- Document update: `Document {id} updated with analysis results`

## Troubleshooting

### Redis Connection Issues

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:** Ensure Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Tesseract OCR Not Working

**Error:** `extractTextFromImage (OCR) failed`

**Solutions:**
1. Install tesseract.js: Already included in dependencies
2. For better accuracy, install system tesseract
3. Check browser console for WASM loading errors

### Job Not Processing

**Check:**
1. Redis is running
2. Server logs show queue processor started
3. Job exists in Redis: `redis-cli LLEN bull:document analysis:waiting`

### Models Not Loading

**Error:** `Model classification failed`

**Solution:** This is expected if ML models aren't trained. The system falls back to heuristics automatically.

## Performance Considerations

- **Job Queue:** Handles concurrent analyses efficiently
- **Retry Logic:** Failed jobs retry 3 times with backoff
- **Cleanup:** Old jobs automatically removed to prevent Redis bloat
- **Polling:** 2-second interval balances responsiveness and server load
- **OCR:** Tesseract.js runs in Web Worker (non-blocking)

## Future Enhancements

1. **WebSocket Support:** Replace polling with WebSocket for real-time updates
2. **Job Priorities:** Prioritize urgent documents
3. **Batch Processing:** Process multiple documents in one job
4. **Progress Events:** More granular progress updates from analysis service
5. **Notifications:** Push notifications when analysis completes
6. **Model Versioning:** Track which model version was used for analysis

## Migration Notes

### From Synchronous to Async

**Breaking Changes:**
- Document upload no longer includes `analysis` in response
- Document status changes from `Uploaded` → `Processing` → `Analyzed`
- New field `analysisJobId` added to documents

**Backward Compatibility:**
- Old documents without `analysisJobId` won't have polling
- Analysis results still stored in `document.analysis` field
- All existing API methods remain functional

## Testing

### Manual Testing

1. Upload a PDF document
2. Verify immediate response with `status: "Processing"`
3. Check job status endpoint: `GET /api/jobs/:jobId`
4. Wait for completion (check logs)
5. Refresh document detail page
6. Verify analysis results displayed

### Automated Testing

```bash
# Test job queue
npm test -- --grep "Job Queue"

# Test OCR
npm test -- --grep "OCR"

# Test API endpoints
npm test -- --grep "Jobs API"
```

## Support

For issues or questions:
1. Check server logs for errors
2. Verify Redis connection
3. Review job status in Redis: `redis-cli`
4. Check browser console for frontend errors