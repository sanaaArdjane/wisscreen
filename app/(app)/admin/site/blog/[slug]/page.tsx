import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readPostRows } from "@/lib/content/posts";
import { PostEditor } from "@/components/dashboard/site/PostEditor";
import { editorContext } from "../../content-props";

export const metadata: Metadata = { title: "Modifier un article — Configuration du site" };

export default async function PostEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [posts, ctx] = await Promise.all([readPostRows(), editorContext()]);
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-[650] text-fg">{post.content.title}</h2>
      <PostEditor
        key={post.slug}
        slug={post.slug}
        initialContent={post.content}
        initialPublished={post.published}
        {...ctx}
      />
    </div>
  );
}
