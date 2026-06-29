import { useState, useEffect, useCallback } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { api, type Taxpayer, type DocumentItem } from '../lib/api'
import './AdminDashboard.css'

type SearchResult = {
  type: 'taxpayer' | 'document'
  data: Taxpayer | DocumentItem
  relevance: number
}

export function SearchRetrieval() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [savedSearches, setSavedSearches] = useState<any[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')

  // Advanced filters
  const [tinFilter, setTinFilter] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'taxpayers' | 'documents'>('all')

  const role = user?.role ?? 'Admin'
  const titleRole = user?.title ?? 'System Administrator'

  // Load search history and saved searches from localStorage
  useEffect(() => {
    const history = localStorage.getItem('searchHistory')
    if (history) setSearchHistory(JSON.parse(history))
    
    const saved = localStorage.getItem('savedSearches')
    if (saved) setSavedSearches(JSON.parse(saved))
  }, [])

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const params: any = { q: searchQuery }
      
      // Add filters
      if (tinFilter) params.taxpayerTin = tinFilter
      if (docTypeFilter) params.type = docTypeFilter
      if (categoryFilter) params.category = categoryFilter
      if (statusFilter) params.status = statusFilter

      const searchData = await api.searchRecords({ q: searchQuery })

      const combined: SearchResult[] = []

      // Add taxpayers with relevance scoring (only if not document-only search)
      if (searchType !== 'documents') {
        searchData.taxpayers?.forEach((t: Taxpayer) => {
          const relevance = calculateRelevance(searchQuery, t.name, t.tin, t.alias, t.district)
          combined.push({ type: 'taxpayer', data: t, relevance })
        })
      }

      // Add documents with relevance scoring (only if not taxpayer-only search)
      if (searchType !== 'taxpayers') {
        searchData.documents?.forEach((d: DocumentItem) => {
          const relevance = calculateDocumentRelevance(searchQuery, d.title, d.type, d.category, d.taxpayerName)
          combined.push({ type: 'document', data: d, relevance })
        })
      }

      // Sort by relevance
      combined.sort((a, b) => b.relevance - a.relevance)
      
      // Log for debugging
      console.log('Search type:', searchType, 'Results:', combined.length, combined.map(r => r.type))

      setResults(combined)

      // Save to history
      const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10)
      setSearchHistory(newHistory)
      localStorage.setItem('searchHistory', JSON.stringify(newHistory))
    } catch (e) {
      console.error('Search failed:', e)
    } finally {
      setLoading(false)
    }
  }, [tinFilter, docTypeFilter, categoryFilter, statusFilter, searchType, searchHistory])

  function calculateRelevance(query: string, ...fields: (string | undefined)[]): number {
    const q = query.toLowerCase()
    let score = 0
    fields.forEach(field => {
      if (!field) return
      const f = field.toLowerCase()
      if (f === q) score += 100 // Exact match
      else if (f.startsWith(q)) score += 50 // Starts with
      else if (f.includes(q)) score += 20 // Contains
    })
    return score
  }

  function calculateDocumentRelevance(query: string, ...fields: (string | undefined)[]): number {
    const q = query.toLowerCase()
    let score = 0
    fields.forEach(field => {
      if (!field) return
      const f = field.toLowerCase()
      if (f === q) score += 100
      else if (f.startsWith(q)) score += 50
      else if (f.includes(q)) score += 20
    })
    return score
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    performSearch(query)
  }

  function handleHistoryClick(term: string) {
    setQuery(term)
    performSearch(term)
  }

  function handleSaveSearch() {
    if (!query.trim()) return
    
    const name = prompt('Enter a name for this search:')
    if (!name) return

    const newSaved = {
      id: `saved-${Date.now()}`,
      name,
      query,
      filters: { tinFilter, docTypeFilter, categoryFilter, statusFilter, searchType },
      createdAt: new Date().toISOString()
    }

    const updated = [...savedSearches, newSaved]
    setSavedSearches(updated)
    localStorage.setItem('savedSearches', JSON.stringify(updated))
  }

  function handleLoadSavedSearch(saved: any) {
    setQuery(saved.query)
    if (saved.filters) {
      setTinFilter(saved.filters.tinFilter || '')
      setDocTypeFilter(saved.filters.docTypeFilter || '')
      setCategoryFilter(saved.filters.categoryFilter || '')
      setStatusFilter(saved.filters.statusFilter || '')
      setSearchType(saved.filters.searchType || 'all')
    }
    performSearch(saved.query)
  }

  function handleDeleteSavedSearch(id: string) {
    const updated = savedSearches.filter(s => s.id !== id)
    setSavedSearches(updated)
    localStorage.setItem('savedSearches', JSON.stringify(updated))
  }

  function handleViewResult(result: SearchResult) {
    setSelectedResult(result)
    setShowPreview(true)
  }

  async function handleExport() {
    if (results.length === 0) return

    try {
      const response = await fetch(`/api/documents/export?format=${exportFormat}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `search-results.${exportFormat}`
      a.click()
    } catch (e: any) {
      alert(e?.message || 'Export failed')
    }
  }

  function getRelevanceLabel(score: number): string {
    if (score >= 100) return 'Exact Match'
    if (score >= 50) return 'High'
    if (score >= 20) return 'Medium'
    return 'Low'
  }

  function getRelevanceColor(score: number): string {
    if (score >= 100) return '#059669' // Green
    if (score >= 50) return '#0d9488' // Teal
    if (score >= 20) return '#d97706' // Orange
    return '#94a3b8' // Gray
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar role={role} title={titleRole} />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Search & Retrieval</p>
            <h1>Search & Retrieval</h1>
            <p className="admin-dashboard__hero-text">Search across taxpayers and documents</p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <select 
              value={exportFormat} 
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
              className="btn btn-secondary"
            >
              <option value="json">Export JSON</option>
              <option value="csv">Export CSV</option>
            </select>
            <button 
              className="btn btn-secondary" 
              type="button" 
              onClick={handleExport}
              disabled={results.length === 0}
            >
              Export Results
            </button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {/* Search Form */}
          <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Search by TIN, name, document title, or keyword..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ flex: 1 }}
                className="w-full"
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Search Type Toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button 
                type="button"
                className={`btn ${searchType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSearchType('all')}
              >
                All Records
              </button>
              <button 
                type="button"
                className={`btn ${searchType === 'taxpayers' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSearchType('taxpayers')}
              >
                Taxpayers Only
              </button>
              <button 
                type="button"
                className={`btn ${searchType === 'documents' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSearchType('documents')}
              >
                Documents Only
              </button>
            </div>

            {/* Advanced Filters Toggle */}
            <button 
              type="button" 
              className="btn btn-ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ marginBottom: '12px' }}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
            </button>

            {/* Advanced Filters */}
            {showAdvanced && (
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3>Advanced Filters</h3>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label>TIN</label>
                    <input 
                      className="w-full" 
                      value={tinFilter} 
                      onChange={(e) => setTinFilter(e.target.value)}
                      placeholder="e.g. 100000001"
                    />
                  </div>
                  <div>
                    <label>Document Type</label>
                    <input 
                      className="w-full" 
                      value={docTypeFilter} 
                      onChange={(e) => setDocTypeFilter(e.target.value)}
                      placeholder="e.g. Tax Return, VAT"
                    />
                  </div>
                  <div>
                    <label>Category</label>
                    <select 
                      className="w-full" 
                      value={categoryFilter} 
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      <option value="Filing">Filing</option>
                      <option value="Return">Return</option>
                      <option value="Correspondence">Correspondence</option>
                      <option value="License">License</option>
                      <option value="Certificate">Certificate</option>
                      <option value="Contract">Contract</option>
                      <option value="Invoice">Invoice</option>
                      <option value="Receipt">Receipt</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label>Status</label>
                    <select 
                      className="w-full" 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Archived">Archived</option>
                      <option value="Expired">Expired</option>
                      <option value="Pending Review">Pending Review</option>
                      <option value="Flagged">Flagged</option>
                    </select>
                  </div>
                  <div>
                    <label>Date From</label>
                    <input 
                      type="date" 
                      className="w-full" 
                      value={dateFrom} 
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Date To</label>
                    <input 
                      type="date" 
                      className="w-full" 
                      value={dateTo} 
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-primary" onClick={() => performSearch(query)}>
                    Apply Filters
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setTinFilter('')
                      setDocTypeFilter('')
                      setCategoryFilter('')
                      setStatusFilter('')
                      setDateFrom('')
                      setDateTo('')
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            {/* Search History & Saved Searches */}
            <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
              {searchHistory.length > 0 && (
                <div>
                  <label style={{ fontWeight: 500, marginBottom: '4px', display: 'block' }}>Recent Searches</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {searchHistory.map((term, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: '0.875rem' }}
                        onClick={() => handleHistoryClick(term)}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {savedSearches.length > 0 && (
                <div>
                  <label style={{ fontWeight: 500, marginBottom: '4px', display: 'block' }}>Saved Searches</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {savedSearches.map((saved) => (
                      <div key={saved.id} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '0.875rem' }}
                          onClick={() => handleLoadSavedSearch(saved)}
                        >
                          {saved.name}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '0.875rem', color: '#dc2626' }}
                          onClick={() => handleDeleteSavedSearch(saved.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Save Search Button */}
          {query && results.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleSaveSearch}>
                Save Current Search
              </button>
            </div>
          )}

          {/* Results */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>Searching...</div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
              {query ? 'No results found. Try adjusting your search criteria.' : 'Enter a search query to get started.'}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px', color: '#64748b', fontSize: '0.875rem', textAlign: 'center' }}>
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </div>

              <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gap: '16px' }}>
                {results.map((result, idx) => (
                  <div key={idx} className="card" style={{ cursor: 'pointer' }} onClick={() => handleViewResult(result)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '8px' }}>
                          <span className={`status status--${result.type === 'taxpayer' ? 'active' : 'updated'}`}>
                            {result.type === 'taxpayer' ? 'Taxpayer' : 'Document'}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '8px' }}>
                          {result.type === 'taxpayer' 
                            ? (result.data as Taxpayer).name 
                            : (result.data as DocumentItem).title}
                        </h3>
                      </div>
                      <div style={{ marginLeft: '16px' }}>
                        <span style={{ 
                          color: getRelevanceColor(result.relevance),
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          padding: '4px 12px',
                          background: '#f1f5f9',
                          borderRadius: '12px'
                        }}>
                          {getRelevanceLabel(result.relevance)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.875rem', color: '#64748b' }}>
                      {result.type === 'taxpayer' ? (
                        <>
                          <div>
                            <label style={{ fontWeight: 500, color: '#1e293b' }}>TIN</label>
                            <p style={{ marginTop: '2px' }}>{(result.data as Taxpayer).tin}</p>
                          </div>
                          <div>
                            <label style={{ fontWeight: 500, color: '#1e293b' }}>Type</label>
                            <p style={{ marginTop: '2px' }}>{(result.data as Taxpayer).type}</p>
                          </div>
                          <div>
                            <label style={{ fontWeight: 500, color: '#1e293b' }}>District</label>
                            <p style={{ marginTop: '2px' }}>{(result.data as Taxpayer).district}</p>
                          </div>
                          <div>
                            <label style={{ fontWeight: 500, color: '#1e293b' }}>Status</label>
                            <p style={{ marginTop: '2px' }}>{(result.data as Taxpayer).status}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label style={{ fontWeight: 500, color: '#1e293b' }}>Type</label>
                            <p style={{ marginTop: '2px' }}>{(result.data as DocumentItem).type}</p>
                          </div>
                          <div>
                            <label style={{ fontWeight: 500, color: '#1e293b' }}>Category</label>
                            <p style={{ marginTop: '2px' }}>{(result.data as DocumentItem).category || '—'}</p>
                          </div>
                          <div>
                            <label style={{ fontWeight: 500, color: '#1e293b' }}>Status</label>
                            <p style={{ marginTop: '2px' }}>{(result.data as DocumentItem).status || '—'}</p>
                          </div>
                          <div>
                            <label style={{ fontWeight: 500, color: '#1e293b' }}>Taxpayer</label>
                            <p style={{ marginTop: '2px' }}>{(result.data as DocumentItem).taxpayerName || '—'}</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ fontSize: '0.875rem' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewResult(result)
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Preview Modal */}
      {showPreview && selectedResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <header className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-4">
                <button className="btn btn-ghost" onClick={() => setShowPreview(false)} style={{ padding: '8px' }}>←</button>
                <div>
                  <h1 className="text-2xl font-bold" style={{ marginBottom: '4px' }}>
                    {selectedResult.type === 'taxpayer' ? 'Taxpayer Profile' : 'Document Details'}
                  </h1>
                  {selectedResult.type === 'taxpayer' && (
                    <p style={{ fontSize: '0.875rem', color: '#64748b' }}>TIN: {(selectedResult.data as Taxpayer).tin}</p>
                  )}
                </div>
              </div>
              {selectedResult.type === 'taxpayer' && (
                <button className="btn btn-primary" onClick={() => window.location.href = `/taxpayers/${(selectedResult.data as Taxpayer).id}`}>
                  Edit Profile
                </button>
              )}
            </header>

            <div className="p-6 overflow-y-auto flex-1">
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {selectedResult.type === 'taxpayer' ? (
                  <>
                    {/* Basic Information */}
                    <div className="card" style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Full Name / Company</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as Taxpayer).name}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>TIN</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as Taxpayer).tin}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Type</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as Taxpayer).type}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Status</label>
                          <p style={{ marginTop: '4px' }}>
                            <span className={`status status--${(selectedResult.data as Taxpayer).status.toLowerCase()}`}>
                              {(selectedResult.data as Taxpayer).status}
                            </span>
                          </p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>District</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as Taxpayer).district}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Alias</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as Taxpayer).alias || '—'}</p>
                        </div>
                        <div className="col-span-2">
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Registration Date</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>
                            {(selectedResult.data as Taxpayer).registered ? new Date((selectedResult.data as Taxpayer).registered!).toLocaleString() : '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="card" style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Contact Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Business Name</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as Taxpayer).businessName || '—'}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Address</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as Taxpayer).address || '—'}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Email</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as Taxpayer).email || '—'}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Phone</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as Taxpayer).phone || '—'}</p>
                        </div>
                        <div className="col-span-2">
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Contact Person</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as Taxpayer).contact || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Tax Information */}
                    <div className="card">
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Tax Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Tax Regime</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as Taxpayer).taxRegime || '—'}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Business Activity</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as Taxpayer).businessActivity || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Document Information */}
                    <div className="card" style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Document Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Title</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as DocumentItem).title}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Type</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as DocumentItem).type}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Category</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as DocumentItem).category || '—'}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Status</label>
                          <p style={{ marginTop: '4px' }}>
                            <span className={`status status--${((selectedResult.data as DocumentItem).status || 'active').toLowerCase().replace(' ', '-')}`}>
                              {(selectedResult.data as DocumentItem).status || 'Active'}
                            </span>
                          </p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Taxpayer</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>{(selectedResult.data as DocumentItem).taxpayerName || '—'}</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Uploaded</label>
                          <p style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px' }}>
                            {(selectedResult.data as DocumentItem).uploadedAt ? new Date((selectedResult.data as DocumentItem).uploadedAt!).toLocaleString() : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Close</button>
                  {selectedResult.type === 'document' && (selectedResult.data as DocumentItem).fileName && (
                    <a 
                      href={`/api/documents/${(selectedResult.data as DocumentItem).id}/file`} 
                      className="btn btn-primary" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
