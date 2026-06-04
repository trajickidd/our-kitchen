import { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import './index.css'

import HomeScreen from './screens/HomeScreen'
import RecipesScreen from './screens/RecipesScreen'
import RecipeDetailScreen from './screens/RecipeDetailScreen'
import AddRecipeScreen from './screens/AddRecipeScreen'
import ProfileScreen from './screens/ProfileScreen'
import IngredientSearchScreen from './screens/IngredientSearchScreen'

function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  const isHome = path === '/'
  const isRecipes = path.startsWith('/recipes') && !path.includes('/add')
  const isProfile = path === '/profile'

  // Hide nav on detail / add screens
  const hide = path.includes('/recipes/') || path.includes('/add') || path.includes('/ingredient-search')
  if (hide) return null

  return (
    <nav className="bottom-nav">
      <div className={`nav-item ${isHome ? 'active' : ''}`} onClick={() => navigate('/')}>
        <i className="ti ti-home" />
        <span>Home</span>
      </div>
      <div className={`nav-item ${isRecipes ? 'active' : ''}`} onClick={() => navigate('/recipes')}>
        <i className="ti ti-book" />
        <span>Recipes</span>
      </div>
      <div className="nav-item">
        <div className="nav-add" onClick={() => navigate('/add')}>
          <i className="ti ti-plus" />
        </div>
      </div>
      <div className="nav-item">
        <i className="ti ti-heart" />
        <span>Saved</span>
      </div>
      <div className={`nav-item ${isProfile ? 'active' : ''}`} onClick={() => navigate('/profile')}>
        <i className="ti ti-user" />
        <span>Profile</span>
      </div>
    </nav>
  )
}

function AppToast({ toast }) {
  if (!toast) return null
  return <div className="toast">{toast}</div>
}

export default function App() {
  const [toast, setToast] = useState(null)

  const showToast = (msg, duration = 2500) => {
    setToast(msg)
    setTimeout(() => setToast(null), duration)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen showToast={showToast} />} />
        <Route path="/recipes" element={<RecipesScreen showToast={showToast} />} />
        <Route path="/recipes/:id" element={<RecipeDetailScreen showToast={showToast} />} />
        <Route path="/add" element={<AddRecipeScreen showToast={showToast} />} />
        <Route path="/profile" element={<ProfileScreen showToast={showToast} />} />
        <Route path="/ingredient-search" element={<IngredientSearchScreen />} />
      </Routes>
      <BottomNav />
      <AppToast toast={toast} />
    </BrowserRouter>
  )
}
