

import { Worker, Milestone } from './types';

export const INITIAL_WORKERS: Worker[] = [
  { id: 1, name: 'MARILYN GABRIEL', statuses: {}, history: [] },
  { id: 2, name: 'FLORIDA PASION', statuses: {}, history: [] },
  { id: 3, name: 'VICTORIA GUARDA BURCIA', statuses: {}, history: [] },
  { id: 4, name: 'JENNIFER VALENZUELA RAPSING', statuses: {}, history: [] },
  { id: 5, name: 'MARY ANN PORLARES MAGALLON', statuses: {}, isRec: true, history: [] },
  { id: 6, name: 'ALMA YUGA LAPITAN', statuses: {}, history: [] },
  { id: 7, name: 'MA. NIÑA MONTALBAN', statuses: {}, history: [] },
  { id: 8, name: 'MARY JANE QUIATZON', statuses: {}, history: [] },
  { id: 9, name: 'LLANTOS, ALMA OBLINA', statuses: {}, history: [] },
  { id: 10, name: 'MARIA ISABEL LAGAN', statuses: {}, history: [] },
  { id: 11, name: 'JOAN BUSACO GALVEZ', statuses: {}, history: [] },
  { id: 12, name: 'CHARRIE JADE RAMIREZ', statuses: {}, history: [] }
];

export const STATUS_COLUMNS = [
  { id: 'signingContract', label: 'Signing Contract', icon: '✍️' },
  { id: 'training', label: 'Training', icon: '📚' },
  { id: 'oec', label: 'OEC', icon: '📄' },
  { id: 'stamp', label: 'Stamp', icon: '✅' },
  { id: 'booking', label: 'Flight', icon: '✈️' }
];

export const MILESTONE_COLORS: Record<string, string> = {
  [Milestone.Training]: "bg-yellow-100 text-yellow-800",
  [Milestone.SigningContract]: "bg-teal-100 text-teal-800",
  [Milestone.OEC]: "bg-blue-100 text-blue-800",
  [Milestone.Stamp]: "bg-green-100 text-green-800",
  [Milestone.Booking]: "bg-purple-100 text-purple-800"
};