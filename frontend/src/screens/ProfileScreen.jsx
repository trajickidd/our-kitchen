import { useState, useEffect } from 'react'
import { profiles as profilesApi } from '../api/client'

const ALLERGEN_OPTIONS = [
  { key: 'gluten', label: 'Gluten', icon: '🌾' },
  { key: 'lactose', label: 'Lactose / Dairy', icon: '🥛' },
  { key: 'nuts', label: 'Nuts', icon: '🥜' },
  { key: 'eggs', label: 'Eggs', icon: '🥚' },
  { key: 'soy', label: 'Soy', icon: '🫘' },
  { key: 'shellfish', label: 'Shellfish', icon: '🦐' },
]

function ProfileCard({ profile, onUpdate, showToast }) {
  const [allergens, setAllergens] = useState(profile.allergens || [])
  const [saving, setSaving] = useState(false)

  const toggle = (key) => setAllergens(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const save = async () => {
    setSaving(true)
    try {
      await profilesApi.update(profile.id, { allergens })
      showToast(`${profile.name}'s profile saved`)
      onUpdate({ ...profile, allergens })
    } catch {
      showToast('Error saving profile')
    } finally {
      setSaving(false)
    }
  }

  const initials = profile.name.slice(0, 1).toUpperCase()
  const isLauren = profile.name.toLowerCase().includes('lauren')
  const avatarBg = isLauren ? '#F2D4C0' : 'var(--accent)'
  const avatarFg = isLauren ? '#8B4513' : '#fff'

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '18px', marginBottom: 14, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: avatarBg, color: avatarFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900 }}>{initials}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--ink)' }}>{profile.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink2)', fontWeight: 500 }}>
            {allergens.length > 0 ? allergens.join(', ') : 'No allergens set'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 10 }}>
        Dietary restrictions
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {ALLERGEN_OPTIONS.map(a => {
          const active = allergens.includes(a.key)
          return (
            <div key={a.key} onClick={() => toggle(a.key)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: active ? (a.key === 'gluten' ? '#FFF9F3' : a.key === 'lactose' ? '#F3F8FF' : 'var(--surface2)') : 'var(--surface2)',
              border: active ? `1.5px solid ${a.key === 'gluten' ? 'var(--allergen-gluten)' : a.key === 'lactose' ? 'var(--allergen-lactose)' : 'var(--border2)'}` : '1.5px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--ink)' : 'var(--ink2)' }}>{a.label}</span>
              {active && <i className="ti ti-check" style={{ marginLeft: 'auto', fontSize: 14, color: a.key === 'gluten' ? 'var(--allergen-gluten)' : 'var(--allergen-lactose)' }} />}
            </div>
          )
        })}
      </div>

      <button className="btn-primary" onClick={save} disabled={saving} style={{ borderRadius: 'var(--radius-md)' }}>
        {saving ? 'Saving...' : 'Save profile'}
      </button>
    </div>
  )
}

export default function ProfileScreen({ showToast }) {
  const [profileList, setProfileList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    profilesApi.list().then(r => {
      setProfileList(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleUpdate = (updated) => {
    setProfileList(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  return (
    <div className="screen">
      <div style={{ background: 'var(--surface)', padding: '52px 20px 16px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Profiles</div>
        <div style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 500, marginTop: 4 }}>
          Allergen flags show on every matching ingredient
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : (
          profileList.map(p => (
            <ProfileCard key={p.id} profile={p} onUpdate={handleUpdate} showToast={showToast} />
          ))
        )}

        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '18px', marginBottom: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>About Our Kitchen</div>
          <div style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 500, lineHeight: 1.6 }}>
            A shared recipe manager for Kievz and Lauren. Recipes can be imported from the web, YouTube, TikTok, or added manually. All nutritional info is per portion and scales automatically.
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--ink3)', fontWeight: 600 }}>v1.0.0 · Nutritional data from Open Food Facts</div>
        </div>
      </div>
    </div>
  )
}
