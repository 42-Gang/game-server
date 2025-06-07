import { TypeOf, z } from 'zod';

const handleMatchCreatedInputSchema = z.object({});
type HandleMatchCreatedInput = TypeOf<typeof handleMatchCreatedInputSchema>;

const handleMatchResultInputSchema = z.object({});
type HandleMatchResultInput = TypeOf<typeof handleMatchResultInputSchema>;

export default class MatchTopicService {
  async handleMatchCreated(messageValue: HandleMatchCreatedInput): Promise<void> {
    handleMatchCreatedInputSchema.parse(messageValue);
  }

  async handleMatchResult(messageValue: HandleMatchResultInput): Promise<void> {
    handleMatchResultInputSchema.parse(messageValue);
  }
}
