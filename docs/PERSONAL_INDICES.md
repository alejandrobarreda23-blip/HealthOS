# Indicadores propios de HealthOS

## Continuidad de horarios · rhythm_alignment_v1

Indicador descriptivo experimental, no clínico. Porcentaje de noches observadas en siete días cuyos horarios de inicio y final se encuentran ambos a ≤30 minutos de sus respectivas medianas circulares en los 28 días anteriores. Requiere ≥5 noches recientes y ≥20 de referencia, con continuidad de fuente, dispositivo, normalizador y zona horaria según comparableSleepNights.

Fórmula: round(100 × noches que cumplen ambas condiciones / noches recientes observadas). La interfaz prioriza el número de noches que coinciden sobre el total y separa las coincidencias del inicio y del final, junto a fechas, referencia y cobertura. No presenta la proporción como una nota de salud. Ausencias no se convierten en ceros. El margen de 30 minutos es una decisión explícita del producto; no un umbral clínico validado. No comparar entre personas ni versiones.

Un valor alto describe coincidencia con los horarios anteriores, incluso si esos horarios o la duración del sueño no son adecuados. No representa salud, recuperación, suficiencia de sueño ni beneficio de una conducta. El historial recalculado no es una predicción ni una lectura conocida en esa fecha. No sustituye a las observaciones de energía o fatiga.

## Siguiente candidato: recuperación personal

No se publica todavía una puntuación de recuperación. Primero definir un resultado observable: energía y fatiga registradas al día siguiente, con fecha y sin reinterpretarlas como diagnósticos. Evaluar si señales nocturnas mejoran la estimación frente a una referencia sencilla que use solo el historial de esas sensaciones.

Separar aprendizaje y evaluación por tiempo; no reutilizar días futuros en las referencias. Comprobar resultados en periodos independientes, cambios de fuente, ausencia de datos y sensibilidad a los componentes. Evitar contar HRV, pulso y derivados del mismo dispositivo como evidencia independiente. No ajustar pesos hasta conseguir una historia convincente a posteriori.

Antes de publicar: criterios de cobertura predefinidos, error y calibración fuera del periodo de aprendizaje, comparación con la referencia sencilla, contribución de cada componente, incertidumbre y razones para abstenerse. Los umbrales se deben justificar con esa evaluación. La asociación predictiva no identifica la causa ni prueba beneficios de intervenir.

## Visualización de la noche

Las fases estimadas se leen de sleep_stages. Los huecos se conservan como desconocidos; una superposición inválida evita publicar un desglose. Porcentajes calculados sobre el intervalo de sesión, incluyendo tiempo despierto y desconocido. El resumen de tiempo dormido conserva su procedencia y puede diferir de la suma de fases.

Las muestras intranocturnas se consultan solo para la sesión, usuario y fuente seleccionados. Validar unidades y rangos técnicos; no unir huecos >10 minutos. El cursor muestra una muestra real a ≤5 minutos, no una interpolación. Temperatura cutánea y HRV Ultrahuman conservan sus propias definiciones. No fabricar ciclos, estrés, exposición ambiental ni fases ausentes.
