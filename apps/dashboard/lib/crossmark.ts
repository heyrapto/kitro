"use client";

// Crossmark XRPL Browser Wallet Integration & Developer Fallback

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: "testnet" | "mainnet" | "unknown";
  walletType: "crossmark" | "developer_testnet" | null;
  publicKey?: string;
}

declare global {
  interface Window {
    crossmark?: {
      methods?: {
        isInstalled?: () => boolean;
        getAddress?: () => Promise<string | { response: { data: { address: string } } }>;
        signInAndWait?: () => Promise<{ response: { data: { address: string; network?: { type?: string } } } }>;
        getNetwork?: () => Promise<{ response: { data: { type: string } } }>;
      };
      async?: {
        signIn?: () => Promise<any>;
      };
      isInstalled?: boolean;
    };
  }
}

export const PREFUNDED_TESTNET_OPERATOR = "rhdpnnEnBGUfXj76fU7ttkNKRJevqbLRqn";
export const PREFUNDED_TESTNET_TREASURY = "rhdpnnEnBGUfXj76fU7ttkNKRJevqbLRqn";

const STORAGE_KEY = "kitro_connected_wallet";

export function isCrossmarkInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.crossmark?.isInstalled || window.crossmark?.methods?.isInstalled?.());
}

export async function connectCrossmark(): Promise<WalletState> {
  if (typeof window === "undefined") {
    throw new Error("Cannot connect wallet outside browser");
  }

  if (!isCrossmarkInstalled()) {
    throw new Error("Crossmark extension not detected. Please install Crossmark or use Developer Testnet mode.");
  }

  try {
    const res = await window.crossmark?.methods?.signInAndWait?.();
    const address = res?.response?.data?.address;
    const networkType = res?.response?.data?.network?.type?.toLowerCase() || "testnet";

    if (!address) {
      throw new Error("No address returned from Crossmark");
    }

    const state: WalletState = {
      isConnected: true,
      address,
      network: networkType.includes("main") ? "mainnet" : "testnet",
      walletType: "crossmark",
    };

    saveWalletState(state);
    return state;
  } catch (err: any) {
    throw new Error(err.message || "Crossmark connection was rejected or timed out");
  }
}

export function connectDeveloperTestnet(customAddress?: string): WalletState {
  const address = customAddress?.trim() || PREFUNDED_TESTNET_OPERATOR;
  const state: WalletState = {
    isConnected: true,
    address,
    network: "testnet",
    walletType: "developer_testnet",
  };
  saveWalletState(state);
  return state;
}

export function disconnectWallet(): WalletState {
  const state: WalletState = {
    isConnected: false,
    address: null,
    network: "unknown",
    walletType: null,
  };
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("kitro_wallet_changed"));
  }
  return state;
}

export function getSavedWalletState(): WalletState {
  if (typeof window === "undefined") {
    return { isConnected: false, address: null, network: "unknown", walletType: null };
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore JSON error
  }
  return { isConnected: false, address: null, network: "unknown", walletType: null };
}

function saveWalletState(state: WalletState) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event("kitro_wallet_changed"));
  }
}
