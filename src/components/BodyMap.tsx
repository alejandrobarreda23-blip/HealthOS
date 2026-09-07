import type { FindingCandidateV1 } from '../health/findings-v1/types';
import { canAnimateBodyChannel } from '../body/grammar';

export type BodySystemKey = 'autonomic' | 'cardio' | 'sleep' | 'musculo' | 'metabolic' | 'recovery';

interface Props {
  coverage: number;
  hasRecentPhysiology: boolean;
  hasSourceDiscontinuity: boolean;
  activeFindings: FindingCandidateV1[];
  selectedSystem?: BodySystemKey;
  onSelectSystem?: (system: BodySystemKey) => void;
}

function hasLocalizedFinding(findings: FindingCandidateV1[]) {
  return findings.some((finding) => {
    const text = `${finding.findingKey} ${finding.domain} ${finding.title} ${finding.summary}`.toLowerCase();
    return !text.includes('insufficient') && !text.includes('cobertura') && !text.includes('missing') && !text.includes('source');
  });
}

const NODES: Array<{ key: BodySystemKey; cx: number; cy: number; r: number; label: string }> = [
  { key: 'autonomic', cx: 260, cy: 174, r: 15, label: 'Autonómico' },
  { key: 'cardio', cx: 260, cy: 278, r: 18, label: 'Cardiorrespiratorio' },
  { key: 'sleep', cx: 260, cy: 114, r: 11, label: 'Sueño' },
  { key: 'metabolic', cx: 260, cy: 374, r: 15, label: 'Metabólico' },
  { key: 'musculo', cx: 199, cy: 481, r: 12, label: 'Musculoesquelético' },
  { key: 'recovery', cx: 319, cy: 481, r: 12, label: 'Recuperación' },
];

