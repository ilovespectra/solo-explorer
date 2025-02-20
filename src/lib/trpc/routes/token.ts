import { t } from "$lib/trpc/t";
import { z } from "zod";

const { HELIUS_API_KEY } = process.env;

export const token = t.procedure
    .input(z.array(z.string()))
    .query(async ({ input }) => {
        const response = await fetch(
            `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`,
            {
                body: JSON.stringify({
                    // Set to true or false based on your needs
                    disableCache: false,
                    includeOffChain: true, // Set to true or false based on your needs
                    mintAccounts: input, // Use the input array of mint accounts
                }),
                headers: {
                    Authorization: "Basic username:password", // Replace with your actual credentials
                    "Content-Type": "application/json",
                },
                method: "POST",
            }
        );

        if (!response.ok) {
            throw new Error(
                `Failed to fetch token metadata: ${response.statusText}`
            );
        }

        const json = await response.json();
        return json;
    });
