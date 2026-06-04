import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { imports, recipes as recipesApi } from '../api/client'

function SourcePicker({ onSelect }) {
  return (
    <div style={{ padding: '20px 20px 0' }}>
      <div style={{ fontSize: 14, color: 'var(--ink2)', fontWeight: 500, marginBottom: 20 }}>
        How would you like to add this recipe?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SOURCES.map(s => (
          <div key={s.key} onClick={() => onSelect(s.key)} style={{
            background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
            cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
            transition: 'transform 0.1s',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 22, color: 'var(--ink)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 500 }}>{s.sub}</div>
            </div>
            <i className="ti ti-chevron-right" style={{ color: 'var(--ink3)', fontSize: 16 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function UrlImporter({ onResult, showToast }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!url.trim()) return
    setLoading(true)
    try {
      const r = await imports.url(url)
      onResult(r.data, url, 'url')
    } catch (e) {
      showToast('Could not import that URL. Try another.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ fontSize: 14, color: 'var(--ink2)', fontWeight: 500, marginBottom: 16 }}>
        Paste the URL of any recipe page and we'll extract the recipe automatically.
      </div>
      <input className="input" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} style={{ marginBottom: 12 }} />
      <button className="btn-primary" onClick={handleImport} disabled={!url.trim() || loading}>
        {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Importing...</> : <><i className="ti ti-download" />Import recipe</>}
      </button>
    </div>
  )
}

function YouTubeImporter({ onResult, showToast }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!url.trim()) return
    setLoading(true)
    try {
      const r = await imports.youtube(url)
      onResult(r.data, url, 'youtube')
    } catch (e) {
      const msg = e.response?.data?.error || 'Could not import from YouTube.'
      showToast(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ fontSize: 14, color: 'var(--ink2)', fontWeight: 500, marginBottom: 16 }}>
        Paste a YouTube cooking video URL. We'll extract the transcript and pull out the recipe using AI.
      </div>
      <input className="input" placeholder="https://youtube.com/watch?v=..." value={url} onChange={e => setUrl(e.target.value)} style={{ marginBottom: 12 }} />
      <button className="btn-primary" onClick={handleImport} disabled={!url.trim() || loading}>
        {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Extracting transcript...</> : <><i className="ti ti-brand-youtube" />Import from YouTube</>}
      </button>
    </div>
  )
}

function TikTokImporter({ onResult, showToast }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!url.trim()) return
    setLoading(true)
    try {
      const r = await imports.tiktok(url)
      onResult({ tiktok: r.data, claude: { title: r.data.title || '' } }, url, 'tiktok')
    } catch (e) {
      showToast('Could not fetch TikTok info. Continue manually.')
      onResult({ claude: { title: '' } }, url, 'tiktok')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ fontSize: 14, color: 'var(--ink2)', fontWeight: 500, marginBottom: 8 }}>
        Paste a TikTok URL to save as a reference. The video link and thumbnail will be attached to the recipe.
      </div>
      <div style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 16, fontSize: 12, fontWeight: 600, color: 'var(--warn-text)' }}>
        TikTok doesn't allow transcript extraction — you'll fill in the recipe details manually.
      </div>
      <input className="input" placeholder="https://tiktok.com/@..." value={url} onChange={e => setUrl(e.target.value)} style={{ marginBottom: 12 }} />
      <button className="btn-primary" onClick={handleImport} disabled={!url.trim() || loading}>
        {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />Fetching...</> : <><i className="ti ti-brand-tiktok" />Continue</>}
      </button>
    </div>
  )
}

