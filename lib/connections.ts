import { supabase } from './supabase';

export type ConnectionStatus = 'none' | 'pending' | 'connected';

/** Map of other-party profile id -> connection status, from my own point of view. */
export async function fetchMyConnectionStatuses(myId: string): Promise<Map<string, ConnectionStatus>> {
  const { data, error } = await supabase
    .from('connections')
    .select('requester_id, addressee_id, status')
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  if (error) throw error;

  const map = new Map<string, ConnectionStatus>();
  for (const row of data ?? []) {
    const otherId = row.requester_id === myId ? row.addressee_id : row.requester_id;
    map.set(otherId, row.status as ConnectionStatus);
  }
  return map;
}

export async function sendConnectionRequest(myId: string, otherId: string) {
  const { error } = await supabase
    .from('connections')
    .insert({ requester_id: myId, addressee_id: otherId, status: 'pending' });
  if (error) throw error;
}

/** Simulates the other side accepting — this app has no messaging/notification
 * flow for a real accept, and connections are explicitly client-side per the
 * build plan, so confirming is just a second tap by the same user. */
export async function confirmConnection(myId: string, otherId: string) {
  const { error } = await supabase
    .from('connections')
    .update({ status: 'connected' })
    .or(`and(requester_id.eq.${myId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${myId})`);
  if (error) throw error;
}

export type Connection = {
  id: string;
  status: ConnectionStatus;
  otherProfile: { id: string; full_name: string; headline: string | null; role: string };
};

export async function fetchMyConnections(myId: string): Promise<Connection[]> {
  const { data, error } = await supabase
    .from('connections')
    .select(
      `id, status, requester_id, addressee_id,
       requester:profiles!connections_requester_id_fkey(id, full_name, headline, role),
       addressee:profiles!connections_addressee_id_fkey(id, full_name, headline, role)`
    );
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status as ConnectionStatus,
    otherProfile: row.requester_id === myId ? (row.addressee as any) : (row.requester as any),
  }));
}
