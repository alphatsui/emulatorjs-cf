export interface RomEntry {
  name: string;
  size: number;
  etag: string;
  lastModified: string;
}

export interface RomMetadata {
  [sha: string]: RomMetaItem;
}

export interface RomMetaItem {
  vid?: string;
  logo?: string;
  back?: string;
  corner?: string;
  video_position?: string;
  ref?: string;
  name?: string;
  cloneof?: string;
}

export interface ConfigFile {
  name: string;
  display_items: number;
  defaults: ConfigDefaults;
  items: Record<string, ConfigItem>;
}

export interface ConfigDefaults {
  has_logo: boolean;
  has_back: boolean;
  has_corner: boolean;
  has_video: boolean;
  rom_extension: string;
  video_position: string;
  multi_disc: number;
}

export interface ConfigItem {
  cloneof?: string;
  multi_disc?: number;
  video_position?: string;
  has_logo?: boolean;
  has_back?: boolean;
  has_corner?: boolean;
  has_video?: boolean;
  rom_extension?: string;
}

export interface MainConfig extends ConfigFile {
  items: Record<string, { video_position: string }>;
}

export interface ProfileEntry {
  username: string;
}

export interface ProfileMap {
  [hash: string]: ProfileEntry;
}

export interface WsEnvelope {
  event: string;
  data?: unknown;
  room?: string;
}

export interface ConsoleDef {
  name: string;
  video_position: string;
}

export const CONSOLES: ConsoleDef[] = [
  { name: '3do', video_position: 'left:11.5vw;top:30vh;width:36.3vw;height:45.5vh;' },
  { name: 'arcade', video_position: 'left:10.3vw;top:30.5vh;width:36.5vw;height:48vh;' },
  { name: 'atari2600', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'atari5200', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'atari7800', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'colecovision', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'doom', video_position: 'left:11.5vw;top:30vh;width:36.3vw;height:45.5vh;' },
  { name: 'gb', video_position: 'left:14.5vw;top:31vh;width:26vw;height:43.5vh;' },
  { name: 'gba', video_position: 'left:13.5vw;top:36vh;width:31.7vw;height:38.3vh;' },
  { name: 'gbc', video_position: 'left:15.5vw;top:31.2vh;width:28vw;height:44.7vh;' },
  { name: 'jaguar', video_position: 'left:11.5vw;top:30vh;width:36.3vw;height:45.5vh;' },
  { name: 'lynx', video_position: 'left:11vw;top:31vh;width:36vw;height:44vh;' },
  { name: 'msx', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'n64', video_position: 'left:11.5vw;top:30vh;width:36.3vw;height:45.5vh;' },
  { name: 'nds', video_position: 'left:23.8vw;top:25.7vh;width:20vw;height:56vh;' },
  { name: 'nes', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'ngp', video_position: 'left:15vw;top:34vh;width:25vw;height:40vh;' },
  { name: 'odyssey2', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'pce', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'psx', video_position: 'left:11.5vw;top:30vh;width:36.3vw;height:45.5vh;' },
  { name: 'sega32x', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'segaCD', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'segaGG', video_position: 'left:12.3vw;top:31.5vh;width:33.4vw;height:43.3vh;' },
  { name: 'segaMD', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'segaMS', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'segaSaturn', video_position: 'left:11.5vw;top:30vh;width:36.3vw;height:45.5vh;' },
  { name: 'segaSG', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'snes', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'vb', video_position: 'left:11.5vw;top:31.5vh;width:36vw;height:43vh;' },
  { name: 'vectrex', video_position: 'left:18vw;top:30vh;width:22vw;height:46vh;' },
  { name: 'ws', video_position: 'left:11.5vw;top:31vh;width:35vw;height:43vh;' },
];

export const META_VARIABLES: [string, string, string][] = [
  ['vid', 'videos', '.mp4'],
  ['logo', 'logos', '.png'],
  ['back', 'backgrounds', '.png'],
  ['corner', 'corners', '.png'],
];

export const SOCKET_IO_EVENTS = [
  'renderconfigs',
  'renderroms',
  'renderromsdir',
  'renderromslanding',
  'renderlanding',
  'renderconfig',
  'rendermetajson',
  'renderrom',
  'modaldata',
  'emptymodal',
  'renderfiledirs',
  'renderprofiles',
  'romdata',
  'saveconfig',
  'dldefaultfiles',
  'scanroms',
  'addtoconfig',
  'purgenoart',
  'downloadart',
  'usermeta',
  'getroms',
  'getconfig',
  'getmeta',
  'getromdata',
  'uploadart',
  'updatevidposition',
  'removemeta',
  'custommeta',
  'createprofile',
  'deleteprofile',
  'renderfiles',
] as const;

export type SocketIoEvent = (typeof SOCKET_IO_EVENTS)[number];
