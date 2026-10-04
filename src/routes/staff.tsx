import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "@/components/icons";
import { fetchStaff, orNothing } from "@/lib/data";
import { EmptyState, PaperHeader } from "@/components/page-parts";
import { Reveal, StaggerItem, StaggerList } from "@/components/motion";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff - Bomas Academy" },
      { name: "description", content: "Meet the teachers and leaders shaping Bomas Academy." },
      { property: "og:title", content: "Staff - Bomas Academy" },
      {
        property: "og:description",
        content: "Meet the teachers and leaders shaping Bomas Academy.",
      },
    ],
  }),
  loader: () => orNothing(fetchStaff),
  component: StaffPage,
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

type Person = {
  id: string;
  name: string;
  position: string;
  bio: string | null;
  photo_url: string | null;
};

function Portrait({ s, large }: { s: Person; large?: boolean }) {
  return s.photo_url ? (
    <img
      src={s.photo_url}
      alt={s.name}
      width={large ? 900 : 600}
      height={large ? 1000 : 750}
      loading={large ? "eager" : "lazy"}
      decoding="async"
      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
    />
  ) : (
    <div
      className="flex h-full w-full items-center justify-center bg-navy font-display text-6xl font-bold text-gold"
      aria-hidden="true"
    >
      {initials(s.name)}
    </div>
  );
}

function StaffPage() {
  const loaded = Route.useLoaderData();
  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => (await fetchStaff()) as Person[],
    staleTime: 30_000,
    initialData: loaded as Person[] | undefined,
  });

  const [lead, ...rest] = staff ?? [];

  return (
    <>
      <PaperHeader
        trail="Staff"
        title="Teachers who know your child by name."
        intro="A team of dedicated educators, mentors and leaders chosen for their craft and their character."
      />
      <section className="container-wide py-10 lg:py-14">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-clip rounded-lg border bg-surface">
                <div className="shimmer aspect-[4/5]" />
                <div className="space-y-2 p-4">
                  <div className="shimmer h-4 w-2/3 rounded-md" />
                  <div className="shimmer h-3 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : lead ? (
          <>
            {/* The first person on the list is shown large */}
            <Reveal>
              <article className="group grid overflow-clip rounded-lg bg-navy-deep text-white md:grid-cols-[5fr_7fr]">
                <div className="aspect-[4/5] overflow-hidden md:aspect-auto md:min-h-[480px]">
                  <Portrait s={lead} large />
                </div>
                <div className="flex flex-col justify-end p-6 sm:p-10 lg:p-14">
                  <p className="label-mono text-gold">{lead.position}</p>
                  <h2 className="display-xl mt-3 text-[clamp(2.2rem,4.6vw,4rem)]">{lead.name}</h2>
                  {lead.bio && (
                    <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">
                      {lead.bio}
                    </p>
                  )}
                </div>
              </article>
            </Reveal>

            {rest.length > 0 && (
              <StaggerList
                as="div"
                className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
              >
                {rest.map((s) => (
                  <StaggerItem key={s.id} as="div">
                    <article className="group">
                      <div className="aspect-[4/5] overflow-hidden rounded-lg bg-secondary">
                        <Portrait s={s} />
                      </div>
                      <h2 className="mt-4 font-display text-xl font-bold leading-snug tracking-tight">
                        {s.name}
                      </h2>
                      <p className="label-mono mt-1 text-navy">{s.position}</p>
                      {s.bio && (
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {s.bio}
                        </p>
                      )}
                    </article>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </>
        ) : (
          <EmptyState
            Icon={Users}
            title="Staff profiles are coming"
            body="The school will add its teachers and leaders here soon."
          />
        )}
      </section>
    </>
  );
}
