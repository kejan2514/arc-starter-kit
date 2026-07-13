"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type ViewMode = "overview" | "portfolio" | "creators" | "details";

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

const stats = [
  { label: "NFTs Minted", value: "12.8k+" },
  { label: "Wallets Connected", value: "8.4k" },
  { label: "Transactions", value: "96.2k" },
];

const featuredDrops = [
  {
    title: "Quantum Genesis",
    subtitle: "Ultra-rare utility pass",
    price: "0.42 ABT",
    category: "Utility",
    accent: "from-fuchsia-500 via-violet-500 to-cyan-400",
  },
  {
    title: "Neon Atlas",
    subtitle: "Immersive creator badge",
    price: "0.18 ABT",
    category: "Art",
    accent: "from-sky-500 via-cyan-500 to-violet-400",
  },
  {
    title: "Nova Vault",
    subtitle: "Access to premium drops",
    price: "0.29 ABT",
    category: "Gaming",
    accent: "from-indigo-500 via-purple-500 to-fuchsia-400",
  },
];

const categories = ["All", "Art", "Utility", "Gaming"];

const recentlySold = [
  { name: "Orbital #312", price: "0.17 ABT", seller: "0xA2f...03c1" },
  { name: "Signal #08", price: "0.11 ABT", seller: "0xD9a...f4e2" },
  { name: "Apex #66", price: "0.22 ABT", seller: "0x81c...8fa9" },
];

const activityFeed = [
  { type: "Sale", user: "0x8fC...9801", item: "Nova Vault #09", price: "0.19 ABT", time: "2m ago" },
  { type: "Mint", user: "0xB71...4f1D", item: "Quantum Genesis", price: "0.42 ABT", time: "8m ago" },
  { type: "Transfer", user: "0xC0d...7e24", item: "Neon Atlas #14", price: "0.08 ABT", time: "15m ago" },
];

const creators = [
  { name: "Maya Vega", handle: "@maya", followers: "5.8k", floor: "0.11 ABT", accent: "from-cyan-500 to-blue-500" },
  { name: "Arlen Flux", handle: "@arlen", followers: "4.2k", floor: "0.09 ABT", accent: "from-fuchsia-500 to-violet-500" },
  { name: "Nico Prime", handle: "@nico", followers: "6.1k", floor: "0.14 ABT", accent: "from-emerald-500 to-cyan-500" },
];

const rankingRows = [
  { name: "Quantum Genesis", volume: "$124k", change: "+18%" },
  { name: "Nova Vault", volume: "$98k", change: "+11%" },
  { name: "Neon Atlas", volume: "$87k", change: "+9%" },
];

const particles = [
  { left: 10, top: 18, size: 6, duration: 10, delay: 0 },
  { left: 22, top: 72, size: 10, duration: 12, delay: 2 },
  { left: 78, top: 20, size: 8, duration: 9, delay: 1 },
  { left: 84, top: 72, size: 7, duration: 11, delay: 3 },
  { left: 58, top: 36, size: 9, duration: 13, delay: 4 },
];

