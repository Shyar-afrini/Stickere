import { Directory, File, Paths } from "expo-file-system";
import Storage from "expo-sqlite/kv-store";

import type { EditorState } from "@/lib/sticker-editor-store";

// A draft is the editing page frozen: the photo, everything drawn on it and the
// route params needed to carry on to the details step. The index lives in the
// key-value store; the images are copied into a folder of their own.
const KEY = "stickerDrafts";
const DIRECTORY = "drafts";

type Editor = Partial<EditorState>;

type StoredDraft = {
  id: string;
  updatedAt: number;
  params: Record<string, string>;
  /** Paths relative to the documents folder, which moves when the app is updated. */
  original: string;
  editor: Editor;
};

export type Draft = Omit<StoredDraft, "original"> & {
  /** The photo as picked. */
  originalUri: string;
};

const root = () => Paths.document.uri;
const directory = () => new Directory(Paths.document, DIRECTORY);

const toRelative = (uri: string) => (uri.startsWith(root()) ? uri.slice(root().length) : uri);
const toAbsolute = (path: string) => (path.startsWith("file:") ? path : root() + path);

function readAll(): StoredDraft[] {
  try {
    return JSON.parse(Storage.getItemSync(KEY) ?? "[]") as StoredDraft[];
  } catch {
    return [];
  }
}

const writeAll = (drafts: StoredDraft[]) => Storage.setItemSync(KEY, JSON.stringify(drafts));

/** Applies `change` to every file path inside the editor state (base photo and sticker layers). */
function mapUris(editor: Editor, change: (uri: string) => string): Editor {
  return {
    ...editor,
    ...(editor.baseUri && { baseUri: change(editor.baseUri) }),
    ops: editor.ops?.map((op) =>
      op.kind === "layer" && op.type === "image" ? { ...op, value: change(op.value) } : op,
    ),
  };
}

function resolve(draft: StoredDraft): Draft {
  const { original, editor, ...rest } = draft;
  return { ...rest, originalUri: toAbsolute(original), editor: mapUris(editor, toAbsolute) };
}

/** Newest first. */
export function listDrafts(): Draft[] {
  return readAll()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(resolve);
}

export function getDraft(id: string): Draft | undefined {
  const found = readAll().find((draft) => draft.id === id);
  return found && resolve(found);
}

/** Copies a picked or cached image into the drafts folder; images already there stay put. */
async function keep(uri: string, name: string) {
  const source = new File(uri);
  if (uri.startsWith(directory().uri)) return uri;

  directory().create({ intermediates: true, idempotent: true });
  const extension = uri.split("?")[0].split(".").pop() ?? "png";
  const target = new File(directory(), `${name}.${extension}`);
  if (target.exists) target.delete();
  await source.copy(target);
  return target.uri;
}

type SaveInput = {
  /** Set when the draft was resumed, so saving again replaces it. */
  id?: string;
  params: Record<string, string>;
  originalUri: string;
  editor: Editor;
};

export async function saveDraft({ id, params, originalUri, editor }: SaveInput) {
  const draftId = id ?? `${Date.now()}`;

  const original = await keep(originalUri, `${draftId}-original`);
  const baseUri = editor.baseUri && editor.baseUri !== originalUri ? await keep(editor.baseUri, `${draftId}-base`) : original;

  const stored: StoredDraft = {
    id: draftId,
    updatedAt: Date.now(),
    params,
    original: toRelative(original),
    editor: mapUris({ ...editor, baseUri }, toRelative),
  };
  writeAll([...readAll().filter((draft) => draft.id !== draftId), stored]);
  return draftId;
}

export function deleteDraft(id: string) {
  writeAll(readAll().filter((draft) => draft.id !== id));
  try {
    const folder = directory();
    if (!folder.exists) return;
    for (const entry of folder.list()) {
      if (entry instanceof File && entry.name.startsWith(`${id}-`)) entry.delete();
    }
  } catch {
    // The index is already updated; leftover files are harmless.
  }
}
