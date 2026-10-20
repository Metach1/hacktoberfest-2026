import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell">
      <div className="empty" style={{ margin: "90px auto", maxWidth: 560 }}>
        <h3>Page not found</h3>
        <p>We couldn&rsquo;t find what you were looking for.</p>
        <Link className="button" href="/" style={{ marginTop: 16 }}>Back to home</Link>
      </div>
    </main>
  );
}
