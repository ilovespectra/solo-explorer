<style>
    .comment {
        transition: transform 0.3s ease;
    }

    .comment:hover {
        transform: scale(1.1);
    }
    .comment-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        max-width: 80vh;
        text-align: left;
        transition: transform 0.3s ease;
        font-size: medium;
    }

    .comment-content:hover {
        transform: scale(1.1);
    }

    .comment-date {
        font-size: small;
        align-self: flex-start;
    }
    .bullish {
        background-color: rgb(101, 152, 101);
    }

    .bearish {
        background-color: rgb(167, 93, 93);
    }

    .neutral {
        background-color: rgb(98, 98, 98);
    }
</style>

<script lang="ts">
    import type { ProtonTransaction } from "$lib/xray";
    import { onMount, onDestroy, afterUpdate } from "svelte";
    import { page } from "$app/stores";
    import { fly } from "svelte/transition";
    import { trpcWithQuery } from "$lib/trpc/client";
    import Account from "$lib/components/account-data.svelte";
    import shortenAddress from "$lib/util/shorten-string";
    import CopyButton from "$lib/components/copy-button.svelte";
    import IconCard from "$lib/components/icon-card.svelte";
    import Icon from "$lib/components/icon.svelte";
    import JSON from "$lib/components/json.svelte";
    import LogMessages from "$lib/components/log-messages.svelte";
    import Transaction from "$lib/components/transaction.svelte";
    import Collapse from "$lib/components/collapse.svelte";
    import { writable } from "svelte/store";
    import Search from "$lib/components/search.svelte";
    import { initializeApp } from "firebase/app";
    import {
        getFirestore,
        collection,
        doc,
        setDoc,
        serverTimestamp,
        query,
        where,
        getDocs,
    } from "firebase/firestore";

    import { walletStore } from "@svelte-on-solana/wallet-adapter-core";
    const comments = writable<{ comment: string }[]>([]);
    const publicKey = $walletStore.publicKey;
    import { type SearchResult, search, connect } from "$lib/xray";

    type SearchResultType =
        | "token"
        | "account"
        | "transaction"
        | "bonfida-domain"
        | "ans-domain"
        | "backpack-username"
        | null;

    interface SearchResult {
        url: string;
        address: string;
        type: SearchResultType;
        valid: boolean;
        search: string;
    }

    // Firebase configuration
    const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    };
    const app = initializeApp(firebaseConfig);

    let animate = false;

    const signature = $page.params.tx;

    const client = trpcWithQuery($page);

    const formatDate = (timestamp) => {
        const date = new Date(timestamp.toDate()); // Convert Firestore timestamp to JavaScript Date object
        const options = {
            day: "numeric",
            hour: "numeric",
            hour12: true,
            minute: "numeric",
            month: "numeric",
            year: "2-digit",
        };
        return date.toLocaleString("en-US", options).replace(",", " -");
    };

    $: sortedEntries = $comments.sort(
        (a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()
    );

    const transaction = client.transaction.createQuery({
        account: $page.url.searchParams
            .get("ref")
            ?.split("@")
            .reduce(
                (acc, ref) =>
                    ref.startsWith("wallet") ? ref.split(":")[1] : acc,
                ""
            ),
        transaction: signature || "",
    });
    let fetchPublicKeyInterval: NodeJS.Timer;
    let fetchCommentsInterval: number;
    let isWalletConnected = $walletStore.publicKey !== null;
    $: isWalletConnected = publicKey !== null;
    const fetchPublicKey = () => {
        const wallet = $walletStore;
        const publicKey = wallet.publicKey;

        if (!publicKey) {
            return;
        }
    };
    const rawTransaction = client.rawTransaction.createQuery(signature || "");

    function initiateSearch(address: string) {
        // Call the searchComment function
        searchComment(address);
    }

    afterUpdate(() => {
        // Update isWalletConnected after each update
        isWalletConnected = $walletStore.publicKey !== null;
    });

    onMount(() => {
        animate = true;
    });

    $: data = $transaction?.data
        ? ($transaction.data as ProtonTransaction)
        : null;

    $: rawData = $rawTransaction?.data;

    $: ({ raw, ...rest } = data || { raw: null });

    const comment = writable("");
    let displayedComments: { comment: string }[] = [];

    // Define an interface to represent the comment structure
    interface Comment {
        comment: string;
        // Add other fields and their types if present in the comment data
        // For example: timestamp: Date;
    }

    export const searchComment = async (address: string) => {
        try {
            const response = await fetch(`/api/search/${address}`);
            const data = await response.json();

            if (data.valid && data.url) {
                window.open(data.url, "_blank");
            } else {
                // console.error('Invalid response or no URL');
            }
        } catch (error) {
            // console.error('Error handling comment click:', error);
        }
    };

    const handleCommentClick = async (address) => {
        try {
            const response = await searchComment(address);
            const result = JSON.parse(response);

            if (result.valid && result.url) {
                window.open(result.url, "_blank");
            } else {
                // console.error('Invalid response or no URL');
            }
        } catch (error) {
            // console.error('Error handling comment click:', error);
        }
    };

    const fetchComments = async () => {
        const db = getFirestore(app);
        const wallet = $walletStore;
        const publicKey = wallet.publicKey;

        if (!publicKey) {
            return;
        }

        try {
            const collections = ["txcomment", "tokencomment", "actcomment"];
            const queryPromises = collections.map((collectionName) =>
                query(
                    collection(db, collectionName),
                    where("walletPublicKey", "==", publicKey.toBase58())
                )
            );

            const querySnapshots = await Promise.all(
                queryPromises.map(getDocs)
            );

            // Define allComments as an array of Comment type
            let allComments: Comment[] = [];
            querySnapshots.forEach((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    const commentData = doc.data() as Comment;
                    allComments.push(commentData);
                });
            });

            comments.set(allComments);
        } catch (error) {
            // console.error("Error fetching comments:", error);
        }
    };

    $: {
        if (isWalletConnected) {
            fetchComments();
            fetchPublicKey();
        }
    }

    onMount(() => {
        fetchComments();
        fetchPublicKey();

        return () => {
            clearInterval(fetchCommentsInterval);
            // Add clearInterval for other intervals if any
        };
    });
