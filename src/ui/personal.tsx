import { useEffect, useRef, useState } from "react";
import type { Card } from "../domain/model";
import type { Words } from "./i18n";
import { TrainCard } from "./TrainCard";
import { onlineWords } from "./onlineWords";

export function usePreference<T>(key: string, initial: T) {
  const read = () => {
    try {
      return (JSON.parse(localStorage.getItem(key) ?? "null") as T) ?? initial;
    } catch {
      return initial;
    }
  };
  const [value, setValue] = useState<T>(read);
  useEffect(() => {
    setValue(read());
  }, [key]);
  const save = (next: T) => {
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* optional preference */
    }
  };
  return [value, save] as const;
}

export function OrderedHand({
  hand,
  payment,
  onSelect,
  t,
  n,
  storageKey,
}: {
  hand: Card[];
  payment: number[];
  onSelect: (index: number) => void;
  t: Words;
  n: typeof onlineWords.zh;
  storageKey: string;
}) {
  const [saved, save] = usePreference<Card[]>(storageKey, []);
  const remaining = hand.map((_, i) => i);
  const order: number[] = [];
  for (const color of saved) {
    const at = remaining.findIndex((i) => hand[i] === color);
    if (at >= 0) order.push(remaining.splice(at, 1)[0]);
  }
  order.push(...remaining);
  const drag = useRef<number | null>(null);
  const move = (from: number, to: number) => {
    const next = [...order];
    next.splice(to, 0, next.splice(from, 1)[0]);
    save(next.map((i) => hand[i]));
  };
  return (
    <>
      <button onClick={() => save([...hand].sort())}>{n.sortCards}</button>
      <small>{n.reorderHint}</small>
      <div className="hand">
        {order.map((i, position) => (
          <div
            key={i}
            className="hand-slot"
            data-hand-position={position}
            draggable
            onDragStart={(e) => {
              drag.current = position;
              e.dataTransfer.setData("text/plain", String(position));
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (drag.current !== null) move(drag.current, position);
              drag.current = null;
            }}
            onDragEnd={() => {
              drag.current = null;
            }}
            onKeyDown={(e) => {
              if (e.altKey && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
                move(
                  position,
                  Math.max(
                    0,
                    Math.min(
                      order.length - 1,
                      position + (e.key === "ArrowLeft" ? -1 : 1),
                    ),
                  ),
                );
              }
            }}
          >
            <span
              className="card-drag-handle"
              aria-label={n.reorderHint}
              onPointerDown={(e) => {
                e.preventDefault();
                drag.current = position;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerUp={(e) => {
                const target = document
                  .elementFromPoint(e.clientX, e.clientY)
                  ?.closest<HTMLElement>("[data-hand-position]");
                if (
                  target &&
                  e.currentTarget.closest(".hand")?.contains(target) &&
                  drag.current !== null
                )
                  move(drag.current, Number(target.dataset.handPosition));
                drag.current = null;
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              ⠿
            </span>
            <TrainCard
              card={hand[i]}
              t={t}
              selected={payment.includes(i)}
              disabled={false}
              onClick={() => onSelect(i)}
            />
          </div>
        ))}
      </div>
    </>
  );
}

export function useGameSound(event: string) {
  const [enabled, save] = usePreference("erc-sound", false);
  const audio = useRef<AudioContext | null>(null);
  const previous = useRef(event);
  useEffect(() => {
    const unlock = () => {
      if (enabled) {
        audio.current ??= new AudioContext();
        void audio.current.resume();
      }
    };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, [enabled]);
  const tone = () => {
    const ctx = audio.current;
    if (!ctx || ctx.state !== "running") return;
    [440, 660].forEach((frequency, i) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        at = ctx.currentTime + i * 0.09;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.04, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.15);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.16);
    });
  };
  useEffect(() => {
    if (previous.current !== event && enabled) tone();
    previous.current = event;
  }, [event, enabled]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  return {
    enabled,
    toggle: () => {
      const next = !enabled;
      save(next);
      if (next) {
        audio.current ??= new AudioContext();
        void audio.current.resume().then(tone);
      }
    },
  };
}
