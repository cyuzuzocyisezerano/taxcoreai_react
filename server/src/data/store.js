import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createSeedData } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'db.json')

let cache = null

const DEFAULT_STATE = {
  notifications: [],
  notificationPreferences: {},
  notificationHistory: [],
  workflows: [],
  workflowBatches: [],
  workflowComments: [],
  workflowHistory: [],
  slaRules: [],
  reports: [],
  settings: {},
  aiPrompts: [],
  auditLogs: [],
}

export async function loadDb() {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    cache = { ...DEFAULT_STATE, ...parsed }
  } catch {
    cache = { ...DEFAULT_STATE, ...(await createSeedData()) }
    await saveDb(cache)
  }

  return cache
}

export async function saveDb(db) {
  cache = db
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
}

export async function resetDb() {
  cache = await createSeedData()
  await saveDb(cache)
  return cache
}
