// Original SVG print finishes. No bitmap textures or publisher board assets.
export function BoardFinish({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-sea`} x2=".8" y2="1">
        <stop stopColor="#c2d9df" />
        <stop offset=".5" stopColor="#dfebea" />
        <stop offset="1" stopColor="#a9c7d0" />
      </linearGradient>
      <radialGradient id={`${id}-land`} cx=".4" cy=".35" r=".8">
        <stop stopColor="#fff7dc" />
        <stop offset=".62" stopColor="#ecdbb6" />
        <stop offset="1" stopColor="#c6a475" />
      </radialGradient>
      <radialGradient id={`${id}-city`} cx=".3" cy=".25">
        <stop stopColor="#fffbd5" />
        <stop offset=".3" stopColor="#ffda64" />
        <stop offset=".72" stopColor="#db8c23" />
        <stop offset="1" stopColor="#a84b22" />
      </radialGradient>
      <linearGradient id={`${id}-frame`} x2="1" y2="1">
        <stop stopColor="#756045" />
        <stop offset=".25" stopColor="#cba76d" />
        <stop offset=".6" stopColor="#87603c" />
        <stop offset="1" stopColor="#d6ba88" />
      </linearGradient>
      <pattern
        id={`${id}-grain`}
        width="160"
        height="160"
        patternUnits="userSpaceOnUse"
      >
        {Array.from({ length: 64 }, (_, i) => {
          const x = (i * 43 + 17) % 160,
            y = (i * 71 + 29) % 160;
          return (
            <path
              key={i}
              d={`M${x} ${y}l${2 + (i % 5)} ${(i % 3) - 1}`}
              stroke={i % 3 ? "#795f3d" : "#fffdf0"}
              strokeWidth={i % 2 ? ".5" : "1"}
              opacity={i % 3 ? ".13" : ".55"}
            />
          );
        })}
        <path
          d="M0 40L40 0M0 110L110 0M50 160L160 50M120 160L160 120"
          stroke="#947950"
          strokeWidth=".4"
          opacity=".09"
        />
      </pattern>
    </defs>
  );
}
