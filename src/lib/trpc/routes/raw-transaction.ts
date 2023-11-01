import { z } from "zod";
import { t } from "$lib/trpc/t";
import { connect } from "$lib/xray";

// Remove the API key since we're using a proxy URL
// const { HELIUS_API_KEY } = process.env;

export const rawTransaction = t.procedure
    .input(z.string())
    .query(async ({ input }) => {
        const connection = connect(
            "mainnet",
            "https://rpc-proxy.denverhnt.workers.dev"
        );

        const transaction = await connection.getTransaction(input, {
            maxSupportedTransactionVersion: 0,
        });

        return {
            transaction,
        };
    });
