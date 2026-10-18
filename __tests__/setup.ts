/**
 * Browser APIs jsdom does not implement, stubbed once for every component test.
 *
 * jsdom ships neither `matchMedia` nor `IntersectionObserver`, and both are things a
 * component is *right* to use: honouring `prefers-reduced-motion` and revealing on
 * scroll are not optional niceties. Guarding each call site with a `typeof` check
 * would be contorting the product to fit the test environment, so the gap is filled
 * here instead — which is also where it belongs, since it is the environment that is
 * incomplete, not the code.
 *
 * The stubs are deliberately inert: `matchMedia` always answers "no preference", and
 * the observer never fires. A component under test therefore renders its *initial*
 * state, which for `Reveal` is the server-rendered, fully visible one — exactly the
 * output these tests assert on.
 */

if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  if (!window.IntersectionObserver) {
    class InertIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds: readonly number[] = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    window.IntersectionObserver =
      InertIntersectionObserver as unknown as typeof window.IntersectionObserver;
  }
}
