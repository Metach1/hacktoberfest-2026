"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

type Role = "supporter" | "athlete";
type Page =
  | "home"
  | "discover"
  | "login"
  | "register"
  | "dashboard"
  | "profile"
  | "edit";

type Athlete = {
  id: number;
  name: string;
  sport: string;
  location: string;
  image: string;
  raised: number;
  goal: number;
  supporters: number;
  verified: boolean;
  featured?: boolean;
  bio: string;
  achievement: string;
};

const photos = {
  hero: "https://images.unsplash.com/photo-1535725213980-3cddc939d616?auto=format&fit=crop&w=1400&q=85",
  runner: "https://images.unsplash.com/photo-1658911200109-a65fe8919a3e?auto=format&fit=crop&w=900&q=85",
  boxer: "https://images.unsplash.com/photo-1681203888755-bd61fe3558eb?auto=format&fit=crop&w=900&q=85",
  basketball: "https://images.unsplash.com/photo-1580442256395-d9c32a65fbf6?auto=format&fit=crop&w=900&q=85",
  swimmer: "https://images.unsplash.com/photo-1772203031513-4a20f7478ad9?auto=format&fit=crop&w=900&q=85",
  track: "https://images.unsplash.com/photo-1728532483490-708f6562b738?auto=format&fit=crop&w=900&q=85",
};

const initialAthletes: Athlete[] = [
  { id: 1, name: "Mikaela Reyes", sport: "Track & Field", location: "Cebu City", image: photos.runner, raised: 78500, goal: 120000, supporters: 143, verified: true, featured: true, bio: "A national 400m hopeful training to represent the Philippines on the Southeast Asian stage. Every contribution supports coaching, travel, and competition fees.", achievement: "2024 PATAFA National Open — Silver Medal" },
  { id: 2, name: "Paolo Santos", sport: "Boxing", location: "Baguio City", image: photos.boxer, raised: 112000, goal: 150000, supporters: 208, verified: true, featured: true, bio: "A disciplined flyweight boxer from Baguio with his sights set on the national team. Paolo trains twice daily while mentoring young boxers in his barangay.", achievement: "Cordillera Regional Champion, 3×" },
  { id: 3, name: "Enzo Villanueva", sport: "Basketball", location: "Quezon City", image: photos.basketball, raised: 45600, goal: 100000, supporters: 86, verified: true, featured: true, bio: "A quick, creative point guard earning a place in elite development camps. Funding will cover travel, gear, and strength training.", achievement: "UAAP Juniors Mythical Five" },
  { id: 4, name: "Althea Cruz", sport: "Swimming", location: "Davao City", image: photos.swimmer, raised: 62900, goal: 90000, supporters: 119, verified: true, bio: "An open-water specialist building toward her first international meet. Althea is proud to carry Davao's colors wherever she races.", achievement: "National Youth Games — Gold Medal" },
  { id: 5, name: "Rafael Lim", sport: "Track & Field", location: "Iloilo City", image: photos.track, raised: 33100, goal: 80000, supporters: 64, verified: false, bio: "A middle-distance runner balancing university and a demanding training schedule.", achievement: "Western Visayas 800m Record Holder" },
];

const peso = (value: number) => `₱${value.toLocaleString("en-PH")}`;

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    back: <><path d="m15 18-6-6 6-6" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    spark: <><path d="m12 3-1.3 4.7L6 9l4.7 1.3L12 15l1.3-4.7L18 9l-4.7-1.3L12 3Z" /><path d="m5 14-.7 2.3L2 17l2.3.7L5 20l.7-2.3L8 17l-2.3-.7L5 14Z" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Logo({ onClick }: { onClick: () => void }) {
  return <button className="logo" onClick={onClick} aria-label="Starlete home"><span className="logo-mark"><Icon name="spark" size={18} /></span><span>starlete</span></button>;
}

function Progress({ value }: { value: number }) {
  return <div className="progress"><span style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}

