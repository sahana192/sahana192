import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export function useHistory() {
  const [history, setHistory] = useState([]);
  const [currentEntryId, setCurrentEntryId] = useState(null);
  const { token } = useAuth();

  // Load history from backend when token changes
  useEffect(() => {
    if (!token) {
      setHistory([]);
      return;
    }
    fetch('http://localhost:8000/api/history', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setHistory(data))
      .catch(() => setHistory([]));
  }, [token]);

  const addEntry = async (entry) => {
    if (!token) return null;
    
    // We expect the backend to return the id, but for optimistic UI we can create a fake one temporarily
    const optimisticId = Date.now().toString();
    const newEntry = { ...entry, id: optimisticId, timestamp: new Date().toISOString() };
    setHistory(prev => [newEntry, ...prev]);

    try {
      const res = await fetch('http://localhost:8000/api/history', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(entry)
      });
      const data = await res.json();
      if (res.ok) {
        setHistory(prev => prev.map(e => e.id === optimisticId ? { ...e, id: data.id } : e));
        setCurrentEntryId(prev => prev === optimisticId ? data.id : prev);
        return data.id;
      }
    } catch {}
    return optimisticId;
  };

  const removeEntry = async (id) => {
    if (!token) return;
    setHistory(prev => prev.filter(e => e.id !== id));
    await fetch(`http://localhost:8000/api/history/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const clearHistory = useCallback(() => {
    // Note: Backend clear all not implemented in API, so we just clear local state for now
    setHistory([]);
  }, []);

  const updateEntry = async (id, updates) => {
    if (!token) return;
    
    setHistory(prev => {
      const newHistory = prev.map(e => (e.id === id ? { ...e, ...updates } : e));
      
      // Persist to backend
      if (updates.result || updates.chat) {
        const current = newHistory.find(e => e.id === id);
        const updatedResult = { ...current.result, ...updates.result };
        if (updates.chat) updatedResult.chat = updates.chat;

        fetch(`http://localhost:8000/api/history/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ result: updatedResult })
        });
      }
      
      return newHistory;
    });
  };

  return { history, currentEntryId, setCurrentEntryId, addEntry, removeEntry, clearHistory, updateEntry };
}

/** Format ISO timestamp → human-readable relative time */
export function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins} min${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}
