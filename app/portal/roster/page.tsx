import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  subteam: string;
}

// The roster reads cookies and the database, so it can't be prerendered.
// Cache Components (next.config.ts) requires that kind of data access to sit
// inside <Suspense>; the page shell renders instantly and the list streams in.
export default function RosterPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          🏴‍☠️ Meet the Crew
        </h1>
        <p className="text-slate-600 mt-1">Active engineers, builders, and strategists of FRC 9181.</p>
      </div>
      <Suspense fallback={<p className="text-slate-500">Loading the crew…</p>}>
        <RosterList />
      </Suspense>
    </div>
  );
}

async function RosterList() {
  // Initialize our secure database client helper
  const supabase = await createClient();
  
  // Fetch active team members ordered alphabetically by role
  const { data: members, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, subteam')
    .eq('is_active', true)
    .order('role', { ascending: true });

  // Fallback state if database tables haven't been seeded yet
  if (error) {
    return (
      <div className="p-6 text-slate-800 bg-amber-50 border border-amber-200 rounded-xl max-w-xl mx-auto">
        <h2 className="font-bold text-lg mb-2">🚧 Database Connection Ready!</h2>
        <p className="text-sm text-slate-600 mb-4">
          Next.js successfully reached your Supabase endpoint, but the data couldn't be loaded. 
          Make sure your SQL script has been run in the Supabase dashboard and your table contains profiles.
        </p>
        <code className="text-xs block p-2 bg-slate-900 text-red-400 rounded">
          {error.message}
        </code>
      </div>
    );
  }

  return (
    <>
      {members && members.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-slate-300 rounded-xl text-slate-500">
          No team profiles found in your database table yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members?.map((member: Profile) => (
            <div key={member.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-slate-800">{member.full_name}</h3>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  member.role === 'Lead' || member.role === 'Mentor' 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {member.role}
                </span>
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                <p>🛠️ <span className="font-medium">Subteam:</span> {member.subteam}</p>
                <p>✉️ <span className="font-medium">Email:</span> {member.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
