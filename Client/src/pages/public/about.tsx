const About = () => {
  return (
    <div className="bg-slate-950 text-white">
      {/* Hero */}
      <section className="border-b border-slate-800/70">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400">
            About Us
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Built for African esports
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
            Apex Arenas is a technology and infrastructure provider designed to
            professionalize competitive gaming in Ghana and scale across West
            Africa.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400 mb-3">
              Our Mission
            </p>
            <h2 className="text-2xl font-bold text-white mb-4">
              Reliable infrastructure for every player and organizer
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              We exist to solve real problems in the African gaming ecosystem — unreliable prize payments, unverified organizers, and the absence of a trusted neutral platform. Apex Arenas brings mandatory escrow, automated payouts, and verified tournament hosting to every competition, from local cups to national championships.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400 mb-3">
              Our Model
            </p>
            <h2 className="text-2xl font-bold text-white mb-4">
              We are not an operator — we are the infrastructure
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Apex Arenas does not run tournaments or fund prize pools. Independent organizers use our platform to create and manage events, while players compete with confidence knowing every prize is locked in escrow before play begins.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-t border-slate-800/60">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400 mb-8">
            What we stand for
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Trust",
                body: "Every prize is escrowed before a tournament goes live. Players always know what they're competing for.",
              },
              {
                title: "Transparency",
                body: "Organizers, players, and the platform have clearly separated roles. No conflicts of interest.",
              },
              {
                title: "Accessibility",
                body: "Built for Ghana first — Mobile Money payments, local currency (GHS), and mobile-first design.",
              },
              {
                title: "Fairness",
                body: "Dispute resolution, verified organizers, and automated prize distribution remove human bias from outcomes.",
              },
              {
                title: "Growth",
                body: "Player profiles, rankings, and career stats give every competitor a permanent record of their performance.",
              },
              {
                title: "Scale",
                body: "Designed to grow from Accra to the rest of West Africa, supporting online, offline, and hybrid formats.",
              },
            ].map(({ title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
              >
                <h3 className="text-base font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team note */}
      <section className="border-t border-slate-800/60">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400 mb-4">
            The team
          </p>
          <h2 className="text-2xl font-bold text-white mb-4">
            Builders who believe in African gaming
          </h2>
          <p className="max-w-2xl text-slate-400 text-sm leading-relaxed">
            We are a small team of engineers, designers, and gaming enthusiasts based in Ghana. We play the same games, attend the same tournaments, and share the same frustrations that led us to build Apex Arenas. This is not a side project — it is the platform we wished existed.
          </p>
        </div>
      </section>
    </div>
  );
};

export default About;
