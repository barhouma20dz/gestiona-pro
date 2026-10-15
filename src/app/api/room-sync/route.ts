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
  type: "CART_UPDATE" | "ORDER_SUBMITTED" | "ORDER_ACCEPTED" | "SALE_COMPLETED" | "ANNOUNCEMENT";
  payload: any;
  timestamp: number;
}

export interface RoomState {
  id: string;
  name: string;
  pin: string;
  storeId: string | null; // tenant binding — room only visible to this store
  createdAt: number;
  devices: Map<string, RoomDevice>;
  events: RoomEvent[];
}

/**
 * Extracts the JWT session from the Authorization header.
 * Every room-sync operation requires a signed-in user of the SaaS.
 */
async function requireSession(req: NextRequest): Promise<SessionPayload | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Tenant guard: a room belongs to the store that created it.
 * SUPER_ADMIN (storeId = null) may access any room.
 */
function canAccessRoom(session: SessionPayload, room: RoomState): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (!room.storeId) return true; // unbound (admin-created) room → any signed-in user with the PIN
  return session.storeId === room.storeId;
}

// Global in-memory rooms store
const globalRooms = global as unknown as {
  __gestionaRooms?: Map<string, RoomState>;
};

if (!globalRooms.__gestionaRooms) {
  globalRooms.__gestionaRooms = new Map<string, RoomState>();
  // Default room (unbound — protected by its PIN + JWT requirement)
  globalRooms.__gestionaRooms.set("DZ-STORE-1", {
    id: "DZ-STORE-1",
    name: "القاعة الرئيسية",
    pin: "7788",
    storeId: null,
    createdAt: Date.now(),
    devices: new Map(),
    events: [],
  });
}

// Hard cap on number of rooms to prevent memory exhaustion
const MAX_ROOMS = 200;

const rooms = globalRooms.__gestionaRooms;

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
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const since = parseInt(searchParams.get("since") || "0", 10);

  // Auth required for every read
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "غير مصرّح — سجّل الدخول أولاً" }, { status: 401 });
  }

  // If no roomId, return list of available rooms visible to this store (without PINs)
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
          createdAt: r.createdAt,
        };
      });
    return NextResponse.json({ success: true, rooms: list });
  }

  const room = rooms.get(roomId);
  if (!room) {
    return NextResponse.json({ success: false, error: "الغرفة غير موجودة" }, { status: 404 });
  }

  if (!canAccessRoom(session, room)) {
    return NextResponse.json({ success: false, error: "الغرفة تنتمي لمتجر آخر" }, { status: 403 });
  }

  cleanupRoom(room);

  // Filter events newer than `since`
  const newEvents = room.events.filter((e) => e.timestamp > since);

  return NextResponse.json({
    success: true,
    room: {
      id: room.id,
      name: room.name,
      devices: Array.from(room.devices.values()),
      events: newEvents,
      serverTime: Date.now(),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Auth required for every write
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "غير مصرّح — سجّل الدخول أولاً" }, { status: 401 });
    }

    const body = await req.json();
    const { action, roomId, pin, device, event, roomName } = body;

    // Action: Create Room
    if (action === "create_room") {
      if (rooms.size >= MAX_ROOMS) {
        return NextResponse.json({ success: false, error: "تم الوصول للحد الأقصى من الغرف" }, { status: 429 });
      }
      const newId = roomId || `DZ-${Math.floor(1000 + Math.random() * 9000)}`;
      if (rooms.has(newId)) {
        return NextResponse.json({ success: false, error: "معرّف الغرفة مستخدم بالفعل" }, { status: 409 });
      }
      const newPin = pin || String(Math.floor(1000 + Math.random() * 9000));
      const room: RoomState = {
        id: newId,
        name: roomName || `غرفة متجر ${newId}`,
        pin: newPin,
        storeId: session.storeId, // bind to the creator's store
        createdAt: Date.now(),
        devices: new Map(),
        events: [],
      };
      rooms.set(newId, room);
      return NextResponse.json({ success: true, room: { id: newId, name: room.name, pin: newPin } });
    }

    // Existing room operations require valid roomId
    if (!roomId) {
      return NextResponse.json({ success: false, error: "معرّف الغرفة مطلوب" }, { status: 400 });
    }

    let room = rooms.get(roomId);
    if (!room) {
      // Auto-create room if requested (bound to the joiner's store)
      if (action === "join" || action === "auto_create") {
        if (rooms.size >= MAX_ROOMS) {
          return NextResponse.json({ success: false, error: "تم الوصول للحد الأقصى من الغرف" }, { status: 429 });
        }
        room = {
          id: roomId,
          name: roomName || `غرفة متجر ${roomId}`,
          pin: pin || "1234",
          storeId: session.storeId, // bind to the joiner's store
          createdAt: Date.now(),
          devices: new Map(),
          events: [],
        };
        rooms.set(roomId, room);
      } else {
        return NextResponse.json({ success: false, error: "الغرفة غير موجودة" }, { status: 404 });
      }
    }

    // Tenant guard: block cross-store access
    if (!canAccessRoom(session, room)) {
      return NextResponse.json({ success: false, error: "الغرفة تنتمي لمتجر آخر" }, { status: 403 });
    }

    // Verify PIN whenever the room has one — omitting it is NOT a bypass.
    // (leave is exempt: disconnecting must never be blocked)
    if (room.pin && action !== "leave" && pin !== room.pin) {
      return NextResponse.json({ success: false, error: "رمز PIN غير صحيح أو مفقود" }, { status: 403 });
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
