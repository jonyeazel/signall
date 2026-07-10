import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { POLICIES, getPolicy, STORE } from "../../../lib/legal";
import { T } from "../../../lib/theme";

export function generateStaticParams() {
  return POLICIES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) return { title: "Policy" };
  return { title: `${policy.title} · ${STORE.name}`, description: policy.summary };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) notFound();

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, color: T.textPrimary }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 22px 80px" }}>
        {/* Back to store */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 14,
            fontWeight: 500,
            color: T.textSecondary,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} />
          {STORE.name}
        </Link>

        <header style={{ marginTop: 30 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {policy.title}
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 15, color: T.textSecondary, lineHeight: 1.5 }}>
            {policy.summary}
          </p>
          <p style={{ margin: "14px 0 0", fontSize: 13, color: T.textTertiary }}>
            Last updated {policy.updated}
          </p>
        </header>

        <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "26px 0" }} />

        <article style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {policy.sections.map((section) => (
            <section key={section.heading}>
              <h2
                style={{
                  margin: "0 0 8px",
                  fontSize: 17,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {section.heading}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {section.body.map((para, i) => (
                  <p key={i} style={{ margin: 0, fontSize: 15, lineHeight: 1.62, color: T.inkSoft }}>
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </article>

        {/* Cross-links to the other policies */}
        <footer style={{ marginTop: 44, paddingTop: 22, borderTop: `1px solid ${T.border}` }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: T.textTertiary, letterSpacing: "0.02em", textTransform: "uppercase" }}>
            More policies
          </p>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {POLICIES.filter((p) => p.slug !== policy.slug).map((p) => (
              <Link
                key={p.slug}
                href={`/legal/${p.slug}`}
                style={{
                  fontSize: 14,
                  color: T.textPrimary,
                  textDecoration: "none",
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 999,
                  padding: "8px 14px",
                }}
              >
                {p.title}
              </Link>
            ))}
          </nav>
          <p style={{ margin: "22px 0 0", fontSize: 12.5, color: T.textTertiary, lineHeight: 1.5 }}>
            {STORE.legalName} · {STORE.address}
          </p>
        </footer>
      </div>
    </div>
  );
}
