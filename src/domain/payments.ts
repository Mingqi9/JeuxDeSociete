import { colors, type Card, type Route } from "./model";
// Candidate payments use the fewest locomotives. Ownership/phase checks belong
// to the engine. No deck or hidden opponent state is needed to plan payment.
export function matchingPayment(
  hand: Card[],
  count: number,
  color: Card | "gray",
  minimumWild = 0,
): Card[] | null {
  const choices: Card[] = color === "gray" ? [...colors, "wild"] : [color];
  for (const choice of choices) {
    const plain = choice === "wild" ? [] : hand.filter((c) => c === choice);
    const wild = hand.filter((c) => c === "wild");
    const wildCount = Math.max(minimumWild, count - plain.length);
    if (
      count >= 0 &&
      wildCount <= count &&
      wild.length >= wildCount &&
      plain.length + wildCount >= count
    )
      return [
        ...plain.slice(0, count - wildCount),
        ...wild.slice(0, wildCount),
      ];
  }
  return null;
}
export function routePayment(hand: Card[], route: Route) {
  return matchingPayment(
    hand,
    route.length,
    route.color,
    route.locomotives ?? 0,
  );
}