function AthleteCard({ athlete, onOpen }: { athlete: Athlete; onOpen: () => void }) {
  const percent = Math.round((athlete.raised / athlete.goal) * 100);
  return (
    <article className="athlete-card" onClick={onOpen}>
      <div className="card-image">
        <img src={athlete.image} alt={`${athlete.name}, ${athlete.sport} athlete`} />
        <span className="sport-pill">{athlete.sport}</span>
        <button className="heart-button" aria-label={`Save ${athlete.name}`} onClick={(e) => e.stopPropagation()}><Icon name="heart" size={18} /></button>
      </div>
      <div className="card-content">
        <div className="name-line"><h3>{athlete.name}</h3>{athlete.verified && <span className="verified" title="Verified athlete"><Icon name="check" size={12} /></span>}</div>
        <p className="location"><Icon name="pin" size={15} />{athlete.location}</p>
        <Progress value={percent} />
        <div className="funding-line"><span><strong>{peso(athlete.raised)}</strong> raised</span><span>{percent}%</span></div>
        <button className="card-link">View story <Icon name="arrow" size={16} /></button>
      </div>
    </article>
  );
}

function Header({ page, role, onNavigate, onLogout }: { page: Page; role: Role | null; onNavigate: (p: Page) => void; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const go = (p: Page) => { onNavigate(p); setOpen(false); };
  return (
    <header className="header">
      <div className="header-inner">
        <Logo onClick={() => go("home")} />
        <nav className={open ? "nav open" : "nav"}>
          <button className={page === "discover" ? "active" : ""} onClick={() => go("discover")}>Discover</button>
          <button onClick={() => { go("home"); setTimeout(() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }), 50); }}>How it works</button>
          {role ? (
            <>
              <button className={page === "dashboard" ? "active" : ""} onClick={() => go("dashboard")}>Dashboard</button>
              <button className="nav-user" onClick={() => go("edit")}>{role === "athlete" ? "MR" : "JD"}</button>
              <button className="icon-only" onClick={onLogout} aria-label="Log out"><Icon name="logout" /></button>
            </>
          ) : (
            <>
              <button onClick={() => go("login")}>Log in</button>
              <button className="button small" onClick={() => go("register")}>Join Starlete</button>
            </>
          )}
        </nav>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu"><Icon name={open ? "close" : "menu"} /></button>
      </div>
    </header>
  );
}

function Landing({ athletes, onNavigate, onOpen }: { athletes: Athlete[]; onNavigate: (p: Page) => void; onOpen: (a: Athlete) => void }) {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow light">Built for Filipino dreamers</span>
          <h1>Every Champion<br />Has a Story.<br /><em>Help Them Go Further.</em></h1>
          <p>Back the next generation of Filipino athletes. Your support powers training, travel, gear, and dreams that go beyond the finish line.</p>
          <div className="hero-actions"><button className="button gold" onClick={() => onNavigate("discover")}>Discover athletes <Icon name="arrow" size={18} /></button><button className="text-button light" onClick={() => onNavigate("register")}>Start your journey</button></div>
          <div className="community-row"><div className="avatars"><img src={photos.boxer} alt="" /><img src={photos.runner} alt="" /><img src={photos.basketball} alt="" /></div><span><strong>4,200+</strong> supporters already cheering</span></div>
        </div>
        <div className="hero-visual">
          <img src={photos.hero} alt="Female track athlete ready to compete" />
          <div className="floating-card"><span className="pulse-dot" /><div><strong>Dreams in motion</strong><small>₱2.8M raised this year</small></div></div>
          <div className="hero-label"><span>Featured story</span><strong>Mikaela Reyes</strong><small>Track &amp; Field · Cebu City</small></div>
        </div>
      </section>

      <section className="trust-strip"><p>Funding real journeys across the Philippines</p><div><span>₱12.4M <small>total raised</small></span><span>860+ <small>athletes supported</small></span><span>32 <small>sports represented</small></span><span>78 <small>provinces reached</small></span></div></section>

      <section className="section">
        <div className="section-head"><div><span className="eyebrow">Meet the dreamers</span><h2>Stories worth cheering for</h2></div><button className="text-button" onClick={() => onNavigate("discover")}>Explore all athletes <Icon name="arrow" size={18} /></button></div>
        <div className="card-grid">{athletes.filter(a => a.featured).map(a => <AthleteCard key={a.id} athlete={a} onOpen={() => onOpen(a)} />)}</div>
      </section>

      <section className="how-section" id="how">
        <div className="how-intro"><span className="eyebrow light">Simple. Transparent. Powerful.</span><h2>Your support changes the game.</h2><p>From finding an athlete whose story moves you to celebrating their next milestone—it only takes a few minutes.</p></div>
        <div className="steps">
          <div className="step"><b>01</b><span className="step-icon"><Icon name="search" /></span><h3>Find your athlete</h3><p>Explore stories by sport, location, or goals that inspire you.</p></div>
          <div className="step"><b>02</b><span className="step-icon"><Icon name="heart" /></span><h3>Choose your support</h3><p>Give any amount through a simulated, transparent checkout.</p></div>
          <div className="step"><b>03</b><span className="step-icon"><Icon name="spark" /></span><h3>Follow the journey</h3><p>Get updates and celebrate every breakthrough together.</p></div>
        </div>
      </section>
      <section className="cta"><div><span className="eyebrow light">Every peso moves a dream forward</span><h2>The next Filipino champion is already training.</h2></div><button className="button gold" onClick={() => onNavigate("discover")}>Find an athlete <Icon name="arrow" /></button></section>
    </main>
  );
}

