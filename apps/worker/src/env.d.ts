export interface Env {
  ROMS: R2Bucket;
  ART: R2Bucket;
  CONFIG: R2Bucket;
  PROFILES: R2Bucket;
  ROOM: DurableObjectNamespace;
  SCANNER: DurableObjectNamespace;
  ADMIN_TOKEN: string;
  R2_MODE: string;
}
