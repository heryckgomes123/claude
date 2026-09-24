"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export type BoardColumn = { id: string; title: string; color?: string; hint?: string };

type Drag = { id: string; from: string; x: number; y: number; w: number; h: number; offX: number; offY: number; node: ReactNode };

/**
 * Kanban board with pointer-based drag & drop.
 * Mouse: drag after a 5px move. Touch: long-press (220ms) to lift, so normal scrolling still works.
 */
export function Board<T extends { id: string }>({
  columns,
  items,
  columnOf,
  renderCard,
  onMove,
  onAdd,
  className,
}: {
  columns: BoardColumn[];
  items: T[];
  columnOf: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  onMove: (item: T, toColumn: string) => void;
  onAdd?: (column: string) => void;
  className?: string;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const pending = useRef<{ id: string; from: string; startX: number; startY: number; el: HTMLElement; pointer: string; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const suppressClick = useRef(false);
  const dragRef = useRef<Drag | null>(null);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  // Block page scrolling on touch while a card is lifted.
  useEffect(() => {
    const block = (e: TouchEvent) => dragRef.current && e.preventDefault();
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, []);

  const lift = (x: number, y: number) => {
    const p = pending.current;
    if (!p) return;
    const r = p.el.getBoundingClientRect();
    const item = items.find((i) => i.id === p.id);
    if (!item) return;
    navigator.vibrate?.(12);
    setDrag({ id: p.id, from: p.from, x, y, w: r.width, h: r.height, offX: x - r.left, offY: y - r.top, node: renderCard(item) });
    setOver(p.from);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = pending.current;
      if (!dragRef.current && p) {
        const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
        if (p.pointer === "mouse" && dist > 5) lift(e.clientX, e.clientY);
        else if (p.pointer !== "mouse" && dist > 8 && p.timer) {
          clearTimeout(p.timer); // user is scrolling, not dragging
          pending.current = null;
        }
        return;
      }
      if (!dragRef.current) return;
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-col]");
      setOver(el?.dataset.col ?? null);
      // Auto-scroll the board horizontally near the edges.
      const sc = scroller.current;
      if (sc) {
        const r = sc.getBoundingClientRect();
        if (e.clientX > r.right - 40) sc.scrollLeft += 14;
        else if (e.clientX < r.left + 40) sc.scrollLeft -= 14;
      }
    };
    const up = () => {
      const d = dragRef.current;
      if (pending.current?.timer) clearTimeout(pending.current.timer);
      pending.current = null;
      if (d) {
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 50);
        const target = over;
        const item = items.find((i) => i.id === d.id);
        if (item && target && target !== d.from) onMove(item, target);
      }
      setDrag(null);
      setOver(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, over, onMove]);

  return (
    <>
      <div ref={scroller} className={cn("-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 lg:mx-0 lg:snap-none lg:px-0", className)}>
        {columns.map((col) => {
          const colItems = items.filter((i) => columnOf(i) === col.id);
          return (
            <div
              key={col.id}
              data-col={col.id}
              className={cn(
                "flex w-[82vw] max-w-[320px] shrink-0 snap-start flex-col rounded-3xl border p-2 transition-colors sm:w-[300px]",
                over === col.id && drag ? "border-violet/50 bg-violet/8" : "border-line bg-surface",
              )}
            >
              <div className="flex items-center gap-2 px-2 pt-1.5 pb-2.5">
                <span className="h-2 w-2 rounded-full" style={{ background: col.color ?? "#8b5cff" }} />
                <span className="text-[13px] font-semibold">{col.title}</span>
                <span className="text-[12px] text-faint">{colItems.length}</span>
                <span className="flex-1" />
                {onAdd && (
                  <button onClick={() => onAdd(col.id)} className="grid h-7 w-7 place-items-center rounded-lg text-faint hover:bg-surface-3 hover:text-ink" aria-label={`Adicionar em ${col.title}`}>
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid min-h-24 content-start gap-2">
                {colItems.map((item) => (
                  <div
                    key={item.id}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      if ((e.target as HTMLElement).closest("button, input, a, [role=checkbox]")) return;
                      const el = e.currentTarget;
                      pending.current = { id: item.id, from: col.id, startX: e.clientX, startY: e.clientY, el, pointer: e.pointerType };
                      if (e.pointerType !== "mouse") {
                        const x = e.clientX;
                        const y = e.clientY;
                        pending.current.timer = setTimeout(() => lift(x, y), 220);
                      }
                    }}
                    onClickCapture={(e) => {
                      if (suppressClick.current) {
                        e.stopPropagation();
                        e.preventDefault();
                      }
                    }}
                    onContextMenu={(e) => drag && e.preventDefault()}
                    className={cn("select-none", drag?.id === item.id && "opacity-30")}
                    style={{ WebkitTouchCallout: "none" }}
                  >
                    {renderCard(item)}
                  </div>
                ))}
                {colItems.length === 0 && <p className="rounded-2xl border border-dashed border-line px-3 py-5 text-center text-[12px] text-faint">{col.hint ?? "Arraste para cá"}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {drag && (
        <div className="pointer-events-none fixed z-[100] rotate-2 opacity-95 shadow-2xl" style={{ left: drag.x - drag.offX, top: drag.y - drag.offY, width: drag.w }}>
          {drag.node}
        </div>
      )}
    </>
  );
}
