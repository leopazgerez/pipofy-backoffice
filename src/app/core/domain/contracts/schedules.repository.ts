import {
  Schedule,
  ScheduleDraft,
  SessionGenerationDraft,
  SessionGenerationResult,
} from '../entities/schedule';

export abstract class SchedulesRepository {
  abstract list(): Promise<Schedule[]>;
  abstract create(draft: ScheduleDraft): Promise<void>;
  abstract update(id: string, draft: ScheduleDraft): Promise<void>;
  abstract remove(id: string): Promise<void>;
  abstract generateSessions(draft: SessionGenerationDraft): Promise<SessionGenerationResult>;
}