</script>

<div class="content mb-4 mt-4 flex justify-between px-3">
    <!-- <h1 class="text-xl font-bold lowercase">view entries</h1> -->
    <div
        class="flex"
        on:click|preventDefault
        on:keydown|preventDefault
    >
        <CopyButton
            success=""
            text={$page.params.search}
        />
        <CopyButton
            icon="link"
            success=""
            text={$page.url.href}
        />
    </div>
</div>

{#if animate}
    {#if $comments.length > 0}
        <div
            in:fly={{
                delay: 500,
                duration: 1000,
                opacity: 0,
                y: 50,
            }}
            class="content pl-2 md:pl-0"
        >
            <div
                class="mb-5grid mb-3 ml-3 mr-3 mt-3 items-center gap-3 rounded-lg border p-1 py-3"
            >
                <h2
                    class="mb-5 ml-10 text-lg font-semibold lowercase md:text-sm"
                >
                    <b>click to view original comment</b>
                </h2>

                {#if isWalletConnected}
                    <!-- <textarea
                        class="text-input mt-5 ml-10"
                        placeholder="type your comment here"
                        bind:value={$comment} 
                        style="background-color: #696969"
                    ></textarea><br> -->
                    <!-- <button class="btn lowercase mb-10 mt-5 ml-10" on:click={submitComment}>Submit Comment</button> -->
                {:else}
                    <p class="ml-10 text-gray-500">
                        connect your wallet to view comments.
                    </p>
                {/if}

                {#each $comments as comment (comment.timestamp)}
                    <!-- Determine class based on sentiment -->
                    {#if comment.sentiment === "bullish"}
                        <div
                            class="comment-content bullish badge mb-3 ml-5 mr-5 px-3"
                            on:click={() => initiateSearch(comment.account)}
                            style="width: 100%;"
                        >
                            <p>
                                <i class="comment-date"
                                    >{formatDate(comment.timestamp)}</i
                                ><br />{comment.comment}
                            </p>
                        </div>
                    {:else if comment.sentiment === "bearish"}
                        <div
                            class="comment-content bearish badge mb-3 ml-5 mr-5 px-3"
                            on:click={() => initiateSearch(comment.account)}
                            style="width: 100%;"
                        >
                            <p>
                                <i class="comment-date"
                                    >{formatDate(comment.timestamp)}</i
                                ><br />{comment.comment}
                            </p>
                        </div>
                    {:else}
                        <div
                            class="comment-content neutral badge mb-3 ml-5 mr-5 px-3"
                            on:click={() => initiateSearch(comment.account)}
                            style="width: 100%;"
                        >
                            <p>
                                <i class="comment-date"
                                    >{formatDate(comment.timestamp)}</i
                                ><br />{comment.comment}
                            </p>
                        </div>
                    {/if}
                {/each}
            </div>
        </div>
    {:else}
        <!-- If there are no comments -->
        <h2 class="mb-5 ml-10 text-lg font-semibold lowercase md:text-sm">
            No comments
        </h2>
    {/if}
{/if}