function VoiceImporter({ onResult, showToast }) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const recogRef = useRef(null)

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Speech recognition not supported in this browser')
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recog = new SR()
    recog.continuous = true
    recog.interimResults = true
    recog.lang = 'en-GB'
    recog.onresult = (e) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      setTranscript(text)
    }
    recog.onerror = () => { setListening(false); showToast('Microphone error') }
    recog.onend = () => setListening(false)
    recog.start()
    recogRef.current = recog
    setListening(true)
  }

  const stopListening = () => {
    recogRef.current?.stop()
    setListening(false)
  }

  const handleParse = async () => {
    if (!transcript.trim()) return
    setLoading(true)
    try {
      const r = await imports.voice(transcript)
      onResult(r.data, null, 'voice')
    } catch (e) {
      showToast('Could not parse voice input. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ fontSize: 14, color: 'var(--ink2)', fontWeight: 500, marginBottom: 20 }}>
        Tap the mic and describe the recipe — ingredients, quantities, and method. Claude will structure it for you.
      </div>
      <div onClick={listening ? stopListening : startListening} style={{
        width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
        background: listening ? '#E24B4A' : 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: listening ? '0 0 0 12px rgba(226,75,74,0.2)' : 'var(--shadow-md)',
        transition: 'all 0.2s',
      }}>
        <i className={`ti ${listening ? 'ti-microphone-off' : 'ti-microphone'}`} style={{ fontSize: 32, color: '#fff' }} />
      </div>
      {listening && <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#E24B4A', marginBottom: 12 }}>Listening... tap to stop</div>}
      {transcript && (
        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 14, fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.5, minHeight: 80 }}>
          {transcript}
        </div>
      )}
      {transcript && (
        <button className="btn-primary" onClick={handleParse} disabled={loading}>
          {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />Structuring recipe...</> : <><i className="ti ti-wand" />Structure with AI</>}
        </button>
      )}
    </div>
  )
}

function RecipeEditor({ data, sourceUrl, sourceType, onSave, showToast }) {
  const d = data?.claude || data?.scraped || {}
  const [title, setTitle] = useState(d.title || '')
  const [description, setDescription] = useState(d.description || '')
  const [cuisine, setCuisine] = useState(d.cuisine || '')
  const [difficulty, setDifficulty] = useState(d.difficulty || 'Medium')
  const [cookTime, setCookTime] = useState(d.cook_time_mins || '')
  const [portions, setPortions] = useState(d.base_portions || 4)
  const [tags, setTags] = useState(d.tags || [])
  const [ingredients, setIngredients] = useState((d.ingredients || []).map((i, idx) => ({ ...i, _key: idx })))
  const [method, setMethod] = useState((d.method || []).join('\n'))
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const imageUrl = data?.scraped?.image_url || data?.tiktok?.thumbnail || data?.thumbnail

  const toggleTag = (tag) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  const updateIngredient = (key, field, value) => {
    setIngredients(prev => prev.map(i => i._key === key ? { ...i, [field]: value } : i))
  }

  const removeIngredient = (key) => setIngredients(prev => prev.filter(i => i._key !== key))

  const addIngredient = () => {
    setIngredients(prev => [...prev, { _key: Date.now(), name: '', quantity: 0, unit: 'g' }])
  }

  const handleSave = async () => {
    if (!title.trim()) { showToast('Please add a recipe title'); return }
    setSaving(true)
    try {
      const payload = {
        title, description, cuisine, difficulty,
        cook_time_mins: cookTime ? parseInt(cookTime) : null,
        base_portions: portions,
        source_type: sourceType,
        source_url: sourceUrl,
        image_url: imageUrl,
        tags,
        notes: method,
        ingredients: ingredients.filter(i => i.name.trim()).map(i => ({
          name: i.name,
          quantity: parseFloat(i.quantity) || 0,
          unit: i.unit || 'g',
        }))
      }
      const r = await recipesApi.create(payload)
      showToast('Recipe saved!')
      navigate(`/recipes/${r.data.id}`)
    } catch (e) {
      showToast('Error saving recipe')
    } finally {
      setSaving(false)
    }
  }

  const ALL_TAGS = ['breakfast', 'lunch', 'dinner', 'snack', 'high-protein', 'low-carb', 'vegetarian', 'vegan', 'quick', 'meal-prep', 'diabetic-friendly']

  return (
    <div style={{ padding: '20px' }}>
      {imageUrl && (
        <div style={{ height: 140, borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16, background: 'var(--surface2)' }}>
          <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>Title</div>
      <input className="input" placeholder="Recipe title" value={title} onChange={e => setTitle(e.target.value)} style={{ marginBottom: 10 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>Cuisine</div>
          <input className="input" placeholder="e.g. Italian" value={cuisine} onChange={e => setCuisine(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>Difficulty</div>
          <select className="input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>Cook time (mins)</div>
          <input className="input" type="number" placeholder="30" value={cookTime} onChange={e => setCookTime(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>Base portions</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '7px 12px' }}>
            <div style={{ cursor: 'pointer', fontSize: 18, fontWeight: 800, color: 'var(--ink2)' }} onClick={() => setPortions(Math.max(1, portions - 1))}>−</div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800 }}>{portions}</div>
            <div style={{ cursor: 'pointer', fontSize: 18, fontWeight: 800, color: 'var(--ink)' }} onClick={() => setPortions(portions + 1)}>+</div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 8 }}>Tags</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {ALL_TAGS.map(t => (
          <div key={t} onClick={() => toggleTag(t)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            background: tags.includes(t) ? 'var(--accent)' : 'var(--surface2)',
            color: tags.includes(t) ? '#fff' : 'var(--ink2)',
          }}>{t.replace(/-/g, ' ')}</div>
        ))}
      </div>

      {/* Ingredients */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 8 }}>Ingredients</div>
      {ingredients.map(ing => (
        <div key={ing._key} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input className="input" placeholder="Ingredient" value={ing.name} onChange={e => updateIngredient(ing._key, 'name', e.target.value)} style={{ flex: 2 }} />
          <input className="input" type="number" placeholder="Qty" value={ing.quantity || ''} onChange={e => updateIngredient(ing._key, 'quantity', e.target.value)} style={{ flex: 1, minWidth: 0 }} />
          <select className="input" value={ing.unit || 'g'} onChange={e => updateIngredient(ing._key, 'unit', e.target.value)} style={{ flex: 1, minWidth: 0 }}>
            <option value="g">g</option><option value="ml">ml</option>
            <option value="tsp">tsp</option><option value="tbsp">tbsp</option>
            <option value="cup">cup</option><option value="whole">whole</option>
            <option value="pinch">pinch</option>
          </select>
          <i className="ti ti-x" style={{ color: 'var(--ink3)', fontSize: 16, cursor: 'pointer', flexShrink: 0 }} onClick={() => removeIngredient(ing._key)} />
        </div>
      ))}
      <button className="btn-secondary" onClick={addIngredient} style={{ marginBottom: 16 }}>
        <i className="ti ti-plus" />Add ingredient
      </button>

      {/* Method */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 8 }}>Method</div>
      <textarea className="input" placeholder="Enter each step on a new line..." value={method} onChange={e => setMethod(e.target.value)}
        style={{ minHeight: 120, resize: 'vertical', lineHeight: 1.6, marginBottom: 20 }} />

      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />Saving...</> : <><i className="ti ti-check" />Save recipe</>}
      </button>
    </div>
  )
}

