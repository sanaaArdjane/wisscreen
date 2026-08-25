/**
 * Freeze page scrolling while a full-screen overlay is up, without the layout jump.
 *
 * `overflow: hidden` on the body is the easy half. The catch is that on a platform with a
 * classic, space-taking scrollbar — Chrome on Linux and Windows — removing it widens the
 * content box by ~15px: the page reflows on the way in and again on the way out, and the
 * second reflow is what makes an overlay's exit read as a snap rather than a close.
 * Reserving that width as padding keeps the content exactly where it was, in both
 * directions.
 *
 * Returns the undo. Both the hero's browser frame and the presentation video use it, so the
 * two states behave identically.
 */
export function lockScroll(): () => void {
  const body = document.body;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  const previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };

  body.style.overflow = "hidden";
  if (gap > 0) body.style.paddingRight = `${gap}px`;

  return () => {
    body.style.overflow = previous.overflow;
    body.style.paddingRight = previous.paddingRight;
  };
}