export default function BodyMap({ coverage, hasRecentPhysiology, hasSourceDiscontinuity, activeFindings, selectedSystem, onSelectSystem }: Props) {
  const localizedFinding = hasLocalizedFinding(activeFindings);
  const animateMeasured = canAnimateBodyChannel('measured-flow', hasRecentPhysiology && !hasSourceDiscontinuity);
  const fog = hasSourceDiscontinuity || coverage < 0.5;

  return <div className={`bodyMap ${fog ? 'bodyMapFogged' : ''}`} aria-label="Mapa fisiológico navegable">
    <svg viewBox="0 0 520 760" role="img" aria-labelledby="body-map-title body-map-desc">
      <title id="body-map-title">Mapa sistémico del cuerpo</title>
      <desc id="body-map-desc">El movimiento representa únicamente fisiología medida. Las zonas son navegables y la niebla representa ausencia de observabilidad.</desc>
      <defs>
        <radialGradient id="bodyCoreGlow" cx="50%" cy="45%" r="55%"><stop offset="0" stopColor="#dfeae3" stopOpacity=".72"/><stop offset=".55" stopColor="#eef2ed" stopOpacity=".22"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></radialGradient>
        <linearGradient id="bodyMeasuredGradient" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#264d3b"/><stop offset=".55" stopColor="#587767"/><stop offset="1" stopColor="#8aa094"/></linearGradient>
        <filter id="bodyFog"><feGaussianBlur stdDeviation="12" /></filter>
        <filter id="findingGlow" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="9" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      <ellipse className="bodyCoreGlow" cx="260" cy="360" rx="160" ry="300" fill="url(#bodyCoreGlow)" />

      <g className="bodyAtmosphere bodyInferred">
        <ellipse cx="260" cy="355" rx="188" ry="320" />
        <ellipse cx="260" cy="355" rx="158" ry="286" />
        <ellipse cx="260" cy="355" rx="126" ry="246" />
      </g>

      <g className="bodySilhouette">
        <path d="M233 134 C213 159 204 204 206 253 C207 287 214 328 214 371 C214 424 207 469 202 519 L189 690 L217 690 L244 510 C248 483 250 458 260 458 C270 458 272 483 276 510 L303 690 L331 690 L318 519 C313 469 306 424 306 371 C306 328 313 287 314 253 C316 204 307 159 287 134 C273 126 247 126 233 134 Z" />
        <path d="M232 145 C206 156 184 179 170 215 L125 361 L106 421 L124 426 L192 283 L208 220" />
        <path d="M288 145 C314 156 336 179 350 215 L395 361 L414 421 L396 426 L328 283 L312 220" />
        <circle cx="260" cy="82" r="43" />
      </g>

      <g className="bodyOutline">
        <circle cx="260" cy="82" r="43" />
        <path d="M233 134 C213 159 204 204 206 253 C207 287 214 328 214 371 C214 424 207 469 202 519 L189 690" />
        <path d="M287 134 C307 159 316 204 314 253 C313 287 306 328 306 371 C306 424 313 469 318 519 L331 690" />
        <path d="M232 145 C206 156 184 179 170 215 L125 361 L106 421" />
        <path d="M288 145 C314 156 336 179 350 215 L395 361 L414 421" />
        <path d="M233 134 C247 126 273 126 287 134" />
        <path d="M214 371 C235 383 285 383 306 371" />
        <path d="M189 690 L181 727 M217 690 L212 727 M303 690 L308 727 M331 690 L339 727" />
      </g>

      <g className={`bodyMeasured ${animateMeasured ? 'bodyAnimated' : ''}`}>
        <path className="bodyCentralFlow" d="M260 127 C258 178 258 216 259 266 C260 332 260 392 260 462 C260 532 250 613 229 699" />
        <path className="bodyCentralFlow" d="M260 127 C262 178 262 216 261 266 C260 332 260 392 260 462 C260 532 272 613 298 699" />
        <path d="M259 225 C231 239 215 268 210 310 C205 357 199 409 184 472" />
        <path d="M261 225 C289 239 305 268 310 310 C315 357 321 409 336 472" />
        <path d="M260 204 C236 218 224 237 216 267" />
        <path d="M260 204 C284 218 296 237 304 267" />
      </g>

      <g className="bodyDerived">
        <path d="M236 169 C264 188 293 210 301 247 C310 286 294 318 263 339 C232 361 220 390 227 425" />
        <path d="M284 169 C256 188 227 210 219 247 C210 286 226 318 257 339 C288 361 300 390 293 425" />
      </g>

      <g className="bodyCrossSystem">
        <path d="M260 174 C215 206 208 265 260 278 C312 265 305 206 260 174" />
        <path d="M260 278 C229 314 229 348 260 374 C291 348 291 314 260 278" />
        <path d="M260 374 C226 406 210 443 199 481" />
        <path d="M260 374 C294 406 308 443 319 481" />
      </g>

      {NODES.map((node) => <g key={node.key} className={`bodyInteractiveNode ${selectedSystem === node.key ? 'selected' : ''}`} onClick={() => onSelectSystem?.(node.key)} role="button" tabIndex={0} aria-label={`Abrir sistema ${node.label}`} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelectSystem?.(node.key); }}>
        <circle className="bodyNodeHalo" cx={node.cx} cy={node.cy} r={node.r + 12}/>
        <circle className="bodyNodeCore" cx={node.cx} cy={node.cy} r={node.r}/>
      </g>)}

      {fog && <g className="bodyFog" filter="url(#bodyFog)"><ellipse cx="260" cy="433" rx="106" ry="196" /></g>}

      {localizedFinding && <g className="bodyFinding" filter="url(#findingGlow)"><circle cx="326" cy="190" r="8"/><circle cx="326" cy="190" r="18" className="bodyFindingRing" /></g>}
    </svg>
    {!animateMeasured && <div className="bodyStillnessNote">Sin fisiología reciente · el mapa permanece quieto</div>}
  </div>;
}
