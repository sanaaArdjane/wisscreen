import { readSolutionRecords } from "@/lib/content";
import { storageConfigured } from "@/lib/storage";
import type { Option } from "@/lib/content/forms";

/** What every /admin/site editor needs besides its own block: the solutions to pick
 *  from in "Solution" selects, and whether uploads are available. */
export async function editorContext(): Promise<{ solutions: Option[]; storage: boolean }> {
  const { records } = await readSolutionRecords();
  return {
    solutions: records.map((r) => ({ value: r.slug, label: r.content.name + (r.published ? "" : " (masquée)") })),
    storage: storageConfigured(),
  };
}
