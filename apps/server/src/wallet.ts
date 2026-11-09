import { eq, sql } from 'drizzle-orm';
import { db, schema } from './db';

type TxType = (typeof schema.chipTxType.enumValues)[number];

export class InsufficientChips extends Error {
  constructor() { super('Not enough chips.'); }
}

/**
 * Atomically changes a player's chips and writes a ledger row.
 * Negative amounts fail (InsufficientChips) instead of going below zero.
 */
export async function moveChips(playerId: string, amount: number, type: TxType, opts: { note?: string; adminId?: string; tableCode?: string } = {}) {
  return db.transaction(async (tx) => {
    const [row] = await tx.update(schema.players)
      .set({ chips: sql`${schema.players.chips} + ${amount}` })
      .where(amount < 0 ? sql`${schema.players.id} = ${playerId} and ${schema.players.chips} >= ${-amount}` : eq(schema.players.id, playerId))
      .returning({ chips: schema.players.chips });
    if (!row) throw new InsufficientChips();
    await tx.insert(schema.chipTxs).values({ playerId, amount, balanceAfter: row.chips, type, note: opts.note, adminId: opts.adminId, tableCode: opts.tableCode });
    return row.chips;
  });
}
