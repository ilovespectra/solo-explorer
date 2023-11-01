import { t } from "$lib/trpc/t";
import { z } from "zod";

export const token = t.procedure
    .input(z.array(z.string()))
    .query(async ({ input }) => {
        const response = await fetch(
            `https://rpc-proxy.denverhnt.workers.dev/v0/token-metadata/`,
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
