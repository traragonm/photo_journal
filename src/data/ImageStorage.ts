import { Directory, File, Paths } from 'expo-file-system';

const PHOTOS_DIR_NAME = 'photos';
const PHOTO_EXTENSION = '.jpg';

/**
 * Owns image files on disk. Files live in the app's document directory
 * (persisted, backed up by the OS, never uploaded by us).
 * Only relative file names are stored in the DB; absolute uris are resolved here.
 */
export class ImageStorage {
  private readonly dir: Directory;

  constructor(rootDirectory: Directory = new Directory(Paths.document, PHOTOS_DIR_NAME)) {
    this.dir = rootDirectory;
  }

  ensureReady(): void {
    this.dir.create({ idempotent: true, intermediates: true });
  }

  fileNameFor(id: string): string {
    return `${id}${PHOTO_EXTENSION}`;
  }

  resolveUri(fileName: string): string {
    return new File(this.dir, fileName).uri;
  }

  exists(fileName: string): boolean {
    const file = new File(this.dir, fileName);
    return file.exists && file.size > 0;
  }

  /**
   * Copies a captured temp image into permanent storage and returns its file name.
   * Copy (not move) so a failure never loses the source; the temp file is
   * deleted best-effort only after the copy is verified on disk.
   */
  async persist(sourceUri: string, id: string): Promise<string> {
    this.ensureReady();
    const fileName = this.fileNameFor(id);
    const destination = new File(this.dir, fileName);
    if (this.exists(fileName)) {
      // Same id captured twice (e.g. double-submit) — keep the first file.
      return fileName;
    }
    const source = new File(sourceUri);
    if (!source.exists || source.size === 0) {
      throw new Error('Captured image is missing or empty.');
    }
    try {
      await source.copy(destination);
    } catch (error) {
      // Never leave a half-written file behind.
      if (destination.exists) destination.delete();
      throw error;
    }
    if (!this.exists(fileName)) {
      throw new Error('Saving the photo failed (file was not written).');
    }
    try {
      source.delete();
    } catch {
      // Temp/cache file; the OS will clean it up eventually.
    }
    return fileName;
  }

  delete(fileName: string): void {
    const file = new File(this.dir, fileName);
    if (file.exists) file.delete();
  }

  /** Lists stored file names (used for orphan cleanup). */
  listFileNames(): string[] {
    if (!this.dir.exists) return [];
    return this.dir
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .map((file) => file.name);
  }

  deleteAll(): void {
    if (this.dir.exists) this.dir.delete();
    this.ensureReady();
  }
}