function Discover({ athletes, onOpen }: { athletes: Athlete[]; onOpen: (a: Athlete) => void }) {
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("All sports");
  const [location, setLocation] = useState("All locations");
  const filtered = athletes.filter(a => (a.name + a.sport + a.location).toLowerCase().includes(search.toLowerCase()) && (sport === "All sports" || a.sport === sport) && (location === "All locations" || a.location === location));
  return (
    <main className="page-shell">
      <div className="discover-hero"><span className="eyebrow light">Discover Filipino talent</span><h1>Find a story to believe in.</h1><p>Behind every athlete is a dream—and a community that can help make it real.</p></div>
      <div className="filters">
        <label className="search-box"><Icon name="search" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search athletes, sports, or cities" /></label>
        <select value={sport} onChange={e => setSport(e.target.value)}><option>All sports</option>{[...new Set(athletes.map(a => a.sport))].map(s => <option key={s}>{s}</option>)}</select>
        <select value={location} onChange={e => setLocation(e.target.value)}><option>All locations</option>{[...new Set(athletes.map(a => a.location))].map(s => <option key={s}>{s}</option>)}</select>
      </div>
      <section className="section compact">
        <div className="results-head"><div><span className="eyebrow">Athlete community</span><h2>{filtered.length} athletes to cheer for</h2></div><span>Most supported</span></div>
        <div className="card-grid">{filtered.map(a => <AthleteCard key={a.id} athlete={a} onOpen={() => onOpen(a)} />)}</div>
        {!filtered.length && <div className="empty"><h3>No athletes found</h3><p>Try broadening your search or changing a filter.</p></div>}
      </section>
    </main>
  );
}

function AthleteProfile({ athlete, role, onBack, onSupport }: { athlete: Athlete; role: Role | null; onBack: () => void; onSupport: () => void }) {
  const percent = Math.round((athlete.raised / athlete.goal) * 100);
  return (
    <main className="profile-page">
      <button className="back-button" onClick={onBack}><Icon name="back" /> Back to athletes</button>
      <section className="profile-hero">
        <div className="profile-photo"><img src={athlete.image} alt={athlete.name} /><span>Photo from athlete profile</span></div>
        <div className="profile-summary">
          <span className="sport-pill inline">{athlete.sport}</span>
          <div className="name-line large"><h1>{athlete.name}</h1>{athlete.verified && <span className="verified"><Icon name="check" size={14} /></span>}</div>
          <p className="location"><Icon name="pin" />{athlete.location}, Philippines</p>
          <p className="profile-bio">{athlete.bio}</p>
          <div className="achievement"><span><Icon name="spark" /></span><div><small>Proudest achievement</small><strong>{athlete.achievement}</strong></div></div>
        </div>
        <aside className="support-card">
          <small>Raised so far</small><strong>{peso(athlete.raised)}</strong><span>of {peso(athlete.goal)} goal</span>
          <Progress value={percent} />
          <div className="support-stats"><span><b>{percent}%</b> funded</span><span><b>{athlete.supporters}</b> supporters</span></div>
          <button className="button full gold" onClick={onSupport} disabled={role === "athlete"}>{role === "athlete" ? "Athletes cannot donate" : <>Support {athlete.name.split(" ")[0]} <Icon name="heart" /></>}</button>
          <p className="safe-note"><Icon name="shield" size={16} /> Demo payments only. No real transaction.</p>
        </aside>
      </section>
      <section className="profile-content">
        <div><span className="eyebrow">The journey</span><h2>Chasing a bigger dream</h2><p>Every training session is a step closer to carrying the Philippine flag on a larger stage. Support covers essential coaching, nutrition, equipment, and the travel required to compete against the best.</p><div className="quote">&ldquo;I&rsquo;m not only running for myself. I&rsquo;m running for every young athlete back home who needs to see that we belong on the world stage.&rdquo;</div></div>
        <div><span className="eyebrow">Latest update</span><article className="post"><small>Training diary · 3 days ago</small><h3>One step closer to nationals</h3><p>This week&rsquo;s time trial was a new personal best! Thank you for helping me access better recovery and coaching.</p></article></div>
      </section>
    </main>
  );
}

