export type Role = 'student' | 'alumni' | 'business' | 'admin';

export const ROLES: { value: Role; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'business', label: 'Business' },
  { value: 'admin', label: 'Admin' },
];
