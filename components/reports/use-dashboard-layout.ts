"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  LAYOUT_STORAGE_KEY,
  normalizeLayout,
  type DashboardLayout,
  type WidgetId,
} from "@/lib/reports/widgets";

function loadLayoutFromStorage(): DashboardLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (raw) return normalizeLayout(JSON.parse(raw) as DashboardLayout);
  } catch {
    // ignore invalid stored layout
  }
  return DEFAULT_DASHBOARD_LAYOUT;
}

export function useDashboardLayout() {
  const [layout, setLayoutState] = useState(DEFAULT_DASHBOARD_LAYOUT);
  const [ready, setReady] = useState(false);
  const [, startHydrateTransition] = useTransition();

  useEffect(() => {
    startHydrateTransition(() => {
      setLayoutState(loadLayoutFromStorage());
      setReady(true);
    });
  }, [startHydrateTransition]);

  const persistLayout = useCallback((next: DashboardLayout) => {
    const normalized = normalizeLayout(next);
    setLayoutState(normalized);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(normalized));
  }, []);

  const toggleWidget = useCallback(
    (id: WidgetId) => {
      persistLayout({
        ...layout,
        widgets: layout.widgets.map((entry) =>
          entry.id === id ? { ...entry, visible: !entry.visible } : entry,
        ),
      });
    },
    [layout, persistLayout],
  );

  const moveWidget = useCallback(
    (id: WidgetId, direction: -1 | 1) => {
      const widgets = [...layout.widgets].sort((a, b) => a.order - b.order);
      const index = widgets.findIndex((entry) => entry.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= widgets.length) return;
      const swapped = widgets[index]!;
      widgets[index] = widgets[target]!;
      widgets[target] = swapped;
      persistLayout({
        ...layout,
        widgets: widgets.map((entry, order) => ({ ...entry, order })),
      });
    },
    [layout, persistLayout],
  );

  const resetLayout = useCallback(() => {
    persistLayout(DEFAULT_DASHBOARD_LAYOUT);
  }, [persistLayout]);

  const visibleWidgets = [...layout.widgets]
    .sort((a, b) => a.order - b.order)
    .filter((entry) => entry.visible);

  return {
    layout,
    ready,
    visibleWidgets,
    setLayout: persistLayout,
    toggleWidget,
    moveWidget,
    resetLayout,
  };
}