function Auth({ mode, onAuth, onSwitch }: { mode: "login" | "register"; onAuth: (role: Role) => void; onSwitch: () => void }) {
  const [role, setRole] = useState<Role>("supporter");
  const [birth, setBirth] = useState("");
  const [consent, setConsent] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const age = birth ? Math.floor((Date.now() - new Date(birth).getTime()) / 31557600000) : 99;
    if (role === "athlete" && age < 18 && !consent) return;
    onAuth(role);
  };
  const showConsent = role === "athlete" && birth !== "" &&
    new Date(birth) > new Date("2008-10-19");
  return (
    <main className="auth-page">
      <div className="auth-art"><Logo onClick={() => {}} /><div><span className="eyebrow light">A community behind every dream</span><h1>{mode === "login" ? "Welcome back to your team." : "Your journey starts with people who believe."}</h1><p>Connect with the Filipino sports community and help turn potential into podiums.</p></div><small>© 2025 Starlete · Built for the Filipino athlete</small></div>
      <div className="auth-panel">
        <div className="auth-form"><span className="eyebrow">{mode === "login" ? "Welcome back" : "Join Starlete"}</span><h2>{mode === "login" ? "Log in to continue" : "Create your account"}</h2><p>{mode === "login" ? "Choose a demo role to explore the full experience." : "First, tell us how you want to be part of the community."}</p>
          <div className="role-switch"><button className={role === "supporter" ? "selected" : ""} onClick={() => setRole("supporter")}><Icon name="heart" /><span><b>Supporter</b><small>Discover and fund athletes</small></span></button><button className={role === "athlete" ? "selected" : ""} onClick={() => setRole("athlete")}><Icon name="spark" /><span><b>Athlete</b><small>Share your journey</small></span></button></div>
          <form onSubmit={submit}>
            {mode === "register" && <label>Full name<input required placeholder="Juan dela Cruz" /></label>}
            <label>Email address<input type="email" required defaultValue={mode === "login" ? (role === "supporter" ? "supporter@starlete.ph" : "athlete@starlete.ph") : ""} placeholder="you@example.com" /></label>
            <label>Password<input type="password" required defaultValue={mode === "login" ? "demo123" : ""} placeholder="At least 8 characters" /></label>
            {mode === "register" && role === "athlete" && <><div className="field-row"><label>Birth date<input type="date" required value={birth} onChange={e => setBirth(e.target.value)} /></label><label>Sport<select required><option>Track &amp; Field</option><option>Boxing</option><option>Basketball</option><option>Swimming</option></select></label></div><label>City / Province<input required placeholder="Cebu City" /></label>{showConsent && <label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span><b>Parental consent confirmed</b><small>A parent or guardian has approved this simulated athlete profile.</small></span></label>}</>}
            <button className="button full" type="submit">{mode === "login" ? `Continue as ${role}` : "Create account"} <Icon name="arrow" /></button>
          </form>
          {mode === "login" && <div className="demo-note"><b>Demo account</b><span>Credentials are pre-filled. No real account is created.</span></div>}
          <p className="auth-switch">{mode === "login" ? "New to Starlete?" : "Already a member?"} <button onClick={onSwitch}>{mode === "login" ? "Create an account" : "Log in"}</button></p>
        </div>
      </div>
    </main>
  );
}

