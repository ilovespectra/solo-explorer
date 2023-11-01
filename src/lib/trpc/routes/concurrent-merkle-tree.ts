import { t } from "$lib/trpc/t";
import { connect } from "$lib/xray";
import { ConcurrentMerkleTreeAccount } from "@solana/spl-account-compression";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

// Remove the API key since we're using a proxy URL
// const { HELIUS_API_KEY } = process.env;

export const concurrentMerkleTree = t.procedure
    .input(z.string())
    .query(async ({ input: address }) => {
        const connection = connect(
            "mainnet",
            "https://rpc-proxy.denverhnt.workers.dev"
        );
        const pubkey = new PublicKey(address);
        const cmt = await ConcurrentMerkleTreeAccount.fromAccountAddress(
            connection,
            pubkey
        );

        const authority = cmt.getAuthority();
        const root = cmt.getCurrentRoot();
        const seq = cmt.getCurrentSeq().toString();
        const canopyDepth = cmt.getCanopyDepth();
        const maxBufferSize = cmt.getMaxBufferSize();
        const treeHeight = cmt.getMaxDepth();
        const creationSlot = cmt.getCreationSlot().toNumber();
        const rightMostIndex = cmt.tree.rightMostPath.index;

        return {
            authority,
            canopyDepth,
            creationSlot,
            maxBufferSize,
            rightMostIndex,
            root,
            seq,
            treeHeight,
        };
    });
