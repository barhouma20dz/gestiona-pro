import { NextRequest, NextResponse } from "next/server";

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
  globalRooms.__gestionaRooms = new Map<string, RoomState>();
  // Create a default secure closed room
  globalRooms.__gestionaRooms.set("DZ-STORE-1", {
    id: "DZ-STORE-1",
    name: "متجر رِواق — الغرفة المغلقة الآمنة",
    pin: "7788",
    isClosed: true,
    isLocked: false,
    createdAt: Date.now(),
    devices: new Map(),
    events: [],
  });
}

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

  // If no roomId, return list of available rooms (without PINs)
  if (!roomId) {
    const list = Array.from(rooms.values()).map((r) => {
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
    const body = await req.json();
    const { action, roomId, pin, device, event, roomName } = body;

    // Action: Create Closed Room (مثل مشروع photo finish)
    if (action === "create_closed_room" || action === "create_room") {
      const isClosed = action === "create_closed_room" || body.isClosed !== false;
      const newId = roomId || `DZ-${isClosed ? "CLOSED-" : ""}${Math.floor(1000 + Math.random() * 9000)}`;
      const newPin = pin || String(Math.floor(1000 + Math.random() * 9000));
      const room: RoomState = {
        id: newId,
        name: roomName || (isClosed ? `غرفة مغلقة مشفرة ${newId}` : `غرفة متجر ${newId}`),
        pin: newPin,
        isClosed,
        isLocked: false,
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
        room = {
          id: roomId,
          name: roomName || `غرفة متجر ${roomId}`,
          pin: pin || "7788",
          isClosed: true,
          isLocked: false,
          createdAt: Date.now(),
          devices: new Map(),
          events: [],
        };
        rooms.set(roomId, room);
      } else {
        return NextResponse.json({ success: false, error: "الغرفة غير موجودة" }, { status: 404 });
      }
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

    // Verify PIN for closed rooms
    if (room.pin && (pin || room.isClosed)) {
      if (!pin || room.pin !== pin) {
        return NextResponse.json({ success: false, error: "رمز PIN غير صحيح للدخول إلى الغرفة المغلقة" }, { status: 403 });
      }
    }

    // Action: Toggle Room Lock (Closed Room Feature)
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
