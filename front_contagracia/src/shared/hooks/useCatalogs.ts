'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  catalogsService,
  type Country,
  type Department,
  type Municipality,
  type TypeDocumentIdentification,
  type TypeOrganization,
  type TypeRegime,
  type TypeLiability,
} from '@/shared/services/catalogs.service';
import type { SearchableSelectOption } from '@/shared/components/ui/searchable-select';

interface UseCatalogsOptions {
  /** Cargar países al iniciar */
  loadCountries?: boolean;
  /** Cargar tipos de documento al iniciar */
  loadDocumentTypes?: boolean;
  /** Cargar tipos de organización al iniciar */
  loadOrganizationTypes?: boolean;
  /** Cargar tipos de régimen al iniciar */
  loadRegimeTypes?: boolean;
  /** Cargar tipos de responsabilidad al iniciar */
  loadLiabilityTypes?: boolean;
  /** ID del país para cargar departamentos */
  countryId?: string;
  /** ID del departamento para cargar municipios */
  departmentId?: number;
}

interface UseCatalogsReturn {
  // Datos
  countries: SearchableSelectOption[];
  departments: SearchableSelectOption[];
  municipalities: SearchableSelectOption[];
  documentTypes: SearchableSelectOption[];
  organizationTypes: SearchableSelectOption[];
  regimeTypes: SearchableSelectOption[];
  liabilityTypes: SearchableSelectOption[];

  // Estados
  isLoading: boolean;
  error: string | null;

  // Métodos para cargar datos bajo demanda
  loadDepartments: (countryId: string) => Promise<void>;
  loadMunicipalities: (departmentId: number) => Promise<void>;

  // Métodos para refrescar
  refresh: () => Promise<void>;
}

// Helpers para convertir a SearchableSelectOption
const toSelectOption = (item: { id: number | string; name: string; code?: string }): SearchableSelectOption => ({
  value: String(item.id),
  label: item.name,
  description: item.code,
});

const toSelectOptionWithCode = (item: { id: number | string; name: string; code: string }): SearchableSelectOption => ({
  value: String(item.id),
  label: item.name,
  description: item.code,
});

/**
 * Hook para cargar y gestionar catálogos del sistema
 */
export function useCatalogs(options: UseCatalogsOptions = {}): UseCatalogsReturn {
  const {
    loadCountries = false,
    loadDocumentTypes = false,
    loadOrganizationTypes = false,
    loadRegimeTypes = false,
    loadLiabilityTypes = false,
    countryId,
    departmentId,
  } = options;

  // Estados
  const [countries, setCountries] = useState<SearchableSelectOption[]>([]);
  const [departments, setDepartments] = useState<SearchableSelectOption[]>([]);
  const [municipalities, setMunicipalities] = useState<SearchableSelectOption[]>([]);
  const [documentTypes, setDocumentTypes] = useState<SearchableSelectOption[]>([]);
  const [organizationTypes, setOrganizationTypes] = useState<SearchableSelectOption[]>([]);
  const [regimeTypes, setRegimeTypes] = useState<SearchableSelectOption[]>([]);
  const [liabilityTypes, setLiabilityTypes] = useState<SearchableSelectOption[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar países
  const fetchCountries = useCallback(async () => {
    try {
      const data = await catalogsService.getCountries();
      setCountries(data.map(toSelectOption));
    } catch (err) {
      console.error('Error loading countries:', err);
      setError('Error al cargar países');
    }
  }, []);

  // Cargar departamentos por país
  const loadDepartments = useCallback(async (countryId: string) => {
    try {
      setDepartments([]);
      setMunicipalities([]);
      const data = await catalogsService.getDepartmentsByCountry(countryId);
      setDepartments(data.map(toSelectOption));
    } catch (err) {
      console.error('Error loading departments:', err);
      setError('Error al cargar departamentos');
    }
  }, []);

  // Cargar municipios por departamento
  const loadMunicipalities = useCallback(async (departmentId: number) => {
    try {
      setMunicipalities([]);
      const data = await catalogsService.getMunicipalitiesByDepartment(departmentId);
      setMunicipalities(data.map(toSelectOption));
    } catch (err) {
      console.error('Error loading municipalities:', err);
      setError('Error al cargar municipios');
    }
  }, []);

  // Cargar tipos de documento
  const fetchDocumentTypes = useCallback(async () => {
    try {
      const data = await catalogsService.getDocumentTypes();
      setDocumentTypes(data.map(toSelectOptionWithCode));
    } catch (err) {
      console.error('Error loading document types:', err);
      setError('Error al cargar tipos de documento');
    }
  }, []);

  // Cargar tipos de organización
  const fetchOrganizationTypes = useCallback(async () => {
    try {
      const data = await catalogsService.getOrganizationTypes();
      setOrganizationTypes(data.map(toSelectOptionWithCode));
    } catch (err) {
      console.error('Error loading organization types:', err);
      setError('Error al cargar tipos de organización');
    }
  }, []);

  // Cargar tipos de régimen
  const fetchRegimeTypes = useCallback(async () => {
    try {
      const data = await catalogsService.getRegimeTypes();
      setRegimeTypes(data.map(toSelectOptionWithCode));
    } catch (err) {
      console.error('Error loading regime types:', err);
      setError('Error al cargar tipos de régimen');
    }
  }, []);

  // Cargar tipos de responsabilidad
  const fetchLiabilityTypes = useCallback(async () => {
    try {
      const data = await catalogsService.getLiabilityTypes();
      setLiabilityTypes(data.map(toSelectOptionWithCode));
    } catch (err) {
      console.error('Error loading liability types:', err);
      setError('Error al cargar tipos de responsabilidad');
    }
  }, []);

  // Cargar datos iniciales
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const promises: Promise<void>[] = [];

    if (loadCountries) promises.push(fetchCountries());
    if (loadDocumentTypes) promises.push(fetchDocumentTypes());
    if (loadOrganizationTypes) promises.push(fetchOrganizationTypes());
    if (loadRegimeTypes) promises.push(fetchRegimeTypes());
    if (loadLiabilityTypes) promises.push(fetchLiabilityTypes());

    await Promise.all(promises);
    setIsLoading(false);
  }, [
    loadCountries,
    loadDocumentTypes,
    loadOrganizationTypes,
    loadRegimeTypes,
    loadLiabilityTypes,
    fetchCountries,
    fetchDocumentTypes,
    fetchOrganizationTypes,
    fetchRegimeTypes,
    fetchLiabilityTypes,
  ]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Efecto para cargar departamentos cuando cambia el país
  useEffect(() => {
    if (countryId) {
      loadDepartments(countryId);
    }
  }, [countryId, loadDepartments]);

  // Efecto para cargar municipios cuando cambia el departamento
  useEffect(() => {
    if (departmentId) {
      loadMunicipalities(departmentId);
    }
  }, [departmentId, loadMunicipalities]);

  return {
    countries,
    departments,
    municipalities,
    documentTypes,
    organizationTypes,
    regimeTypes,
    liabilityTypes,
    isLoading,
    error,
    loadDepartments,
    loadMunicipalities,
    refresh: loadInitialData,
  };
}
