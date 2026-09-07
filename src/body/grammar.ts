export type BodyProvenance = 'measured' | 'derived' | 'reported' | 'inferred' | 'system';

export type BodyVisualChannelKey =
  | 'measured-flow'
  | 'derived-flow'
  | 'reported-annotation'
  | 'inferred-halo'
  | 'active-finding'
  | 'missing-fog'
  | 'deviation-turbulence';

export interface BodyVisualChannelContract {
  key: BodyVisualChannelKey;
  provenance: BodyProvenance;
  meaning: string;
  mayAnimate: boolean;
  requiresSourceData: boolean;
}

export const BODY_VISUAL_GRAMMAR_V1: readonly BodyVisualChannelContract[] = [
  { key: 'measured-flow', provenance: 'measured', meaning: 'Dato fisiológico directamente observado.', mayAnimate: true, requiresSourceData: true },
  { key: 'derived-flow', provenance: 'derived', meaning: 'Transformación determinista de datos observados.', mayAnimate: true, requiresSourceData: true },
  { key: 'reported-annotation', provenance: 'reported', meaning: 'Contexto declarado por el usuario.', mayAnimate: false, requiresSourceData: true },
  { key: 'inferred-halo', provenance: 'inferred', meaning: 'Hipótesis o capa inferida; nunca más autoritativa que lo medido.', mayAnimate: false, requiresSourceData: true },
  { key: 'active-finding', provenance: 'system', meaning: 'Existe un hallazgo activo y trazable que puede abrirse.', mayAnimate: false, requiresSourceData: false },
  { key: 'missing-fog', provenance: 'system', meaning: 'Ausencia o insuficiente observabilidad; nunca cero ni normalidad.', mayAnimate: false, requiresSourceData: false },
  { key: 'deviation-turbulence', provenance: 'derived', meaning: 'Desviación respecto a referencia expresada como comportamiento, no juicio de color.', mayAnimate: true, requiresSourceData: true },
] as const;

export function bodyChannelContract(key: BodyVisualChannelKey) {
  return BODY_VISUAL_GRAMMAR_V1.find((channel) => channel.key === key) ?? null;
}

export function canAnimateBodyChannel(key: BodyVisualChannelKey, hasEligibleSourceData: boolean) {
  const contract = bodyChannelContract(key);
  if (!contract?.mayAnimate) return false;
  if (contract.requiresSourceData && !hasEligibleSourceData) return false;
  return true;
}
