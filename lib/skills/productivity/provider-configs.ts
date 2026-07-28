/** ForgeOS Productivity Skills — provider configurations (RC4.3). */

import type { ProductivityProviderConfig } from "./types";

export const EMAIL_CONFIG: ProductivityProviderConfig = {
  id: "productivity-email",
  name: "Productivity Email",
  provider: "email",
  capability: "email_ops",
  risks: ["external_communication", "data_exposure"],
  permissions: ["productivity-email:execute", "email:read", "email:send"],
  actions: [
    { id: "send", name: "Send Email", description: "Send an email message", risk: "medium" },
    { id: "read", name: "Read Inbox", description: "Read inbox messages", risk: "low" },
    { id: "draft", name: "Draft Email", description: "Create or update a draft", risk: "low" },
    { id: "list_threads", name: "List Threads", description: "List email threads", risk: "low" },
    { id: "archive", name: "Archive", description: "Archive messages", risk: "low" },
  ],
  mockData: { inboxCount: 12, unread: 3 },
};

export const CALENDAR_CONFIG: ProductivityProviderConfig = {
  id: "productivity-calendar",
  name: "Productivity Calendar",
  provider: "calendar",
  capability: "calendar_ops",
  risks: ["scheduling", "external_communication"],
  permissions: ["productivity-calendar:execute", "calendar:read", "calendar:write"],
  actions: [
    { id: "list_events", name: "List Events", description: "List calendar events", risk: "low" },
    { id: "create_event", name: "Create Event", description: "Schedule a new event", risk: "medium" },
    { id: "update_event", name: "Update Event", description: "Modify an event", risk: "medium" },
    { id: "check_availability", name: "Check Availability", description: "Check free/busy slots", risk: "low" },
    { id: "cancel_event", name: "Cancel Event", description: "Cancel a scheduled event", risk: "medium" },
  ],
  mockData: { upcomingEvents: 5, conflicts: 0 },
};

export const FILES_CONFIG: ProductivityProviderConfig = {
  id: "productivity-files",
  name: "Productivity Files",
  provider: "files",
  capability: "file_ops",
  risks: ["data_exposure", "storage"],
  permissions: ["productivity-files:execute", "files:read", "files:write"],
  actions: [
    { id: "upload", name: "Upload File", description: "Upload a file", risk: "medium" },
    { id: "download", name: "Download File", description: "Download a file", risk: "low" },
    { id: "list", name: "List Files", description: "List files in folder", risk: "low" },
    { id: "share", name: "Share File", description: "Share file with link", risk: "high" },
    { id: "delete", name: "Delete File", description: "Delete a file", risk: "high" },
  ],
  mockData: { fileCount: 24, totalSizeMb: 156 },
};

export const DOCUMENTS_CONFIG: ProductivityProviderConfig = {
  id: "productivity-documents",
  name: "Productivity Documents",
  provider: "documents",
  capability: "document_ops",
  risks: ["data_exposure", "collaboration"],
  permissions: ["productivity-documents:execute", "documents:read", "documents:write"],
  actions: [
    { id: "create", name: "Create Document", description: "Create a new document", risk: "medium" },
    { id: "edit", name: "Edit Document", description: "Edit document content", risk: "medium" },
    { id: "collaborate", name: "Collaborate", description: "Invite collaborators", risk: "medium" },
    { id: "comment", name: "Add Comment", description: "Add a comment", risk: "low" },
    { id: "export", name: "Export", description: "Export document", risk: "low" },
  ],
  mockData: { activeDocs: 8, collaborators: 3 },
};

export const MESSAGING_CONFIG: ProductivityProviderConfig = {
  id: "productivity-messaging",
  name: "Productivity Messaging",
  provider: "messaging",
  capability: "messaging_ops",
  risks: ["external_communication", "data_exposure"],
  permissions: ["productivity-messaging:execute", "slack:read", "slack:write"],
  actions: [
    { id: "list_channels", name: "List Channels", description: "List Slack channels", risk: "low" },
    { id: "post_message", name: "Post Message", description: "Post a channel message", risk: "medium" },
    { id: "read_thread", name: "Read Thread", description: "Read message thread", risk: "low" },
    { id: "reply_thread", name: "Reply Thread", description: "Reply in thread", risk: "medium" },
    { id: "search", name: "Search Messages", description: "Search messages", risk: "low" },
  ],
  mockData: { channels: 6, unreadMentions: 2 },
};

export const MEETINGS_CONFIG: ProductivityProviderConfig = {
  id: "productivity-meetings",
  name: "Productivity Meetings",
  provider: "meetings",
  capability: "meeting_ops",
  risks: ["external_communication", "recording"],
  permissions: ["productivity-meetings:execute", "meetings:read", "meetings:write"],
  actions: [
    { id: "create", name: "Create Meeting", description: "Schedule a meeting", risk: "medium" },
    { id: "join", name: "Join Meeting", description: "Join a meeting link", risk: "low" },
    { id: "record", name: "Record Meeting", description: "Start recording", risk: "high" },
    { id: "notes", name: "Meeting Notes", description: "Save meeting notes", risk: "low" },
    { id: "end", name: "End Meeting", description: "End active meeting", risk: "low" },
  ],
  mockData: { scheduledToday: 2, recordings: 1 },
};

export const KNOWLEDGE_CONFIG: ProductivityProviderConfig = {
  id: "productivity-knowledge",
  name: "Productivity Knowledge",
  provider: "knowledge",
  capability: "knowledge_ops",
  risks: ["data_exposure"],
  permissions: ["productivity-knowledge:execute", "knowledge:read", "knowledge:write"],
  actions: [
    { id: "search", name: "Search", description: "Search knowledge base", risk: "low" },
    { id: "get_article", name: "Get Article", description: "Retrieve an article", risk: "low" },
    { id: "create_article", name: "Create Article", description: "Create wiki article", risk: "medium" },
    { id: "update_wiki", name: "Update Wiki", description: "Update wiki page", risk: "medium" },
    { id: "list_spaces", name: "List Spaces", description: "List wiki spaces", risk: "low" },
  ],
  mockData: { articles: 42, spaces: 5 },
};

export const ALL_PRODUCTIVITY_CONFIGS = [
  EMAIL_CONFIG,
  CALENDAR_CONFIG,
  FILES_CONFIG,
  DOCUMENTS_CONFIG,
  MESSAGING_CONFIG,
  MEETINGS_CONFIG,
  KNOWLEDGE_CONFIG,
] as const;
