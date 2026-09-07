import { canAnimateBodyChannel } from '../../body/grammar';
import type { BodySystemKey, BodySystemState } from '../../body/view-state';

interface Props {
  systems: BodySystemState[];
  selectedSystem: BodySystemKey;
  onSelectSystem: (system: BodySystemKey) => void;
  isPresent: boolean;
}

const NODES: Record<BodySystemKey, { cx: number; cy: number; r: number }> = {
  sleep: { cx: 310, cy: 112, r: 13 },
  autonomic: { cx: 310, cy: 205, r: 14 },
  cardio: { cx: 310, cy: 306, r: 18 },
  metabolic: { cx: 310, cy: 420, r: 17 },
  musculo: { cx: 225, cy: 574, r: 14 },
  recovery: { cx: 395, cy: 574, r: 14 },
};

const SYSTEM_LABEL: Record<BodySystemKey, string> = {
  autonomic: 'Autonómico',
  cardio: 'Cardiorrespiratorio',
  sleep: 'Sueño',
  musculo: 'Musculoesquelético',
  metabolic: 'Metabólico',
  recovery: 'Recuperación',
};

function evidenceClass(state: BodySystemState) {
  const evidence = state.evidenceKinds;
  if (evidence.includes('measured') && evidence.length === 1) return 'evidence-measured';
  if (evidence.includes('reported') && evidence.length === 1) return 'evidence-reported';
  if (evidence.includes('inferred') && evidence.length === 1) return 'evidence-inferred';
  if (evidence.length) return 'evidence-derived';
  return 'evidence-unknown';
}

