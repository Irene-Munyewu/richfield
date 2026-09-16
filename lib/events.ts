import { supabase } from './supabase';

export type Event = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
};

export async function fetchEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, location, event_date')
    .order('event_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Ids of events the given profile is registered for — used to render Register vs. Registered. */
export async function fetchMyRegisteredEventIds(profileId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('event_id')
    .eq('profile_id', profileId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.event_id));
}

export async function registerForEvent(eventId: string, profileId: string) {
  const { error } = await supabase.from('event_registrations').insert({ event_id: eventId, profile_id: profileId });
  if (error) throw error;
}

export async function unregisterFromEvent(eventId: string, profileId: string) {
  const { error } = await supabase
    .from('event_registrations')
    .delete()
    .eq('event_id', eventId)
    .eq('profile_id', profileId);
  if (error) throw error;
}

export type NewEvent = {
  createdBy: string;
  title: string;
  description: string;
  location: string;
  eventDate: string;
};

export async function createEvent(input: NewEvent) {
  const { error } = await supabase.from('events').insert({
    created_by: input.createdBy,
    title: input.title,
    description: input.description || null,
    location: input.location || null,
    event_date: input.eventDate,
  });
  if (error) throw error;
}