function SupporterDashboard({ athletes, onOpen }: { athletes: Athlete[]; onOpen: (a: Athlete) => void }) {
  const top = [...athletes].sort((a, b) => b.raised - a.raised);
  return (
    <main className="dashboard page-shell">
      <div className="dash-welcome"><div><span className="eyebrow">Supporter dashboard</span><h1>Magandang araw, Jamie.</h1><p>There are new stories waiting for your support.</p></div><div className="impact-chip"><Icon name="heart" /><span><small>Your total impact</small><b>₱4,500 given</b></span></div></div>
      <section><div className="section-head"><div><span className="eyebrow">Picked for you</span><h2>Athletes making moves</h2></div></div><div className="card-grid">{athletes.slice(0, 3).map(a => <AthleteCard key={a.id} athlete={a} onOpen={() => onOpen(a)} />)}</div></section>
      <section className="dashboard-grid">
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Rising now</span><h2>Trending athletes</h2></div></div>{athletes.slice(1, 4).map((a, i) => <button className="mini-athlete" key={a.id} onClick={() => onOpen(a)}><b>0{i + 1}</b><img src={a.image} alt="" /><span><strong>{a.name}</strong><small>{a.sport} · {a.location}</small></span><Icon name="arrow" /></button>)}</div>
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Community</span><h2>Funding leaderboard</h2></div></div>{top.slice(0, 4).map((a, i) => <div className="leader-row" key={a.id}><span className={i === 0 ? "rank first" : "rank"}>{i + 1}</span><div><strong>{a.name}</strong><small>{a.supporters} supporters</small></div><b>{peso(a.raised)}</b></div>)}</div>
      </section>
    </main>
  );
}

function AthleteDashboard({ athlete, posts, onCreate }: { athlete: Athlete; posts: string[]; onCreate: (p: string) => void }) {
  const [creating, setCreating] = useState(false);
  const [post, setPost] = useState("");
  const percent = Math.round((athlete.raised / athlete.goal) * 100);
  return (
    <main className="dashboard page-shell">
      <div className="dash-welcome"><div><span className="eyebrow">Athlete dashboard</span><h1>Keep going, Mikaela.</h1><p>Your community is cheering with every step.</p></div><button className="button" onClick={() => setCreating(true)}><Icon name="plus" /> Create post</button></div>
      <div className="status-banner"><span className="status-icon"><Icon name="shield" /></span><div><strong>Your profile is verified</strong><p>Supporters can see your verified badge and fund your journey.</p></div><span className="verified-label">Verified athlete</span></div>
      <section className="stat-grid"><div className="stat-card dark"><small>Total funds received</small><strong>{peso(athlete.raised)}</strong><span>+₱12,400 this month</span></div><div className="stat-card"><small>Funding goal</small><strong>{peso(athlete.goal)}</strong><Progress value={percent} /><span>{percent}% funded</span></div><div className="stat-card"><small>Your community</small><strong>{athlete.supporters}</strong><span>supporters behind you</span></div></section>
      <section className="dashboard-grid">
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Community support</span><h2>Recent donations</h2></div></div>{([["Anonymous supporter", 2500, "Today"], ["Carlo M.", 1000, "Yesterday"], ["Nina A.", 500, "2 days ago"]] as [string, number, string][]).map(d => <div className="donation-row" key={d[2]}><span className="donor-avatar"><Icon name="heart" /></span><div><strong>{d[0]}</strong><small>{d[2]}</small></div><b>+{peso(d[1])}</b></div>)}</div>
        <div className="dash-card"><div className="section-head"><div><span className="eyebrow">Your story</span><h2>Recent posts</h2></div><button className="text-button" onClick={() => setCreating(true)}>New post</button></div>{posts.map((p, i) => <article className="dash-post" key={i}><small>{i ? "1 week ago" : "Just now"}</small><strong>{p}</strong><span>{i ? "86" : "0"} cheers · {i ? "12" : "0"} comments</span></article>)}</div>
      </section>
      {creating && <div className="modal-backdrop"><div className="modal small-modal"><button className="modal-close" onClick={() => setCreating(false)}><Icon name="close" /></button><span className="eyebrow">Share an update</span><h2>Bring supporters along</h2><label>Post<textarea value={post} onChange={e => setPost(e.target.value)} placeholder="What happened in training today?" /></label><button className="button full" disabled={!post.trim()} onClick={() => { onCreate(post); setCreating(false); setPost(""); }}>Publish update</button></div></div>}
    </main>
  );
}