export default function BodyFigure({ systems, selectedSystem, onSelectSystem, isPresent }: Props) {
  const byKey = new Map(systems.map((system) => [system.key, system]));
  const selected = byKey.get(selectedSystem)!;
  const anyMeasuredMotion = systems.some((system) => canAnimateBodyChannel('measured-flow', system.canAnimate));
  const findingSystem = systems.find((system) => system.finding)?.key ?? null;

  const systemClass = (key: BodySystemKey) => {
    const state = byKey.get(key)!;
    return [
      'bodyV3Channel',
      `system-${key}`,
      `status-${state.status}`,
      evidenceClass(state),
      selectedSystem === key ? 'selected' : '',
      canAnimateBodyChannel('measured-flow', state.canAnimate) ? 'can-animate' : '',
    ].filter(Boolean).join(' ');
  };

  return (
    <div className={`bodyV3Figure ${anyMeasuredMotion ? 'has-measured-motion' : 'is-still'}`}>
      <svg viewBox="0 0 620 820" role="img" aria-labelledby="body-v3-title body-v3-desc">
        <title id="body-v3-title">Mapa fisiológico sistémico</title>
        <desc id="body-v3-desc">
          Cada canal representa observabilidad fisiológica de un sistema. El movimiento sólo aparece cuando existe evidencia marcada como medida. La niebla representa ausencia de observabilidad.
        </desc>

        <defs>
          <radialGradient id="bodyV3Tissue" cx="50%" cy="38%" r="62%">
            <stop offset="0" stopColor="#fdfefd" stopOpacity=".96" />
            <stop offset=".48" stopColor="#eaf0eb" stopOpacity=".7" />
            <stop offset="1" stopColor="#dfe7e1" stopOpacity=".08" />
          </radialGradient>
          <radialGradient id="bodyV3Core" cx="50%" cy="42%" r="55%">
            <stop offset="0" stopColor="#cddbd1" stopOpacity=".68" />
            <stop offset=".62" stopColor="#edf2ed" stopOpacity=".18" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bodyV3SelectedGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#6d8c7b" stopOpacity=".22" />
            <stop offset="1" stopColor="#6d8c7b" stopOpacity="0" />
          </radialGradient>
          <filter id="bodyV3Soft"><feGaussianBlur stdDeviation="13" /></filter>
          <filter id="bodyV3Fog"><feGaussianBlur stdDeviation="17" /></filter>
          <filter id="bodyV3AmberGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id="bodyV3Clip">
            <circle cx="310" cy="96" r="46" />
            <path d="M282 148 C250 174 236 232 239 301 C241 355 253 399 250 454 C248 506 235 561 228 621 L214 756 L263 756 L293 566 C298 531 300 508 310 508 C320 508 322 531 327 566 L357 756 L406 756 L392 621 C385 561 372 506 370 454 C367 399 379 355 381 301 C384 232 370 174 338 148 C322 139 298 139 282 148 Z" />
            <path d="M281 160 C247 171 216 199 198 241 L145 406 L119 493 L145 501 L218 338 L239 260" />
            <path d="M339 160 C373 171 404 199 422 241 L475 406 L501 493 L475 501 L402 338 L381 260" />
          </clipPath>
        </defs>

        <ellipse className="bodyV3AmbientCore" cx="310" cy="402" rx="205" ry="330" fill="url(#bodyV3Core)" />

        <g className="bodyV3Atmosphere" data-visual-meaning="inferred-halo">
          <ellipse cx="310" cy="402" rx="225" ry="350" />
          <ellipse cx="310" cy="402" rx="190" ry="310" />
          <ellipse cx="310" cy="402" rx="154" ry="266" />
        </g>

        <g className="bodyV3Tissue" data-visual-meaning="body-index-not-diagnosis">
          <circle cx="310" cy="96" r="46" />
          <path d="M282 148 C250 174 236 232 239 301 C241 355 253 399 250 454 C248 506 235 561 228 621 L214 756 L263 756 L293 566 C298 531 300 508 310 508 C320 508 322 531 327 566 L357 756 L406 756 L392 621 C385 561 372 506 370 454 C367 399 379 355 381 301 C384 232 370 174 338 148 C322 139 298 139 282 148 Z" />
          <path d="M281 160 C247 171 216 199 198 241 L145 406 L119 493 L145 501 L218 338 L239 260" />
          <path d="M339 160 C373 171 404 199 422 241 L475 406 L501 493 L475 501 L402 338 L381 260" />
        </g>

        <g className="bodyV3Outline">
          <circle cx="310" cy="96" r="46" />
          <path d="M282 148 C250 174 236 232 239 301 C241 355 253 399 250 454 C248 506 235 561 228 621 L214 756" />
          <path d="M338 148 C370 174 384 232 381 301 C379 355 367 399 370 454 C372 506 385 561 392 621 L406 756" />
          <path d="M281 160 C247 171 216 199 198 241 L145 406 L119 493" />
          <path d="M339 160 C373 171 404 199 422 241 L475 406 L501 493" />
          <path d="M282 148 C298 139 322 139 338 148" />
          <path d="M250 454 C275 469 345 469 370 454" />
          <path d="M214 756 L205 790 M263 756 L257 790 M357 756 L363 790 M406 756 L415 790" />
        </g>

        <g className={systemClass('sleep')} data-visual-meaning="sleep-channel">
          <ellipse cx="310" cy="101" rx="76" ry="66" />
          <path d="M266 91 C286 72 337 72 355 91" />
          <path d="M276 118 C296 134 324 134 344 118" />
        </g>

        <g className={systemClass('autonomic')} data-visual-meaning="autonomic-channel">
          <path d="M310 143 C303 194 303 246 310 298 C317 351 317 410 310 474 C303 543 294 622 282 704" />
          <path d="M310 143 C317 194 317 246 310 298 C303 351 303 410 310 474 C317 543 326 622 338 704" />
          <path d="M310 192 C273 215 259 249 267 286" />
          <path d="M310 192 C347 215 361 249 353 286" />
        </g>

        <g className={systemClass('cardio')} data-visual-meaning="cardiorespiratory-channel">
          <path d="M310 247 C276 256 259 283 265 320 C270 351 294 372 310 389" />
          <path d="M310 247 C344 256 361 283 355 320 C350 351 326 372 310 389" />
          <path d="M310 280 C289 290 282 309 287 327 C292 345 306 350 310 362 C314 350 328 345 333 327 C338 309 331 290 310 280 Z" />
          <path d="M292 247 C270 233 250 234 233 247" />
          <path d="M328 247 C350 233 370 234 387 247" />
        </g>

        <g className={systemClass('metabolic')} data-visual-meaning="metabolic-channel">
          <ellipse cx="310" cy="424" rx="62" ry="54" />
          <ellipse cx="310" cy="424" rx="39" ry="34" />
          <path d="M271 410 C293 397 329 397 350 410" />
          <path d="M271 438 C293 451 329 451 350 438" />
        </g>

        <g className={systemClass('musculo')} data-visual-meaning="musculoskeletal-channel">
          <path d="M252 185 C229 228 219 301 215 365 C210 429 196 490 176 544" />
          <path d="M368 185 C391 228 401 301 405 365 C410 429 424 490 444 544" />
          <path d="M270 481 C257 543 249 619 239 724" />
          <path d="M350 481 C363 543 371 619 381 724" />
          <path d="M298 500 C287 565 280 640 270 728" />
          <path d="M322 500 C333 565 340 640 350 728" />
        </g>

        <g className={systemClass('recovery')} data-visual-meaning="recovery-cross-system-channel">
          <path d="M310 205 C255 239 248 296 310 306 C372 296 365 239 310 205" />
          <path d="M310 306 C270 347 270 390 310 420 C350 390 350 347 310 306" />
          <path d="M310 420 C268 463 240 515 225 574" />
          <path d="M310 420 C352 463 380 515 395 574" />
        </g>

        {systems.filter((system) => system.status === 'absent' || system.status === 'insufficient').map((system) => {
          const node = NODES[system.key];
          return (
            <ellipse
              key={`fog-${system.key}`}
              className="bodyV3LocalFog"
              cx={node.cx}
              cy={node.cy}
              rx={system.key === 'musculo' || system.key === 'recovery' ? 74 : 56}
              ry={system.key === 'sleep' ? 43 : 66}
              filter="url(#bodyV3Fog)"
              data-visual-meaning="missing-fog"
            />
          );
        })}

        <g className="bodyV3TurbulenceLayer" data-visual-meaning="deviation-turbulence">
          {systems.filter((system) => system.finding && typeof system.finding.robustZ === 'number').map((system) => {
            const node = NODES[system.key];
            return (
              <path
                key={`turbulence-${system.key}`}
                className={`bodyV3Turbulence ${selectedSystem === system.key ? 'selected' : ''}`}
                d={`M ${node.cx - 31} ${node.cy} C ${node.cx - 24} ${node.cy - 28}, ${node.cx + 2} ${node.cy - 35}, ${node.cx + 27} ${node.cy - 16} C ${node.cx + 41} ${node.cy - 4}, ${node.cx + 31} ${node.cy + 25}, ${node.cx + 5} ${node.cy + 31} C ${node.cx - 20} ${node.cy + 38}, ${node.cx - 42} ${node.cy + 21}, ${node.cx - 31} ${node.cy}`}
              />
            );
          })}
        </g>

        <g className="bodyV3Nodes">
          {systems.map((system) => {
            const node = NODES[system.key];
            const isSelected = selectedSystem === system.key;
            return (
              <g
                key={system.key}
                className={`bodyV3Node ${isSelected ? 'selected' : ''} status-${system.status}`}
                role="button"
                tabIndex={0}
                aria-label={`Seleccionar sistema ${SYSTEM_LABEL[system.key]}`}
                onClick={() => onSelectSystem(system.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectSystem(system.key);
                }}
              >
                {isSelected && <circle className="bodyV3NodeSelectedGlow" cx={node.cx} cy={node.cy} r={node.r + 32} fill="url(#bodyV3SelectedGlow)" />}
                <circle className="bodyV3NodeHalo" cx={node.cx} cy={node.cy} r={node.r + 10} />
                <circle className="bodyV3NodeCore" cx={node.cx} cy={node.cy} r={node.r} />
              </g>
            );
          })}
        </g>

        {findingSystem && (() => {
          const node = NODES[findingSystem];
          return (
            <g className="bodyV3FindingBeacon" filter="url(#bodyV3AmberGlow)" data-visual-meaning="active-finding">
              <circle cx={node.cx + 25} cy={node.cy - 24} r="6" />
              <circle className="bodyV3FindingRing" cx={node.cx + 25} cy={node.cy - 24} r="14" />
            </g>
          );
        })()}

        <g clipPath="url(#bodyV3Clip)" className="bodyV3Scanlines" data-visual-meaning="observability-texture">
          <path d="M170 333 C232 321 390 321 450 333" />
          <path d="M162 396 C230 382 392 382 458 396" />
          <path d="M180 520 C246 508 374 508 440 520" />
        </g>
      </svg>

      <div className="bodyV3FigureStatus">
        <span className={`bodyV3MotionMark ${anyMeasuredMotion ? 'active' : ''}`} />
        {anyMeasuredMotion
          ? 'Movimiento habilitado por señal medida en la fecha explorada'
          : isPresent
            ? 'Sin canal medido elegible · el organismo permanece quieto'
            : 'Historia reconstruida sin inventar movimiento'}
      </div>

      <div className="bodyV3SelectedCaption">
        <span>Sistema enfocado</span>
        <strong>{selected.title}</strong>
      </div>
    </div>
  );
}
