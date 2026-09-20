import "./heroui.css";
import type { Metadata } from "next";

/**
 * The signed-in area's root. Deliberately thin: the two dashboards have
 * different navigation, different guards and different data, so each brings its
 * own `AppShell` — what they genuinely share is this stylesheet and the
 * "keep it out of search" metadata.
 *
 * `heroui.css` is imported here rather than in the root layout so the marketing
 * pages never download it; the file's own header explains the tradeoff.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: LayoutProps<"/">) {
  return children;
}
