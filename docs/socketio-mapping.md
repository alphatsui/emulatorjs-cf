## Socket.IO → WebSocket mapping

The upstream `index.js` uses Socket.IO for bidirectional admin UI communication. On Cloudflare Workers, this is replaced by a Durable Object (`RoomDO`) using the Hibernating WebSocket API.

### Connection

```
Upstream:  io() → socket.io handshake → connected
Workers:   new WebSocket(`${workerUrl}/ws?room=${roomId}`) → connected
```

### Message format

Both directions use JSON envelopes:

```json
{ "event": "<event-name>", "data": <any> }
```

### Event mapping

| Upstream socket.io event | Direction | Workers equivalent |
|---|---|---|
| `renderconfigs` | server→client | `{event:"renderconfigs", data:[...]}` via broadcast |
| `renderroms` | server→client | `{event:"renderroms", data:{...}}` |
| `renderromsdir` | server→client | `{event:"renderromsdir", data:[...]}` |
| `renderromslanding` | server→client | `{event:"renderromslanding", data:{...}}` |
| `renderlanding` | server→client | `{event:"renderlanding"}` |
| `renderconfig` | server→client | `{event:"renderconfig", data:{...}}` |
| `rendermetajson` | server→client | `{event:"rendermetajson", data:{...}}` |
| `renderrom` | server→client | `{event:"renderrom", data:[...]}` |
| `modaldata` | server→client | `{event:"modaldata", data:"..."}` |
| `emptymodal` | server→client | `{event:"emptymodal"}` |
| `renderfiledirs` | server→client | `{event:"renderfiledirs", data:[...]}` |
| `renderprofiles` | server→client | `{event:"renderprofiles", data:[...]}` |
| `romdata` | server→client | `{event:"romdata", data:{...}}` |
| `saveconfig` | client→server | `{event:"saveconfig", data:{name,config}}` → Worker writes to R2 |
| `scanroms` | client→server | `{event:"scanroms", data:[folder,fullScan]}` → ScannerDO |
| `addtoconfig` | client→server | `{event:"addtoconfig", data:dir}` → Worker updates config |
| `purgenoart` | client→server | `{event:"purgenoart", data:dir}` |
| `downloadart` | client→server | `{event:"downloadart", data:dir}` → Worker fetches from R2 |
| `usermeta` | client→server | `{event:"usermeta", data:[romSha,linkSha,dir]}` |
| `getroms` | client→server | `{event:"getroms", data:dir}` |
| `getconfig` | client→server | `{event:"getconfig", data:file}` |
| `getmeta` | client→server | `{event:"getmeta", data:file}` |
| `getromdata` | client→server | `{event:"getromdata", data:[dir,file]}` |
| `uploadart` | client→server | `{event:"uploadart", data:[type,dir,file,hash,buffer]}` |
| `updatevidposition` | client→server | `{event:"updatevidposition", data:[dir,file,hash,pos]}` |
| `removemeta` | client→server | `{event:"removemeta", data:[romSha,dir,file,purge]}` |
| `custommeta` | client→server | `{event:"custommeta", data:[romSha,dir,name]}` |
| `createprofile` | client→server | `{event:"createprofile", data:[user,pass]}` |
| `deleteprofile` | client→server | `{event:"deleteprofile", data:user}` |
| `renderfiles` | client→server | `{event:"renderfiles"}` |
| `rendermeta` | client→server | `{event:"rendermeta"}` |
| `ping` | client→server | `{event:"ping"}` → `{event:"pong", ts:...}` |

### Room semantics

- One `RoomDO` instance per `room` id (from the `?room=` query param).
- All WebSocket clients connected to the same room receive broadcasts.
- Client-to-server events are processed by the DO and broadcast to other peers.
- Server-originated events (e.g., scan progress) are sent by the DO to all connected clients.

### Client adapter (frontend)

Replace `socket.io-client` with ~50 lines:

```js
const ws = new WebSocket(`${API}/ws?room=admin`);
ws.onmessage = (e) => {
  const { event, data } = JSON.parse(e.data);
  handlers[event]?.(data);
};
function emit(event, data) {
  ws.send(JSON.stringify({ event, data }));
}
```
