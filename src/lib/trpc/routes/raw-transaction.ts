import { z } from "zod";
import { t } from "$lib/trpc/t";
import { connect } from "$lib/xray";

// Use the API key from the environment variables
const { VITE_HELIUS_API_KEY } = process.env;

// Define the types for GetTransactionConfig or GetVersionedTransactionConfig
type GetTransactionConfig = {
    headers: {
        Authorization: string;
    };
    maxSupportedTransactionVersion: number;
};

export const rawTransaction = t.procedure
    .input(z.string())
    .query(async ({ input }) => {
        const connection = connect(
            "mainnet",
            "https://rpc-proxy.denverhnt.workers.dev"
        );

        // Create a valid config object
        const config: GetTransactionConfig = {
            headers: {
                Authorization: `Bearer ${VITE_HELIUS_API_KEY}`,
            },
            maxSupportedTransactionVersion: 0,
        };

        const transaction = await connection.getTransaction(input, config);

        return {
            transaction,
        };
    });
