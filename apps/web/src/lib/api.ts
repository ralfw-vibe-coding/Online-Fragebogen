import type { SurveyAnswers, SurveyDefinition, SurveyRecord } from "@fragebogen/shared";

const API_URL = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {})
      }
    });
  } catch {
    throw new Error("Server nicht erreichbar. Bitte prüfen, ob `npm run dev` läuft.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unbekannter Fehler." }));
    throw new Error(error.message ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  getSession(): Promise<{ authenticated: boolean }> {
    return request("/api/admin/session", { method: "GET" });
  },

  login(pin: string): Promise<{ ok: boolean }> {
    return request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ pin })
    });
  },

  logout(): Promise<{ ok: boolean }> {
    return request("/api/admin/logout", { method: "POST" });
  },

  listSurveys(): Promise<Array<SurveyRecord & { responseCount: number }>> {
    return request("/api/admin/surveys", { method: "GET" });
  },

  createSurvey(input: {
    title: string;
    slug: string;
    recipientEmail: string;
    definition: SurveyDefinition;
  }): Promise<SurveyRecord> {
    return request("/api/admin/surveys", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  updateSurvey(
    id: string,
    input: {
      title: string;
      slug: string;
      recipientEmail: string;
      definition: SurveyDefinition;
    }
  ): Promise<SurveyRecord> {
    return request(`/api/admin/surveys/${id}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },

  getPublicSurvey(slug: string): Promise<SurveyRecord> {
    return request(`/api/public/${slug}`, { method: "GET" });
  },

  submitResponse(slug: string, answers: SurveyAnswers): Promise<{
    ok: boolean;
    responseId: string;
    submittedAt: string;
    answers: SurveyAnswers;
    emailPreview: {
      to: string;
      subject: string;
      markdown: string;
      json: SurveyAnswers;
    };
  }> {
    return request(`/api/public/${slug}/responses`, {
      method: "POST",
      body: JSON.stringify({ answers })
    });
  }
};
