import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getLocalDb, saveLocalDb, generateId, DbRepository, DbTask, DbPlan, DbSnapshot, DbFile } from "@/lib/db/localDb";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || url.includes("your-project.supabase.co") || !url.startsWith("http")) {
    return false;
  }
  if (!key || key === "your-anon-key") {
    return false;
  }
  return true;
}

export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  // If Supabase is configured with real credentials, use official client
  if (isSupabaseConfigured()) {
    const supabaseClient = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in Server Components
            }
          },
        },
      }
    );

    // If local session cookie exists, augment getUser
    if (sessionCookie) {
      const payload = await verifySessionToken(sessionCookie);
      if (payload) {
        return {
          ...supabaseClient,
          auth: {
            ...supabaseClient.auth,
            getUser: async () => ({
              data: {
                user: {
                  id: payload.userId,
                  email: payload.email,
                  app_metadata: {},
                  user_metadata: { name: payload.name },
                  aud: "authenticated",
                  created_at: new Date().toISOString(),
                } as unknown as import("@supabase/supabase-js").User,
              },
              error: null,
            }),
          },
        } as unknown as SupabaseClient<Database>;
      }
    }

    return supabaseClient;
  }

  // ── Local Development Database & Auth Adapter ─────────────────
  const getSessionUser = async () => {
    if (!sessionCookie) return null;
    const payload = await verifySessionToken(sessionCookie);
    if (!payload) return null;
    return {
      id: payload.userId,
      email: payload.email,
      app_metadata: {},
      user_metadata: { name: payload.name },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as unknown as import("@supabase/supabase-js").User;
  };

  const createQueryBuilder = (tableName: string) => {
    let operation: "select" | "insert" | "update" | "delete" = "select";
    let insertData: unknown = null;
    let updateData: unknown = null;
    let selectFields = "*";
    const filters: Array<{ field: string; value: unknown }> = [];
    let orderField: string | null = null;
    let orderAscending = true;
    let limitCount: number | null = null;
    let isSingle = false;
    let isMaybeSingle = false;

    const builder: Record<string, unknown> = {
      select(fields = "*") {
        selectFields = fields;
        return builder;
      },
      insert(data: unknown) {
        operation = "insert";
        insertData = data;
        return builder;
      },
      update(data: unknown) {
        operation = "update";
        updateData = data;
        return builder;
      },
      delete() {
        operation = "delete";
        return builder;
      },
      eq(field: string, value: unknown) {
        filters.push({ field, value });
        return builder;
      },
      order(field: string, opts?: { ascending?: boolean }) {
        orderField = field;
        orderAscending = opts?.ascending ?? true;
        return builder;
      },
      limit(n: number) {
        limitCount = n;
        return builder;
      },
      single() {
        isSingle = true;
        return builder;
      },
      maybeSingle() {
        isMaybeSingle = true;
        return builder;
      },
      then(resolve: (val: unknown) => void, reject?: (err: unknown) => void) {
        try {
          const db = getLocalDb();
          const collection = (db as unknown as Record<string, unknown[]>)[tableName] || [];

          if (operation === "insert") {
            const items = Array.isArray(insertData) ? insertData : [insertData];
            const created = items.map((item) => {
              const record = {
                id: generateId(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...(item as Record<string, unknown>),
              };
              collection.push(record);
              return record;
            });
            saveLocalDb();
            const res = isSingle || isMaybeSingle || !Array.isArray(insertData) ? created[0] : created;
            return Promise.resolve({ data: res, error: null }).then(resolve, reject);
          }

          if (operation === "update") {
            let updatedCount = 0;
            const updatedItems: unknown[] = [];
            collection.forEach((item) => {
              const rec = item as Record<string, unknown>;
              const matches = filters.every((f) => String(rec[f.field]) === String(f.value));
              if (matches) {
                Object.assign(rec, updateData, { updated_at: new Date().toISOString() });
                updatedCount++;
                updatedItems.push(rec);
              }
            });
            saveLocalDb();
            const res = isSingle || isMaybeSingle ? updatedItems[0] ?? null : updatedItems;
            return Promise.resolve({ data: res, error: null }).then(resolve, reject);
          }

          if (operation === "delete") {
            const remaining = collection.filter((item) => {
              const rec = item as Record<string, unknown>;
              return !filters.every((f) => String(rec[f.field]) === String(f.value));
            });
            (db as unknown as Record<string, unknown[]>)[tableName] = remaining;
            saveLocalDb();
            return Promise.resolve({ data: null, error: null }).then(resolve, reject);
          }

          // ── Select Query ──
          let results = collection.filter((item) => {
            const rec = item as Record<string, unknown>;
            return filters.every((f) => String(rec[f.field]) === String(f.value));
          });

          // Join resolution if requested (e.g. tasks -> repositories)
          if (tableName === "tasks" && selectFields.includes("repositories")) {
            results = results.map((item) => {
              const task = item as DbTask;
              const repo = db.repositories.find((r) => r.id === task.repository_id);
              return {
                ...task,
                repositories: repo ? { github_owner: repo.github_owner, github_repo: repo.github_repo } : null,
              };
            });
          }

          // Ordering
          if (orderField) {
            results.sort((a, b) => {
              const valA = (a as Record<string, unknown>)[orderField!];
              const valB = (b as Record<string, unknown>)[orderField!];
              if (valA === valB) return 0;
              if (valA == null) return 1;
              if (valB == null) return -1;
              const cmp = valA > valB ? 1 : -1;
              return orderAscending ? cmp : -cmp;
            });
          }

          // Limit
          if (limitCount !== null) {
            results = results.slice(0, limitCount);
          }

          // Single / MaybeSingle
          if (isSingle) {
            if (results.length === 0) {
              return Promise.resolve({ data: null, error: { message: "Row not found", code: "PGRST116" } }).then(resolve, reject);
            }
            return Promise.resolve({ data: results[0], error: null }).then(resolve, reject);
          }

          if (isMaybeSingle) {
            return Promise.resolve({ data: results[0] ?? null, error: null }).then(resolve, reject);
          }

          return Promise.resolve({ data: results, error: null }).then(resolve, reject);
        } catch (err) {
          return Promise.resolve({ data: null, error: err }).then(resolve, reject);
        }
      },
    };

    return builder;
  };

  return {
    auth: {
      getUser: async () => {
        const user = await getSessionUser();
        return { data: { user }, error: null };
      },
    },
    from(tableName: string) {
      return createQueryBuilder(tableName);
    },
  } as unknown as SupabaseClient<Database>;
}
