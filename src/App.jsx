import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { mealsDB, getMealsByAge, getMealsByAgeAndType, searchMeals, MEAL_TYPES, AGE_FILTERS } from './data/mealsDB.js'
import { getRecipe as getRecipeDB } from './data/recipesDB.js'
import {
  auth, onAuthChange,
  signInGoogle, getGoogleRedirectResult, signInEmail, signUpEmail, signOutUser,
  createFamily, joinFamily, getUserFamilyId,
  subscribeFamily, saveFamilyData,
} from './firebase.js'

function getRecipe(mealId, customRecipes) {
  const cr = customRecipes || loadLS('customRecipes', {})
  return cr[mealId] || getRecipeDB(mealId)
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
const DAY_LONG = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const MEAL_TINTS = {
  breakfast:       { tint: '#F5E3A8', tintSoft: '#FAEFCF' },
  morning_snack:   { tint: '#F2C9B5', tintSoft: '#FBE5D9' },
  lunch:           { tint: '#B5D9C2', tintSoft: '#DEF0E5' },
  afternoon_snack: { tint: '#C7D7E5', tintSoft: '#E2EBF1' },
  dinner:          { tint: '#D5C2E0', tintSoft: '#E9DFEF' },
}
const T = {
  bg: '#FAFAF7',
  green: '#7FB59A',
  dark: '#2C2826',
  mid: '#5C5550',
  light: '#9A938C',
  cream: '#F1ECE5',
  coral: '#E8886A',
  red: '#E85555',
  border: '#E8E2DA',
}

// ─── LOCALSTORAGE ─────────────────────────────────────────────────────────────
function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}
function saveLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ─── WEEK HELPERS ─────────────────────────────────────────────────────────────
function getWeekId(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + offset * 7)
  const year = d.getFullYear()
  const week = Math.ceil((d - new Date(year, 0, 1)) / (7 * 86400000))
  return `${year}-W${String(week).padStart(2, '0')}`
}
function sundayOfWeek(offset = 0) {
  const d = new Date()
  d.setHours(0,0,0,0)
  d.setDate(d.getDate() - d.getDay() + offset * 7)
  return d
}
const HEB_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
function weekDateRangeLabel(offset) {
  const sun = sundayOfWeek(offset)
  const sat = new Date(sun); sat.setDate(sat.getDate() + 6)
  if (sun.getMonth() === sat.getMonth())
    return `${sun.getDate()}–${sat.getDate()} ב${HEB_MONTHS[sun.getMonth()]}`
  return `${sun.getDate()} ב${HEB_MONTHS[sun.getMonth()]} – ${sat.getDate()} ב${HEB_MONTHS[sat.getMonth()]}`
}
function weekHeadlineLabel(offset) {
  if (offset === 0) return 'השבוע'
  if (offset === 1) return 'השבוע הבא'
  if (offset === -1) return 'שבוע שעבר'
  if (offset > 0) return `בעוד ${offset} שבועות`
  return `לפני ${-offset} שבועות`
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
function Icon({ name, size = 20, color = 'currentColor', style }) {
  const s = { width: size, height: size, display: 'inline-block', flexShrink: 0, ...style }
  switch (name) {
    case 'chev-r': return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={s}><polyline points="9 18 15 12 9 6"/></svg>
    case 'chev-l': return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={s}><polyline points="15 18 9 12 15 6"/></svg>
    case 'x':      return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" style={s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    case 'plus':   return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" style={s}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    case 'search': return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    case 'check':  return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={s}><polyline points="20 6 9 17 4 12"/></svg>
    case 'trash':  return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
    case 'whatsapp': return <svg viewBox="0 0 24 24" fill={color} style={s}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.408A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.152-1.162l-.298-.176-3.028.856.822-3.028-.19-.31A7.96 7.96 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/></svg>
    case 'copy':   return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
    case 'wand':   return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><path d="M15 4l5 5L8 21 3 16z"/><path d="M3 3l3 3"/><path d="M13 3l1 1"/><path d="M3 13l1 1"/><path d="M18 3l3 3"/></svg>
    case 'duplicate': return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><rect x="7" y="7" width="13" height="13" rx="2"/><path d="M5 17H4a2 2 0 01-2-2V4a2 2 0 012-2h11a2 2 0 012 2v1"/></svg>
    case 'clock':  return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    case 'users':  return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
    case 'snowflake': return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 7l-5-5-5 5"/><path d="M17 17l-5 5-5-5"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M7 7l-5 5 5 5"/><path d="M17 7l5 5-5 5"/></svg>
    case 'sparkle': return <svg viewBox="0 0 24 24" fill={color} style={s}><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
    case 'spoon':  return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><path d="M7 21l10-10"/><path d="M17 3a2.85 2.83 0 114 4L15 13l-4-4z"/></svg>
    case 'cart':   return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
    case 'bell':   return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
    case 'lock':   return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
    case 'gear':   return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
    default: return null
  }
}

// ─── SHARED SHEET WRAPPER ─────────────────────────────────────────────────────
function Sheet({ open, onClose, children, title }) {
  if (!open) return null
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        <div className="grabber" />
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 4px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.dark }}>{title}</h2>
            <button onClick={onClose} style={{ background: T.cream, border: 'none', borderRadius: 20, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.mid }}>
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </>
  )
}