export default function AddRecipeScreen({ showToast }) {
  const navigate = useNavigate()
  const [step, setStep] = useState('source') // source | importer | editor
  const [source, setSource] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [sourceUrl, setSourceUrl] = useState(null)

  const handleSourceSelect = (key) => {
    setSource(key)
    if (key === 'manual') {
      setImportResult({ claude: {} })
      setStep('editor')
    } else {
      setStep('importer')
    }
  }

  const handleImportResult = (data, url, type) => {
    setImportResult(data)
    setSourceUrl(url)
    setStep('editor')
  }

  return (
    <div className="screen" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', padding: '52px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={() => step === 'source' ? navigate(-1) : setStep(step === 'editor' ? 'importer' : 'source')}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 18 }} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 900 }}>
          {step === 'source' ? 'Add recipe' : step === 'importer' ? SOURCES.find(s => s.key === source)?.label : 'Review & save'}
        </div>
      </div>

      {step === 'source' && <SourcePicker onSelect={handleSourceSelect} />}

      {step === 'importer' && source === 'url' && <UrlImporter onResult={handleImportResult} showToast={showToast} />}
      {step === 'importer' && source === 'youtube' && <YouTubeImporter onResult={handleImportResult} showToast={showToast} />}
      {step === 'importer' && source === 'tiktok' && <TikTokImporter onResult={handleImportResult} showToast={showToast} />}
      {step === 'importer' && source === 'voice' && <VoiceImporter onResult={handleImportResult} showToast={showToast} />}

      {step === 'editor' && (
        <RecipeEditor data={importResult} sourceUrl={sourceUrl} sourceType={source} onSave={() => {}} showToast={showToast} />
      )}
    </div>
  )
}

const SOURCES = [
  { key: 'url', icon: 'ti-world', label: 'Recipe website', sub: 'BBC Good Food, AllRecipes, Tasty...' },
  { key: 'youtube', icon: 'ti-brand-youtube', label: 'YouTube video', sub: 'Paste a YouTube link' },
  { key: 'tiktok', icon: 'ti-brand-tiktok', label: 'TikTok', sub: 'Save link + add manually' },
  { key: 'manual', icon: 'ti-pencil', label: 'Type it out', sub: 'Enter recipe manually' },
  { key: 'voice', icon: 'ti-microphone', label: 'Speak it', sub: 'Describe the recipe out loud' },
]