function EditProfile({ role, onSave }: { role: Role; onSave: () => void }) {
  return <main className="settings page-shell"><div className="settings-head"><span className="eyebrow">Account settings</span><h1>Edit your profile</h1><p>Keep your information current for the Starlete community.</p></div><div className="settings-card"><div className="profile-avatar">{role === "athlete" ? "MR" : "JD"}<button><Icon name="plus" size={16} /></button></div><form onSubmit={e => { e.preventDefault(); onSave(); }}><div className="field-row"><label>Full name<input defaultValue={role === "athlete" ? "Mikaela Reyes" : "Jamie Dela Cruz"} /></label><label>Location<input defaultValue={role === "athlete" ? "Cebu City" : "Makati City"} /></label></div><label>Bio<textarea defaultValue={role === "athlete" ? "National 400m athlete chasing a place on the Philippine team." : "Proud supporter of Filipino athletes."} /></label>{role === "athlete" && <div className="field-row"><label>Sport<input defaultValue="Track & Field" /></label><label>Funding goal<input defaultValue="₱120,000" /></label></div>}<div className="form-actions"><button type="button" className="button secondary" onClick={onSave}>Cancel</button><button className="button">Save changes</button></div></form></div></main>;
}

function Donation({ athlete, onClose, onComplete }: { athlete: Athlete; onClose: () => void; onComplete: (amount: number) => void }) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState("GCash");
  const [reference, setReference] = useState("");
  const actual = custom ? Number(custom) : amount;
  const confirm = () => {
    setStep(4);
    setReference(`STL-${Date.now().toString().slice(-6)}`);
    setTimeout(() => { setStep(5); onComplete(actual); }, 1500);
  };
  return <div className="modal-backdrop"><div className="modal donation-modal">
    {step < 4 && <button className="modal-close" onClick={onClose}><Icon name="close" /></button>}
    {step < 4 && <div className="checkout-head"><span className="eyebrow">Simulated support</span><h2>Back {athlete.name}</h2><div className="stepper"><span className={step >= 1 ? "done" : ""}>1</span><i /><span className={step >= 2 ? "done" : ""}>2</span><i /><span className={step >= 3 ? "done" : ""}>3</span></div></div>}
    {step === 1 && <div className="donation-step"><img className="checkout-athlete" src={athlete.image} alt="" /><h3>Choose your support</h3><p>Every amount helps fund training, travel, and competition costs.</p><div className="amount-grid">{[500, 1000, 2500, 5000].map(a => <button className={!custom && amount === a ? "selected" : ""} onClick={() => { setAmount(a); setCustom(""); }} key={a}>{peso(a)}</button>)}</div><label>Or enter a custom amount<div className="money-input"><span>₱</span><input type="number" min="50" value={custom} onChange={e => setCustom(e.target.value)} placeholder="Other amount" /></div></label><button className="button full gold" disabled={!actual || actual < 50} onClick={() => setStep(2)}>Continue with {peso(actual || 0)} <Icon name="arrow" /></button></div>}
    {step === 2 && <div className="donation-step"><button className="back-button" onClick={() => setStep(1)}><Icon name="back" /> Amount</button><h3>Select payment method</h3><p>This is a demo checkout. No payment details are sent or charged.</p><div className="payment-list">{["GCash", "Maya", "Credit / debit card", "Bank transfer"].map((m, i) => <button className={method === m ? "selected" : ""} onClick={() => setMethod(m)} key={m}><span className={`pay-icon p${i}`}>{m.slice(0, 1)}</span><b>{m}</b><span className="radio" /></button>)}</div><button className="button full" onClick={() => setStep(3)}>Review support <Icon name="arrow" /></button></div>}
    {step === 3 && <div className="donation-step"><button className="back-button" onClick={() => setStep(2)}><Icon name="back" /> Payment</button><h3>Review your support</h3><div className="review-athlete"><img src={athlete.image} alt="" /><div><small>You&rsquo;re supporting</small><strong>{athlete.name}</strong><span>{athlete.sport}</span></div></div><div className="review-rows"><span><small>Support amount</small><b>{peso(actual)}</b></span><span><small>Payment method</small><b>{method}</b></span><span><small>Platform fee</small><b>₱0</b></span><span className="total"><strong>Total</strong><strong>{peso(actual)}</strong></span></div><p className="safe-note"><Icon name="shield" /> This is a simulated payment. No real money will be transferred.</p><button className="button full gold" onClick={confirm}>Confirm support <Icon name="heart" /></button></div>}
    {step === 4 && <div className="processing"><span className="loader" /><h2>Processing your support</h2><p>Simulating a secure connection with {method}…</p></div>}
    {step === 5 && <div className="success"><span className="success-icon"><Icon name="check" size={34} /></span><span className="eyebrow">Support confirmed</span><h2>You just moved a dream forward.</h2><p>Your {peso(actual)} support for <strong>{athlete.name}</strong> has been added to their journey.</p><div className="receipt"><span><small>Reference</small><b>{reference}</b></span><span><small>Method</small><b>{method}</b></span></div><button className="button full" onClick={onClose}>Return to athlete profile</button></div>}
  </div></div>;
}

