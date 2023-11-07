<script lang="ts">
    import { page } from "$app/stores";

    import Icon from "$lib/components/icon.svelte";
    import { onMount } from "svelte";
    import AccountHeader from "$lib/components/account-header.svelte";
    import { showModal } from "$lib/state/stores/modals";
    import { trpcWithQuery } from "$lib/trpc/client";
    import { PROGRAM_ID as ACCOUNT_COMPRESSION_ID } from "@solana/spl-account-compression";

    const client = trpcWithQuery($page);

    const account = $page.params.account;
    const accountInfo = client.accountInfo.createQuery(account);

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

    const signature = $page.params.account;

    // Wallet and comment-related variables
    // const { publicKey } = useWallet();
    const comment = writable('');
    let displayedComments: { comment: string }[] = [];

    const fetchComments = async () => {
        const db = getFirestore(app);
        const commentsRef = collection(db, 'actcomment');
        const commentsQuery = query(commentsRef, where('account', '==', signature));
        
        try {
            const querySnapshot = await getDocs(commentsQuery);

            const newComments: { comment: string }[] = querySnapshot.docs
                .map((doc) => doc.data() as { comment: string })
                .filter((comment) => {
                    const isDisplayed = displayedComments.some(
                        (displayedComment) => displayedComment.comment === comment.comment
                    );
                    return !isDisplayed;
                });

            // Add the new comments to the displayed comments list
            displayedComments = displayedComments.concat(newComments);

            // Update the comments store
            comments.update((currentComments) => [...currentComments, ...newComments]);
        } catch (error) {
            // Handle any errors if necessary
        }
    };

onMount(() => {
        fetchComments(); 
});

const submitComment = async () => {
        const commentText = $comment;
        if (commentText) {
            const db = getFirestore(app);
            const commentsRef = collection(db, 'actcomment');
            const docRef = doc(commentsRef); 

            try {
                await setDoc(docRef, {
                    account: signature,
                    comment: commentText,
                    timestamp: serverTimestamp(),
                });
                comment.set('');
                fetchComments(); // Fetch comments to update the list
            } catch (error) {
                // Handle the error if necessary
            }
        }
};
</script>

<div class="relative mx-auto w-full max-w-2xl pb-32">
    <AccountHeader
        {account}
        link={$page.url.href}
    />
    <div
                    class="mt-3 mb-5grid items-center gap-3 rounded-lg border p-1 py-3"
                >
    <h2 class="text-lg font-semibold md:text-sm ml-10 lowercase"><b>add comment</b></h2>
        <!-- <p>Logged in as: {publicKey?.toBase58()}</p> -->
        <textarea
            class="text-input mt-5 ml-10"
            placeholder="write your comment here"
            bind:value={$comment} 
            style="background-color: #696969"
        ></textarea><br>
        <button class="btn lowercase mb-10 mt-5 ml-10" on:click={submitComment}>Submit Comment</button>
        {#if $comments.length > 0}<div><p></p></div>
    <!-- ... -->
    
    {#each $comments as comment (comment.timestamp)}
    <div class="mb-3 ml-10 px-3 badge mr-1">
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
                    href={`/account/${account}/nfts`}
                    class="tab tab-bordered"
                    class:tab-active={$page.url.pathname.endsWith("/nfts")}
                    >nfts</a
                > -->
                <!-- <a
                    href={`/account/${account}/journal`}
                    class="tab tab-bordered"
                    class:tab-active={$page.url.pathname.endsWith("/journal")}
                    >journal</a
                >
                <a
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
            {#if !$page.url.pathname.endsWith("/tokens")}
                <button
                    class="btn btn-ghost btn-sm lowercase"
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
