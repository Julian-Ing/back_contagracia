/**
 * Fuzzy Search - Búsqueda tolerante a errores de escritura
 * Usa el algoritmo de distancia de Levenshtein para encontrar coincidencias similares
 */

/**
 * Calcula la distancia de Levenshtein entre dos cadenas
 * Representa el número mínimo de operaciones (insertar, eliminar, sustituir)
 * necesarias para transformar una cadena en otra
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix: number[][] = [];

  // Inicializar primera columna
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  // Inicializar primera fila
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  // Llenar la matriz
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // eliminación
        matrix[i][j - 1] + 1,      // inserción
        matrix[i - 1][j - 1] + cost // sustitución
      );
    }
  }

  return matrix[s1.length][s2.length];
}

/**
 * Calcula un puntaje de similitud entre 0 y 1
 * 1 = idénticos, 0 = completamente diferentes
 */
export function similarityScore(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;

  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLength;
}

/**
 * Normaliza texto removiendo acentos y caracteres especiales
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .trim();
}

/**
 * Verifica si una cadena contiene a otra (búsqueda parcial)
 */
function containsMatch(text: string, query: string): boolean {
  return normalizeText(text).includes(normalizeText(query));
}

/**
 * Verifica si las palabras del query están contenidas en el texto
 */
function wordsMatch(text: string, query: string): boolean {
  const normalizedText = normalizeText(text);
  const queryWords = normalizeText(query).split(/\s+/).filter(w => w.length > 0);

  return queryWords.every(word => normalizedText.includes(word));
}

export interface FuzzySearchOptions {
  /** Umbral mínimo de similitud (0-1). Default: 0.3 */
  threshold?: number;
  /** Límite de resultados. Default: sin límite */
  limit?: number;
  /** Incluir coincidencias exactas primero. Default: true */
  prioritizeExact?: boolean;
}

export interface FuzzyResult<T> {
  item: T;
  score: number;
  matchType: 'exact' | 'contains' | 'words' | 'fuzzy';
}

/**
 * Realiza búsqueda fuzzy en un array de items
 * @param items Array de elementos a buscar
 * @param query Texto de búsqueda
 * @param getSearchableText Función para extraer el texto buscable de cada item
 * @param options Opciones de búsqueda
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  getSearchableText: (item: T) => string,
  options: FuzzySearchOptions = {}
): FuzzyResult<T>[] {
  const { threshold = 0.3, limit, prioritizeExact = true } = options;

  if (!query || query.trim().length === 0) {
    return items.map(item => ({ item, score: 1, matchType: 'exact' as const }));
  }

  const normalizedQuery = normalizeText(query);
  const results: FuzzyResult<T>[] = [];

  for (const item of items) {
    const text = getSearchableText(item);
    const normalizedText = normalizeText(text);

    // Coincidencia exacta (máxima prioridad)
    if (normalizedText === normalizedQuery) {
      results.push({ item, score: 1, matchType: 'exact' });
      continue;
    }

    // Contiene el query completo
    if (containsMatch(text, query)) {
      // Dar mejor puntaje si empieza con el query
      const startsWithBonus = normalizedText.startsWith(normalizedQuery) ? 0.1 : 0;
      results.push({ item, score: 0.9 + startsWithBonus, matchType: 'contains' });
      continue;
    }

    // Las palabras del query están en el texto
    if (wordsMatch(text, query)) {
      results.push({ item, score: 0.75, matchType: 'words' });
      continue;
    }

    // Búsqueda fuzzy por similitud
    const score = similarityScore(normalizedText, normalizedQuery);
    if (score >= threshold) {
      results.push({ item, score, matchType: 'fuzzy' });
    }
  }

  // Ordenar por puntaje descendente
  results.sort((a, b) => {
    if (prioritizeExact) {
      // Priorizar por tipo de coincidencia, luego por score
      const typeOrder = { exact: 4, contains: 3, words: 2, fuzzy: 1 };
      const typeDiff = typeOrder[b.matchType] - typeOrder[a.matchType];
      if (typeDiff !== 0) return typeDiff;
    }
    return b.score - a.score;
  });

  return limit ? results.slice(0, limit) : results;
}

/**
 * Versión simplificada para arrays de strings
 */
export function fuzzySearchStrings(
  items: string[],
  query: string,
  options?: FuzzySearchOptions
): string[] {
  return fuzzySearch(items, query, (item) => item, options).map((r) => r.item);
}
