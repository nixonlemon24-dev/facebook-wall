"use client";

import { useEffect, useRef,useState } from "react";
import { supabase,TABLE, BUCKET, type Post } from "@/lib/supabase";

// ---- Profile config: edit these ----
const PROFILE_NAME = "Nixon Lemon";
const NETWORK = "N/A";
const CITY = "Baguio City, PH";
// ------------------------------------
const MAX = 280;
//photo upload

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// add a post to the top, ignoring duplicates (own insert + realtime echo)
const addPost = (list: Post[], p: Post) =>
  list.some((x) => x.id === p.id) ? list : [p, ...list];

export default function Wall({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  //Upload State
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  // Realtime: other visitors' posts appear without refresh
  useEffect(() => {
    const channel = supabase
      .channel("posts-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "fw_user" },
        (payload) => setPosts((prev) => addPost(prev, payload.new as Post))
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  function pick(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function handleFile(f: File | null | undefined) {
    if (!f) return;
    if (!PHOTO_TYPES.includes(f.type)) return setError("Please use a JPG, PNG, WebP or GIF image.");
    if (f.size > 5 * 1024 * 1024) return setError("Photo must be under 5 MB.");
    setError("");
    pick(f);
  }

  async function share() {
    const body = text.trim();
    if ((!body && !file) || body.length > MAX || busy) return;
    setBusy(true);
    setError("");

    let photo_url: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("post-photos")
        .upload(path, file, { contentType: file.type });
      if (up.error) {
        setBusy(false);
        return setError("Photo upload failed: " + up.error.message);
      }
      photo_url = supabase.storage.from("post-photos").getPublicUrl(path).data.publicUrl;
    }

    const { data, error } = await supabase
      .from("fw_user")
      .insert({ body, photo_url }) // add author: ... here if you use visitor names
      .select()
      .single();
    setBusy(false);
    if (error) return setError("Could not share: " + error.message);
    setPosts((prev) => addPost(prev, data as Post));
    setText("");
    pick(null);
  }

  return (
    <div className="shell">
      <header className="topbar">wall</header>

      <div className="layout">
        <aside className="sidebar">
          <div className="avatar" aria-hidden>{PROFILE_NAME[0]}</div>
          <h1>{PROFILE_NAME}</h1>
          <p className="sub">wall</p>
          <button className="infobtn" type="button">Information</button>
          <dl>
            <dt>Networks</dt><dd>{NETWORK}</dd>
            <dt>Current City</dt><dd>{CITY}</dd>
          </dl>
        </aside>

        <main className="content">
 
          <textarea
            value={text}
            maxLength={MAX}
            placeholder="What's on your mind?"
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              const img = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
              if (img) {
                e.preventDefault();
                handleFile(img);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) share();
            }}
          />
          <p className={`remaining${MAX - text.length <= 20 ? " low" : ""}`}>
            {MAX - text.length} characters remaining
          </p>

      <div
        className={`photodrop${dragging ? " over" : ""}${preview ? " has" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => !preview && fileInput.current?.click()}
        onKeyDown={(e) => {
          if (!preview && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            fileInput.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {preview ? (
          <div className="chosen">
            <img src={preview} alt="Selected photo" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pick(null);
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="9" cy="9" r="1.6" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <p className="dtitle">
              <b>{dragging ? "Drop photo here" : "Click to add photo"}</b> (optional)
            </p>
            <p className="dhint">JPG, PNG, GIF up to 5MB</p>
          </>
        )}
      </div>

      {error && <p className="err">{error}</p>}

      <div className="actions">
        <button className="share" onClick={share} disabled={busy || (!text.trim() && !file)}>
          {busy ? "Sharing…" : "Share"}
        </button>
      </div>

          {error && <p className="err">{error}</p>}
        <section>
          {posts.length === 0 && <p className="empty">No posts yet. Be the first!</p>}
          {posts.map((p) => (
            <article className="post" key={p.id}>
              <div className="post-head">
                <strong>{PROFILE_NAME}</strong>
                <time suppressHydrationWarning>{ago(p.created_at)}</time>
              </div>
              {p.body && <p>{p.body}</p>}
              {p.photo_url && (
                <img className="postimg" src={p.photo_url} alt="" loading="lazy" />
              )}
            </article>
          ))}
        </section>

        </main>
      </div>
    </div>
  );
}