const chartBars = [44, 76, 63, 88, 94, 79];

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
      <div className="h-24 rounded-[16px] bg-slate-800/80" />
      <div className="mt-4 h-3 w-20 rounded-full bg-slate-800/80" />
      <div className="mt-2 h-3 w-32 rounded-full bg-slate-800/80" />
      <div className="mt-4 h-8 w-full rounded-full bg-slate-800/80" />
    </div>
  );
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
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<ViewMode>("overview");
  const [toast, setToast] = useState<string | null>(null);

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
      setToast("Blockchain data unavailable");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void loadBlockchainData();
  }, [loadBlockchainData]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function connectWallet() {
    try {
      const ethereum = getEthereum();

      if (!ethereum) {
        alert("MetaMask bulunamadı. Lütfen MetaMask yükleyin.");
        setToast("MetaMask not found");
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
      setToast("Wallet connected to Arc Testnet");
    } catch (error) {
      console.error(error);
      setMessage("Cüzdan bağlantısı başarısız oldu.");
      setToast("Wallet connection failed");
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
        setToast("This listing is no longer available");
        return;
      }

      if (abtBalance < price) {
        setMessage(`Yetersiz ABT bakiyesi. Gerekli miktar: ${formatUnits(price, 18)} ABT`);
        setToast("Insufficient ABT balance");
        return;
      }

      const ethereum = getEthereum();

      if (!ethereum) {
        throw new Error("MetaMask bulunamadı.");
      }

      setBuying(true);
      setMessage("1/2 — Marketplace için ABT izni veriliyor…");
      setToast("Approving marketplace spend");

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
      setToast("Submitting purchase transaction");

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
      setToast("Purchase complete");
      await loadBlockchainData();
    } catch (error) {
      console.error(error);
      setMessage("İşlem tamamlanamadı. MetaMask işlemi reddedilmiş veya ilan kapanmış olabilir.");
      setToast("Purchase failed");
    } finally {
      setBuying(false);
    }
  }

  const formattedPrice = formatUnits(price, 18);
  const formattedBalance = formatUnits(abtBalance, 18);

  const filteredDrops = useMemo(() => {
    return featuredDrops.filter((drop) => {
      const matchesCategory =
        activeCategory === "All" || drop.category === activeCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        drop.title.toLowerCase().includes(query) ||
        drop.subtitle.toLowerCase().includes(query) ||
        drop.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const portfolioValue = wallet ? `${(Number(formattedBalance) * 2.4).toFixed(1)} USDC` : "—";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(192,132,252,0.34),_transparent_22%),radial-gradient(circle_at_80%_20%,_rgba(56,189,248,0.28),_transparent_28%),linear-gradient(135deg,_#040713_0%,_#0f172a_45%,_#1e3a8a_100%)] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora-1 absolute left-[-10%] top-[-8%] h-80 w-80 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="aurora-2 absolute bottom-[-8%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-cyan-400/15" />
        {particles.map((particle) => (
          <span
            key={`${particle.left}-${particle.top}`}
            className="absolute rounded-full bg-white/70 shadow-[0_0_18px_rgba(255,255,255,0.7)]"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <nav className="border-b border-white/10 bg-slate-950/35 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="rounded-full border border-cyan-400/20 bg-white/10 px-4 py-2 shadow-[0_0_30px_rgba(34,211,238,0.14)] backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-cyan-300">
                Arc Builder
              </p>
              <h1 className="text-base font-semibold text-white">Premium Marketplace</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <button
                onClick={() => setActiveView("overview")}
                className={`rounded-full border px-3 py-2 transition ${activeView === "overview" ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200" : "border-white/10 bg-white/5 hover:border-cyan-400/20 hover:text-white"}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveView("portfolio")}
                className={`rounded-full border px-3 py-2 transition ${activeView === "portfolio" ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200" : "border-white/10 bg-white/5 hover:border-cyan-400/20 hover:text-white"}`}
              >
                Portfolio
              </button>
              <button
                onClick={() => setActiveView("creators")}
                className={`rounded-full border px-3 py-2 transition ${activeView === "creators" ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200" : "border-white/10 bg-white/5 hover:border-cyan-400/20 hover:text-white"}`}
              >
                Creators
              </button>
              <button
                onClick={() => setActiveView("details")}
                className={`rounded-full border px-3 py-2 transition ${activeView === "details" ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200" : "border-white/10 bg-white/5 hover:border-cyan-400/20 hover:text-white"}`}
              >
                NFT Detail
              </button>
              <button
                onClick={connectWallet}
                className="rounded-full border border-cyan-400/30 bg-gradient-to-r from-cyan-400/20 to-fuchsia-500/20 px-4 py-2 font-semibold text-white shadow-[0_0_20px_rgba(34,211,238,0.16)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(217,70,239,0.24)]"
              >
                {wallet ? shortenAddress(wallet) : "Connect Wallet"}
              </button>
            </div>
          </div>
        </nav>

        {activeView === "overview" && (
          <>
            <section className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-12">
              <div className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
                <div className="rounded-[36px] border border-cyan-400/20 bg-slate-900/45 p-6 shadow-[0_0_90px_rgba(34,211,238,0.12)] backdrop-blur-2xl lg:p-8">
                  <div className="mb-5 inline-flex w-fit items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 backdrop-blur">
                    Premium Web3 Launchpad
                  </div>

                  <h2 className="max-w-3xl text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
                    Build your legend in the next-gen marketplace.
                  </h2>

                  <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                    Discover elite NFT drops, connect with a thriving creator economy,
                    and purchase live listings directly on Arc Testnet with a premium
                    experience designed for collectors and builders.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <button
                      onClick={buyNFT}
                      disabled={buying || !active}
                      className="rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(192,132,252,0.35)] transition duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(34,211,238,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {buying ? "Processing…" : active ? "Buy featured NFT" : "Sold out"}
                    </button>
                    <a
                      href={`${arcTestnet.blockExplorers.default.url}/address/${NFT_CONTRACT}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-slate-100 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
                    >
                      View on ArcScan
                    </a>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 shadow-[0_20px_60px_rgba(8,15,40,0.35)] backdrop-blur transition duration-300 hover:-translate-y-1"
                      >
                        <p className="text-2xl font-semibold text-white">{stat.value}</p>
                        <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[36px] border border-fuchsia-400/20 bg-gradient-to-br from-slate-950/90 via-slate-900/70 to-slate-800/80 p-4 shadow-[0_0_100px_rgba(192,132,252,0.18)] backdrop-blur-2xl sm:p-6">
                  <div className="rounded-[28px] border border-white/10 bg-black/20 p-4 sm:p-5">
                    <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.24),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(192,132,252,0.24),_transparent_32%)] p-6 sm:min-h-[420px]">
                      <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(255,255,255,0.08),_transparent_40%,_rgba(255,255,255,0.08))]" />
                      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-400/20 to-transparent" />
                      <div className="relative z-10 text-center">
                        <div className="mb-4 text-[5.5rem] font-black tracking-[0.3em] text-white drop-shadow-[0_0_35px_rgba(34,211,238,0.7)] sm:text-[7rem]">
                          ARC
                        </div>
                        <p className="text-lg font-semibold uppercase tracking-[0.35em] text-slate-200">
                          Builder Edition
                        </p>
                        <p className="mt-3 text-sm uppercase tracking-[0.3em] text-cyan-300">
                          Live on Arc Testnet
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[24px] border border-white/10 bg-slate-950/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
                            Live listing
                          </p>
                          <h3 className="mt-2 text-xl font-semibold text-white">
                            Arc Builder NFT #1
                          </h3>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            active
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {loading ? "Loading" : active ? "For sale" : "Sold"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-sm text-slate-400">Current Ask</p>
                          <p className="text-2xl font-semibold text-white">
                            {loading ? "…" : `${formattedPrice} ABT`}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm text-slate-400">Wallet</p>
                          <p className="text-sm font-medium text-slate-200">
                            {wallet ? shortenAddress(wallet) : "Not connected"}
                          </p>
                        </div>
                      </div>

                      {wallet && (
                        <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">
                          Balance: {formattedBalance} ABT
                        </div>
                      )}

                      {message && (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                          {message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="collections" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
              <div className="rounded-[36px] border border-white/10 bg-slate-900/55 p-6 shadow-[0_20px_90px_rgba(2,6,23,0.45)] backdrop-blur-2xl lg:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
                      Trending Collections
                    </p>
                    <h3 className="mt-2 text-3xl font-semibold text-white">
                      Curated drops with neon energy.
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                          activeCategory === category
                            ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200"
                            : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/20 hover:text-white"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 lg:flex-row">
                  <label className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300 backdrop-blur">
                    <span className="text-cyan-300">⌕</span>
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search collections"
                      className="w-full bg-transparent outline-none placeholder:text-slate-500"
                    />
                  </label>
                  <a
                    href={`${arcTestnet.blockExplorers.default.url}/address/${NFT_CONTRACT}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/20 hover:text-white"
                  >
                    Explore ArcScan
                  </a>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-3">
                  {loading
                    ? [0, 1, 2].map((item) => <SkeletonCard key={item} />)
                    : filteredDrops.length > 0
                      ? filteredDrops.map((drop) => (
                          <div
                            key={drop.title}
                            className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5 shadow-[0_20px_70px_rgba(8,15,40,0.3)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20"
                          >
                            <div className={`h-32 rounded-[20px] bg-gradient-to-br ${drop.accent}`} />
                            <div className="mt-4 flex items-center justify-between">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-400">
                                {drop.category}
                              </span>
                              <span className="text-sm font-semibold text-cyan-300">
                                {drop.price}
                              </span>
                            </div>
                            <p className="mt-4 text-xl font-semibold text-white">{drop.title}</p>
                            <p className="mt-1 text-sm text-slate-400">{drop.subtitle}</p>
                          </div>
                        ))
                      : (
                          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-8 text-center text-slate-400 lg:col-span-3">
                            No collections match your search yet.
                          </div>
                        )}
                </div>
              </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
              <div className="rounded-[36px] border border-white/10 bg-slate-900/55 p-6 shadow-[0_20px_90px_rgba(2,6,23,0.4)] backdrop-blur-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
                      Recently Sold NFTs
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">
                      Fresh liquidity across the market.
                    </h3>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
                    +16.2% today
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {recentlySold.map((item) => (
                    <div key={item.name} className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20">
                      <div className="h-24 rounded-[18px] bg-gradient-to-br from-cyan-500/80 to-fuchsia-500/70" />
                      <p className="mt-4 font-semibold text-white">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.seller}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-slate-400">Sold for</span>
                        <span className="text-sm font-semibold text-cyan-300">{item.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[36px] border border-white/10 bg-slate-900/55 p-6 shadow-[0_20px_90px_rgba(2,6,23,0.4)] backdrop-blur-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
                      Live Activity
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">
                      The chain never sleeps.
                    </h3>
                  </div>
                  <span className="text-sm text-slate-400">Updated now</span>
                </div>

                <div className="mt-6 space-y-3">
                  {activityFeed.map((entry) => (
                    <div key={`${entry.user}-${entry.item}`} className="flex items-center justify-between rounded-[18px] border border-white/10 bg-slate-950/50 px-4 py-3 transition hover:border-cyan-400/20">
                      <div>
                        <p className="text-sm font-semibold text-white">{entry.type}</p>
                        <p className="text-sm text-slate-400">{entry.user} · {entry.item}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-cyan-300">{entry.price}</p>
                        <p className="text-xs text-slate-500">{entry.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[36px] border border-white/10 bg-slate-900/55 p-6 shadow-[0_20px_90px_rgba(2,6,23,0.4)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
                        Collection Ranking
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">
                        Top movers right now.
                      </h3>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
                      24h volume
                    </span>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
                    <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                      <thead className="bg-white/5 text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-medium">Collection</th>
                          <th className="px-4 py-3 font-medium">Volume</th>
                          <th className="px-4 py-3 font-medium">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 bg-slate-950/50 text-slate-200">
                        {rankingRows.map((row) => (
                          <tr key={row.name} className="transition hover:bg-white/5">
                            <td className="px-4 py-3 font-semibold text-white">{row.name}</td>
                            <td className="px-4 py-3">{row.volume}</td>
                            <td className="px-4 py-3 text-emerald-300">{row.change}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-[36px] border border-white/10 bg-slate-900/55 p-6 shadow-[0_20px_90px_rgba(2,6,23,0.4)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
                        Market Pulse
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">
                        Volume momentum.
                      </h3>
                    </div>
                    <span className="text-sm text-emerald-300">+24.5%</span>
                  </div>

                  <div className="mt-8 flex h-48 items-end gap-3 rounded-[24px] border border-white/10 bg-slate-950/50 p-4">
                    {chartBars.map((bar) => (
                      <div key={bar} className="flex-1 rounded-t-[12px] bg-gradient-to-t from-cyan-500 to-fuchsia-500 transition-all duration-700" style={{ height: `${bar}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeView === "portfolio" && (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="rounded-[36px] border border-white/10 bg-slate-900/55 p-6 shadow-[0_20px_90px_rgba(2,6,23,0.4)] backdrop-blur-2xl lg:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
                    Wallet Portfolio
                  </p>
                  <h3 className="mt-2 text-3xl font-semibold text-white">
                    A premium overview of your on-chain presence.
                  </h3>
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
                  {wallet ? shortenAddress(wallet) : "Connect wallet to unlock portfolio"}
                </div>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Portfolio value</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{portfolioValue}</p>
                    </div>
                    <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
                      +12.8%
                    </div>
                  </div>

                  <div className="mt-6 flex h-40 items-end gap-3 rounded-[20px] border border-white/10 bg-slate-900/60 p-4">
                    {chartBars.map((bar, index) => (
                      <div key={`${bar}-${index}`} className="flex-1 rounded-t-[12px] bg-gradient-to-t from-cyan-500 to-fuchsia-500 transition-all duration-700" style={{ height: `${bar + (index % 2) * 8}%` }} />
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
                    Holdings
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <p className="font-semibold text-white">Arc Builder NFT #1</p>
                        <p className="text-sm text-slate-400">Live listing</p>
                      </div>
                      <span className="text-sm font-semibold text-cyan-300">{loading ? "…" : `${formattedPrice} ABT`}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <p className="font-semibold text-white">Arc Testnet Balance</p>
                        <p className="text-sm text-slate-400">Available for trading</p>
                      </div>
                      <span className="text-sm font-semibold text-cyan-300">{wallet ? `${formattedBalance} ABT` : "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeView === "creators" && (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="rounded-[36px] border border-white/10 bg-slate-900/55 p-6 shadow-[0_20px_90px_rgba(2,6,23,0.4)] backdrop-blur-2xl lg:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
                    Creator Profiles
                  </p>
                  <h3 className="mt-2 text-3xl font-semibold text-white">
                    Discover the artists shaping the next wave.
                  </h3>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                  Verified creators • 24h activity
                </div>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {creators.map((creator) => (
                  <div key={creator.name} className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20">
                    <div className={`h-24 rounded-[18px] bg-gradient-to-br ${creator.accent}`} />
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{creator.name}</p>
                        <p className="text-sm text-slate-400">{creator.handle}</p>
                      </div>
                      <button className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
                        Follow
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
                      <span>{creator.followers} followers</span>
                      <span>Floor {creator.floor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeView === "details" && (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[36px] border border-fuchsia-400/20 bg-slate-900/55 p-6 shadow-[0_20px_90px_rgba(2,6,23,0.4)] backdrop-blur-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
                      NFT Detail Page
                    </p>
                    <h3 className="mt-2 text-3xl font-semibold text-white">
                      Arc Builder NFT #1
                    </h3>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                    {active ? "For Sale" : "Sold"}
                  </span>
                </div>

                <div className="mt-6 rounded-[28px] border border-white/10 bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 p-8 text-center">
                  <div className="text-[5rem] font-black tracking-[0.3em] text-white">ARC</div>
                  <p className="mt-3 text-lg font-semibold uppercase tracking-[0.3em] text-white/90">
                    Builder Edition
                  </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[20px] border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-sm text-slate-400">Current Ask</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{loading ? "…" : `${formattedPrice} ABT`}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-sm text-slate-400">Owner</p>
                    <p className="mt-2 text-sm font-semibold text-white">{owner ? shortenAddress(owner) : "Loading…"}</p>
                  </div>
                </div>

                <button
                  onClick={buyNFT}
                  disabled={buying || !active}
                  className="mt-6 w-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(192,132,252,0.35)] transition duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_0_40px_rgba(34,211,238,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {buying ? "Processing…" : active ? "Buy now" : "Sold out"}
                </button>
              </div>

              <div className="rounded-[36px] border border-white/10 bg-slate-900/55 p-6 shadow-[0_20px_90px_rgba(2,6,23,0.4)] backdrop-blur-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
                  Details
                </p>
                <h4 className="mt-3 text-2xl font-semibold text-white">
                  Built for collectors who value utility and prestige.
                </h4>
                <p className="mt-4 text-slate-300 leading-7">
                  This ARC edition is anchored on Arc Testnet and can be purchased directly from the marketplace contract with wallet-backed approvals and on-chain execution.
                </p>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-slate-950/50 px-4 py-3">
                    <span className="text-slate-400">Contract</span>
                    <span className="font-semibold text-white">{shortenAddress(NFT_CONTRACT)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-slate-950/50 px-4 py-3">
                    <span className="text-slate-400">Marketplace</span>
                    <span className="font-semibold text-white">{shortenAddress(MARKETPLACE_CONTRACT)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-slate-950/50 px-4 py-3">
                    <span className="text-slate-400">Payment</span>
                    <span className="font-semibold text-white">{shortenAddress(TOKEN_CONTRACT)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-full border border-cyan-400/30 bg-slate-950/90 px-4 py-3 text-sm text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.2)] backdrop-blur">
          {toast}
        </div>
      )}
    </main>
  );
}
