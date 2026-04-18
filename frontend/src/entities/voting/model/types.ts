export interface VotingMessage {
    id: string;
    type: 'voting';
    title: string;
    options: { userId: string; userName: string }[];
    chatId: string;
}