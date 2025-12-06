import React, { useState } from 'react';
import { Worker, Milestone, UpdateLog } from '../types';
import { StatusBadge } from './StatusBadge';
import { ChevronDown, ChevronUp, History, Save, X } from 'lucide-react';
import { format } from 'date-fns';

interface WorkerRowProps {
  worker: Worker;
  onUpdate: (id: string, milestone: Milestone, note: string) => void;
}

export const WorkerRow: React.FC<WorkerRowProps> = ({ worker, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Safe access for optional fields
  const history = worker.history || [];
  const latestLog = history.length > 0 ? history[0] : null;
  
  // Derive status and date from history since they are not on the Worker interface directly
  const currentStatus = (latestLog?.milestone as Milestone) || Milestone.Training;
  const lastUpdateDate = latestLog?.timestamp || new Date().toISOString();
  
  // Edit State
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone>(currentStatus);
  const [note, setNote] = useState('');

  const handleSave = () => {
    onUpdate(String(worker.id), selectedMilestone, note);
    setIsEditing(false);
    setNote('');
    // Ensure history is shown after update to see the result
    setIsExpanded(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNote('');
    setSelectedMilestone(currentStatus);
  };

  return (
    <>
      <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="mr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            <div className="text-sm font-bold text-gray-900">{worker.name}</div>
          </div>
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap">
          {!isEditing ? (
            <StatusBadge status={currentStatus} />
          ) : (
            <select
              value={selectedMilestone}
              onChange={(e) => setSelectedMilestone(e.target.value as Milestone)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1 border"
            >
              {Object.values(Milestone).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {format(new Date(lastUpdateDate), 'MMM d, yyyy')}
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-200"
            >
              Update Status
            </button>
          ) : (
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={handleSave}
                className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md flex items-center"
              >
                <Save size={14} className="mr-1" /> Save
              </button>
              <button
                onClick={handleCancel}
                className="text-gray-600 bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded-md"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </td>
      </tr>

      {/* Expanded Details / Editing Notes */}
      {(isExpanded || isEditing) && (
        <tr className="bg-gray-50">
          <td colSpan={4} className="px-6 py-4">
            
            {/* Edit Mode Notes Input */}
            {isEditing && (
              <div className="mb-4 bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Details / Notes
                </label>
                <textarea
                  rows={2}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2"
                  placeholder="e.g., Documents submitted to embassy..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            )}

            {/* History Timeline */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                <History size={14} className="mr-2" /> History & Logs
              </h4>
              
              {history.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No updates recorded yet.</p>
              ) : (
                <div className="border-l-2 border-gray-200 ml-2 space-y-4">
                  {history.map((log) => (
                    <div key={log.id} className="relative pl-4">
                      <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-gray-400 ring-4 ring-white"></div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {log.milestone}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(log.timestamp), 'PP p')}
                        </span>
                      </div>
                      {log.note && (
                        <p className="mt-1 text-sm text-gray-600 bg-white p-2 rounded border border-gray-100 inline-block">
                          {log.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};