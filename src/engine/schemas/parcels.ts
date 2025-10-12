import { z } from 'zod';

const ChoiceSchema = z.object({
  text: z.string(),
  target: z.string(),
});

const ConversationNodeSchema = z.object({
  text: z.string(),
  choices: z.array(ChoiceSchema),
});

export const ParcelSchema = z.object({
  title: z.string(),
  nodes: z.record(ConversationNodeSchema),
});

export const ParcelCollectionSchema = z.record(ParcelSchema);
