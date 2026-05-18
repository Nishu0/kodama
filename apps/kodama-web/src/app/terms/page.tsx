import Link from "next/link";

export const metadata = {
  title: "Terms of Service · Kodama",
  description: "The legal terms that govern your use of the Kodama platform.",
};

function FlowerMark() {
  return (
    <svg viewBox="0 0 32 32" width={26} height={26} aria-hidden>
      <defs>
        <radialGradient id="terms-petal" cx="50%" cy="40%" r="60%">
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
          fill="url(#terms-petal)"
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
          <dt className="font-serif text-[17px] text-[#1a2a4a] sm:min-w-[140px]">
            {item.term}.
          </dt>
          <dd className="text-[#1a2a4a]/85">{item.def}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function TermsPage() {
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
            Terms of <em className="italic text-[#b46a2a]">Service</em>
          </h1>
          <p className="mt-4 text-sm text-[#3a4a6a]/80">
            Last updated: March 18, 2026
          </p>
        </div>

        <div className="mt-12 rounded-3xl border border-white/60 bg-white/65 p-8 shadow-[0_30px_80px_-30px_rgba(20,40,80,0.25)] backdrop-blur-md sm:p-12">
          <Section number={1} title="Agreement to Terms">
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally
              binding agreement between you (&ldquo;User,&rdquo; &ldquo;you&rdquo;)
              and Kodama (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;)
              governing your access to and use of the Kodama platform, the
              Kodama Dashboard, APIs, and all related services (collectively,
              the &ldquo;Service&rdquo;).
            </p>
            <p>
              By creating an account, accessing, or using the Service, you
              confirm that you have read, understood, and agree to be bound by
              these Terms and our Privacy Policy. If you do not agree, you must
              not use the Service.
            </p>
            <p>
              You represent that you are at least 18 years of age and have the
              legal capacity to enter into these Terms. If you are using the
              Service on behalf of an organization, you represent that you have
              authority to bind that organization to these Terms.
            </p>
          </Section>

          <Section number={2} title="Description of Service">
            <p>
              Kodama provides a developer platform and dashboard (&ldquo;Kodama
              Dashboard&rdquo;) that enables users to build, deploy, manage, and
              monitor AI&#x2011;powered agents across multiple channels. The
              Service includes, but is not limited to:
            </p>
            <Bullets
              items={[
                "The Kodama Dashboard for project management and configuration",
                "APIs for programmatic access to platform functionality",
                "Agent deployment and distribution tools",
                "Analytics, observability, and monitoring features",
                "Documentation and developer resources",
              ]}
            />
            <p>
              We reserve the right to modify, suspend, or discontinue any part
              of the Service at any time, with or without notice. We will make
              reasonable efforts to notify you of material changes.
            </p>
          </Section>

          <Section number={3} title="Account Registration & Security">
            <p>
              To access the Service, you must create an account by providing
              accurate and complete information. You agree to:
            </p>
            <Bullets
              items={[
                "Provide truthful, current, and complete registration information",
                "Maintain the security and confidentiality of your login credentials",
                "Promptly notify us of any unauthorized access to or use of your account",
                "Accept responsibility for all activities that occur under your account",
              ]}
            />
            <p>
              You may not share your account credentials or allow others to
              access the Service through your account. We reserve the right to
              suspend or terminate accounts that violate these Terms.
            </p>
          </Section>

          <Section number={4} title="Acceptable Use">
            <p>You agree not to use the Service to:</p>
            <Bullets
              items={[
                "Violate any applicable law, regulation, or third-party right",
                "Transmit malware, viruses, or any code of a destructive nature",
                "Interfere with, disrupt, or place an undue burden on the Service or its infrastructure",
                "Attempt to gain unauthorized access to any portion of the Service or related systems",
                "Reverse engineer, decompile, or disassemble any part of the Service, except as permitted by law",
                "Use automated means (bots, scrapers, crawlers) to access the Service beyond the provided APIs",
                "Build agents that generate or distribute illegal, harmful, misleading, or abusive content",
                "Resell, sublicense, or redistribute access to the Service without written authorization",
              ]}
            />
            <p>
              We may investigate suspected violations and may remove content or
              suspend accounts at our discretion.
            </p>
          </Section>

          <Section number={5} title="API & Developer Terms">
            <p>
              Access to the Kodama API is subject to the following additional
              terms:
            </p>
            <DefList
              items={[
                {
                  term: "Rate limits",
                  def: "API calls are subject to rate limits as documented. Exceeding these limits may result in temporary throttling or suspension.",
                },
                {
                  term: "API keys",
                  def: "You are responsible for safeguarding your API keys and tokens. Do not expose them in client-side code, public repositories, or insecure environments.",
                },
                {
                  term: "Versioning",
                  def: "We may release new API versions and deprecate older versions with reasonable notice. You are responsible for updating your integrations accordingly.",
                },
                {
                  term: "Uptime",
                  def: "While we strive for high availability, we do not guarantee uninterrupted API access. Service-level agreements, where applicable, are governed by separate agreements.",
                },
              ]}
            />
          </Section>

          <Section number={6} title="Intellectual Property">
            <p>
              The Service, including its design, code, documentation, branding,
              and all associated intellectual property, is owned by Kodama and
              protected by copyright, trademark, and other intellectual property
              laws.
            </p>
            <p>
              You retain ownership of any content, data, or materials you
              submit through the Service (&ldquo;User Content&rdquo;). By
              submitting User Content, you grant us a limited, worldwide,
              non-exclusive, royalty-free license to host, process, and display
              your content solely as necessary to provide the Service.
            </p>
            <p>
              You represent that you have the rights necessary to submit User
              Content and that it does not infringe any third-party rights.
            </p>
          </Section>

          <Section number={7} title="Third-Party Services">
            <p>
              The Service may integrate with or contain links to third-party
              services, including messaging platforms, analytics providers, and
              cloud infrastructure. Your use of such services is governed by
              their respective terms and privacy policies.
            </p>
            <p>
              We are not responsible for the availability, accuracy, or content
              of third-party services. Integration with third-party services
              does not imply endorsement.
            </p>
          </Section>

          <Section number={8} title="Fees & Payment">
            <p>
              Certain features of the Service may be offered under paid plans.
              If you subscribe to a paid plan:
            </p>
            <Bullets
              items={[
                "Fees are billed in advance on a recurring basis (monthly or annually) unless otherwise stated",
                "All fees are non-refundable except as required by law or expressly stated in these Terms",
                "We may change pricing with at least 30 days' notice before the start of your next billing cycle",
                "You are responsible for providing accurate billing information and keeping payment methods current",
                "Failure to pay may result in suspension or downgrade of your account",
              ]}
            />
          </Section>

          <Section number={9} title="Confidentiality">
            <p>
              Each party agrees to maintain the confidentiality of any
              non-public information disclosed by the other party in connection
              with the Service. Confidential information does not include
              information that is publicly available, independently developed,
              or rightfully obtained from a third party without obligation of
              confidentiality.
            </p>
          </Section>

          <Section number={10} title="Disclaimer of Warranties">
            <p>
              The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; basis without warranties of any kind, whether
              express, implied, or statutory. To the maximum extent permitted
              by law, we disclaim all warranties, including warranties of
              merchantability, fitness for a particular purpose, non-infringement,
              and any warranties arising from course of dealing or usage of
              trade.
            </p>
            <p>
              We do not warrant that the Service will be uninterrupted,
              error-free, secure, or free from harmful components.
            </p>
          </Section>

          <Section number={11} title="Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable law, in no event
              shall Kodama, its affiliates, directors, employees, or agents be
              liable for any indirect, incidental, special, consequential, or
              punitive damages, or any loss of profits, revenue, data, or
              goodwill, arising out of or related to your use of the Service,
              regardless of the theory of liability.
            </p>
            <p>
              Our total cumulative liability for all claims arising out of or
              related to these Terms or the Service shall not exceed the
              greater of (a) the amounts you paid to us in the 12 months
              preceding the claim, or (b) $100.
            </p>
          </Section>

          <Section number={12} title="Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless Kodama and its
              officers, directors, employees, and agents from and against any
              claims, liabilities, damages, losses, and expenses (including
              reasonable attorneys&apos; fees) arising out of or related to:
              (a) your use of the Service; (b) your violation of these Terms;
              (c) your User Content; or (d) your violation of any rights of a
              third party.
            </p>
          </Section>

          <Section number={13} title="Term & Termination">
            <p>
              These Terms remain in effect until terminated. You may terminate
              your account at any time by contacting us or using the account
              deletion functionality in the dashboard.
            </p>
            <p>
              We may suspend or terminate your access to the Service at any
              time for any reason, including if we reasonably believe you have
              violated these Terms. Upon termination, your right to use the
              Service ceases immediately.
            </p>
            <p>
              Provisions that by their nature should survive termination
              (including intellectual property, limitation of liability,
              indemnification, and dispute resolution) will survive.
            </p>
          </Section>

          <Section number={14} title="Modifications to Terms">
            <p>
              We may revise these Terms from time to time. When we make
              material changes, we will notify you by email or through a notice
              on the Service at least 30 days before the changes take effect.
            </p>
            <p>
              Your continued use of the Service after the effective date of the
              revised Terms constitutes your acceptance. If you do not agree to
              the updated Terms, you must stop using the Service.
            </p>
          </Section>

          <Section number={15} title="Governing Law & Disputes">
            <p>
              These Terms are governed by and construed in accordance with the
              laws of the State of Delaware, United States, without regard to
              its conflict-of-law provisions.
            </p>
            <p>
              Any dispute arising from these Terms or the Service shall first
              be attempted to be resolved through good-faith negotiation. If
              the dispute cannot be resolved within 30 days, it shall be
              submitted to binding arbitration in accordance with the rules of
              the American Arbitration Association, with proceedings conducted
              in English.
            </p>
          </Section>

          <Section number={16} title="General Provisions">
            <DefList
              items={[
                {
                  term: "Entire agreement",
                  def: "These Terms, together with the Privacy Policy, constitute the entire agreement between you and Kodama regarding the Service.",
                },
                {
                  term: "Severability",
                  def: "If any provision is found unenforceable, the remaining provisions continue in full force and effect.",
                },
                {
                  term: "Waiver",
                  def: "Failure to enforce any right or provision does not constitute a waiver of that right or provision.",
                },
                {
                  term: "Assignment",
                  def: "You may not assign these Terms without our prior written consent. We may assign our rights and obligations without restriction.",
                },
                {
                  term: "Force majeure",
                  def: "Neither party is liable for delays or failures caused by events beyond reasonable control, including natural disasters, war, terrorism, pandemics, or government action.",
                },
              ]}
            />
          </Section>

          <Section number={17} title="Contact">
            <p>
              If you have questions about these Terms, contact us at{" "}
              <a
                href="mailto:itsnisargthakkar@gmail.com"
                className="text-[#b46a2a] underline-offset-2 hover:underline"
              >
                itsnisargthakkar@gmail.com
              </a>
              .
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
              href="#"
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
