<script lang="ts">
    import { page } from "$app/stores";
    import { onMount, onDestroy } from "svelte";
    import AccountHeader from "$lib/components/account-header.svelte";
    import { showModal } from "$lib/state/stores/modals";
    import { trpcWithQuery } from "$lib/trpc/client";
    import { PROGRAM_ID as ACCOUNT_COMPRESSION_ID } from "@solana/spl-account-compression";
    import { walletStore } from "@svelte-on-solana/wallet-adapter-core";
    import Icon from "$lib/components/icon.svelte";
    const client = trpcWithQuery($page);

    const account = $page.params.account;
    const accountInfo = client.accountInfo.createQuery(account);
    // Access publicKey from walletStore
    const publicKey = $walletStore.publicKey;

    // Pass publicKey as a prop to AccountHeader component
    const props = { account, link: $page.url.href, publicKey };
    const params = new URLSearchParams(window.location.search);
    const network = params.get("network");
    const isMainnetValue = network === "mainnet";

    import { writable } from 'svelte/store';
    import { initializeApp } from 'firebase/app';
    import {
        getFirestore,
        collection,
        doc,
        setDoc,
        serverTimestamp,
        query,
        where,
        getDocs,
    } from 'firebase/firestore';

    const comments = writable<{ comment: string }[]>([]);

    // Firebase configuration
    const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
    };
    const app = initializeApp(firebaseConfig);
    let fetchCommentsInterval: number;
    const signature = $page.params.account;
    let fetchPublicKeyInterval: NodeJS.Timer;

    const fetchPublicKey = () => {
        const wallet = $walletStore;
        const publicKey = wallet.publicKey;

        if (!publicKey) {
            return;
        }
    
    };
    
    // Wallet and comment-related variables
    const comment = writable('');
    let displayedComments: { comment: string }[] = [];

    const fetchComments = async () => {
        const db = getFirestore(app);
        const commentsRef = collection(db, 'actcomment');

        const wallet = $walletStore;
        const publicKey = wallet.publicKey;

        if (!publicKey) {
            return;
        }

        const commentsQuery = query(commentsRef, where('walletPublicKey', '==', publicKey.toBase58()));

        try {
            const querySnapshot = await getDocs(commentsQuery);

            const newComments: { comment: string, walletPublicKey: string }[] = querySnapshot.docs
                .map((doc) => doc.data() as { comment: string, walletPublicKey: string })
                .filter((comment) => {
                    
                    return comment.walletPublicKey === publicKey.toBase58() &&
                        !displayedComments.some(
                            (displayedComment) => displayedComment.comment === comment.comment
                        );
                });

            displayedComments = displayedComments.concat(newComments);

            // Update the comments store
            comments.update((currentComments) => [...currentComments, ...newComments]);
        } catch (error) {
            // Handle any errors if necessary
            console.error("Error fetching comments:", error);
        }
};

    
    const startCommentFetchTimer = () => {
        setInterval(() => {
            fetchComments();
        }, 2000); // Fetch every 2 seconds (2000 milliseconds)
    };
    
    const startPublicKeyFetchTimer = () => {
        fetchPublicKeyInterval = setInterval(() => {
            fetchPublicKey();
        }, 2000); // Fetch every 2 seconds (2000 milliseconds)
    };

    onMount(() => {
        fetchComments(); 
        fetchPublicKey();

        startCommentFetchTimer();
        startPublicKeyFetchTimer();
        // Cleanup function
        return () => {
            clearInterval(fetchCommentsInterval);
        };
    });

    onDestroy(() => {
        clearInterval(fetchCommentsInterval);
        clearInterval(fetchPublicKeyInterval);
    });

const submitComment = async () => {
        const commentText = $comment;
        if (commentText) {
            const db = getFirestore(app);
            const commentsRef = collection(db, 'actcomment');
            
            // Get the connected wallet's public key
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
                    timestamp: serverTimestamp(),
                    walletPublicKey: publicKey.toBase58(), // Include the wallet public key
                });
                comment.set('');
                fetchComments(); // Fetch comments to update the list
            } catch (error) {
                // Handle the error if necessary
                console.error("Error submitting comment:", error);
            }
        }
    };
    
</script>

<div class="relative mx-auto w-full max-w-2xl pb-32">
    <AccountHeader {...props} />
    <div
                    class="mt-3 mb-5grid mb-3 items-center ml-3 mr-3 gap-3 rounded-lg border p-1 py-3"
                >
    <h2 class="text-lg font-semibold md:text-sm ml-10 lowercase"><b>add comment</b></h2>
        <!-- <p>Logged in as: {publicKey?.toBase58()}</p> -->
        <textarea
            class="text-input mt-5 ml-10 w-[80vh]"
            placeholder="write your comment here"
            bind:value={$comment} 
            style="background-color: #696969"
        ></textarea><br>
        <button class="btn lowercase mb-10 mt-5 ml-10" on:click={submitComment}>Submit Comment</button>
        {#if $comments.length > 0}<div><p></p></div>
    <!-- ... -->
    {#if publicKey}
    <div class="mb-5 ml-5 mr-5">
        connected with<br><i>{publicKey.toBase58()}</i>
    </div>
{:else}
    <div></div>
{/if}
    {#each $comments as comment (comment.timestamp)}
    <div class="mb-3 ml-5 px-3 badge mr-5">
        <p style="font-size: 16px;">{comment.comment}</p>
    </div>    
    {/each}
{/if}
</div>
    <div>
        <div
            class="mx-3 mb-5 mt-3 flex items-center justify-between rounded-lg border"
        >
            <div class="tabs w-full pt-1 lowercase md:w-auto">
                <div />
                <a
                    href={`/account/${account}`}
                    class="tab tab-bordered"
                    class:tab-active={$page.url.pathname.endsWith(`${account}`)}
                    >transactions</a
                >
                <a
                    href={`/account/${account}/tokens`}
                    class="tab tab-bordered"
                    class:tab-active={$page.url.pathname.endsWith("/tokens")}
                    >tokens</a
                >
                <!-- <a
                    href={`/account/${account}/assets?network=${
                        isMainnetValue ? "mainnet" : "devnet"
                    }`}
                    class="tab-bordered tab"
                    class:tab-active={$page.url.pathname.endsWith("/assets")}
                    >Assets</a
                >
                <a
                    href={`/account/${account}/post`}
                    class="tab tab-bordered"
                    class:tab-active={$page.url.pathname.endsWith("/post")}
                    >journal</a
                > -->
                <!-- <a
                    href={`/account/${account}/entries`}
                    class="tab tab-bordered"
                    class:tab-active={$page.url.pathname.endsWith("/entries")}
                    >wall</a
                > -->
                {#if $accountInfo?.data?.value?.owner === ACCOUNT_COMPRESSION_ID.toBase58()}
                    <a
                        href={`/account/${account}/concurrent-merkle-tree`}
                        class="tab tab-bordered"
                        class:tab-active={$page.url.pathname.endsWith(
                            "concurrent-merkle-tree"
                        )}>Concurrent Merkle Tree</a
                    >
                {/if}
            </div>
            {#if !$page.url.pathname.endsWith("/tokens") && !$page.url.pathname.endsWith("/assets")}
                <button
                    class="btn-ghost btn-sm btn"
                    on:click={() => showModal("TRANSACTION_FILTER")}
                >
                    <Icon id="settings" />
                </button>
            {/if}
        </div>
    </div>

    <div class="content px-3">
        <slot />
    </div>
</div>
