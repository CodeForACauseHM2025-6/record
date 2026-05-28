import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/admin.directory.user.readonly"];

export type DirectoryPerson = { email: string; name: string; photoUrl: string | null };

type ServiceAccountKey = { client_email: string; private_key: string };

// Reads the service-account JSON + admin subject from env. Returns null when either is missing
// so the whole feature degrades gracefully (search endpoint reports "not configured").
function getCreds(): { key: ServiceAccountKey; subject: string } | null {
  const raw = process.env.GOOGLE_DIRECTORY_SA_KEY;
  const subject = process.env.GOOGLE_DIRECTORY_SUBJECT;
  if (!raw || !subject) return null;
  let key: ServiceAccountKey;
  try {
    key = JSON.parse(raw) as ServiceAccountKey;
  } catch {
    return null;
  }
  if (!key.client_email || !key.private_key) return null;
  return { key, subject };
}

export function isDirectoryConfigured(): boolean {
  return getCreds() !== null;
}

// Maps a raw Admin SDK user object to our shape. Exported for unit testing (pure function).
export function mapDirectoryUser(u: {
  primaryEmail?: string | null;
  name?: { fullName?: string | null } | null;
  thumbnailPhotoUrl?: string | null;
}): DirectoryPerson | null {
  const email = u.primaryEmail ?? null;
  if (!email) return null;
  return {
    email,
    name: u.name?.fullName ?? email,
    photoUrl: u.thumbnailPhotoUrl ?? null,
  };
}

async function directoryClient() {
  const creds = getCreds();
  if (!creds) throw new Error("Google directory not configured");
  const jwt = new google.auth.JWT({
    email: creds.key.client_email,
    key: creds.key.private_key,
    scopes: SCOPES,
    subject: creds.subject,
  });
  await jwt.authorize();
  return google.admin({ version: "directory_v1", auth: jwt });
}

export async function searchDirectory(query: string): Promise<DirectoryPerson[]> {
  const q = query.trim();
  if (!q) return [];
  const admin = await directoryClient();
  const res = await admin.users.list({
    customer: "my_customer",
    query: `email:${q}* OR name:${q}*`,
    viewType: "domain_public",
    maxResults: 10,
    orderBy: "email",
  });
  return (res.data.users ?? [])
    .map(mapDirectoryUser)
    .filter((u): u is DirectoryPerson => u !== null);
}

export async function getDirectoryUserByEmail(email: string): Promise<DirectoryPerson | null> {
  const admin = await directoryClient();
  try {
    const res = await admin.users.get({ userKey: email, viewType: "domain_public" });
    return mapDirectoryUser(res.data);
  } catch {
    return null;
  }
}
