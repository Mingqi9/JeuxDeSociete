// Original schematic geography and engraving motifs, fitted to our own city
// coordinates. Neither traced from publisher artwork nor geographic GIS data.
export const continentOutline =
  "M345 246Q359 249 368 270L392 283Q425 266 463 257L495 277Q525 280 553 288L582 262Q598 251 611 263L624 290Q638 309 653 298L684 279Q710 268 728 232L757 224Q781 233 802 223L835 195Q857 185 878 205L903 196Q927 172 950 169L990 151Q1003 131 1026 131L1075 140Q1110 133 1147 109L1182 84Q1207 67 1240 78L1270 89Q1287 68 1321 77L1371 99Q1412 113 1452 95L1496 116Q1540 108 1579 128L1630 115V1095L1585 1066Q1555 1048 1534 1057L1494 1041Q1454 1057 1417 1030L1385 1038Q1341 1023 1315 1049L1280 1069Q1240 1076 1212 1087L1179 1068Q1143 1073 1115 1047L1091 1024Q1087 999 1114 976L1157 942Q1179 918 1190 883L1189 856Q1174 836 1141 817L1101 813Q1074 830 1062 854L1044 891Q1056 914 1035 935L1017 964Q996 975 985 1001L961 1016L946 992L924 986L912 954L890 920L888 898Q868 881 852 851L828 828L799 784Q780 766 748 744L728 756L711 759Q716 787 738 813L745 837L730 865L734 892L715 908L685 925L667 903L643 896L628 865L610 855L593 831Q576 813 570 788L552 751L529 728Q511 706 503 681L478 669L446 657L428 681L409 700Q380 695 350 715L312 718L278 744Q265 773 254 808L243 842L218 864L195 879L168 907Q143 925 112 922L83 939L52 937L26 913Q9 893 16 868L6 829L17 805L18 774L43 746L52 723L77 710L94 686L116 670L105 640L108 615L85 599L72 573L52 556L36 526L12 503L20 481L47 466L54 445L82 438L108 440L130 416L143 390L168 401L189 408L207 399L228 380L247 370L272 373L286 355L312 352L326 331L322 305L335 290Z";
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
      <path className="atlas-shoreline" d={continentOutline} />
      <path className="atlas-land" d={continentOutline} />
      <path
        className="atlas-land"
        d="M151 13Q166 24 191 20L205 35L224 39L217 59L238 80L220 100L224 125L214 140L229 163L211 179L204 202L222 222L219 244L232 263L214 280L191 279L174 298L150 302L144 282L157 260L135 250L114 247L127 228L142 213L132 194L116 180L131 160L126 143L139 126L120 111L128 93L115 81L126 65L127 45Z"
      />
      <path
        className="atlas-land"
        d="M80 125Q93 124 103 144L99 169L109 190L99 210L109 226L97 247L81 259L62 252L56 233L65 216L51 203L54 186L46 177L58 160L57 143Z"
      />
      <path
        className="atlas-land"
        d="M587 0H822L835 23L828 50L809 65L806 83L789 94L789 110L767 123L749 147L726 157L716 184L697 202L677 204L670 228L651 233L641 211L651 195L638 183L648 166L621 164L609 147L593 151L599 131L587 116L591 93L578 76L587 55L575 37Z"
      />
      <path
        className="atlas-land"
        d="M548 948Q565 938 584 941L604 952L628 958L635 971L615 980L594 995L575 991L567 971Z"
      />
      <path
        className="atlas-land"
        d="M502 826Q515 836 511 861L501 876L493 865L496 842ZM493 897Q507 889 518 903L514 929L499 947L487 934L488 912Z"
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
      <g className="atlas-rivers">
        <path d="M480 160Q425 270 480 355T540 530M880 280Q820 380 860 490T1020 650M1250 290Q1170 420 1240 490T1320 720" />
      </g>
      <g className="atlas-relief">
        {[
          { x: 405, y: 605, n: 12 },
          { x: 840, y: 740, n: 8 },
          { x: 1430, y: 900, n: 7 },
          { x: 105, y: 770, n: 6 },
        ].map((range, r) => (
          <g key={r}>
            {Array.from({ length: range.n }, (_, i) => (
              <path
                key={i}
                d={`M${range.x + i * 18} ${range.y + Math.sin(i * 1.7) * 11}l14 -23l15 23m-24 -5l9 -13l9 13m-9 -13v18`}
              />
            ))}
          </g>
        ))}
      </g>
      <g className="atlas-vignettes">
        <g transform="translate(330 890)">
          <path d="M-45 8H44L29 26H-29ZM-2 -52V9M-8 -47L-37 1H-8ZM5 -40L34 1H5ZM-48 31q12 -5 24 0t24 0t24 0t24 0" />
        </g>
        <g transform="translate(75 570)">
          <path d="M-25 8H30L22 20H-19ZM-8 -8H17V8H-8ZM-2 -25H5V-8H-2ZM-34 26q12 -5 24 0t24 0t24 0" />
        </g>
        <g transform="translate(470 190)">
          <path d="M-30 15H30M-22 -5H22V15H-22ZM-28 -6L0 -28L28 -6ZM-6 15V1H6V15M-17 -1H-11V5H-17ZM11 -1H17V5H11Z" />
        </g>
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
