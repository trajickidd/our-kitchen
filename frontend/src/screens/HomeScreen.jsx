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
]

const RECIPE_COLORS = [
  'linear-gradient(160deg,#C8956C,#7D4E2D)',
  'linear-gradient(160deg,#E8A87C,#C45E3E)',
  'linear-gradient(160deg,#D4A849,#9B6E1C)',
  'linear-gradient(160deg,#7BAF5A,#3D6B28)',
  'linear-gradient(160deg,#A87CC8,#6B3A8C)',
  'linear-gradient(160deg,#7CA8C8,#3A5E8C)',
]

const RECIPE_EMOJIS = { url: '🌐', youtube: '▶️', tiktok: '🎵', manual: '✏️', voice: '🎙️' }
const SOURCE_LABELS = { url: 'Imported', youtube: 'YouTube', tiktok: 'TikTok', manual: 'Manual', voice: 'Voice' }

function RecipeCardBig({ recipe, color, onClick }) {
  const m = recipe.macros?.per_portion || {}
  const allergens = recipe.allergens || []
  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={onClick}>
      <div style={{
        height: 170, background: color, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {recipe.image_url
          ? <img src={recipe.image_url} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
          : <span style={{ fontSize: 64, opacity: 0.85 }}>🍽️</span>
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.45))' }} />
        {recipe.source_type && (
          <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#fff', backdropFilter: 'blur(4px)' }}>
            {SOURCE_LABELS[recipe.source_type] || recipe.source_type}
          </div>
        )}
        {allergens.length > 0 && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 11, color: '#F59F00' }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: '#F59F00' }}>Allergens</span>
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>{recipe.title}</div>
        <div style={{ fontSize: 11, color: 'var(--ink2)', marginBottom: 8, fontWeight: 500 }}>
          {recipe.base_portions} portions{recipe.cook_time_mins ? ` · ${recipe.cook_time_mins} min` : ''}{recipe.cuisine ? ` · ${recipe.cuisine}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {m.carbs !== undefined && <span className="macro-badge carb">{m.carbs}g carbs</span>}
          {m.sugar !== undefined && <span className="macro-badge sugar">{m.sugar}g sugar</span>}
          {m.calories !== undefined && <span className="macro-badge cal">{m.calories} kcal</span>}
          {m.protein !== undefined && <span className="macro-badge protein">{m.protein}g protein</span>}
        </div>
      </div>
    </div>
  )
}

function RecipeCardSmall({ recipe, color, onClick }) {
  const m = recipe.macros?.per_portion || {}
  return (
    <div className="card" style={{ flex: 1, cursor: 'pointer' }} onClick={onClick}>
      <div style={{
        height: 95, background: color, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {recipe.image_url
          ? <img src={recipe.image_url} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
          : <span style={{ fontSize: 36, opacity: 0.85 }}>🍽️</span>
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.35))' }} />
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 3, lineHeight: 1.3 }}>{recipe.title}</div>
        <div style={{ fontSize: 10, color: 'var(--ink2)', marginBottom: 6, fontWeight: 500 }}>
          {recipe.base_portions} portions{recipe.cook_time_mins ? ` · ${recipe.cook_time_mins}m` : ''}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {m.carbs !== undefined && <span className="macro-badge carb">{m.carbs}g carbs</span>}
          {m.sugar !== undefined && <span className="macro-badge sugar">{m.sugar}g sugar</span>}
        </div>
      </div>
    </div>
  )
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState(0)
  const [allRecipes, setAllRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    recipesApi.list(FILTERS[activeFilter].tag).then(r => {
      setAllRecipes(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [activeFilter])

  const recent = allRecipes.slice(0, 3)
  const lowCarb = allRecipes.filter(r => (r.macros?.per_portion?.carbs || 0) < 20).slice(0, 4)

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ background: 'var(--surface)', padding: '52px 20px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600, marginBottom: 2 }}>{greeting} 👋</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)' }}>Our Kitchen</div>
          </div>
          <div style={{ display: 'flex', gap: -6 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, border: '2px solid var(--bg)', zIndex: 1 }}>K</div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F2D4C0', color: '#8B4513', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, border: '2px solid var(--bg)', marginLeft: -8 }}>L</div>
          </div>
        </div>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 14, padding: '10px 14px', cursor: 'text' }} onClick={() => navigate('/recipes')}>
          <i className="ti ti-search" style={{ color: 'var(--ink3)', fontSize: 16 }} />
          <span style={{ fontSize: 13, color: 'var(--ink3)', fontWeight: 500 }}>Search your recipes...</span>
        </div>
      </div>

      {/* Category filters */}
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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : allRecipes.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-chef-hat" />
          <h3>No recipes yet</h3>
          <p>Add your first recipe using the + button below</p>
        </div>
      ) : (
        <div style={{ padding: '20px 20px 0' }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
            {[
              { label: 'Recipes', value: allRecipes.length },
              { label: 'Low carb', value: allRecipes.filter(r => (r.macros?.per_portion?.carbs || 0) < 20).length },
              { label: 'High protein', value: allRecipes.filter(r => (r.macros?.per_portion?.protein || 0) > 25).length },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '12px 0', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)' }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recently added */}
          {recent.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-header">
                <div className="section-title">Recently added</div>
                <div className="section-link" onClick={() => navigate('/recipes')}>See all</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recent.slice(0, 1).map((r, i) => (
                  <RecipeCardBig key={r.id} recipe={r} color={RECIPE_COLORS[i % RECIPE_COLORS.length]} onClick={() => navigate(`/recipes/${r.id}`)} />
                ))}
                {recent.length > 1 && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {recent.slice(1, 3).map((r, i) => (
                      <RecipeCardSmall key={r.id} recipe={r} color={RECIPE_COLORS[(i + 1) % RECIPE_COLORS.length]} onClick={() => navigate(`/recipes/${r.id}`)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Low carb section */}
          {lowCarb.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-header">
                <div className="section-title">Low carb picks</div>
                <div className="section-link" onClick={() => { setActiveFilter(2) }}>See all</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {lowCarb.slice(0, 2).map((r, i) => (
                  <RecipeCardSmall key={r.id} recipe={r} color={RECIPE_COLORS[(i + 3) % RECIPE_COLORS.length]} onClick={() => navigate(`/recipes/${r.id}`)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
