import { motion } from 'framer-motion'

// Illustrations des portes. Chaque porte a sa matière et son décor ; le battant pivote pour s'ouvrir.
// Boîte de dessin : 64 × 88. L'ouverture (ce que le battant recouvre) est l'arche définie par OPENING.
const OPENING = 'M6 88V34C6 20 17 9 32 9S58 20 58 34V88Z'
const FRAME = 'M0 88V32C0 14 14 0 32 0S64 14 64 32V88Z'

const STAR_POINTS = [[14, 24], [24, 40], [44, 30], [50, 62], [18, 66], [36, 76], [30, 20], [52, 44], [12, 50], [40, 14]]

// matière (couleurs) et décor de chaque porte : leaf = battant, frame = cadre, room = ce qu'on voit derrière
const ART = {
  bois: {
    frame: '#5c3a19', leaf: '#8a5a2b', room: '#f2d98d',
    details: (
      <>
        <path d="M19 12V88M32 9V88M45 12V88" stroke="#5c3a19" strokeWidth="1.6" opacity=".55" />
        <path d="M11 40h5M23 58h5M36 30h5M48 70h5M13 76h5" stroke="#5c3a19" strokeWidth="1" opacity=".45" strokeLinecap="round" />
        <rect x="6" y="28" width="18" height="4.5" rx="1" fill="#2b1d0e" />
        <rect x="6" y="64" width="18" height="4.5" rx="1" fill="#2b1d0e" />
        <circle cx="49" cy="54" r="3.4" fill="#3a2610" />
        <circle cx="49" cy="54" r="2.3" fill="#d9a441" />
      </>
    ),
  },
  fer: {
    frame: '#3b424b', leaf: '#6b7683', room: '#ffd9a0',
    details: (
      <>
        <rect x="6" y="44" width="52" height="5" fill="#3b424b" />
        <rect x="6" y="70" width="52" height="4" fill="#3b424b" />
        {[14, 26, 38, 50].flatMap((x) => [22, 34, 56, 80].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="#b9c3cf" />))}
        <circle cx="47" cy="60" r="4.2" fill="none" stroke="#dfe6ee" strokeWidth="1.8" />
        <rect x="42" y="50" width="10" height="4" rx="1" fill="#2b3037" />
      </>
    ),
  },
  or: {
    frame: '#9a7418', leaf: '#e0b53c', room: '#fff3b0',
    details: (
      <>
        <path d="M14 46V35C14 28 22 23 32 23s18 5 18 12v11z" fill="#f2cd66" stroke="#9a7418" strokeWidth="1.5" />
        <rect x="14" y="52" width="36" height="28" rx="2" fill="#f2cd66" stroke="#9a7418" strokeWidth="1.5" />
        <path d="M32 58l5 8-5 8-5-8z" fill="#fff2b0" stroke="#9a7418" strokeWidth="1" />
        <circle cx="53" cy="56" r="2.5" fill="#fff8d0" />
      </>
    ),
  },
  runes: {
    frame: '#22103f', leaf: '#4b2a7a', room: '#9af5e0',
    details: (
      <>
        <rect x="11" y="16" width="42" height="68" rx="16" fill="none" stroke="#2f1a54" strokeWidth="2" />
        <g stroke="#3cffd0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M32 26v14M27 30l5-4 5 4" />
          <path d="M32 47v14M26 54h12" />
          <path d="M32 68v11M27 74l5 5 5-5" />
        </g>
        <circle cx="32" cy="47" r="13" fill="#3cffd0" opacity=".08" />
      </>
    ),
  },
  cristal: {
    frame: '#2b7fa8', leaf: '#4fc3e8', room: '#e6fbff',
    details: (
      <>
        <path d="M6 88V52L32 64 58 46V88z" fill="#2b9ccc" opacity=".55" />
        <path d="M6 52V34C6 20 17 9 32 9v55z" fill="#8bebff" opacity=".7" />
        <path d="M32 9C46 9 58 20 58 34v12L32 64z" fill="#bff5ff" opacity=".55" />
        <path d="M32 9v55M6 52l26 12 26-18" stroke="#e6fbff" strokeWidth="1.2" fill="none" opacity=".8" />
        <path d="M14 30l6-8" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".9" />
      </>
    ),
  },
  neant: {
    frame: '#241a4a', leaf: '#0d0a1f', room: '#1b1140',
    details: (
      <>
        {STAR_POINTS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.3 : 0.8} fill="#fff" opacity={0.5 + (i % 4) * 0.12} />
        ))}
        <path d="M32 52m-14 0a14 14 0 1 1 14 14" fill="none" stroke="#7a5cff" strokeWidth="1.4" opacity=".7" />
        <path d="M32 52m-9 0a9 9 0 1 1 9 9" fill="none" stroke="#ff5cf4" strokeWidth="1.2" opacity=".8" />
        <circle cx="32" cy="52" r="4.5" fill="#000" />
      </>
    ),
  },
  rainbow: {
    frame: '#e6e2f0', leaf: null, rainbow: true, room: '#ffffff',
    details: (
      <>
        <path d="M14 46V35C14 28 22 23 32 23s18 5 18 12v11z" fill="none" stroke="#fff" strokeWidth="2" opacity=".7" />
        <rect x="14" y="52" width="36" height="28" rx="2" fill="none" stroke="#fff" strokeWidth="2" opacity=".7" />
        <circle cx="53" cy="56" r="2.5" fill="#fff" />
      </>
    ),
  },
  eternelle: {
    frame: '#0a0a0a', leaf: null, mono: true, room: '#ffffff',
    details: (
      <>
        <path d="M18 52c0-8 8-11 14 0s14 8 14 0-8-11-14 0-14 8-14 0z" fill="none" stroke="#000" strokeWidth="6" strokeLinejoin="round" opacity=".55" />
        <path d="M18 52c0-8 8-11 14 0s14 8 14 0-8-11-14 0-14 8-14 0z" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
        <path d="M32 18v7M32 79v-7M11 52h4M53 52h-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".8" />
      </>
    ),
  },
}

