#!/usr/bin/env python3
"""Vercel setup: validate token, find project, upsert DATABASE_URL + JWT_SECRET,
trigger production redeploy, poll until READY/ERROR."""
import json
import sys
import time
import urllib.error
import urllib.request

TOKEN = "vcp_1BRJCmDIYlgVbTzRcDDX8o65g83YiVgZjViqunXZxkeaFddY4f3xOMcF"
API = "https://api.vercel.com"

DATABASE_URL = (
    "postgresql://neondb_owner:npg_lqZ37XOTAKbt@"
    "ep-broad-poetry-b13vghx7-pooler.c-5.eu-central-1.aws.neon.tech/neondb"
    "?sslmode=require&pgbouncer=true&connection_limit=10"
)
JWT_SECRET = "8bwYL7EuLrRkcrChbjDP7S+qN8PAd0VMmFf+f1Khcng="


def api(method, path, body=None, params=""):
    url = f"{API}{path}{params}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            txt = r.read().decode()
            return r.status, (json.loads(txt) if txt else {})
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try:
            return e.code, json.loads(txt)
        except Exception:
            return e.code, {"raw": txt[:500]}


def main():
    # 1. Validate token (user endpoint may 404 for scoped tokens — non-fatal)
    s, user = api("GET", "/v2/user")
    if s == 200:
        u = user.get("user", {})
        print("Token OK — user:", u.get("username") or u.get("email"))
    else:
        print(f"Note: /v2/user returned {s} (scoped token?) — continuing")

    # 2. Find the project
    s, pl = api("GET", "/v9/projects")
    if s != 200:
        print("PROJECTS FAIL:", s, pl)
        sys.exit(1)
    projects = pl.get("projects", [])
    print("Projects:", [p["name"] for p in projects] or "NONE")

    KNOWN_ID = "prj_IHoHSsmOaeC4eLCOCPRd0vLHglSt"
    proj = next((p for p in projects if p["id"] == KNOWN_ID), None)
    if not proj:
        proj = next((p for p in projects if p["name"] in ("gestiona-pro", "my-project")), None)
    if not proj:
        # fallback: match by deployment alias containing five-liard-35
        for p in projects:
            s2, deps = api("GET", "/v6/deployments", params=f"?projectId={p['id']}&limit=5")
            if s2 == 200:
                for d in deps.get("deployments", []):
                    if any("five-liard-35" in a for a in (d.get("alias") or [])):
                        proj = p
                        break
            if proj:
                break
    if not proj and projects:
        proj = projects[0]  # last resort: only project there is
    if not proj:
        print("ERROR: no project found")
        sys.exit(1)

    pid, pname = proj["id"], proj["name"]
    print(f"Using project: {pname} ({pid})")

    # 3. Upsert env vars (delete-then-create for correct values)
    s, envs = api("GET", f"/v9/projects/{pid}/env")
    existing = {e["key"]: e["id"] for e in envs.get("envs", [])} if s == 200 else {}
    print("Existing env keys:", list(existing.keys()) or "none")
    for key, value in [("DATABASE_URL", DATABASE_URL), ("JWT_SECRET", JWT_SECRET)]:
        if key in existing:
            s2, resp = api("DELETE", f"/v9/projects/{pid}/env/{existing[key]}")
            print(f"  deleted old {key}: HTTP {s2}")
        body = [
            {
                "key": key,
                "value": value,
                "type": "encrypted",
                "target": ["production", "preview", "development"],
            }
        ]
        s2, resp = api("POST", f"/v10/projects/{pid}/env", body)
        if s2 not in (200, 201):
            print(f"  CREATE {key} FAILED: {s2} {json.dumps(resp)[:300]}")
            sys.exit(1)
        print(f"  created {key} OK")

    # 4. Find last production deployment to redeploy from
    s, deps = api("GET", "/v6/deployments", params=f"?projectId={pid}&target=production&limit=5")
    if s != 200 or not deps.get("deployments"):
        print("NO DEPLOYMENTS via projectId, retrying with app name:", s)
        s, deps = api("GET", "/v6/deployments", params=f"?app={pname}&target=production&limit=5")
    def state_of(d):
        return d.get("readyState") or d.get("state") or "?"

    deployments = deps.get("deployments", [])
    for d in deployments[:3]:
        print(f"  existing: {d.get('uid') or d.get('id')} state={state_of(d)} target={d.get('target')}")

    # 5. Trigger production redeploy — prefer gitSource (builds latest main commit,
    #    NOT a pinned old SHA like deploymentId would)
    print("Triggering deployment from github main (latest commit)...")
    s, dep = api(
        "POST",
        "/v13/deployments",
        {
            "name": pname,
            "target": "production",
            "gitSource": {"type": "github", "org": "barhouma20dz", "repo": "gestiona-pro", "ref": "main"},
        },
    )
    if s not in (200, 201):
        print("gitSource deploy failed:", s, json.dumps(dep)[:300], "— trying deploymentId redeploy")
        ready = next((d for d in deployments if state_of(d) == "READY"), None)
        src = ready or (deployments[0] if deployments else None)
        if not src:
            print("NO SOURCE AVAILABLE — cannot deploy")
            sys.exit(1)
        src_id = src.get("id") or src.get("uid")
        s, dep = api("POST", "/v13/deployments", {"name": pname, "deploymentId": src_id, "target": "production"})
        if s not in (200, 201):
            print("DEPLOY TRIGGER FAILED:", s, json.dumps(dep)[:400])
            sys.exit(1)
    dep_id = dep.get("id") or dep.get("uid")
    print("New deployment triggered:", dep_id, dep.get("url"))

    # 6. Poll until terminal state
    deadline = time.time() + 470
    last = None
    while time.time() < deadline:
        s, d = api("GET", f"/v13/deployments/{dep_id}")
        state = (d.get("readyState") or d.get("state") or f"HTTP{s}") if s == 200 else f"HTTP{s}"
        if state != last:
            print(f"  [{time.strftime('%H:%M:%S')}] {state}")
            last = state
        if state == "READY":
            print("ALIASES:", d.get("alias"))
            print("DEPLOY SUCCESS")
            return
        if state in ("ERROR", "CANCELED"):
            print("DEPLOY FAILED:", d.get("errorMessage"))
            s2, ev = api("GET", f"/v2/deployments/{dep_id}/events", params="?limit=100")
            if s2 == 200:
                lines = []
                events = ev if isinstance(ev, list) else ev.get("events", [])
                for e in events:
                    txt = (e.get("payload") or {}).get("text") or ""
                    if txt.strip():
                        lines.append(txt.rstrip())
                print("---- last build log lines ----")
                print("\n".join(lines[-45:]))
            sys.exit(2)
        time.sleep(10)
    print("TIMEOUT — deployment still building; poll again with the script or dashboard")
    sys.exit(3)


if __name__ == "__main__":
    main()
