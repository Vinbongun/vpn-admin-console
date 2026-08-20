import { mockCurrentStaff, type CurrentStaff } from "@/lib/access-control";

/** Replace this interface with the generated OpenAPI client, without changing UI consumers. */
export interface AdminApiClient {
  getCurrentStaff(): Promise<CurrentStaff>;
}

export const mockAdminApi: AdminApiClient = {
  async getCurrentStaff() {
    return mockCurrentStaff;
  },
};
