"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "overview",    label: "Overview"   },
  { id: "database",    label: "Database"   },
  { id: "api",         label: "API"        },
  { id: "pages",       label: "Pages"      },
  { id: "components",  label: "Components" },
  { id: "features",    label: "Features"   },
  { id: "dataflow",    label: "Data Flow"  },
];

export default function ArchitectureNav() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-surface-border -mx-8 px-8 mb-8">
      <div className="flex gap-1 overflow-x-auto py-0">
        {SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              setActive(id);
            }}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              active === id
                ? "border-brand text-brand"
                : "border-transparent text-text-muted hover:text-text-primary hover:border-surface-border"
            }`}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
