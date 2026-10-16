"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "./types";

export type DeviceRole = "cashier" | "order_taker" | "customer_display" | "monitor";

export interface RemoteDevice {
  id: string;
  name: string;
  role: DeviceRole;
  lastSeen: number;
}

export interface RemoteOrder {
  orderId: string;
  senderName: string;
  senderId: string;
  tableName?: string;
  note?: string;
  items: CartItem[];
  total: number;
  createdAt: number;
}

export interface RoomSyncState {
  // Device identity
  deviceId: string;
  deviceName: string;
  role: DeviceRole;
  setDeviceName: (name: string) => void;
  setRole: (role: DeviceRole) => void;

  // Current room
  currentRoomId: string | null;
  currentRoomName: string | null;
  roomPin: string;
  isConnected: boolean;
  isPolling: boolean;
  connectedDevices: RemoteDevice[];
  incomingOrders: RemoteOrder[];

  // Remote customer screen live cart (when in customer_display mode)
  remoteCart: {
    items: CartItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    senderName: string;
  } | null;

  // Pending P2P Database Snapshot received from another phone in the room
  pendingDbSnapshot: {
    senderName: string;
    senderId: string;
    snapshot: any;
    receivedAt: number;
    counts?: { products: number; customers: number; suppliers: number; sales: number };
  } | null;

  // Actions
  joinRoom: (roomId: string, pin?: string, roomName?: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  broadcastDatabasePush: (snapshot: any) => Promise<void>;
  clearPendingDbSnapshot: () => void;
  submitOrderToCashier: (order: {
    items: CartItem[];
    tableName?: string;
    note?: string;
    total: number;
  }) => Promise<boolean>;
  broadcastCartUpdate: (cart: {
    items: CartItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  }) => Promise<void>;
  dismissOrder: (orderId: string) => void;
  clearIncomingOrders: () => void;
  syncWithServer: () => Promise<void>;
}

// Helper to play notification chime
export function playAlertChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // audio not allowed before user gesture
  }
}

