import { NextRequest, NextResponse } from "next/server";
import os from "os";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Auth check: allow if token is present, cookie is present, or running locally
    const header = req.headers.get("authorization") || "";
    const cookieToken = req.cookies.get("gestiona_token")?.value || req.cookies.get("token")?.value;
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : cookieToken;
    const session = token ? await verifyToken(token) : null;
    const host = req.headers.get("host") || "";
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");

    if (!session && !isLocal) {
      return NextResponse.json(
        { success: false, error: "غير مصرّح — سجّل الدخول أولاً" },
        { status: 401 }
      );
    }
    const interfaces = os.networkInterfaces();
    const addresses: { address: string; family: string; internal: boolean; iface: string }[] = [];

    for (const [name, ifaceList] of Object.entries(interfaces)) {
      if (!ifaceList) continue;
      for (const iface of ifaceList) {
        // filter out internal loopback addresses and IPv6 for cleaner mobile scanning
        if (!iface.internal && iface.family === "IPv4") {
          addresses.push({
            address: iface.address,
            family: iface.family,
            internal: iface.internal,
            iface: name,
          });
        }
      }
    }

    // Pick most likely LAN address (starts with 192.168 or 10. or 172.)
    const primary =
      addresses.find((a) => a.address.startsWith("192.168.")) ||
      addresses.find((a) => a.address.startsWith("10.")) ||
      addresses.find((a) => a.address.startsWith("172.")) ||
      addresses[0];

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    const ip = primary ? primary.address : "localhost";
    const localUrl = `http://${ip}:${port}`;

    return NextResponse.json({
      success: true,
      hostname: os.hostname(),
      port,
      primaryIp: ip,
      localUrl,
      allAddresses: addresses.map((a) => ({
        ip: a.address,
        interface: a.iface,
        url: `http://${a.address}:${port}`,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
