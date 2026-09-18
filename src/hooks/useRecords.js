import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { getRecords } from '../api/financeApi';
export function useRecords(entity, enabled = true) {
  const { app, setRows } = useApp();
  const { session } = useAuth();
  const [records,setRecords]=useState([]), [loading,setLoading]=useState(false), [error,setError]=useState('');
  const request = useRef(0);
  const loadRecords = useCallback(async () => {
    if (!enabled) return;
    const id=++request.current;
    setLoading(true);setError('');setRecords([]);
    try {const result=await getRecords(entity,app.filters,session);if(id===request.current){setRecords(result.rows || []);setRows(entity,result.rows || []);}}
    catch(err){if(id===request.current)setError(err.message || 'Gagal memuat data.');}
    finally{if(id===request.current)setLoading(false);}
  },[entity,app.filters,session,setRows,enabled]);
  useEffect(() => {loadRecords();return () => {request.current++;};},[loadRecords,app.state]);
  return {records,loading,error,loadRecords};
}
