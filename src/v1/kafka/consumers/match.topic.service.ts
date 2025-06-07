import { TypeOf, z } from 'zod';

const handleMatchCreatedInputSchema = z.object({});
type HandleMatchCreatedInput = TypeOf<typeof handleMatchCreatedInputSchema>;

const handleMatchResultInputSchema = z.object({});
type HandleMatchResultInput = TypeOf<typeof handleMatchResultInputSchema>;

export default class MatchTopicService {
  async handleMatchCreated(messageValue: HandleMatchCreatedInput): Promise<void> {
    handleMatchCreatedInputSchema.parse(messageValue);

    // TODO: 매치정보(서버정보 및 매치 ID등) 해당 매치에 참여한 유저들에게 전달
  }

  async handleMatchResult(messageValue: HandleMatchResultInput): Promise<void> {
    handleMatchResultInputSchema.parse(messageValue);

    // TODO: 매치 결과 DB에 저장

    // TODO: 매치 결과(승패 및 점수 등) 해당 토너먼트에 참여한 유저들에게 전달
  }
}
