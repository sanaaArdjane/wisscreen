import type { Metadata } from "next";
import Link from "next/link";
import { readPostRows } from "@/lib/content/posts";
import { getCurrentUser } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { Panel } from "@/components/dashboard/PageHeader";
import { ConfirmButton } from "@/components/dashboard/ui";
import { NewPostForm } from "@/components/dashboard/site/PostEditor";
import { Icon } from "@/components/ui/Icon";
import { deletePost, togglePost } from "../actions";

export const metadata: Metadata = { title: "Blog — Configuration du site" };

const btn =
  "flex h-9 w-9 items-center justify-center rounded-full text-fg ring-1 ring-fg/15 hover:bg-fg/8";

const date = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Africa/Algiers" }).format(value)
    : "—";

export default async function BlogAdminPage() {
  const [posts, user] = await Promise.all([readPostRows(), getCurrentUser()]);
  const writable = Boolean(user && can(user, "site:write"));

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Articles"
        description="Chaque article est une page publique de plus sur laquelle le site peut se positionner. Un article masqué n'apparaît nulle part et son adresse renvoie une erreur 404."
      >
        {posts.length === 0 ? (
          <p className="rounded-2xl bg-soft px-4 py-6 text-sm text-fg">
            Aucun article pour l&apos;instant. Le blog affiche « Les premiers articles arrivent bientôt. »
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-fg/10 rounded-2xl ring-1 ring-fg/10">
            {posts.map((post) => (
              <li key={post.slug} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex flex-wrap items-center gap-2 font-[650] text-fg">
                    {post.content.title}
                    {post.published ? (
                      <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[11px] text-fg ring-1 ring-signal/45">
                        Publié
                      </span>
                    ) : (
                      <span className="rounded-full px-2 py-0.5 text-[11px] text-fg ring-1 ring-fg/30">Brouillon</span>
                    )}
                  </span>
                  <span className="truncate font-mono text-xs text-fg/80">
                    /blog/{post.slug} · {date(post.publishedAt)}
                  </span>
                </span>

                {writable && (
                  <form action={togglePost}>
                    <input type="hidden" name="slug" value={post.slug} />
                    <button className="rounded-full px-3 py-2 text-sm font-[650] text-fg ring-1 ring-fg/15 hover:bg-fg/8">
                      {post.published ? "Masquer" : "Publier"}
                    </button>
                  </form>
                )}
                <Link
                  href={`/admin/site/blog/${post.slug}`}
                  className="rounded-full bg-fg px-4 py-2 text-sm font-[650] text-on-fg hover:opacity-90"
                >
                  Modifier
                </Link>
                {post.published && (
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Voir l'article ${post.content.title}`}
                    className={btn}
                  >
                    <Icon name="external" className="h-4 w-4" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {writable && (
        <>
          <Panel
            title="Écrire un article"
            description="Il est créé en brouillon : écrivez-le, puis publiez-le."
          >
            <NewPostForm />
          </Panel>

          {posts.length > 0 && (
            <Panel
              title="Supprimer un article"
              description="Définitif : le texte et les réglages disparaissent. Les fichiers téléversés restent dans le stockage."
            >
              <ul className="flex flex-col gap-3">
                {posts.map((post) => (
                  <li key={post.slug} className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-[650] text-fg">{post.content.title}</span>
                    <ConfirmButton
                      action={deletePost}
                      hidden={{ slug: post.slug }}
                      label={`Supprimer ${post.content.title}`}
                      description={`La page /blog/${post.slug} n'existera plus. Pour la retirer temporairement, préférez « Masquer ».`}
                      typeToConfirm={post.slug}
                      typeToConfirmLabel={`Tapez « ${post.slug} » pour confirmer`}
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
