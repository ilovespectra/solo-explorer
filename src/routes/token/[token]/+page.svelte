<style>
    .nav::before {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        height: 100%;
        width: 100vw;
        transform: translate(-50%, 0);
        background-color: black;
    }

    .img {
        max-height: 50vh;
        max-width: 100%;
    }
    input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        width: 16px;
        height: 16px;
        border: 1px solid #a0aec0;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
        position: relative;
        transition: background-color 0.3s;
    }
    input[type="checkbox"]:checked {
        background-color: #a0aec0;
    }
    input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        width: 20px;
        height: 20px;
        border: 2px solid #ccc;
        border-radius: 4px;
        outline: none;
        cursor: pointer;
    }
    input[type="checkbox"]:checked {
        background-color: grey;
    }
</style>

<script lang="ts">
    import { page } from "$app/stores";
    import basisPointsToPercentage from "$lib/util/percentage";
    import shortenString from "$lib/util/shorten-string";
    import { cubicOut } from "svelte/easing";
    import { PROGRAM_ID as ACCOUNT_COMPRESSION_ID } from "@solana/spl-account-compression";
    import { fade, fly } from "svelte/transition";
    import { onMount, onDestroy, afterUpdate } from "svelte";
    import Collapse from "$lib/components/collapse.svelte";
    import JSON from "$lib/components/json.svelte";
    import { trpcWithQuery } from "$lib/trpc/client";
    import Transactions from "$lib/components/transactions.svelte";
    import { walletStore } from "@svelte-on-solana/wallet-adapter-core";
    import PageLoader from "./_loader.svelte";

    import CopyButton from "$lib/components/copy-button.svelte";
    import TokenProvider from "$lib/components/providers/token-provider.svelte";

    const address = $page.params.token;
    const client = trpcWithQuery($page);

    import { writable } from "svelte/store";
    import { initializeApp } from "firebase/app";
    import {
        getFirestore,
        collection,
        deleteDoc,
        doc,
        setDoc,
        serverTimestamp,
        query,
        where,
        getDocs,
    } from "firebase/firestore";

    const account = $page.params.account;
    const accountInfo = client.accountInfo.createQuery(account);

    const sentiment = writable("");
    const comments = writable<{ comment: string }[]>([]);
    const wallet = $walletStore;
    let publicKey = wallet.publicKey;
    let fetchCommentsInterval: number;
    let fetchPublicKeyInterval: NodeJS.Timer;
    let isWalletConnected = $walletStore.publicKey !== null;
    $: isWalletConnected = publicKey !== null;
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

    const signature = $page.params.token;

    const props = { account, link: $page.url.href, publicKey };
    const params = new URLSearchParams(window.location.search);
    const network = params.get("network");
    const isMainnetValue = network === "mainnet";

    // Wallet and comment-related variables
    // const { publicKey } = useWallet();
    const comment = writable("");
    let displayedComments: { comment: string }[] = [];

    afterUpdate(() => {
        // Update isWalletConnected after each update
        isWalletConnected = $walletStore.publicKey !== null;
    });

    const fetchPublicKey = () => {
        const wallet = $walletStore;
        const publicKey = wallet.publicKey;

        if (!publicKey) {
            return;
        }
    };

    const fetchAndMapComments = async () => {
        const db = getFirestore(app);
        const commentsRef = collection(db, "tokencomment");

        try {
            const querySnapshot = await getDocs(commentsRef);
            const fetchedComments = querySnapshot.docs.map((doc) => ({
                data: doc.data(),
                id: doc.id,
            }));

            // Compare fetched comments with displayed comments and assign IDs
            displayedComments = displayedComments.map((displayedComment) => {
                const matchingComment = fetchedComments.find(
                    (fetchedComment) =>
                        fetchedComment.data.comment === displayedComment.comment
                );

                if (matchingComment) {
                    return {
                        ...displayedComment,
                        id: matchingComment.id,
                    };
                }

                return displayedComment;
            });
        } catch (error) {
            // console.error("Error fetching and mapping comments:", error);
        }
    };

    const fetchComments = async () => {
        const db = getFirestore(app);
        const commentsRef = collection(db, "tokencomment");

        const wallet = $walletStore;
        const publicKey = wallet.publicKey;

        if (!publicKey) {
            return;
        }

        const commentsQuery = query(
            commentsRef,
            where("account", "==", signature)
        );

        try {
            const querySnapshot = await getDocs(commentsQuery);

            const newComments: { comment: string; walletPublicKey: string }[] =
                querySnapshot.docs
                    .map(
                        (doc) =>
                            doc.data() as {
                                comment: string;
                                walletPublicKey: string;
                            }
                    )
                    .filter(
                        (comment) =>
                            comment.walletPublicKey === publicKey.toBase58()
                    )
                    .filter((comment) => {
                        const isDisplayed = displayedComments.some(
                            (displayedComment) =>
                                displayedComment.comment === comment.comment
                        );
                        return !isDisplayed;
                    });

            // Add the new comments to the displayed comments list
            displayedComments = displayedComments.concat(newComments);

            // Update the comments store
            comments.update((currentComments) => [
                ...currentComments,
                ...newComments,
            ]);
        } catch (error) {
            // Handle any errors if necessary
        }
    };

    onMount(() => {
        fetchComments();
        fetchPublicKey();

        return () => {
            clearInterval(fetchCommentsInterval);
        };
    });

    onDestroy(() => {
        clearInterval(fetchCommentsInterval);
        clearInterval(fetchPublicKeyInterval);
    });

    let checkboxSentiment = "";
    $: {
        if (checkboxSentiment === "") {
            sentiment.set("neutral");
        } else {
            sentiment.set(checkboxSentiment);
        }
    }

    const submitComment = async () => {
        const commentText = $comment;
        let selectedSentiment = checkboxSentiment;
        // If no sentiment checkbox is selected, set it to 'neutral'
        if (selectedSentiment === "") {
            selectedSentiment = "neutral";
        }
        if (commentText) {
            const db = getFirestore(app);
            const commentsRef = collection(db, "tokencomment");

            const wallet = $walletStore;
            const publicKey = wallet.publicKey;

            if (!publicKey) {
                return;
            }

            const docRef = doc(commentsRef);

            try {
                await setDoc(docRef, {
                    account: signature,
                    comment: commentText,
                    sentiment: selectedSentiment,
                    timestamp: serverTimestamp(),
                    walletPublicKey: publicKey.toBase58(),
                });
                comment.set("");
                fetchComments();
            } catch (error) {
                // Handle the error if necessary
            }
        }
    };

    const handleCheckbox = (value) => {
        if (checkboxSentiment === value) {
            checkboxSentiment = ""; // If the same checkbox is clicked again, unselect it
            sentiment.set("neutral"); // Set sentiment to neutral when unselecting the checkbox
        } else {
            checkboxSentiment = value; // Select the clicked checkbox
            sentiment.set(value); // Set sentiment to the clicked value
        }
    };
    // Update the sentiment value when checkbox changes
    const updateSentiment = (value) => {
        checkboxSentiment = value === checkboxSentiment ? "" : value;
        sentiment.set(checkboxSentiment === "" ? "neutral" : checkboxSentiment);
    };

    const removeComment = async (
        comment: { comment: string },
        index: number
    ) => {
        try {
            // console.log(`Deleting comment: ${comment.comment}`);

            const db = getFirestore(app);
            const commentsRef = collection(db, "tokencomment");

            const querySnapshot = await getDocs(commentsRef);
            const docs = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            const commentToDelete = docs.find(
                (doc) => doc.comment === comment.comment
            );

            if (commentToDelete) {
                await deleteDoc(doc(db, "tokencomment", commentToDelete.id));

                // Update displayedComments after successful deletion
                displayedComments = displayedComments.filter(
                    (displayedComment) =>
                        displayedComment.comment !== comment.comment
                );

                // Update the comments store
                comments.update((currentComments) =>
                    currentComments.filter(
                        (currentComment) =>
                            currentComment.comment !== comment.comment
                    )
                );
            }
        } catch (error) {
            // console.error('Error removing comment:', error);
        }
    };

    $: {
        if (isWalletConnected) {
            fetchComments();
            fetchPublicKey();
        }
    }

    let commenter = "";
    $: {
        if (isWalletConnected) {
            commenter = $walletStore.publicKey?.toBase58() || "";
        }
    }
