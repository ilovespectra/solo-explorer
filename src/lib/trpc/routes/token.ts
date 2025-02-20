import { t } from "$lib/trpc/t";

import { z } from "zod";

const { HELIUS_API_KEY } = process.env;

export const token = t.procedure
    .input(z.array(z.string()))
    .query(async ({ input }) => {
        const response = await fetch(
            `https://optimistic-daisy-fast-mainnet.helius-rpc.com`,
            {
                body: JSON.stringify({
                    includeOffChain: true,
                    mintAccounts: input,
                }),
                method: "POST",
            }
        );

        const json = await response.json();

        return json;
    });
