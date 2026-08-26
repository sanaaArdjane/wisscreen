import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// GSAP + ScrollTrigger never run meaningfully in jsdom (no layout, no scroll, and
// rAF is throttled in a hidden tab — see AGENTS.md "Known environment quirk"). Stub
// the shared module so the components that reveal/animate render their settled,
// server-visible state deterministically. The a11y state we assert on (aria-expanded,
// active tab, static stat value) is plain React and is unaffected by this.
vi.mock("@/lib/gsap", () => {
  const noop = () => {};
  const gsap = {
    set: noop,
    to: noop,
    fromTo: noop,
    registerPlugin: noop,
    // Reveal runs its body synchronously inside a context() and reverts on cleanup.
    context: (fn?: () => void) => {
      if (typeof fn === "function") fn();
      return { revert: noop };
    },
  };
  const ScrollTrigger = {
    create: () => ({ kill: noop }),
    register: noop,
  };
  return { gsap, ScrollTrigger };
});

// next/link needs the App Router context to be mounted, which RTL does not provide.
// Render it as the plain anchor it ultimately produces so we can assert hrefs.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string | { pathname?: string }; children: ReactNode }) => {
    const resolved = typeof href === "string" ? href : (href?.pathname ?? "");
    return (
      <a href={resolved} {...rest}>
        {children}
      </a>
    );
  },
}));

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tabs } from "@/components/ui/Tabs";
import { Accordion } from "@/components/ui/Accordion";
import { HandUnderline } from "@/components/ui/HandUnderline";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { StatCounter } from "@/components/ui/StatCounter";
import { TypeCycle } from "@/components/ui/TypeCycle";
import { isRemote } from "@/components/ui/LoadingImage";
import { Footer } from "@/components/layout/Footer";
import { SERVICES } from "@/lib/data/services";

// @testing-library/react does not auto-clean between tests without globals enabled.
afterEach(cleanup);

