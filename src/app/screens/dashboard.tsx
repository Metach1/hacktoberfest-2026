"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AthleteCard, Icon, MiniAthlete, Progress, peso } from "@/src/app/shared/ui";
import { useStarlete } from "@/src/app/store";
import type { Athlete } from "@/src/app/data/athletes";
import { type Post } from "@/src/app/data/posts";
import { TimeAgo } from "@/src/app/shared/time-ago";

function SupporterDashboard({ athletes }: { athletes: Athlete[] }) {
  const top = [...athletes].sort((a, b) => b.raised - a.raised);
  return (
    <main className="dashboard page-shell">
      <div className="dash-welcome"><div><span className="eyebrow">Supporter dashboard</span><h1>Magandang araw, Jamie.</h1><p>There are new stories waiting for your support.</p></div><div className="impact-chip"><Icon name="heart" /><span><small>Your total impact</small><b>₱4,500 given</b></span></div></div>
      <section><div className="section-head"><div><span className="eyebrow">Picked for you</span><h2>Athletes making moves</h2></div></div><div className="card-grid">{athletes.slice(0, 3).map(a => <AthleteCard key={a.id} athlete={a} />)}</div></section>
      <section className="dashboard-grid">
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Rising now</span><h2>Trending athletes</h2></div></div>{athletes.slice(1, 4).map((a, i) => <MiniAthlete key={a.id} athlete={a} rank={i + 1} />)}</div>
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Community</span><h2>Funding leaderboard</h2></div></div>{top.slice(0, 4).map((a, i) => <div className="leader-row" key={a.id}><span className={i === 0 ? "rank first" : "rank"}>{i + 1}</span><div><strong>{a.name}</strong><small>{a.supporters} supporters</small></div><b>{peso(a.raised)}</b></div>)}</div>
      </section>
    </main>
  );
}

function AthleteDashboard({ athlete, posts, onCreate, onEdit, onDelete }: { athlete: Athlete; posts: Post[]; onCreate: (authorAthleteId: number, text: string) => void; onEdit: (postId: string, text: string) => void; onDelete: (postId: string) => void }) {
  const [creating, setCreating] = useState(false);
  const [post, setPost] = useState("");
  // Edit modal: the post being edited and its working text.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  // Inline delete confirmation: the post awaiting a Yes/Cancel on its own card.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const percent = Math.round((athlete.raised / athlete.goal) * 100);
  // Only the signed-in athlete's own posts are shown and editable here.
  const myPosts = posts.filter(p => p.authorAthleteId === athlete.id);

  const startEdit = (p: Post) => { setEditingId(p.id); setEditText(p.text); };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };
  const saveEdit = () => {
    if (editingId && editText.trim()) {
      onEdit(editingId, editText);
      cancelEdit();
    }
  };

  return (
    <main className="dashboard page-shell">
      <div className="dash-welcome"><div><span className="eyebrow">Athlete dashboard</span><h1>Keep going, {athlete.name.split(" ")[0]}.</h1><p>Your community is cheering with every step.</p></div><button className="button" onClick={() => setCreating(true)}><Icon name="plus" /> Create post</button></div>
      <div className="status-banner"><span className="status-icon"><Icon name="shield" /></span><div><strong>Your profile is verified</strong><p>Supporters can see your verified badge and fund your journey.</p></div><span className="verified-label">Verified athlete</span></div>
      <section className="stat-grid"><div className="stat-card dark"><small>Total funds received</small><strong>{peso(athlete.raised)}</strong><span>+₱12,400 this month</span></div><div className="stat-card"><small>Funding goal</small><strong>{peso(athlete.goal)}</strong><Progress value={percent} /><span>{percent}% funded</span></div><div className="stat-card"><small>Your community</small><strong>{athlete.supporters}</strong><span>supporters behind you</span></div></section>
      <section className="dashboard-grid">
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Community support</span><h2>Recent donations</h2></div></div>{([["Anonymous supporter", 2500, "Today"], ["Carlo M.", 1000, "Yesterday"], ["Nina A.", 500, "2 days ago"]] as [string, number, string][]).map(d => <div className="donation-row" key={d[2]}><span className="donor-avatar"><Icon name="heart" /></span><div><strong>{d[0]}</strong><small>{d[2]}</small></div><b>+{peso(d[1])}</b></div>)}</div>
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Your story</span><h2>Recent posts</h2></div><button className="text-button" onClick={() => setCreating(true)}>New post</button></div>{myPosts.length ? myPosts.map(p => (
          <article className="dash-post" key={p.id}>
            <small><TimeAgo iso={p.createdAt} />{p.editedAt ? " · edited" : ""}</small>
            <strong>{p.text}</strong>
            <span>{p.likes} cheers · {p.comments.length} comments</span>
            {confirmDeleteId === p.id ? (
              <div className="post-actions">
                <span className="confirm-text">Delete this post?</span>
                <button className="text-button danger" onClick={() => { onDelete(p.id); setConfirmDeleteId(null); }}>Delete</button>
                <button className="text-button" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              </div>
            ) : (
              <div className="post-actions">
                <button className="text-button" onClick={() => startEdit(p)}>Edit</button>
                <button className="text-button danger" onClick={() => setConfirmDeleteId(p.id)}>Delete</button>
              </div>
            )}
          </article>
        )) : <p className="profile-bio">No posts yet. Share your first update!</p>}</div>
      </section>
      {creating && <div className="modal-backdrop"><div className="modal small-modal"><button className="modal-close" onClick={() => setCreating(false)}><Icon name="close" /></button><span className="eyebrow">Share an update</span><h2>Bring supporters along</h2><label>Post<textarea value={post} onChange={e => setPost(e.target.value)} placeholder="What happened in training today?" /></label><button className="button full" disabled={!post.trim()} onClick={() => { onCreate(athlete.id, post); setCreating(false); setPost(""); }}>Publish update</button></div></div>}
      {editingId && <div className="modal-backdrop"><div className="modal small-modal"><button className="modal-close" onClick={cancelEdit}><Icon name="close" /></button><span className="eyebrow">Edit update</span><h2>Update your post</h2><label>Post<textarea value={editText} onChange={e => setEditText(e.target.value)} placeholder="What happened in training today?" /></label><button className="button full" disabled={!editText.trim()} onClick={saveEdit}>Save changes</button></div></div>}
    </main>
  );
}

export function DashboardScreen() {
  const { role, athletes, posts, addPost, editPost, deletePost, mounted } = useStarlete();
  const router = useRouter();

  // Gate the dashboard behind a role. Redirect once hydration has settled so we
  // do not bounce a signed-in user during the first client render.
  useEffect(() => {
    if (mounted && !role) router.replace("/login");
  }, [mounted, role, router]);

  if (!role) return null;
  if (role === "athlete") {
    return <AthleteDashboard athlete={athletes[0]} posts={posts} onCreate={addPost} onEdit={editPost} onDelete={deletePost} />;
  }
  return <SupporterDashboard athletes={athletes} />;
}
