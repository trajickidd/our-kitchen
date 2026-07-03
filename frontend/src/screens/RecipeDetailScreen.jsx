import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { recipes as recipesApi } from '../api/client'
import api from '../api/client'

const ALLERGEN_CONFIG = {
  gluten: { color: 'var(--allergen-gluten)', who: 'Lauren' },
  lactose: { color: 'var(--allergen-lactose)', who: 'Kievz' },
  nuts: { color: '#8B4513', who: 'Both' },
  eggs: { color: '#9B6E1C', who: 'Both' },
}

function MacroCard({ label, value, unit, colorVar, bgVar }) {
  return (
    <div style={{ background: `var(${bgVar})`, borderRadius: 'var(--radius-md)', padding: '10px 14px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink2)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: `var(${colorVar})`, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', marginLeft: 2 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 9, color: 'var(--ink3)', fontWeight: 500, marginTop: 3 }}>per portion</div>
    </div>
  )
}

export default function RecipeDetailScreen({ showToast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [portions, setPortions] = useState(null)
  const [macros, setMacros] = useState(null)
  const [activeTab, setActiveTab] = useState('ingredients')
  const [adjustments, setAdjustments] = useState({})
  const [recalcLoading, setRecalcLoading] = useState(false)
  const [isFavourite, setIsFavourite] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    recipesApi.get(id).then(r => {
      setRecipe(r.data)
      setPortions(r.data.base_portions)
      setMacros(r.data.macros)
      setIsFavourite(r.data.is_favourite || false)
      setLoading(false)
    }).catch(() => { setLoading(false) })
  }, [id])

  const changePortion = async (delta) => {
    const newP = Math.max(1, (portions || recipe.base_portions) + delta)
    setPortions(newP)
    setRecalcLoading(true)
    try {
      const r = await recipesApi.macros(id, newP)
      setMacros(r.data)
    } finally {
      setRecalcLoading(false)
    }
  }

  const toggleFavourite = async () => {
    try {
      const r = await api.post(`/recipes/${id}/favourite`)
      setIsFavourite(r.data.is_favourite)
    } catch (e) {}
  }

  const deleteRecipe = async () => {
    if (!window.confirm('Delete this recipe?')) return
    setDeleting(true)
    try {
      await recipesApi.delete(id)
      navigate('/')
    } catch (e) {
      setDeleting(false)
    }
  }

  const adjustIngredient = (ingId, delta, step, currentQty) => {
    const current = adjustments[ingId] ?? currentQty
    const next = Math.max(0, parseFloat((current + delta * step).toFixed(1)))
    setAdjustments(prev => ({ ...prev, [ingId]: next }))
  }

  const getAllergens = () => {
    if (!recipe) return []
    const seen = new Set()
    const result = []
    for (const ing of recipe.ingredients || []) {
      for (const a of ing.allergens || []) {
        if (!seen.has(a)) { seen.add(a); result.push(a) }
      }
    }
    return result
  }

  const getStepForUnit = (unit) => {
    if (!unit) return 10
    if (['tsp', 'tbsp', 'cup'].includes(unit)) return 0.5
    if (['whole', 'pinch'].includes(unit)) return 1
    if (unit === 'ml') return 10
    return 10 // grams
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" />
    </div>
  )
  if (!recipe) return (
    <div className="empty-state">
      <i className="ti ti-alert-circle" />
      <h3>Recipe not found</h3>
    </div>
  )

  const allergens = getAllergens()
  const m = macros?.per_portion || {}

  return (
    <div className="screen" style={{ paddingBottom: 24 }}>
      {/* Hero */}
      <div style={{ height: 240, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#C8956C,#7D4E2D)' }}>
        {recipe.image_url && (
          <img src={recipe.image_url} alt={recipe.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {!recipe.image_url && <span style={{ fontSize: 72, opacity: 0.8 }}>🍽️</span>}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.15),rgba(0,0,0,0.55))' }} />
        {/* Back */}
        <div onClick={() => navigate(-1)} style={{ position: 'absolute', top: 52, left: 16, zIndex: 10, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
          <i className="ti ti-arrow-left" style={{ color: '#fff', fontSize: 18 }} />
        </div>
        {/* Fav */}
        <div onClick={toggleFavourite} style={{ position: 'absolute', top: 52, right: 16, zIndex: 10, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
          <i className={isFavourite ? 'ti ti-heart' : 'ti ti-heart'} style={{ color: isFavourite ? '#E24B4A' : '#fff', fontSize: 16 }} />
        </div>
        {/* Source badge */}
        {recipe.source_type && (
          <div style={{ position: 'absolute', bottom: 14, left: 16, zIndex: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 10px', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>
              {{ url: 'Imported', youtube: 'YouTube', tiktok: 'TikTok', manual: 'Manual', voice: 'Voice' }[recipe.source_type]}
            </span>
          </div>
        )}
        {/* Change photo */}
        <div style={{ position: 'absolute', bottom: 14, right: 16, zIndex: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '5px 10px', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <i className="ti ti-camera" style={{ color: '#fff', fontSize: 12 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>Change photo</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: 'var(--bg)', borderRadius: '24px 24px 0 0', marginTop: -20, position: 'relative', zIndex: 5, padding: '20px 20px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', marginBottom: 6 }}>{recipe.title}</div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
          {recipe.cook_time_mins && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}><i className="ti ti-clock" style={{ fontSize: 13 }} />{recipe.cook_time_mins} min</span>}
          {recipe.cuisine && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}><i className="ti ti-map-pin" style={{ fontSize: 13 }} />{recipe.cuisine}</span>}
          {recipe.difficulty && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}><i className="ti ti-flame" style={{ fontSize: 13 }} />{recipe.difficulty}</span>}
        </div>

        {/* Allergen banner */}
        {allergens.length > 0 && (
          <div style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--warn-text)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} />Allergens in this recipe
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allergens.map(a => {
                const cfg = ALLERGEN_CONFIG[a] || { color: '#888', who: '' }
                return (
                  <div key={a} className="allergen-pill">
                    <div className={`allergen-pip ${a}`} style={{ background: cfg.color }} />
                    <span style={{ fontSize: 10, fontWeight: 700 }}>{a.charAt(0).toUpperCase() + a.slice(1)}</span>
                    {cfg.who && <span style={{ fontSize: 10, color: 'var(--ink2)', fontWeight: 500 }}>· {cfg.who}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Portion stepper */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>Portions</div>
            <div style={{ fontSize: 10, color: 'var(--ink2)', fontWeight: 500, marginTop: 2 }}>
              {recalcLoading ? 'Recalculating...' : 'Macros update automatically'}
            </div>
          </div>
          <div className="stepper">
            <div className="step-btn" onClick={() => changePortion(-1)}>−</div>
            <div className="step-num">{portions}</div>
            <div className="step-btn primary" onClick={() => changePortion(1)}>+</div>
          </div>
        </div>

        {/* Macros grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <MacroCard label="Carbohydrates" value={m.carbs ?? '—'} unit="g" colorVar="--carb" bgVar="--carb-bg" />
          <MacroCard label="Sugar" value={m.sugar ?? '—'} unit="g" colorVar="--sugar" bgVar="--sugar-bg" />
          <MacroCard label="Calories" value={m.calories ?? '—'} unit="kcal" colorVar="--cal" bgVar="--cal-bg" />
          <MacroCard label="Protein" value={m.protein ?? '—'} unit="g" colorVar="--protein" bgVar="--protein-bg" />
        </div>

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {recipe.tags.map(t => (
              <span key={t} style={{ background: 'var(--surface2)', borderRadius: 20, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: 'var(--ink2)' }}>
                {t.replace('-', ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border)', marginBottom: 14 }}>
          {['ingredients', 'method'].map(tab => (
            <div key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, textAlign: 'center', padding: '9px 0',
              fontSize: 12, fontWeight: 800,
              color: activeTab === tab ? 'var(--ink)' : 'var(--ink3)',
              borderBottom: activeTab === tab ? '2px solid var(--ink)' : '2px solid transparent',
              marginBottom: -1.5, cursor: 'pointer', textTransform: 'capitalize'
            }}>{tab}</div>
          ))}
        </div>

        {/* Ingredients */}
        {activeTab === 'ingredients' && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 10 }}>
              Tap + / − to adjust quantities
            </div>
            {(recipe.ingredients || []).map(ing => {
              const qty = adjustments[ing.id] ?? ing.quantity
              const step = getStepForUnit(ing.unit)
              const ingAllergens = ing.allergens || []
              return (
                <div key={ing.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{ing.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border2)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'var(--ink2)', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => adjustIngredient(ing.id, -1, step, ing.quantity)}>−</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', minWidth: 48, textAlign: 'center' }}>{qty}{ing.unit !== 'whole' ? ing.unit : ''}</div>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border2)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'var(--ink2)', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => adjustIngredient(ing.id, 1, step, ing.quantity)}>+</div>
                    </div>
                  </div>
                  {ingAllergens.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                      {ingAllergens.map(a => {
                        const cfg = ALLERGEN_CONFIG[a] || { color: '#888', who: '' }
                        return (
                          <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color }}>
                              Contains {a}{cfg.who ? ` · ${cfg.who}` : ''}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            {(recipe.ingredients || []).length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink2)', fontSize: 13 }}>No ingredients added yet</div>
            )}
          </div>
        )}

        {/* Method */}
        {activeTab === 'method' && (
          <div style={{ paddingBottom: 20 }}>
            {recipe.notes ? (
              recipe.notes.split('\n').filter(Boolean).map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 16, borderBottom: i < recipe.notes.split('\n').filter(Boolean).length - 1 ? '1px solid var(--border)' : 'none', marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.6, flex: 1 }}>{step}</div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink2)', fontSize: 13 }}>No method added yet</div>
            )}
          </div>
        )}

        {/* Delete button */}
      <div style={{ padding: '0 0 8px' }}>
        <button onClick={deleteRecipe} disabled={deleting} style={{
          width: '100%', padding: '12px', background: 'transparent',
          border: '1px solid #FEECEC', borderRadius: 'var(--radius-md)',
          color: 'var(--sugar)', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Nunito, sans-serif'
        }}>
          <i className="ti ti-trash" style={{ fontSize: 16 }} />
          {deleting ? 'Deleting...' : 'Delete recipe'}
        </button>
      </div>

      {/* Source link */}
        {recipe.source_url && (
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginTop: 16, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
            {recipe.source_type === 'youtube' && (
              <div style={{ background: '#1A1A1A', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-player-play" style={{ color: '#fff', fontSize: 16 }} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>youtube.com</span>
              </div>
            )}
            <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)' }}>
                  {recipe.source_type === 'youtube' ? 'Watch on YouTube' : recipe.source_type === 'tiktok' ? 'View on TikTok' : 'View original recipe'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink2)', fontWeight: 500 }}>Imported from {recipe.source_type}</div>
              </div>
              <a href={recipe.source_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--protein)', textDecoration: 'none' }}>
                <i className="ti ti-external-link" style={{ fontSize: 13 }} />Open
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
