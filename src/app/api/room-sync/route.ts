import { NextRequest, NextResponse } from "next/server";
import { verifyToken, SessionPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface RoomDevice {
  id: string;
  name: string;
  role: "cashier" | "order_taker" | "customer_display" | "monitor";
  lastSeen: number;
}

export interface RoomEvent {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  targetDeviceId?: string; // Optional target device for direct phone-to-phone communication
  type:
    | "CART_UPDATE"
    | "ORDER_SUBMITTED"
    | "ORDER_ACCEPTED"
    | "SALE_COMPLETED"
    | "ANNOUNCEMENT"
    | "DIRECT_MESSAGE"
    | "PING_DEVICE"
    | "PONG_DEVICE"
    | "STOCK_SYNC_BROADCAST"
    | "DATABASE_TRANSFER_PUSH"
    | "DATABASE_TRANSFER_ACK"
    | "PRINT_RECEIPT_REQUEST";
  payload: any;
  timestamp: number;
}

export interface RoomState {
  id: string;
  name: string;
  pin: string;
  isClosed: boolean; // Closed Room flag like photo-finish
  isLocked: boolean; // Locked by host to prevent new joins
  storeId: string | null; // م-0: tenant binding — room only visible to this store
  hostDeviceId?: string; // Host device ID
  createdAt: number;
  devices: Map<string, RoomDevice>;
  events: RoomEvent[];
}

// Global in-memory rooms store
const globalRooms = global as unknown as {
  __gestionaRooms?: Map<string, RoomState>;
};

if (!globalRooms.__gestionaRooms) {
  // م-0: no pre-seeded room with a hard-coded PIN — rooms are created by
  // signed-in users and get a random PIN unless the creator supplies one.
  globalRooms.__gestionaRooms = new Map<string, RoomState>();
}

const rooms = globalRooms.__gestionaRooms;

// م-0: cap the in-memory room count so an attacker cannot flood the
// server's memory with fabricated rooms (DoS guard).
const MAX_ROOMS = 200;

/** م-0: every caller (GET and POST) must present a valid JWT session. */
async function requireSession(req: NextRequest): Promise<SessionPayload | null> {
  const header = req.headers.get("authorization") || "";
  const cookieToken =
    req.cookies.get("gestiona_token")?.value ||
    req.cookies.get("token")?.value ||
    req.cookies.get("swiftbill-session")?.value;
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : cookieToken;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * م-0: tenant isolation. SUPER_ADMIN (storeId = null) may access any room.
 * A room bound to a store is only accessible to that store's members.
 * Unbound rooms (created before binding, or by admins) are reachable by any
 * signed-in user who also knows the PIN.
 */
function canAccessRoom(session: SessionPayload, room: RoomState): boolean {
  if (!room.storeId) return true;
  if (!session.storeId) return true; // SUPER_ADMIN
  return session.storeId === room.storeId;
}

// Prune inactive devices (> 90s) and old events (> 100)
function cleanupRoom(room: RoomState) {
  const now = Date.now();
  for (const [id, dev] of room.devices.entries()) {
    if (now - dev.lastSeen > 90000) {
      room.devices.delete(id);
    }
  }
  if (room.events.length > 100) {
    room.events = room.events.slice(-100);
  }
}

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "مصادقة مطلوبة" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const since = parseInt(searchParams.get("since") || "0", 10);

  // If no roomId, return list of available rooms (without PINs)
  if (!roomId) {
    const list = Array.from(rooms.values())
      .filter((r) => canAccessRoom(session, r))
      .map((r) => {
        cleanupRoom(r);
        return {
          id: r.id,
          name: r.name,
          deviceCount: r.devices.size,
          hasPin: Boolean(r.pin),
          isClosed: r.isClosed ?? true,
          createdAt: r.createdAt,
        };
      });
    return NextResponse.json({ success: true, rooms: list });
  }

  const room = rooms.get(roomId);
  if (!room || !canAccessRoom(session, room)) {
    return NextResponse.json({ success: false, error: "الغرفة غير موجودة" }, { status: 404 });
  }

  cleanupRoom(room);

  // Filter events newer than `since`
  const newEvents = room.events.filter((e) => e.timestamp > since);

  return NextResponse.json({
    success: true,
    room: {
      id: room.id,
      name: room.name,
      isClosed: room.isClosed ?? true,
      isLocked: room.isLocked ?? false,
      hostDeviceId: room.hostDeviceId,
      devices: Array.from(room.devices.values()),
      events: newEvents,
      serverTime: Date.now(),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // م-0: authentication is mandatory for every room action.
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "مصادقة مطلوبة — سجّل الدخول أولاً" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, roomId, pin, device, event, roomName } = body;

    // Action: Create Closed Room (مثل مشروع photo finish)
    if (action === "create_closed_room" || action === "create_room") {
      if (rooms.size >= MAX_ROOMS) {
        return NextResponse.json(
          { success: false, error: "تم الوصول للحد الأقصى من الغرف" },
          { status: 429 }
        );
      }
      // م-0: the creator picks the ID, but never silently overwrites an
      // existing room with the same ID (hijack guard).
      const isClosed = action === "create_closed_room" || body.isClosed !== false;
      const newId = roomId || `DZ-${isClosed ? "CLOSED-" : ""}${Math.floor(1000 + Math.random() * 9000)}`;
      if (rooms.has(newId)) {
        return NextResponse.json(
          { success: false, error: "معرّف الغرفة مستخدم بالفعل — اختر معرّفاً آخر" },
          { status: 409 }
        );
      }
      const newPin = pin || String(Math.floor(1000 + Math.random() * 9000));
      const room: RoomState = {
        id: newId,
        name: roomName || (isClosed ? `غرفة مغلقة مشفرة ${newId}` : `غرفة متجر ${newId}`),
        pin: newPin,
        isClosed,
        isLocked: false,
        storeId: session.storeId, // م-0: bind to the creator's store
        hostDeviceId: device?.id,
        createdAt: Date.now(),
        devices: new Map(),
        events: [],
      };
      if (device?.id) {
        room.devices.set(device.id, {
          id: device.id,
          name: device.name || "مضيف الغرفة",
          role: device.role || "cashier",
          lastSeen: Date.now(),
        });
      }
      rooms.set(newId, room);
      return NextResponse.json({
        success: true,
        room: {
          id: newId,
          name: room.name,
          pin: newPin,
          isClosed,
          isLocked: false,
        },
      });
    }

    // Existing room operations require valid roomId
    if (!roomId) {
      return NextResponse.json({ success: false, error: "معرّف الغرفة مطلوب" }, { status: 400 });
    }

    let room = rooms.get(roomId);
    if (!room) {
      // Auto-create room if requested
      if (action === "join" || action === "auto_create") {
        if (rooms.size >= MAX_ROOMS) {
          return NextResponse.json(
            { success: false, error: "تم الوصول للحد الأقصى من الغرف" },
            { status: 429 }
          );
        }
        room = {
          id: roomId,
          name: roomName || `غرفة متجر ${roomId}`,
          // م-0: no hard-coded default PIN — the creator's PIN is required
          pin: pin || String(Math.floor(1000 + Math.random() * 9000)),
          isClosed: true,
          isLocked: false,
          storeId: session.storeId, // م-0: bind to the creator's store
          createdAt: Date.now(),
          devices: new Map(),
          events: [],
        };
        rooms.set(roomId, room);
      } else {
        return NextResponse.json({ success: false, error: "الغرفة غير موجودة" }, { status: 404 });
      }
    }

    // م-0: tenant isolation — members of other stores cannot touch this room.
    if (!canAccessRoom(session, room)) {
      return NextResponse.json(
        { success: false, error: "الغرفة غير موجودة" },
        { status: 404 }
      );
    }

    // م-0: PIN is ALWAYS mandatory for a room that has one — the only
    // exemption is "leave" so a device can always disconnect.
    if (room.pin && action !== "leave" && pin !== room.pin) {
      return NextResponse.json(
        { success: false, error: "رمز PIN غير صحيح للدخول إلى الغرفة المغلقة" },
        { status: 403 }
      );
    }

    // Closed Room Lock Check: If room is locked, only existing members can enter
    if (room.isLocked && action === "join" && device?.id && !room.devices.has(device.id)) {
      return NextResponse.json(
        {
          success: false,
          error: "الغرفة المغلقة مقفلة حالياً بواسطة المسؤول لمنع أجهزة جديدة من الدخول.",
        },
        { status: 403 }
      );
    }

    // Action: Toggle Room Lock (Closed Room Feature) — PIN already verified above
    if (action === "toggle_room_lock") {
      room.isLocked = !room.isLocked;
      const statusText = room.isLocked ? "مقفلة (Locked)" : "مفتوحة للأعضاء (Unlocked)";
      room.events.push({
        id: `evt-lock-${Date.now()}`,
        roomId,
        senderId: device?.id || "system",
        senderName: device?.name || "المسؤول",
        type: "ANNOUNCEMENT",
        payload: { message: `تم تحديث حماية الغرفة المغلقة: ${statusText}` },
        timestamp: Date.now(),
      });
      return NextResponse.json({ success: true, isLocked: room.isLocked });
    }

    cleanupRoom(room);

    // Action: Join or Heartbeat
    if (action === "join" || action === "heartbeat") {
      if (device && device.id) {
        room.devices.set(device.id, {
          id: device.id,
          name: device.name || "جهاز غير مسمى",
          role: device.role || "order_taker",
          lastSeen: Date.now(),
        });
      }
      return NextResponse.json({
        success: true,
        devices: Array.from(room.devices.values()),
        serverTime: Date.now(),
      });
    }

    // Action: Leave
    if (action === "leave") {
      if (device?.id) {
        room.devices.delete(device.id);
      }
      return NextResponse.json({ success: true });
    }

    // Action: Broadcast Event
    if (action === "send_event") {
      if (!event || !event.type) {
        return NextResponse.json({ success: false, error: "بيانات الحدث غير صالحة" }, { status: 400 });
      }

      const newEvent: RoomEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        roomId,
        senderId: device?.id || "unknown",
        senderName: device?.name || "جهاز",
        targetDeviceId: event.targetDeviceId,
        type: event.type,
        payload: event.payload,
        timestamp: Date.now(),
      };

      room.events.push(newEvent);

      // Keep device alive
      if (device?.id) {
        room.devices.set(device.id, {
          id: device.id,
          name: device.name || "جهاز",
          role: device.role || "order_taker",
          lastSeen: Date.now(),
        });
      }

      return NextResponse.json({ success: true, eventId: newEvent.id });
    }

    return NextResponse.json({ success: false, error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
