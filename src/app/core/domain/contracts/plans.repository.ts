import { Plan, PlanDraft } from '../entities/plan';

/** Ver CategoryGroupsRepository por qué es una clase abstracta y por qué no lleva clubId. */
export abstract class PlansRepository {
  abstract list(): Promise<Plan[]>;
  abstract create(draft: PlanDraft): Promise<void>;
  abstract update(id: string, draft: PlanDraft): Promise<void>;
  abstract remove(id: string): Promise<void>;
}