// ─── PILL BUTTON ─────────────────────────────────────────────────────────────
function Pill({ active, onClick, children, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px',
        borderRadius: 20,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        background: active ? T.dark : T.cream,
        color: active ? '#fff' : T.mid,
        border: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function ToastMessage({ msg }) {
  return <div className="toast">{msg}</div>
}

// ─── SPOON HEART ILLUSTRATION ────────────────────────────────────────────────
function SpoonHeartIllo() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#FAEFCF" stroke="#F5E3A8" strokeWidth="2"/>
      <ellipse cx="60" cy="42" rx="16" ry="16" fill="#7FB59A" opacity="0.2"/>
      <path d="M60 28 C52 28 46 34 46 42 C46 50 60 62 60 62 C60 62 74 50 74 42 C74 34 68 28 60 28Z" fill="#E8886A" opacity="0.85"/>
      <path d="M55 72 L65 72 L63 92 Q61 96 59 92 Z" fill="#7FB59A" stroke="#5A9E82" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="60" cy="67" r="6" fill="#7FB59A"/>
      <path d="M57 42 Q60 38 63 42" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

// ─── ONBOARDING SCREEN ───────────────────────────────────────────────────────
function OnboardingScreen({ onComplete }) {
  const [name, setName] = useState('')
  const [count, setCount] = useState('1')
  const [age, setAge] = useState(12)
  const [allergies, setAllergies] = useState('')

  const rangeRef = useRef(null)
  useEffect(() => {
    if (rangeRef.current) {
      const pct = ((age - 6) / (36 - 6)) * 100
      rangeRef.current.style.setProperty('--pct', `${100 - pct}%`)
    }
  }, [age])

  const countOptions = [
    { val: '1', label: '1' },
    { val: '2', label: '2' },
    { val: 'twins', label: 'תאומים' },
    { val: 'more', label: 'יותר' },
  ]

  function handleSubmit() {
    if (!name.trim()) return
    onComplete({ name: name.trim(), count, ageMonths: age, allergies })
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 40px', gap: 0 }}>
      <div style={{ marginBottom: 24 }}>
        <SpoonHeartIllo />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: T.dark, marginBottom: 6, textAlign: 'center' }}>BabyPlate 🥄</h1>
      <p style={{ fontSize: 15, color: T.mid, marginBottom: 32, textAlign: 'center' }}>תכנון ארוחות שבועי לתינוקות וילדים קטנים</p>

      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Name */}
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: T.dark, display: 'block', marginBottom: 8 }}>שם הילד/ים *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="לדוגמה: נועה, אריאל"
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 14,
              border: `1.5px solid ${name ? T.green : T.border}`,
              fontSize: 15, background: '#fff', color: T.dark,
              transition: 'border-color 0.15s',
            }}
          />
        </div>

        {/* Count */}
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: T.dark, display: 'block', marginBottom: 8 }}>מספר ילדים</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {countOptions.map(o => (
              <Pill key={o.val} active={count === o.val} onClick={() => setCount(o.val)}>
                {o.label}
              </Pill>
            ))}
          </div>
        </div>

        {/* Age */}
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: T.dark, display: 'block', marginBottom: 8 }}>
            גיל בחודשים: <span style={{ color: T.green, fontWeight: 700 }}>{age} ח׳</span>
          </label>
          <input
            ref={rangeRef}
            type="range"
            min={6} max={36} value={age}
            onChange={e => setAge(+e.target.value)}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.light, marginTop: 4 }}>
            <span>6 חודשים</span><span>3 שנים</span>
          </div>
        </div>

        {/* Allergies */}
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: T.dark, display: 'block', marginBottom: 8 }}>
            אלרגיות <span style={{ fontWeight: 400, color: T.light }}>(אופציונלי)</span>
          </label>
          <textarea
            value={allergies}
            onChange={e => setAllergies(e.target.value)}
            placeholder="לדוגמה: בוטנים, גלוטן, חלב..."
            rows={2}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 14,
              border: `1.5px solid ${T.border}`, fontSize: 14,
              background: '#fff', color: T.dark,
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          style={{
            marginTop: 8, padding: '16px', borderRadius: 18,
            fontSize: 16, fontWeight: 700,
            background: name.trim() ? T.coral : T.border,
            color: name.trim() ? '#fff' : T.light,
            border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed',
            boxShadow: name.trim() ? '0 4px 20px rgba(232,136,106,0.35)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          בואו נתחיל לתכנן ✨
        </button>
      </div>
    </div>
  )
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onDone }) {
  const [mode, setMode] = useState('choose') // 'choose' | 'email-signin' | 'email-signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirectPending, setRedirectPending] = useState(false)

  // Handle Google redirect result on page load
  useEffect(() => {
    setRedirectPending(true)
    getGoogleRedirectResult()
      .then(() => setRedirectPending(false))
      .catch(() => setRedirectPending(false))
  }, [])

  async function handleGoogle() {
    setLoading(true); setError('')
    try { await signInGoogle() } catch (e) { setError('כניסה עם Google נכשלה'); setLoading(false) }
  }

  async function handleEmailSignIn() {
    setLoading(true); setError('')
    try { await signInEmail(email, password) }
    catch (e) { setError('אימייל או סיסמה שגויים'); setLoading(false) }
  }

  async function handleEmailSignUp() {
    if (!displayName.trim()) { setError('נא להזין שם'); return }
    setLoading(true); setError('')
    try { await signUpEmail(email, password, displayName.trim()) }
    catch (e) {
      if (e.code === 'auth/email-already-in-use') setError('אימייל כבר רשום, נסי להתחבר')
      else if (e.code === 'auth/weak-password') setError('סיסמה חלשה מדי (6 תווים לפחות)')
      else setError('הרשמה נכשלה')
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: 14,
    border: `1.5px solid ${T.border}`, fontSize: 15,
    background: '#fff', color: T.dark, marginBottom: 12,
  }

  if (redirectPending) {
    return (
      <div dir="rtl" lang="he" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF7', fontFamily: 'Rubik, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: T.green, borderRadius: 16, width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="spoon" size={28} color="#fff" />
          </div>
          <p style={{ color: T.mid, fontSize: 15 }}>מתחבר עם Google...</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" lang="he" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: 'linear-gradient(180deg, #FAFAF7 0%, #FAEFCF 100%)', fontFamily: 'Rubik, system-ui, sans-serif' }}>
      <div style={{ marginBottom: 20 }}><SpoonHeartIllo /></div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: T.dark, marginBottom: 6, textAlign: 'center' }}>BabyPlate 🥄</h1>
      <p style={{ fontSize: 14, color: T.mid, marginBottom: 32, textAlign: 'center' }}>כניסה לחשבון המשפחה</p>

      <div style={{ width: '100%', maxWidth: 380 }}>
        {mode === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={handleGoogle} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', borderRadius: 16, border: `1.5px solid ${T.border}`, background: '#fff', fontSize: 15, fontWeight: 600, color: T.dark, cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              כניסה עם Google
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: T.border }} />
              <span style={{ fontSize: 13, color: T.light }}>או עם אימייל</span>
              <div style={{ flex: 1, height: 1, background: T.border }} />
            </div>
            <button onClick={() => setMode('email-signin')} style={{ padding: '14px', borderRadius: 16, background: T.coral, color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              כניסה עם אימייל וסיסמה
            </button>
            <button onClick={() => setMode('email-signup')} style={{ padding: '12px', borderRadius: 16, background: T.cream, color: T.mid, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              חשבון חדש — הרשמה
            </button>
          </div>
        )}

        {mode === 'email-signin' && (
          <div>
            <button onClick={() => { setMode('choose'); setError('') }} style={{ background: 'none', border: 'none', color: T.mid, fontSize: 14, cursor: 'pointer', marginBottom: 20, padding: 0 }}>← חזרה</button>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.dark, marginBottom: 20 }}>כניסה</h2>
            <input type="email" placeholder="אימייל" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="סיסמה" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            {error && <p style={{ color: T.coral, fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <button onClick={handleEmailSignIn} disabled={loading || !email || !password} style={{ width: '100%', padding: '14px', borderRadius: 16, background: loading ? T.border : T.coral, color: loading ? T.light : '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: loading ? 'default' : 'pointer' }}>
              {loading ? 'מתחבר...' : 'כניסה'}
            </button>
          </div>
        )}

        {mode === 'email-signup' && (
          <div>
            <button onClick={() => { setMode('choose'); setError('') }} style={{ background: 'none', border: 'none', color: T.mid, fontSize: 14, cursor: 'pointer', marginBottom: 20, padding: 0 }}>← חזרה</button>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.dark, marginBottom: 20 }}>הרשמה</h2>
            <input type="text" placeholder="שם מלא" value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} />
            <input type="email" placeholder="אימייל" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="סיסמה (6 תווים לפחות)" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            {error && <p style={{ color: T.coral, fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <button onClick={handleEmailSignUp} disabled={loading || !email || !password} style={{ width: '100%', padding: '14px', borderRadius: 16, background: loading ? T.border : T.coral, color: loading ? T.light : '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: loading ? 'default' : 'pointer' }}>
              {loading ? 'נרשם...' : 'הרשמה'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── FAMILY SETUP SCREEN ──────────────────────────────────────────────────────
function FamilySetupScreen({ user, onDone }) {
  const [mode, setMode] = useState('choose') // 'choose' | 'create' | 'join'
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!familyName.trim()) { setError('נא להזין שם משפחה'); return }
    setLoading(true); setError('')
    try {
      const { familyId, inviteCode } = await createFamily(user.uid, familyName.trim())
      onDone(familyId)
    } catch (e) { setError('יצירת משפחה נכשלה'); setLoading(false) }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) { setError('נא להזין קוד הזמנה'); return }
    setLoading(true); setError('')
    try {
      const familyId = await joinFamily(user.uid, inviteCode)
      onDone(familyId)
    } catch (e) { setError(e.message || 'הצטרפות נכשלה'); setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: 14,
    border: `1.5px solid ${T.border}`, fontSize: 15,
    background: '#fff', color: T.dark, marginBottom: 12,
  }

  return (
    <div dir="rtl" lang="he" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: 'linear-gradient(180deg, #FAFAF7 0%, #FAEFCF 100%)', fontFamily: 'Rubik, system-ui, sans-serif' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>👨‍👩‍👧</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: T.dark, marginBottom: 8, textAlign: 'center' }}>הגדרת חשבון משפחה</h1>
      <p style={{ fontSize: 14, color: T.mid, marginBottom: 32, textAlign: 'center' }}>כל בני המשפחה רואים ועורכים את אותו תפריט</p>

      <div style={{ width: '100%', maxWidth: 380 }}>
        {mode === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setMode('create')} style={{ padding: '16px', borderRadius: 16, background: T.coral, color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              ✨ יצירת חשבון משפחה חדש
            </button>
            <button onClick={() => setMode('join')} style={{ padding: '14px', borderRadius: 16, background: T.cream, color: T.mid, fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              🔗 הצטרפות למשפחה קיימת
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div>
            <button onClick={() => { setMode('choose'); setError('') }} style={{ background: 'none', border: 'none', color: T.mid, fontSize: 14, cursor: 'pointer', marginBottom: 20, padding: 0 }}>← חזרה</button>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.dark, marginBottom: 20 }}>יצירת משפחה חדשה</h2>
            <input type="text" placeholder="שם המשפחה (לדוגמה: משפחת לוי)" value={familyName} onChange={e => setFamilyName(e.target.value)} style={inputStyle} />
            {error && <p style={{ color: T.coral, fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <button onClick={handleCreate} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 16, background: loading ? T.border : T.coral, color: loading ? T.light : '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: loading ? 'default' : 'pointer' }}>
              {loading ? 'יוצר...' : 'צור משפחה'}
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div>
            <button onClick={() => { setMode('choose'); setError('') }} style={{ background: 'none', border: 'none', color: T.mid, fontSize: 14, cursor: 'pointer', marginBottom: 20, padding: 0 }}>← חזרה</button>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.dark, marginBottom: 8 }}>הצטרפות למשפחה</h2>
            <p style={{ fontSize: 13, color: T.mid, marginBottom: 20 }}>בקש מבן/בת הזוג לשלוח לך את קוד ההזמנה מהגדרות האפליקציה</p>
            <input type="text" placeholder="קוד הזמנה (6 תווים)" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} style={{ ...inputStyle, textAlign: 'center', letterSpacing: 4, fontSize: 18, fontWeight: 700 }} />
            {error && <p style={{ color: T.coral, fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <button onClick={handleJoin} disabled={loading || inviteCode.length < 6} style={{ width: '100%', padding: '14px', borderRadius: 16, background: (loading || inviteCode.length < 6) ? T.border : T.green, color: (loading || inviteCode.length < 6) ? T.light : '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: (loading || inviteCode.length < 6) ? 'default' : 'pointer' }}>
              {loading ? 'מצטרף...' : 'הצטרף'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SETTINGS SHEET ───────────────────────────────────────────────────────────
function SettingsSheet({ open, profile, onSave, onClose, onAdminOpen, user, familyId, inviteCode, onSignOut }) {
  const [name, setName] = useState(profile?.name || '')
  const [count, setCount] = useState(profile?.count || '1')
  const [age, setAge] = useState(profile?.ageMonths || 12)
  const [allergies, setAllergies] = useState(profile?.allergies || '')
  const rangeRef = useRef(null)

  useEffect(() => {
    if (open) { setName(profile?.name || ''); setCount(profile?.count || '1'); setAge(profile?.ageMonths || 12); setAllergies(profile?.allergies || '') }
  }, [open, profile])

  useEffect(() => {
    if (rangeRef.current) {
      const pct = ((age - 6) / (36 - 6)) * 100
      rangeRef.current.style.setProperty('--pct', `${100 - pct}%`)
    }
  }, [age])

  const countOptions = [{ val: '1', label: '1' }, { val: '2', label: '2' }, { val: 'twins', label: 'תאומים' }, { val: 'more', label: 'יותר' }]

  return (
    <Sheet open={open} onClose={onClose} title="הגדרות פרופיל">
      <div style={{ padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: T.dark, display: 'block', marginBottom: 8 }}>שם הילד/ים</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: '#fff', color: T.dark }} />
        </div>
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: T.dark, display: 'block', marginBottom: 8 }}>מספר ילדים</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {countOptions.map(o => <Pill key={o.val} active={count === o.val} onClick={() => setCount(o.val)}>{o.label}</Pill>)}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: T.dark, display: 'block', marginBottom: 8 }}>
            גיל: <span style={{ color: T.green }}>{age} ח׳</span>
          </label>
          <input ref={rangeRef} type="range" min={6} max={36} value={age} onChange={e => setAge(+e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: T.dark, display: 'block', marginBottom: 8 }}>אלרגיות</label>
          <textarea value={allergies} onChange={e => setAllergies(e.target.value)} rows={2}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 14, background: '#fff', color: T.dark }} />
        </div>
        <button
          onClick={() => onSave({ name: name.trim() || profile.name, count, ageMonths: age, allergies })}
          style={{ padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700, background: T.green, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(127,181,154,0.35)' }}
        >
          שמור שינויים
        </button>
        <button
          onClick={() => { onClose(); setTimeout(onAdminOpen, 200) }}
          style={{ padding: '12px', borderRadius: 16, fontSize: 14, fontWeight: 600, background: T.cream, color: T.mid, border: 'none', cursor: 'pointer' }}
        >
          🔧 ניהול מתכונים (Admin)
        </button>

        {inviteCode && (
          <div style={{ background: T.cream, borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.dark, marginBottom: 6 }}>קוד הזמנה למשפחה</p>
            <p style={{ fontSize: 13, color: T.mid, marginBottom: 10 }}>שלחו קוד זה לבן/בת הזוג להצטרפות לחשבון המשפחה</p>
            <div style={{ background: '#fff', border: `2px solid ${T.border}`, borderRadius: 12, padding: '12px', textAlign: 'center', fontSize: 24, fontWeight: 700, letterSpacing: 6, color: T.dark }}>
              {inviteCode}
            </div>
          </div>
        )}

        {user && (
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
            <p style={{ fontSize: 12, color: T.light, marginBottom: 10, textAlign: 'center' }}>מחובר: {user.displayName || user.email}</p>
            <button
              onClick={onSignOut}
              style={{ width: '100%', padding: '12px', borderRadius: 16, fontSize: 14, fontWeight: 600, background: '#fff', color: T.coral, border: `1.5px solid ${T.coral}`, cursor: 'pointer' }}
            >
              התנתקות
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}

// ─── APP HEADER ───────────────────────────────────────────────────────────────
function AppHeader({ profile, onSettingsOpen }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 20px 12px',
      background: '#fff', borderBottom: `1px solid ${T.border}`,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ background: T.green, borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="spoon" size={18} color="#fff" />
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: T.dark }}>BabyPlate</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {profile && (
          <div style={{
            background: T.cream, borderRadius: 20,
            padding: '5px 12px', fontSize: 13, fontWeight: 500, color: T.mid,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="users" size={14} color={T.mid} />
            <span>{profile.name}</span>
            <span style={{ color: T.light, fontSize: 12 }}>· {profile.ageMonths} ח׳</span>
          </div>
        )}
        <button
          onClick={onSettingsOpen}
          style={{ background: T.cream, border: 'none', borderRadius: 20, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.mid, cursor: 'pointer' }}
        >
          <Icon name="gear" size={18} color={T.mid} />
        </button>
      </div>
    </div>
  )
}

// ─── TAB BAR ─────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tabs = [
    { key: 'plan',     label: 'תכנית',  emoji: '📅' },
    { key: 'prep',     label: 'הכנה',   emoji: '🍳' },
    { key: 'ideas',    label: 'רעיונות', emoji: '💡' },
    { key: 'shopping', label: 'קניות',  emoji: '🛒' },
  ]
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: '#fff', borderTop: `1px solid ${T.border}`,
      display: 'flex', zIndex: 20,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            flex: 1, padding: '10px 0 12px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 22 }}>{t.emoji}</span>
          <span style={{ fontSize: 11, fontWeight: active === t.key ? 700 : 400, color: active === t.key ? T.coral : T.light }}>
            {t.label}
          </span>
          {active === t.key && <div style={{ width: 20, height: 3, borderRadius: 2, background: T.coral, marginTop: -2 }} />}
        </button>
      ))}
    </div>
  )
}

// ─── MEAL EDIT SHEET ──────────────────────────────────────────────────────────
function MealEditSheet({ open, day, mealType, currentMeal, profile, onClose, onSelect, onClear, mealLibrary, setMealLibrary, showToast }) {
  const [query, setQuery] = useState('')
  const mt = MEAL_TYPES.find(m => m.key === mealType)
  const tint = MEAL_TINTS[mealType] || {}

  useEffect(() => { if (open) setQuery('') }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return mealLibrary.filter(m => m.mealType === mealType && m.ageMin <= profile.ageMonths && m.ageMax >= profile.ageMonths)
    }
    return searchMeals(query, profile.ageMonths).filter(m => m.mealType === mealType)
      .concat(searchMeals(query, profile.ageMonths).filter(m => m.mealType !== mealType))
  }, [query, mealLibrary, mealType, profile.ageMonths])

  const exactMatch = mealLibrary.some(m => m.name === query.trim())

  function handleAddManual() {
    const newMeal = {
      id: `manual-${Date.now()}`,
      name: query.trim(),
      ingredients: [],
      needsThawing: [],
      ageMin: profile.ageMonths,
      ageMax: 36,
      mealType,
      nutritionNote: '',
      source: 'manual',
    }
    setMealLibrary(prev => [...prev, newMeal])
    onSelect(newMeal)
    showToast?.('מנה נוספה לספרייה ✓')
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ padding: '4px 20px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>{mt?.emoji}</span>
            <div>
              <div style={{ fontSize: 13, color: T.light }}>יום {DAY_LONG[day]}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.dark }}>{mt?.label}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: T.cream, border: 'none', borderRadius: 20, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={16} color={T.mid} />
          </button>
        </div>

        {/* Current meal */}
        {currentMeal && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: tint.tintSoft || T.cream, borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: T.light, marginBottom: 2 }}>מנה נוכחית</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.dark }}>{currentMeal.name}</div>
            </div>
            <button
              onClick={() => { onClear(); onClose() }}
              style={{ background: '#FDEAEA', color: T.red, border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              הסר
            </button>
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Icon name="search" size={16} color={T.light} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="חפש מנה או מרכיב..."
            style={{
              width: '100%', paddingRight: 36, paddingLeft: 12, paddingTop: 11, paddingBottom: 11,
              borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 14, background: '#fff', color: T.dark,
            }}
          />
        </div>

        {/* Add manual */}
        {query.trim() && !exactMatch && (
          <button
            onClick={handleAddManual}
            style={{
              width: '100%', padding: '11px', borderRadius: 12, marginBottom: 10,
              background: T.green, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Icon name="plus" size={16} color="#fff" />
            הוסף "{query.trim()}"
          </button>
        )}

        {/* Suggestions */}
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: T.light, padding: '24px 0', fontSize: 14 }}>לא נמצאו מנות</div>
          )}
          {filtered.map(m => (
            <button
              key={m.id}
              onClick={() => { onSelect(m); onClose() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: `1px solid ${T.border}`,
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right',
              }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: tint.tintSoft || T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {mt?.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.dark }}>{m.name}</div>
                {m.nutritionNote && <div style={{ fontSize: 12, color: T.light, marginTop: 1 }}>{m.nutritionNote}</div>}
              </div>
              <span style={{ fontSize: 11, color: T.light, background: T.cream, borderRadius: 8, padding: '3px 7px', flexShrink: 0 }}>
                {m.ageMin}+ח׳
              </span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

// ─── ADD TO DAY SHEET ─────────────────────────────────────────────────────────
function AddToDaySheet({ open, idea, weekOffset, weekPlan, onClose, onPick }) {
  const weekId = getWeekId(weekOffset)
  const plan = weekPlan[weekId] || {}
  const mt = idea ? MEAL_TYPES.find(m => m.key === idea.mealType) : null

  if (!idea) return null

  return (
    <Sheet open={open} onClose={onClose} title={idea.name}>
      <div style={{ padding: '4px 20px 24px' }}>

        {/* Meal type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ background: MEAL_TINTS[idea.mealType]?.tintSoft || T.cream, borderRadius: 10, padding: '6px 12px', fontSize: 13, color: T.mid, fontWeight: 600 }}>
            {mt?.emoji} {mt?.label}
          </div>
          <span style={{ fontSize: 13, color: T.light }}>בחרי לאיזה יום בשבוע להוסיף את המנה</span>
        </div>

        {/* Day buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          {DAYS.map((d, i) => {
            const existingMeal = plan[i]?.[idea.mealType]
            return (
              <button
                key={i}
                onClick={() => onPick(i)}
                style={{
                  padding: '12px 16px', borderRadius: 14,
                  background: existingMeal ? T.cream : '#fff',
                  border: `1.5px solid ${existingMeal ? T.border : T.green}`,
                  cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  color: T.dark,
                }}
              >
                <span>יום {DAY_LONG[i]}</span>
                {existingMeal
                  ? <span style={{ fontSize: 12, color: T.light, fontWeight: 400 }}>יש כבר: {existingMeal} ← יוחלף</span>
                  : <span style={{ fontSize: 12, color: T.green, fontWeight: 500 }}>פנוי ✓</span>
                }
              </button>
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}

// ─── NEW IDEA SHEET ───────────────────────────────────────────────────────────
function NewIdeaSheet({ open, defaultAge, onClose, onSave }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('lunch')
  const [age, setAge] = useState(defaultAge || 12)
  const [note, setNote] = useState('')
  const rangeRef = useRef(null)

  useEffect(() => {
    if (open) { setName(''); setNote(''); setAge(defaultAge || 12) }
  }, [open, defaultAge])

  useEffect(() => {
    if (rangeRef.current) {
      const pct = ((age - 6) / (36 - 6)) * 100
      rangeRef.current.style.setProperty('--pct', `${100 - pct}%`)
    }
  }, [age])

  function handleSave() {
    if (!name.trim()) return
    onSave({
      id: `manual-${Date.now()}`,
      name: name.trim(),
      ingredients: [],
      needsThawing: [],
      ageMin: age,
      ageMax: 36,
      mealType: type,
      nutritionNote: note.trim(),
      source: 'manual',
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="מנה חדשה">
      <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: T.dark, display: 'block', marginBottom: 6 }}>שם המנה *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="לדוגמה: קציצות ירק"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 14, background: '#fff', color: T.dark }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: T.dark, display: 'block', marginBottom: 8 }}>סוג ארוחה</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {MEAL_TYPES.map(mt => (
              <Pill key={mt.key} active={type === mt.key} onClick={() => setType(mt.key)}>
                {mt.emoji} {mt.label}
              </Pill>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: T.dark, display: 'block', marginBottom: 6 }}>
            גיל מינימלי: <span style={{ color: T.green }}>{age} ח׳</span>
          </label>
          <input ref={rangeRef} type="range" min={6} max={36} value={age} onChange={e => setAge(+e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: T.dark, display: 'block', marginBottom: 6 }}>הערת תזונה (אופציונלי)</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="לדוגמה: עשיר בברזל"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 14, background: '#fff', color: T.dark }} />
        </div>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          style={{ padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 700, background: name.trim() ? T.coral : T.border, color: name.trim() ? '#fff' : T.light, border: 'none', cursor: name.trim() ? 'pointer' : 'default', boxShadow: name.trim() ? '0 4px 16px rgba(232,136,106,0.3)' : 'none' }}
        >
          שמור מנה
        </button>
      </div>
    </Sheet>
  )
}

// ─── TOMORROW BRIEFING ────────────────────────────────────────────────────────
function buildBriefingText(tomorrowIdx, dayAfterIdx, weekId, weekPlan, mealLibrary) {
  const plan = weekPlan[weekId] || {}
  const tmrMeals = plan[tomorrowIdx] || {}
  const daTMeals = plan[dayAfterIdx] || {}

  let lines = [`🍽️ תפריט מחר — יום ${DAY_LONG[tomorrowIdx]}`]
  let hasMenu = false
  for (const mt of MEAL_TYPES) {
    if (tmrMeals[mt.key]) {
      lines.push(`${mt.emoji} ${mt.label}: ${tmrMeals[mt.key]}`)
      hasMenu = true
    }
  }
  if (!hasMenu) lines.push('(לא תוכנן תפריט)')

  const thawItems = []
  for (const mt of MEAL_TYPES) {
    const mealName = daTMeals[mt.key]
    if (mealName) {
      const meal = mealLibrary.find(m => m.name === mealName)
      if (meal?.needsThawing?.length) {
        thawItems.push(...meal.needsThawing)
      }
    }
  }
  const uniqueThaw = [...new Set(thawItems)]
  if (uniqueThaw.length) {
    lines.push('', '❄️ להפשיר הערב:')
    uniqueThaw.forEach(i => lines.push(`• ${i}`))
  }

  return lines.join('\n')
}

function TomorrowBriefing({ weekId, weekPlan, mealLibrary, showToast, notificationTime, setNotificationTime }) {
  const todayIdx = new Date().getDay()
  const tomorrowIdx = (todayIdx + 1) % 7
  const dayAfterIdx = (todayIdx + 2) % 7

  const plan = weekPlan[weekId] || {}
  const tmrMeals = plan[tomorrowIdx] || {}
  const hasTomorrow = MEAL_TYPES.some(mt => tmrMeals[mt.key])

  const thawItems = useMemo(() => {
    const daTMeals = plan[dayAfterIdx] || {}
    const items = []
    for (const mt of MEAL_TYPES) {
      const mealName = daTMeals[mt.key]
      if (mealName) {
        const meal = mealLibrary.find(m => m.name === mealName)
        if (meal?.needsThawing?.length) items.push(...meal.needsThawing)
      }
    }
    return [...new Set(items)]
  }, [plan, dayAfterIdx, mealLibrary])

  const text = buildBriefingText(tomorrowIdx, dayAfterIdx, weekId, weekPlan, mealLibrary)

  const [showNotifPicker, setShowNotifPicker] = useState(false)
  const [notifInput, setNotifInput] = useState(notificationTime || '07:00')

  function handleWhatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`)
  }
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => showToast?.('הועתק ✓'))
  }
  function handleSetNotif() {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') { setNotificationTime(notifInput); setShowNotifPicker(false); showToast?.('תזכורת הוגדרה ✓') }
      })
    } else {
      setNotificationTime(notifInput); setShowNotifPicker(false); showToast?.('תזכורת הוגדרה ✓')
    }
  }

  return (
    <div style={{
      margin: '16px 16px 0',
      background: 'linear-gradient(135deg, #FBE5D9 0%, #FAEFCF 100%)',
      borderRadius: 24, padding: 18,
      boxShadow: '0 4px 20px rgba(127,181,154,0.08)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 10, background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(127,181,154,0.15)', fontSize: 16,
          }}>✨</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: T.dark }}>מחר</div>
        </div>
        <div style={{ fontSize: 12, color: '#5C8472', fontWeight: 500 }}>יום {DAY_LONG[tomorrowIdx]}</div>
      </div>

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {/* Right: tomorrow menu */}
        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 16, padding: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#5C8472', marginBottom: 8 }}>תפריט מחר</div>
          {hasTomorrow ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MEAL_TYPES.map(mt => {
                const meal = tmrMeals[mt.key]
                if (!meal) return null
                return (
                  <div key={mt.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11.5, color: T.dark }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{mt.emoji}</span>
                    <span style={{ lineHeight: 1.3, fontWeight: 500 }}>{meal}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: T.light, fontStyle: 'italic' }}>לא תוכנן תפריט</div>
          )}
        </div>

        {/* Left: thaw tonight */}
        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 16, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#5C8472', marginBottom: 4 }}>
            <span>להוציא מהמקפיא</span>
            <span style={{ fontSize: 13 }}>❄️</span>
          </div>
          <div style={{ fontSize: 10.5, color: T.light, marginBottom: 8 }}>עבור יום {DAY_LONG[dayAfterIdx]}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {thawItems.length === 0 ? (
              <div style={{ fontSize: 11, color: T.light, fontStyle: 'italic' }}>אין מה להפשיר</div>
            ) : thawItems.map(item => (
              <div key={item} style={{
                background: '#DCE5EE', color: '#4A6B83',
                padding: '5px 10px', borderRadius: 999,
                fontSize: 11, fontWeight: 500,
              }}>{item}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleWhatsapp} style={{
          flex: 1, background: T.green, color: '#fff',
          border: 'none', borderRadius: 14, padding: '11px',
          fontFamily: 'Rubik, sans-serif', fontWeight: 600, fontSize: 13.5,
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(127,181,154,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon name="whatsapp" size={15} color="#fff" />
          שלח ל-WhatsApp
        </button>
        <button onClick={handleCopy} style={{
          background: '#fff', color: T.dark,
          border: 'none', borderRadius: 14, padding: '11px 14px',
          fontFamily: 'Rubik, sans-serif', fontWeight: 600, fontSize: 13.5,
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(44,40,38,0.06)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="copy" size={14} color={T.dark} />
          העתק
        </button>
      </div>

      {/* Notification row */}
      <div style={{ marginTop: 10 }}>
        <button
          onClick={() => setShowNotifPicker(p => !p)}
          style={{
            width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 12, color: '#5C8472', fontFamily: 'Rubik, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '4px 0',
          }}
        >
          <Icon name="bell" size={13} color="#5C8472" />
          {notificationTime ? `תזכורת מוגדרת: ${notificationTime}` : 'הגדר תזכורת ערב'}
        </button>
        {showNotifPicker && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="time" value={notifInput} onChange={e => setNotifInput(e.target.value)}
              style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 15, background: '#fff', color: T.dark, textAlign: 'center' }}
            />
            <button onClick={handleSetNotif} style={{ padding: '9px 16px', borderRadius: 10, background: T.green, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              הגדר
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── WEEKLY PLAN SCREEN ───────────────────────────────────────────────────────
function WeeklyPlanScreen({ profile, weekPlan, setWeekPlan, weekOffset, setWeekOffset, mealLibrary, setMealLibrary, onSettingsOpen, showToast, notificationTime, setNotificationTime }) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  const [editSlot, setEditSlot] = useState(null)
  const [viewMode, setViewMode] = useState('daily')
  const [editingNote, setEditingNote] = useState(false)

  const weekId = getWeekId(weekOffset)
  const todayIdx = new Date().getDay()
  const plan = weekPlan[weekId] || {}

  function setDayNote(day, note) {
    setWeekPlan(prev => ({
      ...prev,
      [weekId]: {
        ...(prev[weekId] || {}),
        [day]: { ...((prev[weekId] || {})[day] || {}), _note: note || undefined },
      }
    }))
  }

  function setMeal(day, mealType, meal) {
    setWeekPlan(prev => ({
      ...prev,
      [weekId]: {
        ...(prev[weekId] || {}),
        [day]: {
          ...((prev[weekId] || {})[day] || {}),
          [mealType]: meal ? meal.name : undefined,
        }
      }
    }))
  }

  function autoFill() {
    const newPlan = { ...(weekPlan[weekId] || {}) }
    for (let d = 0; d < 7; d++) {
      newPlan[d] = newPlan[d] || {}
      for (const mt of MEAL_TYPES) {
        if (!newPlan[d][mt.key]) {
          const pool = mealLibrary.filter(m => m.mealType === mt.key && m.ageMin <= profile.ageMonths && m.ageMax >= profile.ageMonths)
          if (pool.length) {
            newPlan[d][mt.key] = pool[Math.floor(Math.random() * pool.length)].name
          }
        }
      }
    }
    setWeekPlan(prev => ({ ...prev, [weekId]: newPlan }))
    showToast?.('התפריט מולא אוטומטית ✓')
  }

  function duplicatePrevWeek() {
    const prevId = getWeekId(weekOffset - 1)
    const prevPlan = weekPlan[prevId]
    if (!prevPlan) { showToast?.('אין תפריט לשבוע הקודם'); return }
    setWeekPlan(prev => ({ ...prev, [weekId]: { ...prevPlan } }))
    showToast?.('שוכפל מהשבוע הקודם ✓')
  }

  function clearWeek() {
    setWeekPlan(prev => ({ ...prev, [weekId]: {} }))
    showToast?.('התפריט נוקה')
  }

  const currentMeal = editSlot ? (plan[selectedDay]?.[editSlot] || null) : null
  const currentMealObj = currentMeal ? mealLibrary.find(m => m.name === currentMeal) : null

  return (
    <div>
      <AppHeader profile={profile} onSettingsOpen={onSettingsOpen} />

      {/* Week navigator */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: T.cream, border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="chev-r" size={18} color={T.mid} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: T.dark }}>{weekHeadlineLabel(weekOffset)}</div>
            <div style={{ fontSize: 12, color: T.light }}>{weekDateRangeLabel(weekOffset)}</div>
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: T.cream, border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="chev-l" size={18} color={T.mid} />
          </button>
        </div>

        {/* View toggle + Action pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div style={{ display: 'flex', background: T.cream, borderRadius: 20, padding: 3, gap: 2 }}>
            {[{ key: 'daily', label: 'יומי' }, { key: 'table', label: 'שבועי' }].map(v => (
              <button key={v.key} onClick={() => setViewMode(v.key)} style={{ padding: '6px 16px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: viewMode === v.key ? '#fff' : 'transparent', color: viewMode === v.key ? T.dark : T.light, boxShadow: viewMode === v.key ? '0 1px 4px rgba(44,40,38,0.1)' : 'none', transition: 'all .15s' }}>
                {v.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={autoFill} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 11px', borderRadius: 20, background: T.green, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
              <Icon name="wand" size={13} color="#fff" />אוטומטי
            </button>
            <button onClick={duplicatePrevWeek} style={{ padding: '7px 11px', borderRadius: 20, background: T.cream, color: T.mid, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
              שכפל
            </button>
            <button onClick={clearWeek} style={{ width: 32, height: 32, borderRadius: 20, background: T.cream, color: T.mid, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trash" size={14} color={T.mid} />
            </button>
          </div>
        </div>
      </div>

      {/* Table view */}
      {viewMode === 'table' && (
        <div style={{ padding: '14px 12px 20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px', fontSize: 11, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: 52, padding: '6px 4px', color: T.light, fontWeight: 600, textAlign: 'right' }}></th>
                {DAYS.map((d, i) => {
                  const isToday = weekOffset === 0 && i === todayIdx
                  return (
                    <th key={i} style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: isToday ? T.green : T.dark, borderRadius: 6 }}>
                      {d}׳
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {MEAL_TYPES.map(mt => {
                const tint = MEAL_TINTS[mt.key]
                return (
                  <tr key={mt.key}>
                    <td style={{ padding: '4px 4px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: 10, color: T.mid, fontWeight: 600, lineHeight: 1.3 }}>{mt.label}</div>
                    </td>
                    {DAYS.map((d, i) => {
                      const mealName = plan[i]?.[mt.key]
                      return (
                        <td key={i} style={{ padding: '3px' }}>
                          <div
                            onClick={() => { setSelectedDay(i); setEditSlot(mt.key); setViewMode('daily') }}
                            style={{
                              background: mealName ? tint.tintSoft : '#F5F3F0',
                              borderRadius: 8, padding: '5px 4px',
                              minHeight: 44, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              textAlign: 'center',
                              fontSize: 10, color: mealName ? T.dark : T.light,
                              lineHeight: 1.3, fontWeight: mealName ? 500 : 400,
                              border: `1px solid ${mealName ? tint.tint : T.border}`,
                              transition: 'opacity .1s',
                            }}
                          >
                            {mealName || '+'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Day pills — daily mode only */}
      {viewMode === 'daily' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, padding: '14px 16px 0' }}>
        {DAYS.map((d, i) => {
          const dayPlan = plan[i] || {}
          const filled = MEAL_TYPES.filter(mt => dayPlan[mt.key]).length
          const isToday = weekOffset === 0 && i === todayIdx
          const isSelected = i === selectedDay
          return (
            <button
              key={i}
              onClick={() => { setSelectedDay(i); setEditingNote(false) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '10px 4px 8px',
                borderRadius: 14,
                background: isSelected ? T.dark : isToday ? T.green : T.cream,
                color: isSelected || isToday ? '#fff' : T.mid,
                border: 'none', cursor: 'pointer',
                boxShadow: isSelected ? '0 4px 12px rgba(44,40,38,0.2)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>{d}</span>
              {dayPlan._note && <span style={{ fontSize: 9 }}>📝</span>}
              <div style={{ display: 'flex', gap: 2 }}>
                {MEAL_TYPES.slice(0, 5).map((mt, mi) => (
                  <div key={mi} style={{ width: 4, height: 4, borderRadius: 2, background: dayPlan[mt.key] ? (isSelected || isToday ? 'rgba(255,255,255,0.7)' : T.green) : 'rgba(0,0,0,0.1)' }} />
                ))}
              </div>
            </button>
          )
        })}
      </div>}

      {/* Day label + meal slots (daily mode only) */}
      {viewMode === 'daily' && <>
        <div style={{ padding: '14px 16px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.dark }}>יום {DAY_LONG[selectedDay]}</span>
            {weekOffset === 0 && selectedDay === todayIdx && <span style={{ fontSize: 12, background: T.green, color: '#fff', borderRadius: 10, padding: '2px 8px' }}>היום</span>}
          </div>
        </div>

        {/* Day note */}
        <div style={{ padding: '4px 16px 8px' }}>
          {editingNote ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <textarea
                autoFocus
                value={plan[selectedDay]?._note || ''}
                onChange={e => setDayNote(selectedDay, e.target.value)}
                onBlur={() => setEditingNote(false)}
                placeholder="הערה ליום זה... (מטפלת, חג, טיול, בחוץ)"
                rows={2}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 12,
                  border: `1.5px solid ${T.green}`, fontSize: 13,
                  fontFamily: 'Rubik, sans-serif', color: T.dark,
                  background: '#FFFDF7', resize: 'none', outline: 'none',
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => setEditingNote(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: plan[selectedDay]?._note ? '#FFFDF7' : 'transparent',
                border: `1px ${plan[selectedDay]?._note ? 'solid' : 'dashed'} ${plan[selectedDay]?._note ? '#E8E2DA' : T.border}`,
                borderRadius: 12, padding: '8px 12px', cursor: 'pointer',
                width: '100%', textAlign: 'right',
              }}
            >
              <span style={{ fontSize: 16 }}>📝</span>
              <span style={{ fontSize: 13, color: plan[selectedDay]?._note ? T.dark : T.light, flex: 1, textAlign: 'right' }}>
                {plan[selectedDay]?._note || 'הוסיפי הערה ליום זה'}
              </span>
              {plan[selectedDay]?._note && (
                <span
                  onClick={e => { e.stopPropagation(); setDayNote(selectedDay, '') }}
                  style={{ fontSize: 12, color: T.light, padding: '2px 6px' }}
                >✕</span>
              )}
            </button>
          )}
        </div>

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MEAL_TYPES.map(mt => {
            const mealName = plan[selectedDay]?.[mt.key]
            const tint = MEAL_TINTS[mt.key]
            return (
              <button
                key={mt.key}
                onClick={() => setEditSlot(mt.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 14px',
                  borderRadius: 16,
                  background: mealName ? '#fff' : 'transparent',
                  border: mealName ? `1px solid ${T.border}` : `1.5px dashed ${T.border}`,
                  cursor: 'pointer', textAlign: 'right',
                  boxShadow: mealName ? '0 2px 8px rgba(44,40,38,0.06)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: mealName ? tint.tintSoft : T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {mt.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: T.light, marginBottom: 2 }}>{mt.label}</div>
                  {mealName ? (
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mealName}</div>
                  ) : (
                    <div style={{ fontSize: 13, color: T.light }}>לחצי להוספה</div>
                  )}
                </div>
                {mealName && <Icon name="chev-l" size={16} color={T.light} />}
              </button>
            )
          })}
        </div>

        {weekOffset === 0 && (
          <TomorrowBriefing
            weekId={weekId}
            weekPlan={weekPlan}
            mealLibrary={mealLibrary}
            showToast={showToast}
            notificationTime={notificationTime}
            setNotificationTime={setNotificationTime}
          />
        )}
        <div style={{ height: 20 }} />
      </>}

      {/* Meal edit sheet */}
      <MealEditSheet
        open={!!editSlot}
        day={selectedDay}
        mealType={editSlot}
        currentMeal={currentMealObj}
        profile={profile}
        mealLibrary={mealLibrary}
        setMealLibrary={setMealLibrary}
        onClose={() => setEditSlot(null)}
        onSelect={meal => { setMeal(selectedDay, editSlot, meal); showToast?.('מנה נוספה ✓') }}
        onClear={() => setMeal(selectedDay, editSlot, null)}
        showToast={showToast}
      />
    </div>
  )
}

// ─── MEAL IDEAS SCREEN ────────────────────────────────────────────────────────
// ─── RECIPE SHEET ─────────────────────────────────────────────────────────────
function scaleAmount(amountStr, ratio) {
  if (!amountStr || ratio === 1) return amountStr
  // Try to find and scale the first number (integer or fraction like ½ ¼ ¾)
  const fractions = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667 }
  let str = amountStr
  // Replace unicode fractions with decimals temporarily
  Object.entries(fractions).forEach(([f, v]) => { str = str.replace(f, String(v)) })
  // Match number (including decimal)
  const match = str.match(/([\d.]+)/)
  if (!match) return amountStr
  const scaled = parseFloat(match[1]) * ratio
  // Format nicely
  let formatted
  const frac = scaled % 1
  const whole = Math.floor(scaled)
  if (frac === 0) formatted = String(whole)
  else if (Math.abs(frac - 0.5) < 0.01) formatted = whole > 0 ? `${whole}½` : '½'
  else if (Math.abs(frac - 0.25) < 0.01) formatted = whole > 0 ? `${whole}¼` : '¼'
  else if (Math.abs(frac - 0.75) < 0.01) formatted = whole > 0 ? `${whole}¾` : '¾'
  else formatted = Number(scaled.toFixed(1)).toString()
  return str.replace(match[1], formatted)
}

function RecipeSheet({ meal, onClose, onAddToPlan }) {
  const [portions, setPortions] = useState(null) // null = use recipe default
  useEffect(() => { setPortions(null) }, [meal?.id])
  if (!meal) return null
  const mt = MEAL_TYPES.find(t => t.key === meal.mealType)
  const tints = MEAL_TINTS[meal.mealType] || {}
  const recipe = getRecipe(meal.id)
  const baseServings = recipe?.servings || 1
  const currentPortions = portions ?? baseServings
  const ratio = currentPortions / baseServings
  const ingredients = recipe?.ingredientsDetailed || meal.ingredients || []
  const instructions = recipe?.instructions || []
  const tip = recipe?.tip

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(28,24,22,0.5)', backdropFilter: 'blur(2px)' }} />

      {/* Sheet */}
      <div style={{
        position: 'relative', background: T.bg,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
        maxWidth: 480, width: '100%', margin: '0 auto',
      }}>
        {/* Grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 5, borderRadius: 99, background: '#DCD5CC' }} />
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 100 }}>
          {/* Hero banner */}
          <div style={{ background: tints.tintSoft || T.cream, padding: '14px 20px 18px', position: 'relative' }}>
            <button onClick={onClose} style={{
              position: 'absolute', top: 12, left: 16,
              width: 34, height: 34, borderRadius: 11, border: 'none',
              background: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(44,40,38,0.08)',
            }}>
              <Icon name="x" size={16} color={T.mid} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 50, height: 50, borderRadius: 16, background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, flexShrink: 0,
                boxShadow: '0 2px 8px rgba(44,40,38,0.06)',
              }}>{mt?.emoji}</div>
              <div>
                <div style={{ fontSize: 11.5, color: '#5C8472', fontWeight: 600 }}>ארוחת {mt?.label}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <div style={{ background: '#fff', color: '#3F8B6F', padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700 }}>
                    מ-{meal.ageMin} חודש
                  </div>
                  {meal.freezable && (
                    <div style={{ background: 'rgba(255,255,255,0.75)', color: '#4A6B83', padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 600 }}>
                      ❄️ להקפאה
                    </div>
                  )}
                  {meal.batchable && (
                    <div style={{ background: 'rgba(255,255,255,0.75)', color: '#7A6A1F', padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 600 }}>
                      ⚡ בכמות
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 22, color: T.dark, letterSpacing: -0.4, lineHeight: 1.2 }}>{meal.name}</div>
            <div style={{ fontSize: 12.5, color: T.mid, marginTop: 5 }}>{meal.nutritionNote}</div>
          </div>

          {/* Stats row — only when recipe has real data */}
          {recipe && (recipe.prepTime != null || recipe.cookTime != null) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '16px 20px 0' }}>
              {[
                { icon: 'clock',  label: 'הכנה',  value: recipe.prepTime != null ? `${recipe.prepTime} דק׳` : '—' },
                { icon: 'repeat', label: 'בישול', value: recipe.cookTime != null ? `${recipe.cookTime} דק׳` : '—' },
              ].map(s => (
                <div key={s.label} style={{
                  background: '#fff', borderRadius: 14, padding: '12px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  boxShadow: '0 2px 8px rgba(44,40,38,0.04)',
                }}>
                  <Icon name={s.icon} size={18} color={T.green} />
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.dark }}>{s.value}</div>
                  <div style={{ fontSize: 10.5, color: T.light }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Portions adjuster */}
          {recipe && (
            <div style={{ margin: '12px 20px 0', background: '#fff', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(44,40,38,0.04)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.dark }}>כמות מנות</div>
                <div style={{ fontSize: 11.5, color: T.light, marginTop: 2 }}>הרכיבים יתעדכנו בהתאם</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => setPortions(p => Math.max(0.5, (p ?? baseServings) - 0.5))}
                  style={{ width: 34, height: 34, borderRadius: 10, background: T.cream, border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, color: T.mid, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >−</button>
                <div style={{ minWidth: 36, textAlign: 'center', fontWeight: 700, fontSize: 18, color: T.dark }}>
                  {Number.isInteger(currentPortions) ? currentPortions : currentPortions.toFixed(1).replace('.0', '')}
                </div>
                <button
                  onClick={() => setPortions(p => (p ?? baseServings) + 0.5)}
                  style={{ width: 34, height: 34, borderRadius: 10, background: T.green, border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >+</button>
              </div>
            </div>
          )}

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <div style={{ padding: '18px 20px 0' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.dark, marginBottom: 10 }}>רכיבים</div>
              <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(44,40,38,0.04)' }}>
                {ingredients.map((ing, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px',
                    borderBottom: i < ingredients.length - 1 ? `1px solid ${T.cream}` : 'none',
                    fontSize: 14, color: T.dark,
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: tints.tint || T.green, flexShrink: 0 }} />
                    {typeof ing === 'string'
                      ? ing
                      : <span><span style={{ color: T.green, fontWeight: 700 }}>{scaleAmount(ing.amount, ratio)}</span> {ing.item}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {instructions.length > 0 && (
            <div style={{ padding: '18px 20px 0' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.dark, marginBottom: 10 }}>הוראות הכנה</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {instructions.map((step, i) => (
                  <div key={i} style={{
                    background: '#fff', borderRadius: 14, padding: '12px 14px',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    boxShadow: '0 2px 8px rgba(44,40,38,0.04)',
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: tints.tintSoft || T.cream,
                      color: '#3F8B6F', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 12, flexShrink: 0, marginTop: 1,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 14, color: T.dark, lineHeight: 1.45, flex: 1 }}>{step}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tip */}
          {tip && (
            <div style={{ margin: '18px 20px 0', background: '#FAEFCF', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>💡</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#7A6A1F', marginBottom: 3 }}>טיפ</div>
                <div style={{ fontSize: 13, color: T.mid, lineHeight: 1.45 }}>{tip}</div>
              </div>
            </div>
          )}

          {/* No recipe fallback */}
          {!recipe && ingredients.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: T.light, fontSize: 14 }}>
              אין פרטי מתכון למנה זו
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 20px 22px',
          background: `linear-gradient(180deg, rgba(250,250,247,0) 0%, ${T.bg} 30%)`,
        }}>
          <button onClick={() => onAddToPlan(meal)} style={{
            width: '100%', background: T.green, color: '#fff',
            border: 'none', borderRadius: 16, padding: '15px',
            fontFamily: 'Rubik, sans-serif', fontWeight: 700, fontSize: 15,
            cursor: 'pointer', boxShadow: '0 6px 20px rgba(127,181,154,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Icon name="plus" size={18} color="#fff" />
            הוספי לתכנית השבועית
          </button>
        </div>
      </div>
    </div>
  )
}

function MealIdeasScreen({ profile, mealLibrary, setMealLibrary, weekPlan, setWeekPlan, weekOffset, onSettingsOpen, showToast }) {
  const [ageFilter, setAgeFilter] = useState(() => {
    return AGE_FILTERS.find(f => f.min <= profile.ageMonths && f.max >= profile.ageMonths) || AGE_FILTERS[0]
  })
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [newIdeaOpen, setNewIdeaOpen] = useState(false)
  const [addToDayIdea, setAddToDayIdea] = useState(null)
  const [viewingRecipe, setViewingRecipe] = useState(null)

  const filtered = useMemo(() => {
    let pool = mealLibrary.filter(m => m.ageMin <= ageFilter.max && m.ageMax >= ageFilter.min)
    if (typeFilter !== 'all') pool = pool.filter(m => m.mealType === typeFilter)
    if (query.trim()) {
      const q = query.toLowerCase()
      pool = pool.filter(m => m.name.includes(q) || m.ingredients?.some(i => i.toLowerCase().includes(q)))
    }
    return pool
  }, [mealLibrary, ageFilter, typeFilter, query])

  function handleDelete(meal) {
    if (meal.source === 'db') return
    setMealLibrary(prev => prev.filter(m => m.id !== meal.id))
    showToast?.('מנה נמחקה')
  }

  function handleSaveNew(meal) {
    setMealLibrary(prev => [...prev, meal])
    showToast?.('מנה נוספה ✓')
  }

  function handlePick(ideaToAdd, dayIdx) {
    const weekId = getWeekId(weekOffset)
    setWeekPlan(prev => ({
      ...prev,
      [weekId]: {
        ...(prev[weekId] || {}),
        [dayIdx]: {
          ...((prev[weekId] || {})[dayIdx] || {}),
          [ideaToAdd.mealType]: ideaToAdd.name,
        }
      }
    }))
    setAddToDayIdea(null)
    showToast?.('נוסף לתפריט ✓')
  }

  return (
    <div>
      <AppHeader profile={profile} onSettingsOpen={onSettingsOpen} />

      <div style={{ padding: '14px 16px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: T.dark }}>ספריית רעיונות</div>
            <div style={{ fontSize: 13, color: T.light }}>{filtered.length} מנות</div>
          </div>
          <button
            onClick={() => setNewIdeaOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 14, background: T.coral, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 14px rgba(232,136,106,0.3)' }}
          >
            <Icon name="plus" size={15} color="#fff" />מנה חדשה
          </button>
        </div>

        {/* Age filters */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}>
          {AGE_FILTERS.map(f => (
            <Pill key={f.label} active={ageFilter.label === f.label} onClick={() => setAgeFilter(f)}>
              {f.label}
            </Pill>
          ))}
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
          <Pill active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>הכל</Pill>
          {MEAL_TYPES.map(mt => (
            <Pill key={mt.key} active={typeFilter === mt.key} onClick={() => setTypeFilter(mt.key)}>
              {mt.emoji} {mt.label}
            </Pill>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Icon name="search" size={16} color={T.light} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="חפש מנה או מרכיב..."
            style={{ width: '100%', paddingRight: 36, paddingLeft: 12, paddingTop: 10, paddingBottom: 10, borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 14, background: '#fff', color: T.dark }}
          />
        </div>
      </div>

      {/* Meal list */}
      <div style={{ padding: '0 16px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: T.light, fontSize: 14 }}>לא נמצאו מנות</div>
        )}
        {filtered.map(meal => {
          const mt = MEAL_TYPES.find(t => t.key === meal.mealType)
          const tint = MEAL_TINTS[meal.mealType]
          return (
            <div
              key={meal.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
                borderBottom: `1px solid ${T.border}`,
                cursor: 'pointer',
              }}
              onClick={() => setViewingRecipe(meal)}
            >
              <div style={{ width: 44, height: 44, borderRadius: 14, background: tint?.tintSoft || T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {mt?.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.dark }}>{meal.name}</div>
                {meal.nutritionNote && <div style={{ fontSize: 12, color: T.light, marginTop: 1 }}>{meal.nutritionNote}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, background: tint?.tint || T.cream, color: T.mid, borderRadius: 6, padding: '2px 7px' }}>{mt?.label}</span>
                  <span style={{ fontSize: 11, color: T.light }}>{meal.ageMin}+ ח׳</span>
                  {getRecipe(meal.id) && <span style={{ fontSize: 11, background: '#E8F4EE', color: T.green, borderRadius: 6, padding: '2px 7px', fontWeight: 600 }}>📋 מתכון</span>}
                  {meal.source !== 'db' && <span style={{ fontSize: 11, color: T.coral }}>✏️ שלי</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setAddToDayIdea(meal) }}
                  style={{ padding: '7px 13px', borderRadius: 10, background: T.green, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  + הוסף
                </button>
                {meal.source !== 'db' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(meal) }}
                    style={{ width: 32, height: 32, borderRadius: 10, background: '#FDEAEA', color: T.red, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="trash" size={15} color={T.red} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
        <div style={{ height: 16 }} />
      </div>

      <NewIdeaSheet open={newIdeaOpen} defaultAge={profile.ageMonths} onClose={() => setNewIdeaOpen(false)} onSave={handleSaveNew} />
      <AddToDaySheet
        open={!!addToDayIdea}
        idea={addToDayIdea}
        weekOffset={weekOffset}
        weekPlan={weekPlan}
        onClose={() => setAddToDayIdea(null)}
        onPick={dayIdx => handlePick(addToDayIdea, dayIdx)}
      />
      <RecipeSheet
        meal={viewingRecipe}
        onClose={() => setViewingRecipe(null)}
        onAddToPlan={meal => { setViewingRecipe(null); setAddToDayIdea(meal) }}
      />
    </div>
  )
}

// ─── SHOPPING SCREEN ──────────────────────────────────────────────────────────
function ShoppingScreen({ profile, weekPlan, weekOffset, mealLibrary, onSettingsOpen, showToast }) {
  const weekId = getWeekId(weekOffset)
  const [checkedAuto, setCheckedAuto] = useState(() => loadLS('checkedAutoItems', []))
  const [manualItems, setManualItems] = useState(() => loadLS('manualShoppingItems', []))
  const [newItem, setNewItem] = useState('')
  const [showNotifPicker, setShowNotifPicker] = useState(false)
  const [notifInput, setNotifInput] = useState('07:00')

  useEffect(() => { saveLS('checkedAutoItems', checkedAuto) }, [checkedAuto])
  useEffect(() => { saveLS('manualShoppingItems', manualItems) }, [manualItems])

  // Derive auto shopping list from current week plan
  const autoIngredients = useMemo(() => {
    const plan = weekPlan[weekId] || {}
    const all = []
    for (let d = 0; d < 7; d++) {
      const dayPlan = plan[d] || {}
      for (const mt of MEAL_TYPES) {
        const mealName = dayPlan[mt.key]
        if (mealName) {
          const meal = mealLibrary.find(m => m.name === mealName)
          if (meal?.ingredients?.length) {
            all.push(...meal.ingredients)
          }
        }
      }
    }
    return [...new Set(all)].sort()
  }, [weekPlan, weekId, mealLibrary])

  function toggleAuto(item) {
    setCheckedAuto(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
  }
  function toggleManual(id) {
    setManualItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }
  function addManual() {
    if (!newItem.trim()) return
    setManualItems(prev => [...prev, { id: Date.now().toString(), text: newItem.trim(), done: false }])
    setNewItem('')
  }
  function removeManual(id) {
    setManualItems(prev => prev.filter(i => i.id !== id))
  }
  function clearBought() {
    setManualItems(prev => prev.filter(i => !i.done))
    setCheckedAuto(prev => prev.filter(i => !autoIngredients.includes(i)))
    showToast?.('פריטים שנקנו נוקו ✓')
  }

  function buildShoppingText() {
    const unchecked = autoIngredients.filter(i => !checkedAuto.includes(i))
    const manualPending = manualItems.filter(i => !i.done)
    let lines = ['🛒 רשימת קניות — BabyPlate', '']
    if (unchecked.length) {
      lines.push('מרכיבים לארוחות:')
      unchecked.forEach(i => lines.push(`• ${i}`))
    }
    if (manualPending.length) {
      if (unchecked.length) lines.push('')
      lines.push('פריטים נוספים:')
      manualPending.forEach(i => lines.push(`• ${i.text}`))
    }
    return lines.join('\n')
  }

  function handleWhatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildShoppingText())}`)
  }
  function handleCopy() {
    navigator.clipboard.writeText(buildShoppingText()).then(() => showToast?.('הועתק ✓'))
  }

  function handleSetNotif() {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') { saveLS('notificationTime', notifInput); setShowNotifPicker(false); showToast?.('תזכורת הוגדרה ✓') }
      })
    } else {
      saveLS('notificationTime', notifInput); setShowNotifPicker(false); showToast?.('תזכורת הוגדרה ✓')
    }
  }

  return (
    <div>
      <AppHeader profile={profile} onSettingsOpen={onSettingsOpen} />

      <div style={{ padding: '14px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: T.dark }}>רשימת קניות</div>
            <div style={{ fontSize: 13, color: T.light }}>{weekHeadlineLabel(weekOffset)}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleWhatsapp} style={{ width: 36, height: 36, borderRadius: 10, background: '#25D366', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="whatsapp" size={18} color="#fff" />
            </button>
            <button onClick={handleCopy} style={{ width: 36, height: 36, borderRadius: 10, background: T.cream, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="copy" size={18} color={T.mid} />
            </button>
          </div>
        </div>

        {/* Auto section */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.dark, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="sparkle" size={15} color={T.green} />מרכיבים לארוחות
          </div>
          {autoIngredients.length === 0 ? (
            <div style={{ color: T.light, fontSize: 13, padding: '12px 0' }}>תכנני ארוחות כדי לראות מרכיבים</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              {autoIngredients.map((item, i) => {
                const checked = checkedAuto.includes(item)
                return (
                  <button
                    key={item}
                    onClick={() => toggleAuto(item)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '13px 14px',
                      borderBottom: i < autoIngredients.length - 1 ? `1px solid ${T.border}` : 'none',
                      background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right',
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${checked ? T.green : T.border}`,
                      background: checked ? T.green : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {checked && <Icon name="check" size={13} color="#fff" />}
                    </div>
                    <span style={{ fontSize: 14, color: checked ? T.light : T.dark, textDecoration: checked ? 'line-through' : 'none', flex: 1, textAlign: 'right' }}>
                      {item}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Manual section */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.dark, marginBottom: 8 }}>פריטים נוספים</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              type="text" value={newItem} onChange={e => setNewItem(e.target.value)}
              placeholder="הוסף פריט..."
              onKeyDown={e => e.key === 'Enter' && addManual()}
              style={{ flex: 1, padding: '11px 13px', borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 14, background: '#fff', color: T.dark }}
            />
            <button onClick={addManual} style={{ width: 44, height: 44, borderRadius: 12, background: T.green, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={20} color="#fff" />
            </button>
          </div>

          {manualItems.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              {manualItems.map((item, i) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < manualItems.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <button
                    onClick={() => toggleManual(item.id)}
                    style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                      border: `2px solid ${item.done ? T.green : T.border}`,
                      background: item.done ? T.green : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {item.done && <Icon name="check" size={13} color="#fff" />}
                  </button>
                  <span style={{ flex: 1, fontSize: 14, color: item.done ? T.light : T.dark, textDecoration: item.done ? 'line-through' : 'none', textAlign: 'right' }}>{item.text}</span>
                  <button onClick={() => removeManual(item.id)} style={{ width: 28, height: 28, borderRadius: 8, background: '#FDEAEA', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="x" size={13} color={T.red} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={clearBought}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 14, background: T.cream, color: T.mid, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <Icon name="check" size={15} color={T.mid} />נקה שנקנו
          </button>
          <button
            onClick={() => setShowNotifPicker(p => !p)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', borderRadius: 14, background: T.cream, color: T.mid, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <Icon name="bell" size={15} color={T.mid} />תזכורת קניות
          </button>
        </div>

        {showNotifPicker && (
          <div style={{ marginTop: 10, background: T.cream, borderRadius: 14, padding: '14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="time" value={notifInput} onChange={e => setNotifInput(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 15, background: '#fff', color: T.dark }}
            />
            <button onClick={handleSetNotif} style={{ padding: '10px 18px', borderRadius: 10, background: T.green, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              הגדר
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PREP SCREEN ──────────────────────────────────────────────────────────────
function PrepScreen({ profile, weekPlan, mealLibrary, onGoToPlan, showToast }) {
  const [viewing, setViewing] = useState(0)

  const weekOptions = [
    { v: 0, label: 'השבוע' },
    { v: 1, label: 'השבוע הבא' },
    { v: 2, label: 'בעוד שבועיים' },
  ]

  const weekId = getWeekId(viewing)
  const plan = weekPlan[weekId] || {}

  // Collect batchable + freezable meals from plan
  // Use mealsDB directly for batchable/freezable/timing fields (always up-to-date, unlike localStorage cache)
  const { batchable, freezable, totalMeals, totalPrepMins } = useMemo(() => {
    const bMap = new Map(), fMap = new Map()
    let total = 0, mins = 0
    for (let d = 0; d < 7; d++) {
      for (const mt of MEAL_TYPES) {
        const name = plan[d]?.[mt.key]
        if (!name) continue
        total++
        // Look up in mealsDB first (has fresh metadata), fall back to mealLibrary
        const dbMeal = mealsDB.find(m => m.name === name)
        const libMeal = mealLibrary.find(m => m.name === name)
        const meal = dbMeal || libMeal
        if (!meal) continue
        const enriched = { ...meal, ...(dbMeal || {}) }
        // Deduplicate by name — same meal can appear under different IDs (lunch vs dinner)
        if (enriched.batchable) {
          if (!bMap.has(name)) bMap.set(name, { meal: enriched, days: [] })
          bMap.get(name).days.push(d)
        }
        if (enriched.freezable) {
          if (!fMap.has(name)) fMap.set(name, { meal: enriched, days: [] })
          fMap.get(name).days.push(d)
        }
      }
    }
    bMap.forEach(({ meal, days }) => {
      const r = getRecipe(meal.id)
      const prep = r?.prepTime ?? meal.prepTime ?? 10
      const cook = r?.cookTime ?? meal.cookTime ?? 20
      mins += (prep + cook) * Math.max(1, Math.ceil(days.length / 2))
    })
    return { batchable: [...bMap.values()], freezable: [...fMap.values()], totalMeals: total, totalPrepMins: mins }
  }, [plan, mealLibrary])

  const empty = totalMeals === 0

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '20px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.dark, letterSpacing: -0.5 }}>הכנה מראש</div>
          <div style={{ fontSize: 13, color: T.light, marginTop: 3 }}>תכנון חכם, פחות סטרס באמצע השבוע</div>
        </div>
      </div>

      {/* Week selector */}
      <div style={{ padding: '10px 20px 16px', display: 'flex', gap: 8 }}>
        {weekOptions.map(o => {
          const active = o.v === viewing
          return (
            <button key={o.v} onClick={() => setViewing(o.v)} style={{
              flex: 1, padding: '10px 6px', borderRadius: 12,
              border: 'none', cursor: 'pointer',
              background: active ? T.dark : '#fff',
              color: active ? '#fff' : T.mid,
              fontFamily: 'Rubik, sans-serif', fontWeight: 600, fontSize: 12.5,
              boxShadow: active ? '0 4px 12px rgba(44,40,38,0.18)' : '0 2px 8px rgba(44,40,38,0.04)',
              transition: 'all .15s',
            }}>{o.label}</button>
          )
        })}
      </div>

      {empty ? (
        <div style={{ padding: '20px' }}>
          <div style={{
            background: '#fff', borderRadius: 22, padding: '32px 24px',
            textAlign: 'center', boxShadow: '0 4px 20px rgba(44,40,38,0.05)',
          }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🌱</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: T.dark }}>עדיין אין תכנית לשבוע הזה</div>
            <div style={{ fontSize: 13, color: T.light, marginTop: 6, lineHeight: 1.5 }}>
              מלאי קודם את הארוחות בלשונית "תכנית" ונציע לך מה לבשל מראש ומה להקפיא
            </div>
            <button onClick={onGoToPlan} style={{
              marginTop: 18, background: T.green, color: '#fff',
              border: 'none', borderRadius: 14, padding: '12px 24px',
              fontFamily: 'Rubik, sans-serif', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(127,181,154,0.3)',
            }}>פתחי את התכנית</button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 20px 30px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Summary strip */}
          <div style={{
            background: 'linear-gradient(135deg, #DEF0E5 0%, #FAEFCF 100%)',
            borderRadius: 22, padding: '16px 18px',
            boxShadow: '0 4px 20px rgba(127,181,154,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(127,181,154,0.15)', fontSize: 16 }}>✨</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.dark }}>סוף השבוע – מומלץ להשקיע</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'זמן בישול', value: `${totalPrepMins} דק׳` },
                { label: 'לבשל בכמות', value: `${batchable.length} מנות` },
                { label: 'להקפאה', value: `${freezable.length} מנות` },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 20, color: T.dark }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: T.light, marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* No batchable/freezable meals */}
          {batchable.length === 0 && freezable.length === 0 && totalMeals > 0 && (
            <div style={{ background: '#fff', borderRadius: 20, padding: '24px', textAlign: 'center', boxShadow: '0 4px 20px rgba(44,40,38,0.05)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🥗</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.dark, marginBottom: 6 }}>המנות שתכננת לא דורשות הכנה מראש</div>
              <div style={{ fontSize: 13, color: T.light, lineHeight: 1.5 }}>הוסיפי מנות כמו מרק, קציצות, פירה, תבשיל עדשים — אלה מנות שאפשר להכין בכמות גדולה ולהקפיא</div>
            </div>
          )}

          {/* Batchable */}
          {batchable.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 20, padding: '16px', boxShadow: '0 4px 20px rgba(44,40,38,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: '#FAEFCF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>⚡</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.dark }}>לבשל בכמות גדולה</div>
                <div style={{ fontSize: 11.5, color: T.light, marginRight: 'auto' }}>הכיני פעם אחת — מספיק לכמה ימים</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {batchable.map(({ meal, days }) => {
                  const mt = MEAL_TYPES.find(t => t.key === meal.mealType)
                  const tints = MEAL_TINTS[meal.mealType] || {}
                  const recipe = getRecipe(meal.id)
                  const totalTime = recipe ? (recipe.prepTime ?? meal.prepTime ?? 0) + (recipe.cookTime ?? meal.cookTime ?? 0) : null
                  const timesThisWeek = days.length
                  return (
                    <div key={meal.name} style={{
                      background: tints.tintSoft || T.cream, borderRadius: 14,
                      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 13, background: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                      }}>{mt?.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: T.dark }}>{meal.name}</div>
                        <div style={{ fontSize: 11.5, color: T.light, marginTop: 2 }}>
                          הכיני פעם אחת — מספיק לכמה ימים
                          {totalTime ? ` · ${totalTime} דק׳` : ''}
                        </div>
                      </div>
                      {meal.freezable && (
                        <div style={{ background: '#DCE5EE', color: '#4A6B83', padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                          ❄️ להקפאה
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Freezable only (not in batchable) */}
          {freezable.filter(f => !batchable.find(b => b.meal.name === f.meal.name)).length > 0 && (
            <div style={{ background: '#fff', borderRadius: 20, padding: '16px', boxShadow: '0 4px 20px rgba(44,40,38,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: '#E2EBF1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>❄️</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.dark }}>מנות להקפאה</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {freezable.filter(f => !batchable.find(b => b.meal.name === f.meal.name)).map(({ meal, days }) => {
                  const mt = MEAL_TYPES.find(t => t.key === meal.mealType)
                  const tints = MEAL_TINTS[meal.mealType] || {}
                  return (
                    <div key={meal.id} style={{ background: tints.tintSoft || T.cream, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 13, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{mt?.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: T.dark }}>{meal.name}</div>
                        <div style={{ fontSize: 11.5, color: T.light, marginTop: 2 }}>ל-{days.length} ימים</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tip */}
          <div style={{ background: '#FAEFCF', borderRadius: 18, padding: '14px 16px', display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div style={{ fontSize: 13, color: '#5C5550', lineHeight: 1.5 }}>
              <strong>טיפ:</strong> בשלי כמות כפולה ממנות ניתנות להקפאה, חלקי לקופסאות מנה — ותחסכי שעות בשבוע הבא.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ADMIN SCREEN ────────────────────────────────────────────────────────────
function AdminScreen({ onClose, customRecipes, setCustomRecipes }) {
  const [selectedMealId, setSelectedMealId] = useState('')
  const [form, setForm] = useState({ servings: '', prepTime: '', cookTime: '', ingredients: '', instructions: '', tip: '' })
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const allMeals = mealsDB.map(m => ({ id: m.id, name: m.name, type: m.mealType }))

  function loadExisting(id) {
    setSelectedMealId(id)
    const existing = customRecipes[id] || getRecipeDB(id)
    if (existing) {
      setForm({
        servings: existing.servings || '',
        prepTime: existing.prepTime ?? '',
        cookTime: existing.cookTime ?? '',
        ingredients: (existing.ingredientsDetailed || []).map(i => `${i.amount} ${i.item}`).join('\n'),
        instructions: (existing.instructions || []).join('\n'),
        tip: existing.tip || '',
      })
    } else {
      setForm({ servings: '', prepTime: '', cookTime: '', ingredients: '', instructions: '', tip: '' })
    }
    setSaved(false)
  }

  function saveRecipe() {
    if (!selectedMealId) return
    const ingredientsDetailed = form.ingredients.split('\n').filter(Boolean).map(line => {
      const parts = line.trim().split(' ')
      return { amount: parts[0] || '', item: parts.slice(1).join(' ') }
    })
    const recipe = {
      servings: Number(form.servings) || undefined,
      prepTime: form.prepTime !== '' ? Number(form.prepTime) : undefined,
      cookTime: form.cookTime !== '' ? Number(form.cookTime) : undefined,
      ingredientsDetailed,
      instructions: form.instructions.split('\n').filter(Boolean),
      tip: form.tip || undefined,
    }
    const updated = { ...customRecipes, [selectedMealId]: recipe }
    setCustomRecipes(updated)
    saveLS('customRecipes', updated)
    setSaved(true)
  }

  async function generateWithAI() {
    if (!selectedMealId) return
    const meal = mealsDB.find(m => m.id === selectedMealId)
    if (!meal) return
    setAiLoading(true)
    const prompt = `You are a baby food expert. Write a detailed recipe for: "${meal.name}".
Ingredients: ${meal.ingredients.join(', ')}.
Age range: ${meal.ageMin}–${meal.ageMax} months.
${aiPrompt ? `Additional notes: ${aiPrompt}` : ''}

Respond ONLY in valid JSON (no markdown) with this shape:
{
  "servings": <number>,
  "prepTime": <minutes as number>,
  "cookTime": <minutes as number>,
  "ingredientsDetailed": [{"amount": "...", "item": "..."}],
  "instructions": ["step 1", "step 2"],
  "tip": "one tip"
}
All text must be in Hebrew.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const recipe = JSON.parse(text)
      setForm({
        servings: recipe.servings || '',
        prepTime: recipe.prepTime ?? '',
        cookTime: recipe.cookTime ?? '',
        ingredients: (recipe.ingredientsDetailed || []).map(i => `${i.amount} ${i.item}`).join('\n'),
        instructions: (recipe.instructions || []).join('\n'),
        tip: recipe.tip || '',
      })
    } catch (e) {
      alert('שגיאה ביצירת מתכון עם AI. בדקי שמפתח ה-API תקין.')
    } finally {
      setAiLoading(false)
    }
  }

  const labelStyle = { fontSize: 12, color: T.mid, marginBottom: 4, display: 'block' }
  const inputStyle = { width: '100%', padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, fontFamily: 'Rubik, sans-serif', boxSizing: 'border-box', background: '#fff' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: T.bg, width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: '20px 20px 0 0', maxHeight: '92dvh', overflowY: 'auto', padding: '20px 20px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>ניהול מתכונים</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: T.mid }}>✕</button>
        </div>

        <label style={labelStyle}>בחר מנה</label>
        <select
          value={selectedMealId}
          onChange={e => loadExisting(e.target.value)}
          style={{ ...inputStyle, marginBottom: 16 }}
        >
          <option value="">-- בחר מנה --</option>
          {allMeals.map(m => (
            <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
          ))}
        </select>

        {selectedMealId && (
          <>
            <div style={{ background: '#F0F9F4', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.mid, marginBottom: 6 }}>יצירת מתכון עם AI</div>
              <input
                placeholder="הוראות נוספות (אופציונלי)"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <button
                onClick={generateWithAI}
                disabled={aiLoading}
                style={{ background: T.green, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: aiLoading ? 0.6 : 1 }}
              >
                {aiLoading ? 'יוצר מתכון...' : '✨ צור מתכון עם AI'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>מנות</label>
                <input type="number" value={form.servings} onChange={e => setForm(f => ({ ...f, servings: e.target.value }))} style={inputStyle} placeholder="4" />
              </div>
              <div>
                <label style={labelStyle}>הכנה (דק')</label>
                <input type="number" value={form.prepTime} onChange={e => setForm(f => ({ ...f, prepTime: e.target.value }))} style={inputStyle} placeholder="10" />
              </div>
              <div>
                <label style={labelStyle}>בישול (דק')</label>
                <input type="number" value={form.cookTime} onChange={e => setForm(f => ({ ...f, cookTime: e.target.value }))} style={inputStyle} placeholder="20" />
              </div>
            </div>

            <label style={labelStyle}>מרכיבים (שורה אחת לכל מרכיב, כמות + שם)</label>
            <textarea
              value={form.ingredients}
              onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))}
              rows={5}
              placeholder={"2 כוסות קמח אורז\n1 בננה בשלה"}
              style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }}
            />

            <label style={labelStyle}>הוראות הכנה (שורה לכל שלב)</label>
            <textarea
              value={form.instructions}
              onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
              rows={5}
              placeholder={"בשל את האורז במים...\nהוסף בננה ועט..."}
              style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }}
            />

            <label style={labelStyle}>טיפ</label>
            <input
              value={form.tip}
              onChange={e => setForm(f => ({ ...f, tip: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 20 }}
              placeholder="ניתן להקפיא עד חודש..."
            />

            <button
              onClick={saveRecipe}
              style={{ width: '100%', background: T.coral, color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              {saved ? '✓ נשמר!' : 'שמור מתכון'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── MERGE MEAL LIBRARY ───────────────────────────────────────────────────────
function mergeMealLibrary(saved) {
  if (!saved || !saved.length) return mealsDB.map(m => ({ ...m }))
  const hasOldIds = saved.some(m => /^[a-z]+\d$/.test(m.id))
  if (hasOldIds) return mealsDB.map(m => ({ ...m }))
  const savedIds = new Set(saved.map(m => m.id))
  const merged = saved.map(m => {
    const fresh = mealsDB.find(db => db.id === m.id)
    return fresh ? { ...m, ...fresh } : m
  })
  mealsDB.forEach(m => { if (!savedIds.has(m.id)) merged.push({ ...m }) })
  return merged
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  // Auth state
  const [authUser, setAuthUser] = useState(undefined) // undefined = loading
  const [familyId, setFamilyId] = useState(null)
  const [familyData, setFamilyData] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  // UI state
  const [tab, setTab] = useState('plan')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [toast, setToast] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)

  // Local-only state (not shared)
  const [notificationTime, setNotificationTime] = useState(() => loadLS('notificationTime', null))

  // Listen to Firebase auth changes
  useEffect(() => {
    return onAuthChange(async (user) => {
      setAuthUser(user)
      if (user) {
        const fid = await getUserFamilyId(user.uid)
        setFamilyId(fid)
      } else {
        setFamilyId(null)
        setFamilyData(null)
      }
      setAuthReady(true)
    })
  }, [])

  // Subscribe to family Firestore data
  useEffect(() => {
    if (!familyId) return
    const unsub = subscribeFamily(familyId, data => setFamilyData(data))
    return unsub
  }, [familyId])

  // Derived shared state from familyData
  const profile = familyData?.profile || null
  const weekPlan = familyData?.weekPlan || {}
  const customRecipes = familyData?.customRecipes || {}
  const mealLibrary = useMemo(() => mergeMealLibrary(familyData?.mealLibrary), [familyData?.mealLibrary])

  // Save helpers — write to Firestore
  const saveProfile = useCallback(async (p) => {
    if (!familyId) return
    await saveFamilyData(familyId, { profile: p })
  }, [familyId])

  const setWeekPlan = useCallback(async (updater) => {
    if (!familyId) return
    const next = typeof updater === 'function' ? updater(weekPlan) : updater
    await saveFamilyData(familyId, { weekPlan: next })
  }, [familyId, weekPlan])

  const setMealLibrary = useCallback(async (updater) => {
    if (!familyId) return
    const next = typeof updater === 'function' ? updater(mealLibrary) : updater
    await saveFamilyData(familyId, { mealLibrary: next })
  }, [familyId, mealLibrary])

  const setCustomRecipes = useCallback(async (updater) => {
    if (!familyId) return
    const next = typeof updater === 'function' ? updater(customRecipes) : updater
    await saveFamilyData(familyId, { customRecipes: next })
    saveLS('customRecipes', next) // keep local copy for getRecipe()
  }, [familyId, customRecipes])

  // Sync customRecipes to localStorage so getRecipe() can use them without prop drilling
  useEffect(() => {
    if (customRecipes && Object.keys(customRecipes).length > 0) {
      saveLS('customRecipes', customRecipes)
    }
  }, [customRecipes])

  // Notification interval
  useEffect(() => {
    if (!notificationTime) return
    const iv = setInterval(() => {
      const now = new Date()
      const cur = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      if (cur === notificationTime && Notification.permission === 'granted') {
        new Notification('BabyPlate 🥄', { body: 'הכינו את ארוחות הילדים לתכנית השבועית!' })
      }
    }, 60000)
    return () => clearInterval(iv)
  }, [notificationTime])

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }, [])

  // Loading state
  if (!authReady) {
    return (
      <div dir="rtl" lang="he" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF7', fontFamily: 'Rubik, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: T.green, borderRadius: 16, width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="spoon" size={28} color="#fff" />
          </div>
          <p style={{ color: T.mid, fontSize: 15 }}>טוען...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!authUser) {
    return <LoginScreen />
  }

  // Logged in but no family yet
  if (!familyId) {
    return <FamilySetupScreen user={authUser} onDone={fid => setFamilyId(fid)} />
  }

  // Family data not yet loaded
  if (!familyData) {
    return (
      <div dir="rtl" lang="he" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF7', fontFamily: 'Rubik, system-ui, sans-serif' }}>
        <p style={{ color: T.mid, fontSize: 15 }}>טוען נתוני משפחה...</p>
      </div>
    )
  }

  // Onboarding — profile not set yet
  if (!profile) {
    return (
      <div dir="rtl" lang="he" style={{ fontFamily: 'Rubik, system-ui, sans-serif', minHeight: '100dvh', background: 'linear-gradient(180deg, #FAFAF7 0%, #FAEFCF 100%)', overflowY: 'auto' }}>
        <OnboardingScreen onComplete={data => saveProfile(data)} />
      </div>
    )
  }

  return (
    <div dir="rtl" lang="he" style={{
      fontFamily: 'Rubik, system-ui, sans-serif',
      background: T.bg,
      height: '100%',
      display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: 88,
        WebkitOverflowScrolling: 'touch',
      }}>
        {tab === 'plan' && (
          <WeeklyPlanScreen
            profile={profile}
            weekPlan={weekPlan}
            setWeekPlan={setWeekPlan}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            mealLibrary={mealLibrary}
            setMealLibrary={setMealLibrary}
            onSettingsOpen={() => setSettingsOpen(true)}
            showToast={showToast}
            notificationTime={notificationTime}
            setNotificationTime={setNotificationTime}
          />
        )}
        {tab === 'ideas' && (
          <MealIdeasScreen
            profile={profile}
            mealLibrary={mealLibrary}
            setMealLibrary={setMealLibrary}
            weekPlan={weekPlan}
            setWeekPlan={setWeekPlan}
            weekOffset={weekOffset}
            onSettingsOpen={() => setSettingsOpen(true)}
            showToast={showToast}
          />
        )}
        {tab === 'prep' && (
          <PrepScreen
            profile={profile}
            weekPlan={weekPlan}
            mealLibrary={mealLibrary}
            onGoToPlan={() => setTab('plan')}
            showToast={showToast}
          />
        )}
        {tab === 'shopping' && (
          <ShoppingScreen
            profile={profile}
            weekPlan={weekPlan}
            weekOffset={weekOffset}
            mealLibrary={mealLibrary}
            onSettingsOpen={() => setSettingsOpen(true)}
            showToast={showToast}
          />
        )}
      </div>

      <TabBar active={tab} onChange={setTab} />

      <SettingsSheet
        open={settingsOpen}
        profile={profile}
        onSave={p => { saveProfile(p); setSettingsOpen(false) }}
        onClose={() => setSettingsOpen(false)}
        onAdminOpen={() => setAdminOpen(true)}
        user={authUser}
        familyId={familyId}
        inviteCode={familyData?.inviteCode}
        onSignOut={() => { signOutUser(); setSettingsOpen(false) }}
      />

      {toast && <ToastMessage msg={toast} />}

      {adminOpen && (
        <AdminScreen
          onClose={() => setAdminOpen(false)}
          customRecipes={customRecipes}
          setCustomRecipes={setCustomRecipes}
        />
      )}

    </div>
  )
}