export default function StarleteApp() {
  const [page, setPage] = useState<Page>("home");
  const [role, setRole] = useState<Role | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>(initialAthletes);
  const [mounted, setMounted] = useState(false);
  const [selectedId, setSelectedId] = useState(1);
  const [donating, setDonating] = useState(false);
  const [posts, setPosts] = useState(["One step closer to nationals", "Recovery, reset, repeat"]);
  const selected = athletes.find(a => a.id === selectedId) || athletes[0];

  // Hydrate persisted state from localStorage once on client mount. Reading
  // localStorage during render/SSR is unsafe, so this runs in an effect and
  // synchronizes the browser-only external store into React state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const savedRole = window.localStorage.getItem("starlete-role") as Role | null;
      const savedAthletes = window.localStorage.getItem("starlete-athletes");
      setRole(savedRole ?? null);
      setAthletes(savedAthletes ? (JSON.parse(savedAthletes) as Athlete[]) : initialAthletes);
    } catch {
      // ignore unavailable/corrupt storage
    } finally {
      setMounted(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem("starlete-athletes", JSON.stringify(athletes));
    } catch {
      // ignore
    }
  }, [athletes, mounted]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const openAthlete = (a: Athlete) => { setSelectedId(a.id); setPage("profile"); };
  const auth = (r: Role) => {
    setRole(r);
    try { window.localStorage.setItem("starlete-role", r); } catch {}
    setPage("dashboard");
  };
  const logout = () => {
    setRole(null);
    try { window.localStorage.removeItem("starlete-role"); } catch {}
    setPage("home");
  };
  const startSupport = () => role === "supporter" ? setDonating(true) : role === "athlete" ? undefined : setPage("login");
  const completeDonation = (amount: number) => setAthletes(list => list.map(a => a.id === selected.id ? { ...a, raised: a.raised + amount, supporters: a.supporters + 1 } : a));

  const body = useMemo(() => {
    if (page === "home") return <Landing athletes={athletes} onNavigate={setPage} onOpen={openAthlete} />;
    if (page === "discover") return <Discover athletes={athletes} onOpen={openAthlete} />;
    if (page === "profile") return <AthleteProfile athlete={selected} role={role} onBack={() => setPage("discover")} onSupport={startSupport} />;
    if (page === "login") return <Auth mode="login" onAuth={auth} onSwitch={() => setPage("register")} />;
    if (page === "register") return <Auth mode="register" onAuth={auth} onSwitch={() => setPage("login")} />;
    if (page === "edit" && role) return <EditProfile role={role} onSave={() => setPage("dashboard")} />;
    if (page === "dashboard" && role === "athlete") return <AthleteDashboard athlete={athletes[0]} posts={posts} onCreate={p => setPosts([p, ...posts])} />;
    if (page === "dashboard") return <SupporterDashboard athletes={athletes} onOpen={openAthlete} />;
    return <Landing athletes={athletes} onNavigate={setPage} onOpen={openAthlete} />;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, athletes, selected, role, posts]);

  const authPage = page === "login" || page === "register";
  return <div className="app">{!authPage && <Header page={page} role={role} onNavigate={setPage} onLogout={logout} />}{body}{!authPage && <footer><Logo onClick={() => setPage("home")} /><p>Backing Filipino athletes, one story at a time.</p><span>© 2025 Starlete. Demo experience only.</span></footer>}{donating && <Donation athlete={selected} onClose={() => setDonating(false)} onComplete={completeDonation} />}</div>;
}