function getStoredOrNewDeviceId(): string {
  if (typeof window === "undefined") return "dev-init";
  let id = localStorage.getItem("gestiona_device_id");
  if (!id) {
    id = `dev-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
    localStorage.setItem("gestiona_device_id", id);
  }
  return id;
}

let lastEventTimestamp = 0;

export const useRoomSyncStore = create<RoomSyncState>()(
  persist(
    (set, get) => ({
      deviceId: typeof window !== "undefined" ? getStoredOrNewDeviceId() : "dev-server",
      deviceName:
        typeof window !== "undefined" && window.navigator?.userAgent?.includes("Android")
          ? "هاتف أندرويد"
          : typeof window !== "undefined" && window.navigator?.userAgent?.includes("iPhone")
          ? "هاتف آيفون"
          : "نقطة البيع الرئيسية (PC)",
      role: "cashier",
      setDeviceName: (name) => set({ deviceName: name }),
      setRole: (role) => set({ role }),

      currentRoomId: "DZ-STORE-1",
      currentRoomName: "متجر رِواق — القاعة الرئيسية",
      roomPin: "7788",
      isConnected: false,
      isPolling: false,
      connectedDevices: [],
      incomingOrders: [],
      remoteCart: null,
      pendingDbSnapshot: null,

      broadcastDatabasePush: async (snapshot: any) => {
        const { currentRoomId, deviceId, deviceName, role, isConnected } = get();
        if (!currentRoomId || !isConnected) return;
        try {
          await fetch("/api/room-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "send_event",
              roomId: currentRoomId,
              device: { id: deviceId, name: deviceName, role },
              event: {
                type: "DATABASE_TRANSFER_PUSH",
                payload: { snapshot },
              },
            }),
          });
        } catch {}
      },

      clearPendingDbSnapshot: () => set({ pendingDbSnapshot: null }),

      joinRoom: async (roomId: string, pin = "", roomName = "") => {
        const { deviceId, deviceName, role } = get();
        try {
          const res = await fetch("/api/room-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "join",
              roomId,
              pin,
              roomName: roomName || `غرفة ${roomId}`,
              device: { id: deviceId, name: deviceName, role },
            }),
          });
          const data = await res.json();
          if (data.success) {
            set({
              currentRoomId: roomId,
              currentRoomName: roomName || `غرفة ${roomId}`,
              roomPin: pin,
              isConnected: true,
              connectedDevices: data.devices || [],
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      leaveRoom: async () => {
        const { currentRoomId, deviceId } = get();
        if (currentRoomId) {
          try {
            await fetch("/api/room-sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "leave",
                roomId: currentRoomId,
                device: { id: deviceId },
              }),
            });
          } catch {}
        }
        set({ isConnected: false, connectedDevices: [], incomingOrders: [] });
      },

      submitOrderToCashier: async (order) => {
        const { currentRoomId, deviceId, deviceName } = get();
        if (!currentRoomId) return false;
        try {
          const res = await fetch("/api/room-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "send_event",
              roomId: currentRoomId,
              device: { id: deviceId, name: deviceName, role: get().role },
              event: {
                type: "ORDER_SUBMITTED",
                payload: {
                  orderId: `ord-${Date.now().toString(36)}`,
                  items: order.items,
                  tableName: order.tableName,
                  note: order.note,
                  total: order.total,
                },
              },
            }),
          });
          const data = await res.json();
          return Boolean(data.success);
        } catch {
          return false;
        }
      },

      broadcastCartUpdate: async (cart) => {
        const { currentRoomId, deviceId, deviceName, role, isConnected } = get();
        if (!currentRoomId || !isConnected) return;
        try {
          await fetch("/api/room-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "send_event",
              roomId: currentRoomId,
              device: { id: deviceId, name: deviceName, role },
              event: {
                type: "CART_UPDATE",
                payload: cart,
              },
            }),
          });
        } catch {}
      },

      dismissOrder: (orderId) => {
        set((state) => ({
          incomingOrders: state.incomingOrders.filter((o) => o.orderId !== orderId),
        }));
      },

      clearIncomingOrders: () => set({ incomingOrders: [] }),

      syncWithServer: async () => {
        const { currentRoomId, deviceId, deviceName, role, isConnected } = get();
        if (!currentRoomId) return;

        try {
          // Heartbeat
          if (isConnected) {
            await fetch("/api/room-sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "heartbeat",
                roomId: currentRoomId,
                device: { id: deviceId, name: deviceName, role },
              }),
            });
          }

          // Fetch active devices and new events
          const res = await fetch(
            `/api/room-sync?roomId=${encodeURIComponent(currentRoomId)}&since=${lastEventTimestamp}`
          );
          const data = await res.json();
          if (data.success && data.room) {
            set({
              connectedDevices: data.room.devices || [],
              isConnected: true,
            });

            // Process events
            const events = data.room.events || [];
            if (events.length > 0) {
              lastEventTimestamp = data.room.serverTime || Date.now();

              events.forEach((evt: any) => {
                // If order submitted and we are cashier
                if (evt.type === "ORDER_SUBMITTED" && evt.senderId !== deviceId) {
                  const newOrd: RemoteOrder = {
                    orderId: evt.payload.orderId || evt.id,
                    senderName: evt.senderName,
                    senderId: evt.senderId,
                    tableName: evt.payload.tableName,
                    note: evt.payload.note,
                    items: evt.payload.items || [],
                    total: evt.payload.total || 0,
                    createdAt: evt.timestamp,
                  };
                  playAlertChime();
                  set((s) => ({
                    incomingOrders: [newOrd, ...s.incomingOrders.filter((o) => o.orderId !== newOrd.orderId)],
                  }));
                }

                // If cart update and we are customer_display or monitor
                if (evt.type === "CART_UPDATE" && evt.senderId !== deviceId) {
                  set({
                    remoteCart: {
                      ...evt.payload,
                      senderName: evt.senderName,
                    },
                  });
                }

                // If database transfer push received from another phone in the room
                if (evt.type === "DATABASE_TRANSFER_PUSH" && evt.senderId !== deviceId) {
                  playAlertChime();
                  set({
                    pendingDbSnapshot: {
                      senderName: evt.senderName,
                      senderId: evt.senderId,
                      snapshot: evt.payload.snapshot,
                      receivedAt: evt.timestamp,
                      counts: evt.payload.snapshot?.counts,
                    },
                  });
                }
              });
            }
          }
        } catch {}
      },
    }),
    {
      name: "gestiona-room-sync-storage",
      partialize: (state) => ({
        deviceId: state.deviceId,
        deviceName: state.deviceName,
        role: state.role,
        currentRoomId: state.currentRoomId,
        currentRoomName: state.currentRoomName,
        roomPin: state.roomPin,
      }),
    }
  )
);
