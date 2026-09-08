import { canAnimateBodyChannel } from '../../body/grammar';
import type { BodySystemKey, BodySystemState } from '../../body/view-state';

export type BodyVisualMode = 'state' | 'coverage' | 'provenance';

interface Props {
  systems: BodySystemState[];
  selectedSystem: BodySystemKey;
  onSelectSystem: (system: BodySystemKey) => void;
  isPresent: boolean;
  mode: BodyVisualMode;
}

const NODES: Record<BodySystemKey, { cx: number; cy: number; r: number }> = {
  sleep: { cx: 310, cy: 104, r: 12 },
  autonomic: { cx: 310, cy: 210, r: 13 },
  cardio: { cx: 310, cy: 316, r: 17 },
  metabolic: { cx: 310, cy: 435, r: 16 },
  musculo: { cx: 228, cy: 600, r: 13 },
  recovery: { cx: 392, cy: 600, r: 13 },
};

const LABEL: Record<BodySystemKey, string> = {
  autonomic: 'Autonómico', cardio: 'Cardiorrespiratorio', sleep: 'Sueño', musculo: 'Musculoesquelético', metabolic: 'Metabólico', recovery: 'Recuperación',
};

function evidenceClass(state: BodySystemState) {
  const evidence = state.evidenceKinds;
  if (evidence.includes('measured') && evidence.length === 1) return 'evidence-measured';
  if (evidence.includes('reported') && evidence.length === 1) return 'evidence-reported';
  if (evidence.includes('inferred') && evidence.length === 1) return 'evidence-inferred';
  if (evidence.length) return 'evidence-derived';
  return 'evidence-unknown';
}

