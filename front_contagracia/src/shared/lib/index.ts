/**
 * Exportación centralizada de utilidades
 */

export { cn } from './utils';
export {
  levenshteinDistance,
  similarityScore,
  normalizeText,
  fuzzySearch,
  fuzzySearchStrings,
  type FuzzySearchOptions,
  type FuzzyResult,
} from './fuzzy-search';
