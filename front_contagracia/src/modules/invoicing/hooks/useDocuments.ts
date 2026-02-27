import { useState, useCallback, useEffect, useRef } from 'react';
import { documentsService } from '../services/documents.service';
import { DocumentListItem, DocumentsFilters, DocType, DocumentStatus } from '../types';

const STORAGE_KEY = 'invoicing-documents-filters';

interface SavedFilters {
  search?: string;
  docType?: DocType | '';
  status?: DocumentStatus | '';
}

function loadFilters(): SavedFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFilters(filters: SavedFilters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {}
}

export function useDocuments(limit = 50) {
  const saved = useRef(loadFilters()).current;

  const [items, setItems] = useState<DocumentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(saved.search ?? '');
  const [docType, setDocType] = useState<DocType | ''>(saved.docType ?? '');
  const [status, setStatus] = useState<DocumentStatus | ''>(saved.status ?? '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchIdRef = useRef(0);
  const initialLoadDone = useRef(false);

  const fetchData = useCallback(
    async (overridePage?: number) => {
      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const filters: DocumentsFilters = {
          search: search || undefined,
          docType: docType || undefined,
          status: status || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page: overridePage ?? page,
          limit,
        };

        const response = await documentsService.getAll(filters);

        if (fetchId !== fetchIdRef.current) return;
        setItems(response.data);
        setTotal(response.total);
      } catch (err: any) {
        if (fetchId !== fetchIdRef.current) return;
        setError(err.response?.data?.message || err.message || 'Error al cargar documentos');
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [search, docType, status, fromDate, toDate, page, limit],
  );

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchData();
    }
  }, []);

  useEffect(() => {
    saveFilters({ search, docType, status });
  }, [search, docType, status]);

  const submitSearch = useCallback(() => {
    setPage(1);
    setTimeout(() => fetchData(1), 0);
  }, [fetchData]);

  const goToPage = useCallback(
    (p: number) => {
      setPage(p);
      setTimeout(() => fetchData(p), 0);
    },
    [fetchData],
  );

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    setSearch,
    docType,
    setDocType,
    status,
    setStatus,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    submitSearch,
    goToPage,
    refetch: fetchData,
  };
}
