import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { recipes as recipesApi } from '../api/client'

const FILTERS = [
  { label: 'All', tag: null },
  { label: 'Diabetic friendly', tag: 'diabetic-friendly' },
  { label: 'High protein', tag: 'high-protein' },
  { label: 'Low carb', tag: 'low-carb' },
  { label: 'Quick', tag: 'quick' },
  { label: 'Meal prep', tag: 'meal-prep' },
  { label: 'Vegetarian', tag: 'vegetarian' },
]

const RECIPE_COLORS = [
  'linear-gradient(160deg,#C8956C,#7D4E2D)',
  'linear-gradient(160deg,#E8A87C,#C45E3E)',
  'linear-gradient(160deg,#D4A849,#9B6E1C)',
  'linear-gradient(160deg,#7BAF5A,#3D6B28)',
  'linear-gradient(160deg,#A87CC8,#6B3A8C)',
  'linear-gradient(160deg,#7CA8C8,#3A5E8C)',
]

function RecipeRow({ recipe, onClick }) {
  const m = recipe.macros?.per_portion || {}
  const allergens = recipe.allergens || []
  const SOURCE = { url: 'Imported', youtube: 'YouTube', tiktok: 'TikTok', manual: 'Manual', voice: 'Voice' }
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: RECIPE_COLORS[recipe.id % RECIPE_COLORS.length], flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {recipe.image_url
          ? <img src={recipe.image_url} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 24 }}>🍽️</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {recipe.title}
          {allergens.length > 0 && <i className="ti ti-alert-triangle" style={{ fontSize: 11, color: 'var(--warn-text)', marginLeft: 5 }} />}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink2)', fontWeight: 500, marginBottom: 5 }}>
          {recipe.base_portions} portions{recipe.cook_time_mins ? ` · ${recipe.cook_time_mins} min` : ''} · {SOURCE[recipe.source_type] || recipe.source_type}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {m.carbs !== undefined && <span className="macro-badge carb">{m.carbs}g carbs</span>}
          {m.sugar !== undefined && <span className="macro-badge sugar">{m.sugar}g sugar</span>}
          {m.calories !== undefined && <span className="macro-badge cal">{m.calories} kcal</span>}
        </div>
      </div>
      <i className="ti ti-chevron-right" style={{ color: 'var(--ink3)', fontSize: 16, flexShrink: 0 }} />
    </div>
  )
}

export default function RecipesScreen() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState(0)
  const [allRecipes, setAllRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    recipesApi.list(FILTERS[activeFilter].tag).then(r => {
      setAllRecipes(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [activeFilter])

  const filtered = allRecipes.filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.cuisine || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ background: 'var(--surface)', padding: '52px 20px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Recipes</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 14, padding: '10px 14px', marginBottom: 0 }}>
          <i className="ti ti-search" style={{ color: 'var(--ink3)', fontSize: 15 }} />
          <input
            className="input"
            style={{ background: 'transparent', border: 'none', padding: 0 }}
            placeholder="Search recipes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <i className="ti ti-x" style={{ color: 'var(--ink3)', cursor: 'pointer' }} onClick={() => setSearch('')} />}
        </div>
      </div>
      {/* Filters */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
        <div style={{ display: 'flex', gap: 8, paddingLeft: 20, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {FILTERS.map((f, i) => (
            <div key={f.label} className={`cat-pill ${activeFilter === i ? 'active' : 'inactive'}`} onClick={() => setActiveFilter(i)}>
              {f.label}
            </div>
          ))}
          <div style={{ minWidth: 12 }} />
        </div>
      </div>
      {/* List */}
      <div style={{ padding: '4px 20px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-search" />
            <h3>{search ? 'No results' : 'No recipes yet'}</h3>
            <p>{search ? `Nothing matched "${search}"` : 'Add your first recipe using the + button'}</p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 0 4px' }}>
              {filtered.length} recipe{filtered.length !== 1 ? 's' : ''}
            </div>
            {filtered.map(r => (
              <RecipeRow key={r.id} recipe={r} onClick={() => navigate(`/recipes/${r.id}`)} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
