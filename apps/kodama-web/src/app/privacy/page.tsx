import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Kodama",
  description: "How Kodama collects, uses, and protects your personal information.",
};

function FlowerMark() {
  return (
    <svg viewBox="0 0 32 32" width={26} height={26} aria-hidden>
      <defs>
        <radialGradient id="privacy-petal" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffd9a8" />
          <stop offset="60%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#e26a1f" />
        </radialGradient>
      </defs>
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="16"
          cy="9"
          rx="4.2"
          ry="6.4"
          fill="url(#privacy-petal)"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="3.4" fill="#fff3df" />
      <circle cx="16" cy="16" r="1.6" fill="#f97316" />
    </svg>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={`section-${number}`} className="mt-14 scroll-mt-24">
      <h2 className="flex items-baseline gap-3 font-serif text-[28px] leading-tight tracking-tight text-[#1a2a4a] sm:text-[32px]">
        <span className="font-serif text-[#b46a2a]/80">{number}.</span>
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-[15.5px] leading-[1.75] text-[#1a2a4a]/85">
        {children}
      </div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 font-serif text-xl tracking-tight text-[#1a2a4a]">
      {children}
    </h3>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-[#ff7a2e]"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DefList({
  items,
}: {
  items: { term: string; def: React.ReactNode }[];
}) {
  return (
    <dl className="space-y-3">
      {items.map((item) => (
        <div key={item.term} className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          <dt className="font-serif text-[17px] text-[#1a2a4a] sm:min-w-[180px]">
            {item.term}.
          </dt>
          <dd className="text-[#1a2a4a]/85">{item.def}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#fdf6ec] via-[#fbeed5] to-[#f5e2bc] text-[#1a2a4a]">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,196,142,0.45),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,217,168,0.55),transparent)]"
      />

      <header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-6 pt-8">
        <Link href="/" className="flex items-center gap-2">
          <FlowerMark />
          <span className="font-serif text-2xl tracking-tight">Kodama</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-[#1a2a4a]/12 bg-white/70 px-4 py-2 text-sm font-medium text-[#1a2a4a] shadow-sm backdrop-blur transition hover:bg-white/90"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to home
        </Link>
      </header>

      <article className="relative z-10 mx-auto max-w-3xl px-6 pb-16 pt-12 sm:pt-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#1a2a4a]/10 bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#b46a2a] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff7a2e]" />
            Legal
          </span>
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] tracking-tight text-[#1a2a4a] sm:text-6xl">
            Privacy <em className="italic text-[#b46a2a]">Policy</em>
          </h1>
          <p className="mt-4 text-sm text-[#3a4a6a]/80">
            Last updated: March 18, 2026
          </p>
        </div>

        <div className="mt-12 rounded-3xl border border-white/60 bg-white/65 p-8 shadow-[0_30px_80px_-30px_rgba(20,40,80,0.25)] backdrop-blur-md sm:p-12">
          <Section number={1} title="Introduction">
            <p>
              Kodama (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;)
              is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, share, and safeguard your personal
              information when you use the Kodama platform, the Kodama
              Dashboard, APIs, and all related services (the
              &ldquo;Service&rdquo;).
            </p>
            <p>
              By using the Service, you agree to the practices described in
              this Privacy Policy. This policy should be read alongside our{" "}
              <Link
                href="/terms"
                className="text-[#b46a2a] underline-offset-2 hover:underline"
              >
                Terms of Service
              </Link>
              .
            </p>
          </Section>

          <Section number={2} title="Information We Collect">
            <p>We collect information in the following categories:</p>

            <SubHeading>Information You Provide</SubHeading>
            <DefList
              items={[
                {
                  term: "Account information",
                  def: "Name, email address, and password when you create an account",
                },
                {
                  term: "Profile information",
                  def: "Organization name, team details, and other optional profile data",
                },
                {
                  term: "Payment information",
                  def: "Billing address and payment method details, processed by our third-party payment processors",
                },
                {
                  term: "Communications",
                  def: "Information you provide when contacting support or giving feedback",
                },
                {
                  term: "User content",
                  def: "Agent configurations, templates, and other content you create through the Service",
                },
              ]}
            />

            <SubHeading>Information Collected Automatically</SubHeading>
            <DefList
              items={[
                {
                  term: "Usage data",
                  def: "Pages visited, features used, actions taken, timestamps, and interaction patterns",
                },
                {
                  term: "Device information",
                  def: "Browser type, operating system, device identifiers, and screen resolution",
                },
                {
                  term: "Network data",
                  def: "IP address, approximate location (city/region), referring URL, and ISP",
                },
                {
                  term: "Log data",
                  def: "API call logs, error reports, and performance metrics",
                },
              ]}
            />

            <SubHeading>Information from Third Parties</SubHeading>
            <DefList
              items={[
                {
                  term: "OAuth providers",
                  def: "If you sign in via Google or another provider, we receive your name, email, and profile picture as permitted by the provider",
                },
                {
                  term: "Analytics partners",
                  def: "Aggregated or de-identified data from analytics and advertising partners",
                },
              ]}
            />
          </Section>

          <Section number={3} title="How We Use Your Information">
            <p>We use the information we collect to:</p>
            <Bullets
              items={[
                "Provide, operate, and maintain the Service",
                "Authenticate your identity and manage your account",
                "Process transactions and send related billing notifications",
                "Send transactional communications, including security alerts and account updates",
                "Respond to your inquiries, support requests, and feedback",
                "Analyze usage patterns to improve the Service, fix bugs, and develop new features",
                "Detect, prevent, and address security issues, fraud, and abuse",
                "Comply with legal obligations and enforce our Terms of Service",
                "Send marketing communications where you have opted in (you may opt out at any time)",
              ]}
            />
          </Section>

          <Section number={4} title="Legal Bases for Processing">
            <p>
              Where applicable (including under the GDPR), we process personal
              data based on the following legal bases:
            </p>
            <DefList
              items={[
                {
                  term: "Contract performance",
                  def: "Processing necessary to provide the Service you requested",
                },
                {
                  term: "Legitimate interests",
                  def: "Processing for our legitimate business purposes, such as security, analytics, and service improvement, balanced against your rights",
                },
                {
                  term: "Consent",
                  def: "Where you have given explicit consent, such as for marketing communications",
                },
                {
                  term: "Legal obligation",
                  def: "Processing required to comply with applicable laws and regulations",
                },
              ]}
            />
          </Section>

          <Section number={5} title="Information Sharing & Disclosure">
            <p>
              We do not sell your personal information. We may share
              information in the following circumstances:
            </p>
            <DefList
              items={[
                {
                  term: "Service providers",
                  def: "With trusted vendors who assist in operating the Service (e.g., cloud hosting, payment processing, email delivery, analytics), bound by contractual obligations to protect your data",
                },
                {
                  term: "Within your organization",
                  def: "If you use the Service as part of a team or organization, other members may see your profile and activity within that workspace",
                },
                {
                  term: "Legal requirements",
                  def: "When required by law, legal process, or government request, or to protect the rights, property, or safety of Kodama, our users, or the public",
                },
                {
                  term: "Business transfers",
                  def: "In connection with a merger, acquisition, reorganization, or sale of assets, where your data may be transferred to the successor entity",
                },
                {
                  term: "With your consent",
                  def: "When you explicitly authorize us to share your information for a specific purpose",
                },
              ]}
            />
          </Section>

          <Section number={6} title="Data Security">
            <p>
              We implement industry-standard technical and organizational
              security measures to protect your personal information,
              including:
            </p>
            <Bullets
              items={[
                "Encryption of data in transit (TLS) and at rest",
                "Regular security assessments and penetration testing",
                "Access controls and principle of least privilege",
                "Secure development practices and code review",
                "Incident response and breach notification procedures",
              ]}
            />
            <p>
              While we strive to protect your data, no method of transmission
              or storage is completely secure. We cannot guarantee absolute
              security.
            </p>
          </Section>

          <Section number={7} title="Data Retention">
            <p>
              We retain your personal information for as long as your account
              is active or as necessary to provide the Service. When you delete
              your account, we will delete or anonymize your personal data
              within 30 days, except where retention is required by law or for
              legitimate business purposes (e.g., fraud prevention, resolving
              disputes, enforcing agreements).
            </p>
            <p>
              Usage logs and analytics data may be retained in aggregated,
              de-identified form for longer periods.
            </p>
          </Section>

          <Section number={8} title="Your Privacy Rights">
            <p>
              Depending on your jurisdiction, you may have the following
              rights:
            </p>
            <DefList
              items={[
                {
                  term: "Access",
                  def: "Request a copy of the personal data we hold about you",
                },
                {
                  term: "Correction",
                  def: "Request correction of inaccurate or incomplete data",
                },
                {
                  term: "Deletion",
                  def: "Request deletion of your personal data, subject to legal exceptions",
                },
                {
                  term: "Portability",
                  def: "Request your data in a structured, machine-readable format",
                },
                {
                  term: "Restriction",
                  def: "Request restriction of processing in certain circumstances",
                },
                {
                  term: "Objection",
                  def: "Object to processing based on legitimate interests or direct marketing",
                },
                {
                  term: "Withdraw consent",
                  def: "Where processing is based on consent, withdraw at any time without affecting prior processing",
                },
              ]}
            />
            <p>
              To exercise any of these rights, contact us at{" "}
              <a
                href="mailto:itsnisargthakkar@gmail.com"
                className="text-[#b46a2a] underline-offset-2 hover:underline"
              >
                itsnisargthakkar@gmail.com
              </a>
              . We will respond within 30 days.
            </p>

            <SubHeading>California Residents (CCPA/CPRA)</SubHeading>
            <p>
              California residents have the right to know what personal
              information is collected, request its deletion, opt out of the
              sale of personal information (we do not sell personal data), and
              not be discriminated against for exercising these rights.
            </p>

            <SubHeading>EEA/UK Residents (GDPR)</SubHeading>
            <p>
              If you are in the European Economic Area or United Kingdom, you
              have the rights listed above and may also lodge a complaint with
              your local data protection authority.
            </p>
          </Section>

          <Section number={9} title="Cookies & Tracking Technologies">
            <p>We use the following types of cookies and similar technologies:</p>
            <DefList
              items={[
                {
                  term: "Essential cookies",
                  def: "Required for authentication, security, and basic functionality. These cannot be disabled.",
                },
                {
                  term: "Analytics cookies",
                  def: "Help us understand how you use the Service so we can improve it. You may opt out through your browser settings.",
                },
                {
                  term: "Preference cookies",
                  def: "Store your settings and preferences for a better experience.",
                },
              ]}
            />
            <p>
              You can manage cookie preferences through your browser settings.
              Disabling certain cookies may limit your ability to use parts of
              the Service.
            </p>
          </Section>

          <Section number={10} title="International Data Transfers">
            <p>
              Your information may be transferred to and processed in countries
              other than your country of residence, including the United
              States. These countries may have different data protection laws.
            </p>
            <p>
              Where we transfer data outside the EEA/UK, we ensure appropriate
              safeguards are in place, such as Standard Contractual Clauses
              approved by the European Commission or reliance on an adequacy
              decision.
            </p>
          </Section>

          <Section number={11} title="Children's Privacy">
            <p>
              The Service is not directed to individuals under the age of 18.
              We do not knowingly collect personal information from children.
              If you become aware that a child has provided us with personal
              data, please contact us and we will take steps to delete the
              information.
            </p>
          </Section>

          <Section number={12} title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we make
              material changes, we will notify you by email or through a
              prominent notice on the Service at least 30 days before the
              changes take effect. The &ldquo;Last updated&rdquo; date at the
              top reflects the most recent revision.
            </p>
            <p>
              Your continued use of the Service after changes take effect
              constitutes acceptance of the revised policy.
            </p>
          </Section>

          <Section number={13} title="Contact">
            <p>
              If you have questions, concerns, or requests regarding this
              Privacy Policy or our data practices, contact us at:
            </p>
            <p>
              <a
                href="mailto:itsnisargthakkar@gmail.com"
                className="font-serif text-lg text-[#b46a2a] underline-offset-2 hover:underline"
              >
                itsnisargthakkar@gmail.com
              </a>
            </p>
          </Section>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#1a2a4a]/10 pt-8 text-sm text-[#3a4a6a]/80 sm:flex-row">
          <div className="flex items-center gap-5">
            <Link
              href="/terms"
              className="text-[#1a2a4a] underline-offset-2 hover:underline"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-[#1a2a4a] underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>
          </div>
          <span>© 2026 Kodama. All rights reserved.</span>
        </div>
      </article>
    </main>
  );
}
