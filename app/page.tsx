'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';


// Remove the interface definitions from page.tsx and import from shared types
import { 
  ResultItem, 
  RaceType, 
  RaceResult, 
  RaceResults,
  EventInfo,
  SubmitResultsRequest,
  SubmitResultsResponse
} from '@/app/types';

// Race type options for dropdown
const RACE_TYPE_OPTIONS: RaceType[] = [
  "200 MR", "200 Free", "200 IM", "50 Free", "100 Fly", 
  "100 Free", "500 Free", "200 FR", "100 Back", 
  "100 Breast", "400 FR"
];


type Page = 'upload' | 'edit' | 'login' | 'loadingSport' | 'selectSport' | 'loadingEvent' | 'selectEvent' | 'submitting' | 'submissionResult';

function useRequestId() {
  const [requestId] = useState(() => {
    // This function runs only once during initial render
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `${timestamp}_${randomStr}`;
  });
  
  return requestId;
}

// EditableTable Component
function EditableTable({ raceResults, onUpdate }: { 
  raceResults: RaceResults; 
  onUpdate: (updatedResults: RaceResults) => void;
}) {
  const [editingCell, setEditingCell] = useState<{raceIndex: number, rowIndex?: number, field?: string} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save indicator
  useEffect(() => {
    if (lastSaved) {
      const timer = setTimeout(() => {
        setLastSaved(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  const startEditing = (raceIndex: number, rowIndex: number, field: string, value: string | number) => {
    setEditingCell({ raceIndex, rowIndex, field });
    setEditValue(String(value));
  };

  const saveEdit = () => {
    if (!editingCell || editingCell.rowIndex === undefined || !editingCell.field) return;

    const updatedResults = [...raceResults];
    const { raceIndex, rowIndex, field } = editingCell;

    if (field === 'race') {
      updatedResults[raceIndex].race = editValue as RaceType;
    } else {
      const resultItem = updatedResults[raceIndex].results[rowIndex];
      
      switch (field) {
        case 'swimmers':
          resultItem.swimmers = editValue.split(',').map(s => s.trim()).filter(Boolean);
          break;
        case 'place':
          resultItem.place = parseInt(editValue) || 1;
          break;
        case 'time':
          resultItem.time = editValue;
          break;
      }
    }

    onUpdate(updatedResults);
    setEditingCell(null);
    setEditValue('');
    setLastSaved(new Date());
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const addRow = (raceIndex: number) => {
    const updatedResults = [...raceResults];
    updatedResults[raceIndex].results.push({
      swimmers: ['New Swimmer'],
      place: updatedResults[raceIndex].results.length + 1,
      time: '00:00.00'
    });
    onUpdate(updatedResults);
    setLastSaved(new Date());
  };

  const removeRow = (raceIndex: number, rowIndex: number) => {
    const updatedResults = [...raceResults];
    updatedResults[raceIndex].results = updatedResults[raceIndex].results.filter((_, idx) => idx !== rowIndex);
    // Recalculate places
    updatedResults[raceIndex].results = updatedResults[raceIndex].results.map((item, idx) => ({
      ...item,
      place: idx + 1
    }));
    onUpdate(updatedResults);
    setLastSaved(new Date());
  };

  const addRace = () => {
    const updatedResults = [...raceResults];
    updatedResults.push({
      race: '200 Free',
      results: []
    });
    onUpdate(updatedResults);
    setLastSaved(new Date());
  };

  const removeRace = (raceIndex: number) => {
    const updatedResults = raceResults.filter((_, idx) => idx !== raceIndex);
    onUpdate(updatedResults);
    setLastSaved(new Date());
  };

  // Handle Enter/Escape keys in edit mode
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  if (raceResults.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No race results available</p>
        <button
          onClick={addRace}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add First Race
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {raceResults.map((raceResult, raceIndex) => (
        <div key={raceIndex} className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
            {editingCell?.raceIndex === raceIndex && editingCell.field === 'race' ? (
              <div className="flex items-center space-x-2">
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="border rounded px-3 py-1"
                  autoFocus
                >
                  {RACE_TYPE_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <button
                  onClick={saveEdit}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  ✓
                </button>
                <button
                  onClick={cancelEdit}
                  className="bg-gray-600 text-white px-3 py-1 rounded text-sm"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold">{raceResult.race}</h3>
                <button
                  onClick={() => startEditing(raceIndex, -1, 'race', raceResult.race)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ✏️ Edit
                </button>
              </div>
            )}
            <div className="flex space-x-2">
              <button
                onClick={() => addRow(raceIndex)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                + Add Result
              </button>
              <button
                onClick={() => removeRace(raceIndex)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Remove Race
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Place
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Swimmers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {raceResult.results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No results yet. Click "Add Result" to add one.
                    </td>
                  </tr>
                ) : (
                  raceResult.results.map((result, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingCell?.raceIndex === raceIndex && 
                         editingCell.rowIndex === rowIndex && 
                         editingCell.field === 'place' ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="border rounded px-2 py-1 w-20"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                            onClick={() => startEditing(raceIndex, rowIndex, 'place', result.place)}
                          >
                            {result.place}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingCell?.raceIndex === raceIndex && 
                         editingCell.rowIndex === rowIndex && 
                         editingCell.field === 'swimmers' ? (
                          <div>
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              className="border rounded px-2 py-1 w-full"
                              rows={2}
                              autoFocus
                              placeholder="Enter swimmer names, separated by commas"
                            />
                            <p className="text-xs text-gray-500 mt-1">Separate names with commas</p>
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                            onClick={() => startEditing(raceIndex, rowIndex, 'swimmers', result.swimmers.join(', '))}
                          >
                            {result.swimmers.map((swimmer, idx) => (
                              <div key={idx} className="flex items-center">
                                <span className="inline-block w-6 text-gray-400">{idx + 1}.</span>
                                <span>{swimmer}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingCell?.raceIndex === raceIndex && 
                         editingCell.rowIndex === rowIndex && 
                         editingCell.field === 'time' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="border rounded px-2 py-1 w-24"
                            autoFocus
                            placeholder="MM:SS.mm"
                          />
                        ) : (
                          <span 
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                            onClick={() => startEditing(raceIndex, rowIndex, 'time', result.time)}
                          >
                            {result.time}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editingCell?.raceIndex === raceIndex && editingCell.rowIndex === rowIndex ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={saveEdit}
                              className="text-green-600 hover:text-green-900"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => removeRow(raceIndex, rowIndex)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="flex justify-center">
        <button
          onClick={addRace}
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
        >
          + Add New Race
        </button>
      </div>

      {/* Auto-save indicator */}
      {lastSaved && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out z-50">
          ✅ Changes saved automatically
        </div>
      )}
    </div>
  );
}

function LoginSection({ onBack, onSubmit, error, isLoggingIn }: { 
  onBack: () => void; 
  onSubmit: (credentials: { username: string; password: string }) => void;
  error: string | null;
  isLoggingIn: boolean;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setLoginError('Please enter both username and password');
      return;
    }
    onSubmit({ username, password });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800 flex items-center space-x-2 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Results</span>
        </button>
        
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Enter your NJ School Sports Credentials</h2>
        </div>
        
        <p className="text-gray-600 mb-6">
          Login to submit the scanned results to the official NJ School Sports system.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="Enter your username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="Enter your password"
          />
        </div>

        {loginError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
            <p className="text-sm text-red-700">{loginError}</p>
          </div>
        )}

        <div className="pt-4">
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </>
            ) : (
              'Login & Continue'
            )}
          </button>
        </div>

        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need help? Reach out to Om Raheja. 
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingSport() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
      <div className="text-center py-12">
        <div className="relative">
          <svg className="animate-spin h-16 w-16 text-purple-600 mx-auto mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-purple-600 rounded-full animate-ping"></div>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Loading Your Sports
        </h2>
        
        <div className="max-w-md mx-auto">
          <p className="text-gray-600 mb-4">
            Fetching available sports from your NJ School Sports account.
          </p>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Authenticating</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              <span>Loading sports</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              <span>Preparing selection</span>
            </div>
          </div>
        </div>
        
        <div className="mt-12 max-w-lg w-full">
          <div className="bg-gray-100 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full animate-pulse w-1/2"></div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Connecting to NJ School Sports database...
          </p>
        </div>
      </div>
    </div>
  );
}

function SportSelection({ 
  sports, 
  selectedSport, 
  onSelect, 
  onBack, 
  onSubmit 
}: { 
  sports: string[];
  selectedSport: string;
  onSelect: (sport: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800 flex items-center space-x-2 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Login</span>
        </button>
        
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-purple-100 p-3 rounded-full">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Select Sport</h2>
        </div>
        
        <p className="text-gray-600 mb-6">
          Your account has access to multiple sports. Please select which sport you want to submit results for.
        </p>
      </div>

      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sports.map((sport) => (
            <button
              key={sport}
              onClick={() => onSelect(sport)}
              className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedSport === sport
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">{sport}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Submit results for {sport.toLowerCase()} meets
                  </p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedSport === sport 
                    ? 'bg-purple-500 border-purple-500' 
                    : 'bg-white border-gray-300'
                }`}>
                  {selectedSport === sport && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {sports.length === 0 && (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">No sports available for your account.</p>
            <p className="text-sm text-gray-400 mt-2">Contact your athletic director for access.</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-md hover:bg-gray-100"
          >
            Back
          </button>
          <button
            onClick={onSubmit}
            disabled={!selectedSport}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-semibold disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
          >
            Continue with {selectedSport}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingEvent({ sport }: { sport: string }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
      <div className="text-center py-12">
        <div className="relative">
          <svg className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full animate-ping"></div>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Loading Events for {sport}
        </h2>
        
        <div className="max-w-md mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="font-semibold text-blue-800">{sport}</p>
            </div>
          </div>
          
          <p className="text-gray-600 mb-4">
            Fetching available events for {sport}.
          </p>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Connecting</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              <span>Loading schedule</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span>Processing events</span>
            </div>
          </div>
        </div>
        
        <div className="mt-12 max-w-lg w-full">
          <div className="bg-gray-100 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse w-2/3"></div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Retrieving meet schedule from NJ School Sports...
          </p>
        </div>
      </div>
    </div>
  );
}

function EventSelection({
  events,
  selectedSport,
  selectedEvent,
  onSelect,
  onBack,
  onSubmit,
  error
}: {
  events: EventInfo[];
  selectedSport: string;
  selectedEvent: EventInfo | null;
  onSelect: (event: EventInfo) => void;
  onBack: () => void;
  onSubmit: () => void;
  error: string;
}) {
  const safeEvents = Array.isArray(events) ? events : [];
  
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 flex items-center space-x-2 mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Sport Selection</span>
          </button>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-700">
                Failed to load events
              </p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800 flex items-center space-x-2 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Sport Selection</span>
        </button>
        
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Select Event</h2>
            <p className="text-sm text-gray-500 mt-1">
              Choose an event to submit results for {selectedSport}
            </p>
          </div>
        </div>
        
        <p className="text-gray-600 mb-6">
          Select the meet or event where these results took place.
        </p>
      </div>

      <div className="mb-8">
        {safeEvents.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {safeEvents.map((event, index) => (
              <button
                key={index}
                onClick={() => onSelect(event)}
                className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                  selectedEvent?.date === event.date && 
                  selectedEvent?.opponent === event.opponent
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-800">
                          {event.opponent}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {event.date}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        event.result === 'W' 
                          ? 'bg-green-100 text-green-800'
                          : event.result === 'L'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.result === 'W' ? 'Win' : event.result === 'L' ? 'Loss' : event.result}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mt-2">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{selectedSport} Meet</span>
                    </div>
                  </div>
                  <div className={`ml-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedEvent?.date === event.date && 
                    selectedEvent?.opponent === event.opponent
                      ? 'bg-blue-500 border-blue-500' 
                      : 'bg-white border-gray-300'
                  }`}>
                    {selectedEvent?.date === event.date && 
                     selectedEvent?.opponent === event.opponent && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 inline-block">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Events Found</h3>
              <p className="text-gray-600 mb-4">No events were found for {selectedSport}.</p>
              <p className="text-sm text-gray-500 mb-4">
                This could mean there are no scheduled events or you need to create one first.
              </p>
              <button
                onClick={onBack}
                className="bg-gray-100 text-gray-800 hover:bg-gray-200 px-4 py-2 rounded-md font-medium"
              >
                Return to Sport Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {safeEvents.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-md hover:bg-gray-100"
            >
              Back
            </button>
            <div className="flex items-center space-x-4">
              {selectedEvent && (
                <div className="text-sm text-gray-700">
                  Selected: <span className="font-semibold text-blue-600">{selectedEvent.opponent}</span> on {selectedEvent.date}
                </div>
              )}
              <button
                onClick={onSubmit}
                disabled={!selectedEvent}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
              >
                Continue with Selected Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FullPageLoader({ message = "Submitting results..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-95 z-50 flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <svg className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full animate-ping"></div>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-3">{message}</h2>
        
        <div className="max-w-md mx-auto">
          <p className="text-gray-600 mb-4">
            This may take a moment. Please don't close this window.
          </p>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Validating credentials</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              <span>Uploading results</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span>Confirming submission</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-12 max-w-lg w-full">
        <div className="bg-gray-100 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4"></div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          Processing your submission...
        </p>
      </div>
    </div>
  );
}

function SubmissionResult({ 
  result, 
  onStartOver,
  onRetry,
  setCurrentPage,
  raceCount,
  sport,
  event
}: { 
  result: SubmitResultsResponse;
  onStartOver: () => void;
  onRetry?: () => void;
  setCurrentPage: (page: Page) => void;
  raceCount: number;
  sport: string;
  event: EventInfo;
}) {
  if (result.success) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Submission Successful! 🎉</h2>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-green-800 mb-3">Results have been submitted to NJ School Sports</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Sport</p>
                <p className="font-semibold text-gray-800">{sport}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Event</p>
                <p className="font-semibold text-gray-800">{event.opponent}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-semibold text-gray-800">{event.date}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Races Submitted</p>
                <p className="font-semibold text-gray-800">{raceCount}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-green-100">
              <p className="text-sm text-green-700">
                2 hours of work condensed into 5 minutes. 
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onStartOver}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold"
            >
              Submit Another Meet
            </button>
            <button
              onClick={() => window.print()}
              className="bg-gray-100 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-200 transition-all duration-200 font-semibold border border-gray-300"
            >
              Print Confirmation
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-6">
            Please reach out with any questions or concerns.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
      <div className="text-center py-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Submission Failed</h2>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 text-left">
          <h3 className="font-semibold text-red-800 mb-2">{result.error || 'Unknown Error'}</h3>
          
          {result.details && (
            <p className="text-red-700 mb-3">{result.details}</p>
          )}
          
          {result.suggestion && (
            <div className="bg-white p-4 rounded border border-red-100">
              <p className="text-sm font-medium text-red-800 mb-1">Suggested Action:</p>
              <p className="text-red-700">{result.suggestion}</p>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-red-100">
            <p className="text-sm text-red-700">
              Please review your data and try again. If the problem persists, contact support.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold"
            >
              Try Again
            </button>
          )}
          <button
            onClick={() => setCurrentPage('selectEvent')}
            className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 font-semibold"
          >
            Go Back
          </button>
          <button
            onClick={onStartOver}
            className="bg-gray-100 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-200 transition-all duration-200 font-semibold border border-gray-300"
          >
            Start Over
          </button>
        </div>
        
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Your data has been saved locally. You can start over without losing your work.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  // initial page
  const [currentPage, setCurrentPage] = useState<Page>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [raceResults, setRaceResults] = useState<RaceResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storedCredentials, setStoredCredentials] = 
      useState<{username: string; password: string} | null>(null);

  // selectSport
  const [sportsList, setSportsList] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // selectEvent
  const [eventsList, setEventsList] = useState<EventInfo[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventInfo | null>(null);
  const [eventsError, setEventsError] = useState<string>('');

  // submission pages
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmitResultsResponse | null>(null);

  const requestId = useRequestId();

  useEffect(() => {
    if (raceResults) {
      setCurrentPage('edit');
    }
  }, [raceResults]);

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    setRaceResults(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('requestId', requestId);

    try {
      const response = await axios.post<RaceResults>('/api/py/scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        setRaceResults(response.data);
        console.log('Extracted data:', response.data);
      } else {
        setError('Upload failed');
      }
    } catch (err: any) {
      setError(err.response?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setRaceResults(null);
    setFile(null);
    setError(null);
    setSportsList([]);
    setSelectedSport('');
    setLoginError('');
    setEventsList([]);
    setSelectedEvent(null);
    setStoredCredentials(null);
    setSubmissionResult(null);
    setIsSubmitting(false);
    setEventsError(''); // Add this
    setCurrentPage('upload');
  };

  const handleContinue = () => {
    console.log('Continuing to login with data:', raceResults);
    setCurrentPage('login');
  };

  const handleLoginSubmit = async (credentials: { username: string; password: string }) => {
    setLoginError('');
    setIsLoggingIn(true);

    setCurrentPage('loadingSport'); // Add this line
    
    try {
      const response = await axios.post<string[]>('/api/getSports', { ...credentials, requestId }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200 && response.data) {
        setSportsList(response.data);
        setStoredCredentials(credentials);
        
        setCurrentPage('selectSport');
        console.log('Available sports:', response.data);
      } else {
        setLoginError('Failed to fetch sports list. Please check your credentials.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.error || 'Login failed';
      setLoginError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSportSubmit = async () => {
    console.log('Selected sport:', selectedSport);
    
    if (!selectedSport) {
      setEventsError('Please select a sport first.');
      return;
    }

    setCurrentPage('loadingEvent'); // Add this line
    setEventsError('');
    setSelectedEvent(null);
    
    try {
      if (!storedCredentials) {
        setEventsError('Session expired. Please login again.');
        setCurrentPage('login');
        return;
      }

      const response = await axios.post('/api/getEvents', {
        username: storedCredentials.username,
        password: storedCredentials.password,
        sport: selectedSport,
        requestId
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200 && response.data) {
        let eventsData = response.data;
        
        // Handle different response formats
        if (!Array.isArray(eventsData)) {
          if (eventsData.events && Array.isArray(eventsData.events)) {
            eventsData = eventsData.events;
          } else if (eventsData.data && Array.isArray(eventsData.data)) {
            eventsData = eventsData.data;
          } else {
            console.warn('Unexpected events data format:', eventsData);
            eventsData = [];
          }
        }
        
        // Transform to EventInfo format if needed
        const processedEvents = eventsData.map((item: any) => ({
          date: item.date || '',
          result: item.result || '',
          opponent: item.opponent || ''
        })).filter((event: EventInfo) => event.date && event.opponent);
        
        setEventsList(processedEvents);
        setCurrentPage('selectEvent');
        
        if (processedEvents.length === 0) {
          setEventsError('No events found for this sport.');
        }
      } else {
        setEventsError('Failed to fetch events list.');
      }
    } catch (err: any) {
      console.error('Events fetch error:', err);
      setEventsError(err.response?.data?.error || 'Failed to load events. Please try again.');
    }
  };

  const handleEventSelect = (event: EventInfo) => {
    setSelectedEvent(event);
  };

  const handleEventSubmit = async () => {
    console.log('Submitting results...');
    
    if (!selectedEvent || !storedCredentials || !raceResults || !selectedSport) {
      console.error('Missing required data for submission');
      return;
    }
    
    setIsSubmitting(true);
    setCurrentPage('submitting');
    
    try {
      const requestData: SubmitResultsRequest = {
        username: storedCredentials.username,
        password: storedCredentials.password,
        sport: selectedSport,
        eventDate: selectedEvent.date,
        data: raceResults,
        requestId: requestId
      };
      
      console.log('Submitting data:', {
        sport: selectedSport,
        event: selectedEvent.opponent,
        raceCount: raceResults.length
      });
      
      const response = await axios.post<SubmitResultsResponse>(
        '/api/submitResults',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout
        }
      );
      
      setSubmissionResult(response.data);
      
      if (response.data.success) {
        console.log('Submission successful!');
      } else {
        console.error('Submission failed:', response.data.error);
      }
      
    } catch (error: any) {
      console.error('Submission error:', error);
      
      setSubmissionResult({
        success: false,
        error: 'Submission failed',
        details: error.response?.data?.error || error.message || 'Unknown error',
        suggestion: 'Please check your connection and try again.'
      });
    } finally {
      setCurrentPage('submissionResult');
      setIsSubmitting(false);
    }
  };

  const handleRetrySubmission = () => {
    setSubmissionResult(null);
    handleEventSubmit();
  };

  return (
    <main className="min-h-screen bg-gray-50 relative pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-3xl font-bold text-gray-800">🏊‍♂️ Swim Meet Scanner</h1>
            
            {raceResults && currentPage !== 'upload' && (
              <button
                onClick={handleStartOver}
                className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-md hover:bg-gray-100 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Start Over</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section - Only shown initially */}
        {currentPage === 'upload' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Upload Timing Sheet</h2>
            
            <div className="mb-6">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {file ? (
                      <>
                        <svg className="w-8 h-8 mb-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        <p className="text-sm text-gray-600">{file.name}</p>
                      </>
                    ) : (
                      <>
                        <svg className="w-8 h-8 mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                        <p className="text-sm text-gray-600"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 10MB</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                    <span>Scan with Gemini AI</span>
                  </>
                )}
              </button>

              {file && (
                <button
                  onClick={() => setFile(null)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
              )}
            </div>

            {file && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
                <div className="max-w-md mx-auto">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="rounded-lg shadow border border-gray-200"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {raceResults && currentPage === 'edit' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="mb-6">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-bold text-gray-800">Race Results</h2>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r flex-1">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-800">
                        WARNING: THESE ARE AI-GENERATED RESULTS
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Please verify all data before continuing. AI can make mistakes.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500 whitespace-nowrap">
                  {raceResults.reduce((total, race) => total + race.results.length, 0)} entries
                </div>
              </div>
            </div>
            
            <EditableTable raceResults={raceResults} onUpdate={setRaceResults} />
          </div>
        )}

        {/* Floating Continue Button - Only shown when results are loaded */}
        {raceResults && currentPage === 'edit' && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={handleContinue}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-lg shadow-lg hover:from-green-700 hover:to-green-800 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-3"
            >
              <span className="text-lg font-semibold">Continue</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}

        {currentPage === 'selectSport' && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700">
                Selected: <span className="text-purple-600">{selectedSport || 'None'}</span>
              </p>
            </div>
          </div>
        )}

        {currentPage === 'selectEvent' && selectedEvent && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={handleEventSubmit}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-lg shadow-lg hover:from-green-700 hover:to-green-800 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-3"
              disabled={isSubmitting}
            >
              <span className="text-lg font-semibold">
                {isSubmitting ? 'Submitting...' : 'Submit Results'}
              </span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}

        {currentPage === 'login' && raceResults && (
          <LoginSection 
            onBack={() => setCurrentPage('edit')}
            onSubmit={handleLoginSubmit}
            error={loginError}
            isLoggingIn={isLoggingIn}
          />
        )}

        {currentPage === 'loadingSport' && (
          <LoadingSport />
        )}

        {currentPage === 'selectSport' && (
          <SportSelection
            sports={sportsList}
            selectedSport={selectedSport}
            onSelect={setSelectedSport}
            onBack={() => setCurrentPage('login')}
            onSubmit={handleSportSubmit}
          />
        )}

        {currentPage === 'loadingEvent' && (
          <LoadingEvent sport={selectedSport} />
        )}

        {currentPage === 'selectEvent' && (
          <EventSelection
            events={eventsList}
            selectedSport={selectedSport}
            selectedEvent={selectedEvent}
            onSelect={handleEventSelect}
            onBack={() => setCurrentPage('selectSport')}
            onSubmit={handleEventSubmit}
            error={eventsError}
          />
        )}

        {currentPage === 'submitting' && (
          <FullPageLoader 
            message="Submitting results to NJ School Sports..."
          />
        )}

        {currentPage === 'submissionResult' && submissionResult && (
          <SubmissionResult
            result={submissionResult}
            onStartOver={handleStartOver}
            onRetry={() => {
              setCurrentPage('selectEvent');
              setSubmissionResult(null);
            }}
            setCurrentPage={setCurrentPage}
            raceCount={raceResults?.length || 0}
            sport={selectedSport}
            event={selectedEvent!}
          />
        )}
      </div>

      {/* Tailwind animation for auto-save indicator */}
      <style jsx>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fade-in-out {
          animation: fadeInOut 2s ease-in-out;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            background: white !important;
          }
          
          .print-confirmation {
            display: block !important;
            border: 2px solid #000 !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </main>
  );
}
