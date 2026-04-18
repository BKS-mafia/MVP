interface ChatDTO {
        id: number;
        name: string;
        lastMessage: string;
        lastMessageTime: string;
        unread: number;
        avatar: string | null;
        online: boolean;
        isGroup?: boolean;
}
export default ChatDTO;