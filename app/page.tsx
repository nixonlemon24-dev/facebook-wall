import Wall from "@/components/Wall";
import { supabase, TABLE, type Post } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) console.error("LOAD POSTS FAILED:", error.message);
  console.log("posts loaded:", data?.length ?? 0);

  return <Wall initialPosts={(data ?? []) as Post[]} />;
}