// Local settings (charter section 6). Everything lives on the phone under
// one AsyncStorage key. The storage wrapper with defaults on failure arrives
// in T5; T1 only needs the shape and the defaults.

export interface Settings {
  version: 1;
  lastApp: 'instagram' | 'linkedin';
  igUsername: string | null;
  liProfileUrl: string | null;
  allowSharedPosts: boolean;
  hideCounts: boolean;
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  lastApp: 'instagram',
  igUsername: null,
  liProfileUrl: null,
  allowSharedPosts: true,
  hideCounts: false,
  haptics: true,
};