describe("Button", () => {
  it("renders a real <button type=button> by default, with the trailing arrow icon", () => {
    render(<Button>Envoyer</Button>);
    const btn = screen.getByRole("button", { name: "Envoyer" });
    expect(btn).toHaveProperty("tagName", "BUTTON");
    expect(btn.getAttribute("type")).toBe("button");
    // Primary is the signal-filled control (the brand's one accent CTA).
    expect(btn.className).toContain("control-signal");
    // withArrow defaults on → an aria-hidden svg is appended.
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("drops the arrow when withArrow is false", () => {
    render(<Button withArrow={false}>Nu</Button>);
    expect(screen.getByRole("button", { name: "Nu" }).querySelector("svg")).toBeNull();
  });

  it("maps each variant to its class contract", () => {
    const { rerender } = render(<Button variant="secondary">x</Button>);
    expect(screen.getByRole("button").className).toContain("bg-ink");
    rerender(<Button variant="ghost">x</Button>);
    expect(screen.getByRole("button").className).toContain("bg-transparent");
  });

  it("renders an anchor (not a button) when given an href", () => {
    render(<Button href="/solutions/ocr">Découvrir</Button>);
    const link = screen.getByRole("link", { name: "Découvrir" });
    expect(link.getAttribute("href")).toBe("/solutions/ocr");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("fires onClick for the button variant", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("merges a caller className without dropping the base classes", () => {
    render(<Button className="my-custom-class">x</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("my-custom-class");
    expect(cls).toContain("rounded-full");
  });
});

describe("Badge", () => {
  it("renders children, merges className, and forwards arbitrary span props", () => {
    render(
      <Badge className="text-signal" data-testid="badge" id="eyebrow">
        Nouveau
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    expect(badge.textContent).toBe("Nouveau");
    expect(badge.getAttribute("id")).toBe("eyebrow"); // ...rest is spread through
    expect(badge.className).toContain("text-signal");
    expect(badge.className).toContain("uppercase"); // base class survives
  });
});

describe("Container", () => {
  it("wraps children in the max-width shell and merges className", () => {
    const { container } = render(
      <Container className="py-10">
        <span>content</span>
      </Container>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.textContent).toBe("content");
    expect(root.className).toContain("max-w-[1280px]");
    expect(root.className).toContain("py-10");
  });
});

describe("Icon", () => {
  it("renders the exact path registered for a name, hidden from a11y", () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("stroke-width")).toBe("1.6"); // default
    expect(svg.className.baseVal).toContain("h-6 w-6"); // default class
    expect(svg.querySelector("path")!.getAttribute("d")).toBe("M4 12l6 6L20 6");
  });

  it("honours a custom strokeWidth and className", () => {
    const { container } = render(<Icon name="scan" strokeWidth={3} className="h-4 w-4" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("stroke-width")).toBe("3");
    expect(svg.className.baseVal).toContain("h-4 w-4");
  });
});

describe("SectionHeading", () => {
  it("renders the eyebrow, an h2 title, and the description", () => {
    render(<SectionHeading eyebrow="Nos solutions" title="Un univers connecté" description="Quatre produits." />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Un univers connecté");
    expect(screen.getByText("Nos solutions")).toBeTruthy();
    expect(screen.getByText("Quatre produits.")).toBeTruthy();
  });

  it("omits the eyebrow badge when no eyebrow is given", () => {
    render(<SectionHeading title="Titre seul" />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Titre seul");
    expect(screen.queryByText("Nos solutions")).toBeNull();
  });
});

describe("Tabs", () => {
  const tabs = [
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta" },
  ];

  it("activates the first tab by default and passes its id to the render prop", () => {
    render(<Tabs tabs={tabs}>{(active) => <div data-testid="panel">active:{active}</div>}</Tabs>);
    expect(screen.getByTestId("panel").textContent).toBe("active:a");
    expect(screen.getByRole("button", { name: "Alpha" }).className).toContain("control-accent");
    expect(screen.getByRole("button", { name: "Beta" }).className).not.toContain("control-accent");
  });

  it("switches the active tab and the rendered content on click", () => {
    render(<Tabs tabs={tabs}>{(active) => <div data-testid="panel">active:{active}</div>}</Tabs>);
    fireEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(screen.getByTestId("panel").textContent).toBe("active:b");
    expect(screen.getByRole("button", { name: "Beta" }).className).toContain("control-accent");
    expect(screen.getByRole("button", { name: "Alpha" }).className).not.toContain("control-accent");
  });

  it("respects an explicit defaultTab", () => {
    render(
      <Tabs tabs={tabs} defaultTab="b">
        {(active) => <div data-testid="panel">active:{active}</div>}
      </Tabs>,
    );
    expect(screen.getByTestId("panel").textContent).toBe("active:b");
  });
});

describe("Accordion", () => {
  const items = [
    { title: "Question un", content: "Réponse un" },
    { title: "Question deux", content: "Réponse deux" },
  ];

  it("opens the defaultOpen item and marks it aria-expanded", () => {
    render(<Accordion items={items} />);
    expect(screen.getByRole("button", { name: "Question un" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Question deux" }).getAttribute("aria-expanded")).toBe("false");
    // Both panels are always in the DOM (collapsed via height), so content is present.
    expect(screen.getByText("Réponse deux")).toBeTruthy();
  });

  it("moves the open state to a clicked item, then closes it on a second click", () => {
    render(<Accordion items={items} />);
    const q2 = screen.getByRole("button", { name: "Question deux" });

    fireEvent.click(q2);
    expect(q2.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Question un" }).getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(q2);
    expect(q2.getAttribute("aria-expanded")).toBe("false");
  });

  it("can start fully closed with defaultOpen={null}", () => {
    render(<Accordion items={items} defaultOpen={null} />);
    expect(screen.getByRole("button", { name: "Question un" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: "Question deux" }).getAttribute("aria-expanded")).toBe("false");
  });
});

describe("HandUnderline", () => {
  it("renders a signal-filled decorative path and merges the caller's animation class", () => {
    const { container } = render(<HandUnderline className="underline-draw" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.className.baseVal).toContain("underline-draw");
    expect(svg.className.baseVal).toContain("pointer-events-none");
    expect(svg.querySelector("path")!.getAttribute("class")).toContain("fill-signal");
  });
});

describe("ErrorBoundary", () => {
  it("renders its children when they do not throw", () => {
    render(
      <ErrorBoundary fallback={<span>secours</span>}>
        <span>contenu</span>
      </ErrorBoundary>,
    );
    expect(screen.getByText("contenu")).toBeTruthy();
    expect(screen.queryByText("secours")).toBeNull();
  });

  it("swaps in the fallback when a child throws", () => {
    // React logs the caught error; silence it so the run stays clean.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const Boom = () => {
      throw new Error("boom");
    };
    render(
      <ErrorBoundary fallback={<span>secours</span>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("secours")).toBeTruthy();
    spy.mockRestore();
  });
});

describe("StatCounter", () => {
  it("renders the raw value as its no-JS / pre-animation state", () => {
    // GSAP is mocked, so the count-up never fires and the static value is what shows —
    // which is exactly the server-rendered fallback a crawler or no-JS visitor sees.
    render(<StatCounter value="99,2%" className="text-4xl" />);
    expect(screen.getByText("99,2%")).toBeTruthy();
  });
});

describe("TypeCycle", () => {
  it("renders the first word up front with a decorative caret", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<TypeCycle words={["Extraire", "Connecter"]} />);
      expect(screen.getByText("Extraire")).toBeTruthy();
      // The caret is aria-hidden so it never pollutes the accessible name.
      expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("isRemote (LoadingImage helper)", () => {
  it("treats http(s) URLs as remote and local paths as not", () => {
    expect(isRemote("https://cdn.example.com/a.jpg")).toBe(true);
    expect(isRemote("http://example.com/a.png")).toBe(true);
    expect(isRemote("/photos/service1.jpg")).toBe(false);
    expect(isRemote("photos/service1.jpg")).toBe(false);
  });
});

describe("Footer", () => {
  it("renders a contentinfo landmark linking to every solution page", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeTruthy();
    for (const service of SERVICES) {
      const link = screen.getByRole("link", { name: service.name });
      expect(link.getAttribute("href")).toBe(`/solutions/${service.slug}`);
    }
  });

  it("shows the current year in the copyright line", () => {
    render(<Footer />);
    const year = String(new Date().getFullYear());
    expect(screen.getByText(new RegExp(`${year} Wissal Univers`))).toBeTruthy();
  });
});
