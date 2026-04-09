import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Filter, Grid3x3, List, Download, Upload } from 'lucide-react'
import { api } from '../api'
import SkillCard from '../components/SkillCard'

const categories = ['All', 'Design', 'Frontend', 'Backend', 'Quality', 'DevOps', 'Testing', 'General']

export default function Dashboard() {
  const navigate = useNavigate()
  const [skills, setSkills] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [viewMode, setViewMode] = useState('grid')
  const [loading, setLoading] = useState(true)
  const [importData, setImportData] = useState(null)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    loadSkills()
  }, [search, category])

  async function loadSkills() {
    try {
      const params = {}
      if (search) params.search = search
      if (category !== 'All') params.category = category
      const res = await api.getSkills(params)
      setSkills(res.data)
    } catch (err) {
      console.error('Failed to load skills:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!importData) return
    try {
      const parsed = JSON.parse(importData)
      await api.importSkill(parsed)
      setShowImport(false)
      setImportData(null)
      loadSkills()
    } catch (err) {
      alert('Invalid import data: ' + err.message)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Skills</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {skills.length} skill{skills.length !== 1 ? 's' : ''} in your library
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(!showImport)}
            className="btn-secondary btn-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button
            onClick={() => navigate('/skills/new')}
            className="btn-primary btn-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Skill
          </button>
        </div>
      </div>

      {/* Import Panel */}
      {showImport && (
        <div className="card mb-4 animate-fade-in">
          <h3 className="text-sm font-semibold mb-2">Import Skill</h3>
          <textarea
            value={importData || ''}
            onChange={(e) => setImportData(e.target.value)}
            placeholder='Paste exported skill JSON here...'
            className="input font-mono text-xs h-32 mb-2"
          />
          <div className="flex gap-2">
            <button onClick={handleImport} className="btn-primary btn-sm">Import</button>
            <button onClick={() => { setShowImport(false); setImportData(null) }} className="btn-secondary btn-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills by name, content, or tags..."
            className="input pl-9"
          />
        </div>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              category === cat
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Skills Grid/List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading skills...</div>
      ) : skills.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-1">No skills found</p>
          <p className="text-xs text-gray-400 mb-4">
            {search ? 'Try a different search query' : 'Create your first skill to get started'}
          </p>
          <button onClick={() => navigate('/skills/new')} className="btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" />
            Create Skill
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} compact />
          ))}
        </div>
      )}
    </div>
  )
}
