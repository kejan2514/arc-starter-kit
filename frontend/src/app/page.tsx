"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  formatUnits,
  http,
  parseUnits,
} from "viem";

const NFT_CONTRACT = "0xfA6D79e3B602Cfc3Acfd9d5Ef57bd6c12d0bc90D" as const;
const MARKETPLACE_CONTRACT =
  "0xA5efb7349312d0DFc7616D59108599D4467AEcF6" as const;
const TOKEN_CONTRACT =
  "0x6DB4F186CF79af2C28602dFbDFE90B94A0bDd8BB" as const;

const LISTING_ID = 1n;

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

const marketplaceAbi = [
  {
    type: "function",
    name: "listings",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "seller", type: "address" },
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "buyNFT",
    stateMutability: "nonpayable",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
  },
] as const;

const nftAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const tokenAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

type EthereumProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

function getEthereum(): EthereumProvider | undefined {
  return (
    window as typeof window & {
      ethereum?: EthereumProvider;
    }
  ).ethereum;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Home() {
  const [wallet, setWallet] = useState<`0x${string}` | null>(null);
  const [owner, setOwner] = useState<`0x${string}` | null>(null);
  const [seller, setSeller] = useState<`0x${string}` | null>(null);
  const [price, setPrice] = useState(0n);
  const [active, setActive] = useState(false);
  const [abtBalance, setAbtBalance] = useState(0n);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");

  const loadBlockchainData = useCallback(async () => {
    try {
      setLoading(true);

      const listing = await publicClient.readContract({
        address: MARKETPLACE_CONTRACT,
        abi: marketplaceAbi,
        functionName: "listings",
        args: [LISTING_ID],
      });

      const [listingSeller, , tokenId, listingPrice, listingActive] = listing;

      const currentOwner = await publicClient.readContract({
        address: NFT_CONTRACT,
        abi: nftAbi,
        functionName: "ownerOf",
        args: [tokenId],
      });

      setSeller(listingSeller);
      setOwner(currentOwner);
      setPrice(listingPrice);
      setActive(listingActive);

      if (wallet) {
        const balance = await publicClient.readContract({
          address: TOKEN_CONTRACT,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [wallet],
        });

        setAbtBalance(balance);
      }
    } catch (error) {
      console.error(error);
      setMessage("Blockchain verileri okunamadı.");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void loadBlockchainData();
  }, [loadBlockchainData]);

  async function connectWallet() {
    try {
      const ethereum = getEthereum();

      if (!ethereum) {
        alert("MetaMask bulunamadı. Lütfen MetaMask yükleyin.");
        return;
      }

      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as `0x${string}`[];

      const account = accounts[0];

      if (!account) {
        throw new Error("Cüzdan hesabı bulunamadı.");
      }

      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x4CEF52" }],
        });
      } catch {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x4CEF52",
              chainName: "Arc Testnet",
              nativeCurrency: {
                name: "USDC",
                symbol: "USDC",
                decimals: 18,
              },
              rpcUrls: ["https://rpc.testnet.arc.network"],
              blockExplorerUrls: ["https://testnet.arcscan.app"],
            },
          ],
        });
      }

      setWallet(account);
      setMessage("Cüzdan bağlandı.");
    } catch (error) {
      console.error(error);
      setMessage("Cüzdan bağlantısı başarısız oldu.");
    }
  }

  async function buyNFT() {
    try {
      if (!wallet) {
        await connectWallet();
        return;
      }

      if (!active) {
        setMessage("Bu NFT daha önce satılmış.");
        return;
      }

      if (abtBalance < price) {
        setMessage(
          `Yetersiz ABT bakiyesi. Gerekli miktar: ${formatUnits(price, 18)} ABT`,
        );
        return;
      }

      const ethereum = getEthereum();

      if (!ethereum) {
        throw new Error("MetaMask bulunamadı.");
      }

      setBuying(true);
      setMessage("1/2 — Marketplace için ABT izni veriliyor…");

      const walletClient = createWalletClient({
        account: wallet,
        chain: arcTestnet,
        transport: custom(ethereum),
      });

      const approvalHash = await walletClient.writeContract({
        address: TOKEN_CONTRACT,
        abi: tokenAbi,
        functionName: "approve",
        args: [MARKETPLACE_CONTRACT, parseUnits("100", 18)],
      });

      await publicClient.waitForTransactionReceipt({
        hash: approvalHash,
      });

      setMessage("2/2 — NFT satın alma işlemi gönderiliyor…");

      const purchaseHash = await walletClient.writeContract({
        address: MARKETPLACE_CONTRACT,
        abi: marketplaceAbi,
        functionName: "buyNFT",
        args: [LISTING_ID],
      });

      await publicClient.waitForTransactionReceipt({
        hash: purchaseHash,
      });

      setMessage("NFT başarıyla satın alındı! 🎉");
      await loadBlockchainData();
    } catch (error) {
      console.error(error);
      setMessage(
        "İşlem tamamlanamadı. MetaMask işlemi reddedilmiş veya ilan kapanmış olabilir.",
      );
    } finally {
      setBuying(false);
    }
  }

  const formattedPrice = formatUnits(price, 18);
  const formattedBalance = formatUnits(abtBalance, 18);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-bold">Arc Builder Marketplace</h1>
            <p className="text-sm text-zinc-400">Built on Arc Testnet</p>
          </div>

          <button
            onClick={connectWallet}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
          >
            {wallet ? shortenAddress(wallet) : "Connect Wallet"}
          </button>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2">
        <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 p-10 shadow-2xl">
          <div className="text-center">
            <div className="mb-5 text-8xl">◈</div>
            <h2 className="text-4xl font-black">ARC BUILDER</h2>
            <p className="mt-3 text-xl font-semibold">NFT #1</p>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <span
            className={`mb-4 w-fit rounded-full px-4 py-2 text-sm font-semibold ${
              active
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {loading ? "LOADING…" : active ? "FOR SALE" : "SOLD"}
          </span>

          <h2 className="text-5xl font-black tracking-tight">
            Arc Builder NFT #1
          </h2>

          <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-400">
            Arc Testnet üzerinde oluşturulan ve akıllı sözleşme üzerinden
            yönetilen sınırlı bir ERC-721 koleksiyonu.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-zinc-400">Listing price</p>
            <p className="mt-2 text-4xl font-bold">
              {loading ? "…" : `${formattedPrice} ABT`}
            </p>

            {wallet && (
              <p className="mt-4 text-sm text-zinc-400">
                Your balance: {formattedBalance} ABT
              </p>
            )}
          </div>

          {active ? (
            <button
              onClick={buyNFT}
              disabled={buying}
              className="mt-6 rounded-2xl bg-violet-500 px-6 py-4 text-lg font-bold transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {buying ? "Processing…" : "Buy NFT"}
            </button>
          ) : (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-center font-bold text-red-300">
              This NFT has been sold
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
              {message}
            </div>
          )}

          <div className="mt-8 space-y-3 text-sm text-zinc-400">
            <p>
              <span className="text-zinc-200">Current owner:</span>{" "}
              {owner ? shortenAddress(owner) : "Loading…"}
            </p>

            <p>
              <span className="text-zinc-200">Original seller:</span>{" "}
              {seller ? shortenAddress(seller) : "Loading…"}
            </p>

            <p>
              <span className="text-zinc-200">NFT Contract:</span>{" "}
              {shortenAddress(NFT_CONTRACT)}
            </p>

            <p>
              <span className="text-zinc-200">Marketplace:</span>{" "}
              {shortenAddress(MARKETPLACE_CONTRACT)}
            </p>

            <p>
              <span className="text-zinc-200">Payment Token:</span>{" "}
              {shortenAddress(TOKEN_CONTRACT)}
            </p>

            <a
              href={`${arcTestnet.blockExplorers.default.url}/address/${NFT_CONTRACT}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block pt-2 font-semibold text-violet-400 hover:text-violet-300"
            >
              View contract on ArcScan ↗
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
