import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { food } from '../api/client'

export default function IngredientSearchScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ local: [], off: [] })
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState(100)
  const [unit, setUnit] = useState('g')
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults({ local: [], off: [] }); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await food.search(query)
        setResults(r.data)
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const allResults = [...(results.local || []), ...(results.off || [])]

  const handleSelect = (item) => {
    setSelected(selected?.off_id === item.off_id && selected?.id === item.id ? null : item)
  }

  const handleAdd = () => {
    if (!selected) return
    // Return result to parent via state/callback
    navigate(-1, { state: { ingredient: { ...selected, quantity: qty, unit } } })
  }

  return (
    <div className="screen" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', padding: '52px 20px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 18 }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Add ingredient</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 14, padding: '10px 14px' }}>
            <i className="ti ti-search" style={{ color: 'var(--ink3)', fontSize: 15 }} />
            <input
              className="input" style={{ background: 'transparent', border: 'none', padding: 0, flex: 1 }}
              placeholder="Search ingredient or brand..."
              value={query} onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {query && <i className="ti ti-x" style={{ color: 'var(--ink3)', cursor: 'pointer' }} onClick={() => setQuery('')} />}
          </div>
          {/* Barcode btn */}
          <div style={{ width: 44, height: 44, background: 'var(--accent)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <i className="ti ti-barcode" style={{ color: '#fff', fontSize: 20 }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {!query && (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <i className="ti ti-search" />
            <h3>Search for an ingredient</h3>
            <p>Try "Aromat", "Kikkoman soy sauce", or scan a barcode</p>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && query && allResults.length === 0 && (
          <div>
            <div className="empty-state" style={{ padding: '30px 20px' }}>
              <i className="ti ti-search-off" />
              <h3>Nothing found for "{query}"</h3>
              <p>Try a different spelling or add it manually</p>
            </div>
            <button className="btn-secondary" onClick={() => {}}>
              <i className="ti ti-pencil" />Enter macros manually
            </button>
          </div>
        )}

        {!loading && allResults.length > 0 && (
          <>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 10 }}>
              {allResults.length} result{allResults.length !== 1 ? 's' : ''} — values per 100g
            </div>

            {allResults.map((item, i) => {
              const isSelected = selected && (item.id ? item.id === selected.id : item.off_id === selected.off_id)
              const allergens = item.allergens || []
              return (
                <div key={item.id || item.off_id || i} onClick={() => handleSelect(item)}
                  style={{
                    background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
                    marginBottom: 8, overflow: 'hidden',
                    border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🧂</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink2)', fontWeight: 500, marginBottom: 6 }}>
                        {[item.brand, item.is_custom ? 'Your library' : 'Open Food Facts'].filter(Boolean).join(' · ')}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {item.carbs_per100 > 0 && <span className="macro-badge carb">{item.carbs_per100}g carbs</span>}
                        {item.sugar_per100 > 0 && <span className="macro-badge sugar">{item.sugar_per100}g sugar</span>}
                        {item.calories_per100 > 0 && <span className="macro-badge cal">{item.calories_per100} kcal</span>}
                        {item.protein_per100 > 0 && <span className="macro-badge protein">{item.protein_per100}g protein</span>}
                      </div>
                    </div>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: isSelected ? 'var(--accent)' : 'var(--surface2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isSelected ? '#fff' : 'var(--ink3)', fontSize: 16, flexShrink: 0
                    }}>
                      <i className={`ti ${isSelected ? 'ti-check' : 'ti-plus'}`} />
                    </div>
                  </div>
                  {allergens.length > 0 && (
                    <div style={{ background: 'var(--warn-bg)', borderTop: '1px solid var(--warn-border)', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: 11, color: 'var(--warn-text)' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--warn-text)' }}>
                        Contains: {allergens.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Manual entry option */}
            <div style={{ border: '1.5px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginTop: 4 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-pencil" style={{ fontSize: 18, color: 'var(--ink2)' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>Enter macros manually</div>
                <div style={{ fontSize: 10, color: 'var(--ink2)', fontWeight: 500 }}>Saves to your ingredient library</div>
              </div>
              <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: 'var(--ink3)' }} />
            </div>
          </>
        )}
      </div>

      {/* Confirm bar */}
      {selected && (
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480,
          background: 'var(--accent)', padding: '14px 20px calc(14px + var(--safe-bottom))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, zIndex: 100,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Set quantity</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 2px' }}>
            <div onClick={() => setQty(q => Math.max(0, q - (unit === 'g' || unit === 'ml' ? 10 : 0.5)))}
              style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 16, fontWeight: 800 }}>−</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', minWidth: 52, textAlign: 'center' }}>{qty}{unit}</div>
            <div onClick={() => setQty(q => q + (unit === 'g' || unit === 'ml' ? 10 : 0.5))}
              style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 16, fontWeight: 800 }}>+</div>
          </div>
          <div onClick={handleAdd} style={{ background: '#fff', color: 'var(--accent)', borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>
            Add
          </div>
        </div>
      )}
    </div>
  )
}
