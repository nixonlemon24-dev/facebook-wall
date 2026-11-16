import { createClient } from "@supabase/supabase-js";

export const TABLE = "fw_user";
export const BUCKET = "post-photos"; // must match your bucket id in Supabase

export type Post = {
  id: string;
  user_id: string | null;
  body: string;
  created_at: string;
  photo_url: string | null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local and restart the dev server."
  );
}

export const supabase = createClient(url, key);