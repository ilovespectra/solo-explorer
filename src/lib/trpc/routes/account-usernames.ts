import { t } from "$lib/trpc/t";

import { z } from "zod";

import { VITE_HELIUS_API_KEY } from "$env/static/private";
import { Connection } from "@solana/web3.js";
import { TldParser } from "@onsol/tldparser";

interface Username {
    type: "bonfida" | "alldomains";
    username: string;
}

const getSolanaDomain = async (usernames: Username[], address = "") => {
    const url = `https://api.helius.xyz/v0/addresses/${address}/names?api-key=${VITE_HELIUS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data?.domainNames) {
        for (const domain of data.domainNames) {
            usernames.push({
                type: "bonfida",
                username: `${domain}.sol`,
            });
        }
    }
};

const getAllDomainsDomain = async (usernames: Username[], address = "") => {
    const connection = new Connection(process.env.HELIUS_API_URL as string);
    const parser = new TldParser(connection);

    await Promise.allSettled(
        ["blink", "sol", "ser", "bonk", "poor", "abc"].map(async (domain) => {
            const domains = await parser.getParsedAllUserDomainsFromTld(
                address,
                domain
            );
            for (const domain of domains) {
                usernames.push({
                    type: "alldomains",
                    username: domain.domain,
                });
            }
        })
    );
};

export const accountUsernames = t.procedure
    .input(z.string())
    .output(
        z.array(
            z.object({
                type: z.string(),
                username: z.string(),
            })
        )
    )
    .query(async ({ input: address }) => {
        const usernames: Username[] = [];
        await Promise.allSettled([
            getSolanaDomain(usernames, address),
            getAllDomainsDomain(usernames, address),
        ]);

        return usernames || [];
    });
