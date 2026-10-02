export type AlbumResult =
  | { status: 'empty' }
  | { status: 'done'; printCount: number; skippedCount: number; pageCount?: number };
