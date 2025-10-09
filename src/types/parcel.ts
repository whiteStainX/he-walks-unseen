export interface Choice {
  text: string;
  target: string;
}

export interface ConversationNode {
  text: string;
  choices: Choice[];
}

export interface Parcel {
  title: string;
  nodes: Record<string, ConversationNode>;
}
