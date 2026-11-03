// Original schematic geography and engraving motifs, fitted to our own city
// coordinates. Neither traced from publisher artwork nor geographic GIS data.
export const continentOutline =
  "M350 265L395 290L465 260L555 295L610 250L650 310L695 285L730 215L795 230L835 190L885 215L945 175L1020 135L1110 140L1205 85L1290 95L1395 170L1570 155L1600 385L1585 605L1620 790L1560 1025L1485 1060L1380 1025L1315 1045L1190 1090L1095 1050L1100 980L1175 915L1190 855L1140 810L1085 800L1050 860L1010 890L1015 965L965 1015L925 980L895 905L845 850L800 780L745 740L705 760L740 835L725 895L685 920L645 885L615 850L590 825L570 770L540 725L505 680L445 650L410 695L350 710L275 740L245 835L160 915L65 945L15 895L5 805L45 725L115 665L95 590L20 485L50 440L105 430L135 390L200 415L245 365L305 350Z";
export function BoardScenery({
  width,
  height,
  full,
}: {
  width: number;
  height: number;
  full: boolean;
}) {
  if (!full)
    return (
      <g className="map-decoration" aria-hidden="true">
        <path d={`M20 40H${width - 20}V${height - 30}H20Z`} />
      </g>
    );
  return (
    <g
      className="map-decoration"
      aria-hidden="true"
      transform={`scale(${width / 1630} ${height / 1105})`}
    >
      <g className="atlas-grid">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={`M${60 + i * 140} 0V1105`} />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M0 ${50 + i * 145}H1630`} />
        ))}
      </g>
      <path className="atlas-land" d={continentOutline} />
      <path
        className="atlas-land"
        d="M136 15L212 25L249 75L219 116L235 160L207 198L233 245L212 288L159 306L145 263L112 241L139 205L119 173L137 133L114 102Z"
      />
      <path
        className="atlas-land"
        d="M78 123L110 144L101 194L116 220L88 269L54 252L58 211L46 181Z"
      />
      <path
        className="atlas-land"
        d="M570 0L815 0L838 42L794 100L745 144L707 195L667 233L642 210L647 173L607 144L595 85Z"
      />
      <path
        className="atlas-land"
        d="M545 950L584 928L633 960L622 990L568 997Z"
      />
      <g className="atlas-regions">
        <path d="M65 945L15 895L5 805L45 725L115 665L275 740L245 835L160 915Z" />
        <path d="M350 265L395 290L465 260L555 295L610 250L650 310L695 285L800 450L740 540L610 580L465 540L410 420Z" />
        <path d="M800 780L745 740L705 760L590 690L610 580L740 540L900 570L990 715L1010 890L965 1015L925 980L895 905L845 850Z" />
        <path d="M1050 250L1205 85L1290 95L1395 170L1570 155L1600 385L1585 605L1450 710L1240 650L1140 490Z" />
      </g>
      <g className="atlas-borders">
        <path d="M115 665Q230 705 350 710M410 420L410 540L465 540L505 680M610 250L610 430L740 540L900 570L990 715L1085 800M1050 250L1140 490L1240 650L1450 710M705 760L800 690L990 715" />
      </g>
      <g className="atlas-mountains">
        {Array.from({ length: 9 }, (_, i) => (
          <path
            key={i}
            d={`M${400 + i * 23} ${605 - Math.sin(i) * 13}l12 -18l12 18m-16 -7l4 -4l4 4`}
          />
        ))}
      </g>
      <g className="atlas-waves">
        <path d="M22 580q12 -7 24 0t24 0m-35 18q12 -7 24 0t24 0M400 925q12 -7 24 0t24 0m-35 18q12 -7 24 0t24 0M995 75q12 -7 24 0t24 0" />
      </g>
      <g className="atlas-compass" transform="translate(420 140)">
        <circle r="34" />
        <circle r="25" />
        <path d="M0 -49L7 -7L0 49L-7 7ZM-49 0L-7 -7L49 0L7 7Z" />
        <path d="M-32 -32L32 32M32 -32L-32 32" />
      </g>
      <text className="atlas-wordmark" x="275" y="74">
        EUROPA RAIL CLUB
      </text>
    </g>
  );
}
