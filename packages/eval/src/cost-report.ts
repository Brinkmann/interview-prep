// Prints AI cost per free and Sprint user against the ceilings agreed in D-22.
import { CEILINGS, costPerUser } from "./cost-model";

for (const tier of ["free", "sprint"] as const) {
  const { lines, total } = costPerUser(tier);
  console.log(`\n${tier} user: US$${total.toFixed(3)} (ceiling US$${CEILINGS[tier].toFixed(2)}) ${total < CEILINGS[tier] ? "UNDER" : "OVER"}`);
  for (const l of [...lines].sort((a, b) => b.cost - a.cost)) {
    console.log(`  ${l.task.padEnd(40)} ${l.model.padEnd(18)} x${l.calls.toFixed(1).padStart(5)}  US$${l.cost.toFixed(4)}`);
  }
}
