
interface MessageDTO {
        id: string;
        chatId: number;
        senderId: string;
        text: string;
        timestamp: string;
        isOwn: boolean;
    }
export default MessageDTO;