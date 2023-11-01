import type { EnrichedTransaction } from "helius-sdk";
import { parseTransaction } from "$lib/xray";
import { t } from "$lib/trpc/t";
import { z } from "zod";

export const transaction = t.procedure
    .input(
        z.object({
            account: z.string().optional(),
            transaction: z.string(),
        })
    )
    .query(async ({ input }) => {
        const url = `https://rpc-proxy.denverhnt.workers.dev/v0/transactions`;

        const response = await fetch(url, {
            body: JSON.stringify({
                transactions: [input?.transaction],
            }),
            method: "POST",
        });

        const [tx]: EnrichedTransaction[] = await response.json();

        const parsed = parseTransaction(tx, input?.account);

        parsed.raw = tx;

        return parsed;
    });
