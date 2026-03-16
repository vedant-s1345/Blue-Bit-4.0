package com.gitlens.backend.dto;

import java.util.List;

public class ChatRequest {

    private String systemPrompt;
    private List<Message> messages;

    public String getSystemPrompt() { return systemPrompt; }
    public void setSystemPrompt(String systemPrompt) { this.systemPrompt = systemPrompt; }

    public List<Message> getMessages() { return messages; }
    public void setMessages(List<Message> messages) { this.messages = messages; }

    public static class Message {
        private String role;    // "user" or "assistant"
        private String content;

        public String getRole()    { return role; }
        public void setRole(String role) { this.role = role; }

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
}