export default function BodyFigureV4({ systems, selectedSystem, onSelectSystem, isPresent, mode }: Props) {
  const byKey = new Map(systems.map((system) => [system.key, system]));
  const selected = byKey.get(selectedSystem)!;
  const findingSystems = systems.filter((system) => system.finding).map(s => s.key);
  const anyMeasuredMotion = systems.some((system) => canAnimateBodyChannel('measured-flow', system.canAnimate));

  const channelClass = (key: BodySystemKey) => {
    const state = byKey.get(key)!;
    return [
      'bodyV4Channel', `system-${key}`, `status-${state.status}`, evidenceClass(state),
      selectedSystem === key ? 'selected' : 'muted', mode === 'coverage' ? 'coverage-mode' : '', mode === 'provenance' ? 'provenance-mode' : '',
      canAnimateBodyChannel('measured-flow', state.canAnimate) ? 'can-animate' : '',
    ].filter(Boolean).join(' ');
  };

  return (
    <div className={`bodyV4Figure mode-${mode} ${anyMeasuredMotion ? 'has-motion' : 'still'}`}>
      <svg viewBox="0 0 620 820" role="img" aria-labelledby="body-v4-title body-v4-desc">
        <title id="body-v4-title">Organismo fisiológico navegable</title>
        <desc id="body-v4-desc">El cuerpo funciona como índice de señales y evidencia. La niebla significa datos insuficientes, no enfermedad.</desc>
        <defs>
          <radialGradient id="v4BodyFill" cx="50%" cy="34%" r="68%"><stop offset="0" stopColor="#fbfdfb" stopOpacity="1"/><stop offset=".48" stopColor="#dfeae3" stopOpacity=".82"/><stop offset="1" stopColor="#cbd9d0" stopOpacity=".18"/></radialGradient>
          <radialGradient id="v4Core" cx="50%" cy="43%" r="56%"><stop offset="0" stopColor="#8ea999" stopOpacity=".32"/><stop offset=".5" stopColor="#c9d9cf" stopOpacity=".18"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></radialGradient>
          <radialGradient id="v4Selected" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#3f6a54" stopOpacity=".25"/><stop offset=".7" stopColor="#557967" stopOpacity=".07"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></radialGradient>
          <filter id="v4Fog"><feGaussianBlur stdDeviation="18"/></filter>
          <filter id="v4Glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="7" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <clipPath id="v4Clip"><circle cx="310" cy="91" r="47"/><path d="M281 148 C251 173 237 229 239 299 C241 365 253 408 250 465 C247 520 236 578 228 640 L214 758 L264 758 L293 570 C298 534 302 512 310 512 C318 512 322 534 327 570 L356 758 L406 758 L392 640 C384 578 373 520 370 465 C367 408 379 365 381 299 C383 229 369 173 339 148 C321 137 299 137 281 148 Z"/><path d="M279 160 C244 171 213 202 196 246 L145 412 L118 501 L147 507 L218 340 L239 263"/><path d="M341 160 C376 171 407 202 424 246 L475 412 L502 501 L473 507 L402 340 L381 263"/></clipPath>
        </defs>

        <ellipse className="bodyV4Ambient" cx="310" cy="410" rx="214" ry="352" fill="url(#v4Core)"/>
        <g className="bodyV4OuterField" data-visual-meaning="context-field"><ellipse cx="310" cy="410" rx="235" ry="370"/><ellipse cx="310" cy="410" rx="192" ry="317"/></g>

        <g className="bodyV4Body" data-visual-meaning="body-index-not-diagnosis">
          <circle cx="310" cy="91" r="47"/>
          <path d="M281 148 C251 173 237 229 239 299 C241 365 253 408 250 465 C247 520 236 578 228 640 L214 758 L264 758 L293 570 C298 534 302 512 310 512 C318 512 322 534 327 570 L356 758 L406 758 L392 640 C384 578 373 520 370 465 C367 408 379 365 381 299 C383 229 369 173 339 148 C321 137 299 137 281 148 Z"/>
          <path d="M279 160 C244 171 213 202 196 246 L145 412 L118 501 L147 507 L218 340 L239 263"/>
          <path d="M341 160 C376 171 407 202 424 246 L475 412 L502 501 L473 507 L402 340 L381 263"/>
        </g>
        <g className="bodyV4Outline"><circle cx="310" cy="91" r="47"/><path d="M281 148 C251 173 237 229 239 299 C241 365 253 408 250 465 C247 520 236 578 228 640 L214 758"/><path d="M339 148 C369 173 383 229 381 299 C379 365 367 408 370 465 C373 520 384 578 392 640 L406 758"/><path d="M279 160 C244 171 213 202 196 246 L145 412 L118 501"/><path d="M341 160 C376 171 407 202 424 246 L475 412 L502 501"/></g>

        <g className={channelClass('sleep')} data-visual-meaning="sleep-channel"><ellipse cx="310" cy="96" rx="75" ry="62"/><path d="M268 85 C287 68 334 68 353 85"/><path d="M277 117 C297 132 323 132 343 117"/></g>
        <g className={channelClass('autonomic')} data-visual-meaning="autonomic-channel"><path d="M310 140 C304 198 304 248 310 305 C316 362 316 420 310 489 C304 558 294 632 282 716"/><path d="M310 140 C316 198 316 248 310 305 C304 362 304 420 310 489 C316 558 326 632 338 716"/><path d="M310 196 C274 218 258 252 267 292"/><path d="M310 196 C346 218 362 252 353 292"/></g>
        <g className={channelClass('cardio')} data-visual-meaning="cardiorespiratory-channel"><path d="M310 250 C274 262 257 291 264 329 C269 358 292 382 310 401"/><path d="M310 250 C346 262 363 291 356 329 C351 358 328 382 310 401"/><path className="bodyV4Heart" d="M310 286 C289 296 282 316 288 335 C293 353 306 358 310 371 C314 358 327 353 332 335 C338 316 331 296 310 286 Z"/></g>
        <g className={channelClass('metabolic')} data-visual-meaning="metabolic-channel"><ellipse cx="310" cy="437" rx="64" ry="57"/><ellipse cx="310" cy="437" rx="38" ry="34"/><path d="M270 421 C292 405 329 405 350 421"/><path d="M270 451 C292 466 329 466 350 451"/></g>
        <g className={channelClass('musculo')} data-visual-meaning="musculoskeletal-channel"><path d="M253 185 C229 232 220 306 216 375 C211 439 196 504 176 560"/><path d="M367 185 C391 232 400 306 404 375 C409 439 424 504 444 560"/><path d="M270 492 C257 555 249 630 239 727"/><path d="M350 492 C363 555 371 630 381 727"/><path d="M298 514 C287 579 280 650 270 730"/><path d="M322 514 C333 579 340 650 350 730"/></g>
        <g className={channelClass('recovery')} data-visual-meaning="recovery-channel"><path d="M310 205 C254 240 247 301 310 315 C373 301 366 240 310 205"/><path d="M310 315 C269 356 269 403 310 437 C351 403 351 356 310 315"/><path d="M310 437 C267 482 240 537 228 600"/><path d="M310 437 C353 482 380 537 392 600"/></g>

        <g clipPath="url(#v4Clip)" className="bodyV4Texture"><path d="M166 330 C230 317 390 317 454 330"/><path d="M158 402 C228 386 392 386 462 402"/><path d="M176 528 C241 514 379 514 444 528"/><path d="M197 603 C246 590 374 590 423 603"/></g>

        {systems.filter((s) => s.status === 'absent' || s.status === 'insufficient').map((system) => {
          const node = NODES[system.key];
          return <ellipse key={`fog-${system.key}`} className="bodyV4Fog" cx={node.cx} cy={node.cy} rx={system.key === 'musculo' || system.key === 'recovery' ? 76 : 57} ry={system.key === 'sleep' ? 44 : 67} filter="url(#v4Fog)"/>;
        })}

        <g className="bodyV4Nodes">
          {systems.map((system) => {
            const node = NODES[system.key]; const isSelected = selectedSystem === system.key;
            return <g key={system.key} className={`bodyV4Node ${isSelected ? 'selected' : ''} status-${system.status}`} role="button" tabIndex={0} onClick={() => onSelectSystem(system.key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectSystem(system.key); }}>
              <title>{LABEL[system.key]} · {Math.round(system.coverage * 100)}% observabilidad</title>
              {isSelected && <circle cx={node.cx} cy={node.cy} r={node.r + 38} fill="url(#v4Selected)"/>}
              <circle className="halo" cx={node.cx} cy={node.cy} r={node.r + 10}/><circle className="core" cx={node.cx} cy={node.cy} r={node.r}/>
            </g>;
          })}
        </g>

        {findingSystems.map(key => { const n = NODES[key]; return <g key={key} className="bodyV4Finding" filter="url(#v4Glow)"><circle cx={n.cx + 26} cy={n.cy - 25} r="6"/><circle className="ring" cx={n.cx + 26} cy={n.cy - 25} r="14"/></g>; })}
      </svg>

      <div className="bodyV4FigureReadout">
        <span className={anyMeasuredMotion ? 'active' : ''}/>
        <div><small>{mode === 'state' ? 'Estado' : mode === 'coverage' ? 'Cobertura' : 'Procedencia'}</small><strong>{selected.title}</strong></div>
        <p>{anyMeasuredMotion ? 'Movimiento respaldado por señal medida.' : 'Vista descriptiva; no representa movimiento fisiológico.'}</p>
      </div>
    </div>
  );
}