// porte lointaine : silhouette grise avec un point d'interrogation
const HIDDEN = {
  frame: '#2a2f3d', leaf: '#232733', room: '#15171f',
  details: <text x="32" y="60" textAnchor="middle" fontSize="26" fontWeight="700" fill="#4a5163" fontFamily="inherit">?</text>,
}

export default function DoorArt({ id, hidden = false, opening = false }) {
  const art = hidden ? HIDDEN : (ART[id] ?? ART.bois)
  const leafAnimation = opening
    ? { rotateY: [0, 0, 0, -105], x: [0, -1, 1, 0], transition: { duration: 1, times: [0, 0.3, 0.6, 1] } }
    : { rotateY: 0 }

  return (
    <div className="door-art" aria-hidden="true">
      {/* cadre et pièce derrière la porte */}
      <svg className="door-base" viewBox="0 0 64 88" width="64" height="88">
        <path d={OPENING} fill={art.room} />
        <path d={`${FRAME}${OPENING}`} fill={art.frame} fillRule="evenodd" />
        <rect x="29" y="0" width="6" height="7" rx="1" fill="#fff" opacity=".2" />
      </svg>
      {/* battant */}
      <motion.div
        className={`door-leaf ${art.rainbow ? 'rainbow-fill' : art.mono ? 'mono-fill' : ''}`}
        style={{ clipPath: `path('${OPENING}')`, background: art.rainbow || art.mono ? undefined : art.leaf, transformOrigin: '6px 50%' }}
        animate={leafAnimation}
      >
        <svg viewBox="0 0 64 88" width="64" height="88">
          {art.details}
        </svg>
      </motion.div>
    </div>
  )
}
