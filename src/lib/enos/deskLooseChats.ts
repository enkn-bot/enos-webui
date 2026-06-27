// Native "Chats" group — the home for project-less conversation on Desk.
//
// The two-birds model (folder-first focus AND loose chat): a chat sent without a
// formal project lands in a native, system-owned "Chats" group instead of spawning a
// noise project. The group is NOT a normal project:
//   - undeletable / unrenameable (it's virtual — there's no folder row to delete),
//   - conditionally visible (only appears when it actually holds loose chats),
//   - carries NO project context (no cloud folder, no files panel, no Local/Cloud
//     badge) so its chats render as PLAIN conversations — "clean".
// A loose chat can later be PROMOTED into a real project (set its folder_id).
//
// A loose Desk chat is identified structurally: no folder (folder_id == null) but
// explicitly tagged to the Desk surface (meta.surface === 'desk'). The surface tag is
// what keeps it on Desk — an untagged folder-less chat defaults to the Chat surface.

export const DESK_CHATS_GROUP_NAME = 'Chats';

type LooseChatLike = {
	folder_id?: unknown;
	meta?: { surface?: unknown } | null;
};

/** True when a chat is a loose Desk chat: no project, surface-tagged to Desk. */
export const isLooseDeskChat = (chat: LooseChatLike | null | undefined): boolean =>
	Boolean(chat) && chat?.folder_id == null && chat?.meta?.surface === 'desk';

/** All loose Desk chats in a list. */
export const looseDeskChats = <T extends LooseChatLike>(chats: T[] | null | undefined): T[] =>
	(Array.isArray(chats) ? chats : []).filter(isLooseDeskChat);

/** The native "Chats" group renders only when it holds at least one loose Desk chat. */
export const showDeskChatsGroup = (chats: LooseChatLike[] | null | undefined): boolean =>
	looseDeskChats(chats).length > 0;
