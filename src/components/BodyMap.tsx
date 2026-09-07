import type { FindingCandidateV1 } from '../health/findings-v1/types';
import { canAnimateBodyChannel } from '../body/grammar';

interface Props {
  coverage: number;
  hasRecentPhysiology: boolean;
  hasSourceDiscontinuity: boolean;
  activeFindings: FindingCandidateV1[];
}

function hasLocalizedFinding(findings: FindingCandidateV1[]) {
  return findings.some((finding) => {
    const text = `${finding.findingKey} ${finding.domain} ${finding.title} ${finding.summary}`.toLowerCase();
    return !text.includes('insufficient') && !text.includes('cobertura') && !text.includes('missing') && !text.includes('source');
  });
}

export default function BodyMap({ coverage, hasRecentPhysiology, hasSourceDiscontinuity, activeFindings }: Props) {
  const localizedFinding = hasLocalizedFinding(activeFindings);
  const animateMeasured = canAnimateBodyChannel('measured-flow', hasRecentPhysiology && !hasSourceDiscontinuity);
  const fog = hasSourceDiscontinuity || coverage < 0.5;

  return <div className={`bodyMap ${fog ? 'bodyMapFogged' : ''}`} aria-label="Mapa fisiológico navegable">
    <svg viewBox="0 0 520 760" role="img" aria-labelledby="body-map-title body-map-desc">
      <title id="body-map-title">Mapa sistémico del cuerpo</title>
      <desc id="body-map-desc">Los trazos representan procedencia y observabilidad. El movimiento sólo aparece cuando existe fisiología reciente elegible.</desc>
      <defs>
        <filter id="bodyFog"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id="findingGlow" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="9" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      <g className="bodyAtmosphere bodyInferred">
        <ellipse cx="260" cy="357" rx="184" ry="318" />
        <ellipse cx="260" cy="357" rx="157" ry="282" />
      </g>

      <g className="bodyOutline">
        <circle cx="260" cy="82" r="42" />
        <path d="M221 137 C201 172 195 230 200 302 L212 410 L210 501 L194 690" />
        <path d="M299 137 C319 172 325 230 320 302 L308 410 L310 501 L326 690" />
        <path d="M221 140 C205 151 180 169 164 210 L126 335 L105 423" />
        <path d="M299 140 C315 151 340 169 356 210 L394 335 L415 423" />
        <path d="M220 137 C239 131 281 131 300 137" />
        <path d="M214 410 C234 420 286 420 306 410" />
        <path d="M194 690 L185 724 M210 501 L227 690 L223 725 M326 690 L335 724 M310 501 L293 690 L297 725" />
      </g>

      <g className={`bodyMeasured ${animateMeasured ? 'bodyAnimated' : ''}`}>
        <path d="M260 126 C257 175 256 215 258 260 C259 320 259 390 259 464 C259 540 250 619 230 702" />
        <path d="M260 126 C263 176 266 219 263 261 C266 331 267 389 262 459 C263 539 274 620 298 702" />
        <path d="M258 226 C225 247 210 277 207 321 C204 373 198 425 184 477" />
        <path d="M263 226 C296 247 311 277 314 321 C317 373 322 425 337 477" />
        <path d="M256 188 C230 207 216 228 209 261 M266 188 C292 207 306 228 313 261" />
      </g>

      <g className="bodyDerived">
        <path d="M236 168 C265 187 291 206 300 243 C310 282 294 315 263 337 C231 359 219 390 227 425" />
        <path d="M284 168 C255 187 229 206 220 243 C210 282 226 315 257 337 C289 359 301 390 293 425" />
      </g>

      <g className="bodyNodes">
        {[150, 260, 360, 470, 580].map((y, i) => <circle key={y} cx={260 + (i % 2 ? 6 : -4)} cy={y} r={i === 2 ? 11 : 6} />)}
        <circle cx="204" cy="330" r="5"/><circle cx="316" cy="330" r="5"/>
        <circle cx="190" cy="480" r="5"/><circle cx="333" cy="480" r="5"/>
      </g>

      {fog && <g className="bodyFog" filter="url(#bodyFog)">
        <ellipse cx="260" cy="415" rx="95" ry="185" />
      </g>}

      {localizedFinding && <g className="bodyFinding" filter="url(#findingGlow)">
        <circle cx="326" cy="190" r="8"/><circle cx="326" cy="190" r="18" className="bodyFindingRing" />
      </g>}
    </svg>
    {!animateMeasured && <div className="bodyStillnessNote">Sin fisiología reciente: la figura permanece quieta.</div>}
  </div>;
}