</script>

<TokenProvider
    {address}
    let:metadata
    let:tokenIsLoading
>
    {#if tokenIsLoading}
        <div class="content">
            <PageLoader />
        </div>
    {:else}
        <div
            class="nav content sticky top-14 z-30 bg-base-100 px-3 py-2 lowercase"
        >
            <div
                class="relative flex flex-wrap items-center justify-between bg-base-100"
            >
                <div>
                    <h3 class="m-0 text-xl font-bold md:text-3xl">
                        {metadata.name}
                    </h3>
                </div>

                <div>
                    <div class="my-2">
                        <CopyButton text={$page.params.search} />
                        <CopyButton
                            text={$page.url.href}
                            icon="link"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div class="content px-3 lowercase">
            <div
                class="flex flex-col items-center justify-center"
                in:fade={{ delay: 100, duration: 800 }}
            >
                <img
                    class="img m-auto my-3 h-auto w-full rounded-md object-contain lowercase"
                    alt="token symbol"
                    src={metadata.image}
                    in:fade={{ delay: 600, duration: 1000 }}
                />
            </div>

            <div
                class="mb-5grid mb-3 ml-3 mr-3 mt-3 items-center gap-3 rounded-lg border p-1 py-3"
            >
                <h2 class="ml-10 text-lg font-semibold lowercase md:text-sm">
                    <b>add token comment</b>
                </h2>

                {#if isWalletConnected}
                    <div
                        class="mx-3 mb-5 mt-3 flex items-center justify-between rounded-lg border"
                    >
                        <div class="tabs w-full pt-1 lowercase md:w-auto">
                            <div />
                            <a
                                href={`/account/${commenter}`}
                                class="tab tab-bordered"
                                class:tab-active={$page.url.pathname.endsWith(
                                    `${commenter}`
                                )}>transactions</a
                            >
                            <a
                                href={`/account/${commenter}/tokens`}
                                class="tab tab-bordered"
                                class:tab-active={$page.url.pathname.endsWith(
                                    "/tokens"
                                )}>tokens</a
                            >
                            <a
                                href={`/account/${commenter}/assets?network=${
                                    isMainnetValue ? "mainnet" : "devnet"
                                }`}
                                class="tab tab-bordered"
                                class:tab-active={$page.url.pathname.endsWith(
                                    "/assets"
                                )}>assets</a
                            >
                            <a
                                href={`/account/${commenter}/journal`}
                                class="tab tab-bordered"
                                class:tab-active={$page.url.pathname.endsWith(
                                    "/journal"
                                )}>journal</a
                            >
                            <a
                                href={`/account/${commenter}/view`}
                                class="tab tab-bordered"
                                class:tab-active={$page.url.pathname.endsWith(
                                    "/view"
                                )}>comments</a
                            >

                            {#if $accountInfo?.data?.value?.owner === ACCOUNT_COMPRESSION_ID.toBase58()}
                                <a
                                    href={`/account/${$walletStore.publicKey}/concurrent-merkle-tree`}
                                    class="tab tab-bordered"
                                    class:tab-active={$page.url.pathname.endsWith(
                                        "concurrent-merkle-tree"
                                    )}>Concurrent Merkle Tree</a
                                >
                            {/if}
                        </div>
                        <!-- {#if !$page.url.pathname.endsWith("/tokens") && !$page.url.pathname.endsWith("/assets")}
                <button
                    class="btn-ghost btn-sm btn"
                    on:click={() => showModal("TRANSACTION_FILTER")}
                >
                    <Icon id="settings" />
                </button>
            {/if} -->
                    </div>
                    <textarea
                        class="text-input ml-10 mt-5"
                        placeholder="type your comment here"
                        bind:value={$comment}
                        style="background-color: #696969"
                    />
                    <br />

                    <!-- Checkboxes for bullish and bearish sentiments -->
                    <div class="ml-10 mt-5 flex items-center">
                        <label class="mr-5 flex items-center">
                            <input
                                type="checkbox"
                                checked={checkboxSentiment === "bullish"}
                                value="bullish"
                                on:change={() => handleCheckbox("bullish")}
                            />
                            <span class="ml-2 text-green-500">&#8593;</span>
                        </label>
                        <label class="flex items-center">
                            <input
                                type="checkbox"
                                checked={checkboxSentiment === "bearish"}
                                value="bearish"
                                on:change={() => handleCheckbox("bearish")}
                            />
                            <span class="ml-2 text-red-500">&#8595;</span>
                        </label>
                    </div>
                    <button
                        class="btn mb-10 ml-10 mt-5 lowercase"
                        on:click={submitComment}
                    >
                        submit comment
                    </button>
                {:else}
                    <p class="ml-10 text-gray-500">
                        connect your wallet to comment on this token.
                    </p>
                {/if}

                {#if $comments.length > 0}
                    {#each $comments as comment, index}
                        <div
                            class="badge mb-3 ml-5 mr-5 flex items-center px-3"
                        >
                            {#if comment.sentiment === "bullish"}
                                <span class="mr-2 text-green-500">&#8593;</span>
                            {:else if comment.sentiment === "bearish"}
                                <span class="mr-2 text-red-500">&#8595;</span>
                            {/if}
                            <p class="text-base">{comment.comment}</p>
                            <button
                                on:click={() => removeComment(comment, index)}
                                class="ml-2 text-gray-500 transition-colors hover:text-black"
                            >
                                X
                            </button>
                        </div>
                    {/each}
                {:else}
                    <div class="ml-5 mt-5">
                        <p>no comments available.</p>
                    </div>
                {/if}
            </div>
            {#if metadata.description}
                <div class="mt-3">
                    <div
                        class="mt-3"
                        in:fly={{
                            delay: 100,
                            easing: cubicOut,
                            y: 50,
                        }}
                    >
                        <Collapse
                            sectionTitle="Description"
                            iconId="person"
                            showDetails={true}
                        >
                            <p>{metadata.description}</p>
                        </Collapse>
                    </div>
                    {#if metadata.collectionKey}
                        <TokenProvider
                            address={metadata.collectionKey}
                            let:metadata
                        >
                            {#if metadata.name}
                                <div
                                    class="mt-3"
                                    in:fly={{
                                        delay: 200,
                                        easing: cubicOut,
                                        y: 50,
                                    }}
                                >
                                    <Collapse
                                        sectionTitle="Collection"
                                        iconId="collection"
                                        showDetails={true}
                                    >
                                        <p>
                                            {metadata.name
                                                ? metadata.name
                                                : "Unknown"}
                                        </p>
                                    </Collapse>
                                </div>
                            {/if}
                        </TokenProvider>
                    {/if}
                </div>
            {/if}
            {#if metadata.attributes && metadata.attributes.length}
                <div
                    class="mt-3"
                    in:fly={{
                        delay: 300,
                        easing: cubicOut,
                        y: 50,
                    }}
                >
                    <Collapse
                        sectionTitle="Properties"
                        iconId="attributes"
                        showDetails
                    >
                        <div class="flex flex-wrap gap-2">
                            {#each metadata.attributes as attribute, idx}
                                <div class="card p-0">
                                    <h4
                                        class="text-sm font-medium uppercase text-gray-500"
                                    >
                                        {attribute.trait_type ||
                                            attribute.traitType}
                                    </h4>
                                    <p class="text-sm">
                                        {attribute.value}
                                    </p>
                                </div>
                            {/each}
                        </div>
                    </Collapse>
                </div>
            {/if}

            {#if metadata.sellerFeeBasisPoints}
                <div
                    class="mt-3"
                    in:fly={{
                        delay: 300,
                        easing: cubicOut,
                        y: 50,
                    }}
                >
                    <Collapse
                        sectionTitle="Creator Royalties"
                        sectionAditionalInfo={basisPointsToPercentage(
                            metadata.sellerFeeBasisPoints
                        )}
                        iconId="percentage"
                    >
                        <p>
                            {metadata.name ?? "The"} creator(s) currently expect
                            to take {basisPointsToPercentage(
                                metadata.sellerFeeBasisPoints
                            )} of every secondary sale on this piece.
                        </p>
                    </Collapse>
                </div>
            {/if}
            {#if metadata.owner}
                <div
                    class="mt-3"
                    in:fly={{ delay: 300, easing: cubicOut, y: 50 }}
                >
                    <Collapse
                        sectionTitle="Ownership"
                        iconId="key"
                    >
                        <div class="flex flex-wrap gap-2">
                            <a
                                class="card p-0"
                                href="/account/{metadata.owner}"
                            >
                                <header
                                    class="flex items-center justify-between gap-6 text-sm font-medium uppercase text-gray-500"
                                >
                                    <h4>Owner</h4>
                                </header>
                                <p class="text-sm">
                                    {shortenString(metadata.owner)}
                                </p>
                            </a>
                            <div class="card p-0">
                                <h4
                                    class="text-sm font-medium lowercase text-gray-500"
                                >
                                    Mutable
                                </h4>
                                <p class="text-sm">
                                    {metadata.mutable ? "true" : "false"}
                                </p>
                            </div>
                            <div class="card p-0">
                                <h4
                                    class="text-sm font-medium lowercase text-gray-500"
                                >
                                    Frozen
                                </h4>
                                <p class="text-sm">
                                    {metadata.frozen ? "true" : "false"}
                                </p>
                            </div>
                            {#if metadata.delegate}
                                <a
                                    class="card p-0"
                                    href="/account/{metadata.owner}"
                                >
                                    <header
                                        class="flex items-center justify-between gap-6 text-sm font-medium uppercase text-gray-500"
                                    >
                                        <h4>Delegate</h4>
                                    </header>
                                    <p class="text-sm">
                                        {shortenString(metadata.delegate)}
                                    </p>
                                </a>
                            {:else}
                                <div class="card p-0">
                                    <h4
                                        class="text-sm font-medium uppercase text-gray-500"
                                    >
                                        Delegate
                                    </h4>
                                    <p class="text-sm">false</p>
                                </div>
                            {/if}
                        </div>
                    </Collapse>
                </div>
            {/if}
            {#if metadata.creators && metadata.creators.length > 0}
                <div
                    class="mt-3"
                    in:fly={{
                        delay: 300,
                        easing: cubicOut,
                        y: 50,
                    }}
                >
                    <Collapse
                        sectionTitle="Creators"
                        sectionAditionalInfo={metadata.creators.length}
                        iconId="creator"
                    >
                        <div class="flex flex-wrap gap-2">
                            {#each metadata.creators as creator, idx}
                                <a
                                    class="card p-0"
                                    href="/account/{creator.address}"
                                >
                                    <header
                                        class="flex items-center justify-between gap-6 text-sm font-medium text-gray-500"
                                    >
                                        <h4>
                                            CREATOR {idx + 1}
                                        </h4>
                                        <abbr
                                            title={`Creator ${
                                                idx + 1
                                            } royalties percentage`}
                                        >
                                            <h4>
                                                {creator.share}%
                                            </h4>
                                        </abbr>
                                    </header>
                                    <p class="text-sm">
                                        {shortenString(creator.address)}
                                    </p>
                                </a>
                            {/each}
                        </div>
                    </Collapse>
                </div>
            {/if}
            {#if metadata.compressed}
                <div
                    class="mt-3"
                    in:fly={{
                        delay: 300,
                        easing: cubicOut,
                        y: 50,
                    }}
                >
                    <Collapse
                        sectionTitle="Compression"
                        iconId="tree"
                    >
                        <div class="flex flex-wrap gap-2">
                            <a
                                class="card p-0"
                                href="/account/{metadata.tree}/concurrent-merkle-tree"
                            >
                                <header
                                    class="flex items-center justify-between gap-6 text-sm font-medium uppercase text-gray-500"
                                >
                                    <h4>Tree ID</h4>
                                </header>
                                <p class="text-sm">
                                    {shortenString(metadata.tree)}
                                </p>
                            </a>
                            <div class="flex flex-wrap gap-2">
                                <div class="card p-0">
                                    <h4
                                        class="text-sm font-medium uppercase text-gray-500"
                                    >
                                        Sequence
                                    </h4>
                                    <p class="text-sm">
                                        {metadata.seq?.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <div class="card p-0">
                                    <h4
                                        class="text-sm font-medium uppercase text-gray-500"
                                    >
                                        Leaf ID
                                    </h4>
                                    <p class="text-sm">
                                        {metadata.leafId?.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <div class="card p-0">
                                    <h4
                                        class="text-sm font-medium uppercase text-gray-500"
                                    >
                                        Data Hash
                                    </h4>
                                    <p class="text-sm">
                                        {metadata.dataHash}
                                    </p>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <div class="card p-0">
                                    <h4
                                        class="text-sm font-medium uppercase text-gray-500"
                                    >
                                        Asset Hash
                                    </h4>
                                    <p class="text-sm">
                                        {metadata.assetHash}
                                    </p>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <div class="card p-0">
                                    <h4
                                        class="text-sm font-medium uppercase text-gray-500"
                                    >
                                        Creator Hash
                                    </h4>
                                    <p class="text-sm">
                                        {metadata.creatorHash}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Collapse>
                </div>
            {/if}
            <div class="mt-3 pl-2 md:pl-0">
                <Transactions account={address} />
            </div>
            <div class="mt-3">
                <JSON
                    data={metadata}
                    label="token"
                />
            </div>
        </div>
    {/if}
</TokenProvider>
