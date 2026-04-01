import { useEffect, useMemo, useState } from "react";
import {
  type SurveyAnswers,
  type SurveyDefinition,
  sampleSurveyDefinition,
  surveyDefinitionSchema
} from "@fragebogen/shared";
import { SurveyRenderer } from "./components/SurveyRenderer";
import { api } from "./lib/api";

type SurveyListItem = {
  id: string;
  title: string;
  slug: string;
  recipientEmail: string;
  createdAt: string;
  definition: SurveyDefinition;
  responseCount: number;
};

const RECIPIENT_EMAIL_STORAGE_KEY = "fragebogen.recipientEmail";

function createInitialEditorState() {
  return {
    title: "",
    slug: "",
    recipientEmail: "",
    definitionText: ""
  };
}

function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatAnswerValue(value: SurveyAnswers[string]) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "—";
  }

  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function SubmissionSummary({
  definition,
  answers
}: {
  definition: SurveyDefinition;
  answers: SurveyAnswers;
}) {
  return (
    <section className="summary-list">
      {definition.questions.map((question) => (
        <article className="summary-item" key={question.id}>
          <h3>{question.label}</h3>
          <p>{formatAnswerValue(answers[question.id])}</p>
        </article>
      ))}
    </section>
  );
}

function createInitialAnswers(definition: SurveyDefinition): SurveyAnswers {
  return definition.questions.reduce<SurveyAnswers>((acc, question) => {
    acc[question.id] = question.type === "multiChoice" ? [] : "";
    return acc;
  }, {});
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main className="shell login-shell">
      <section className="hero-card">
        <span className="eyebrow">Admin</span>
        <h1>Online Fragebogen</h1>

        <div className="stack">
          <div className="pin-row">
            <label className="field-label pin-inline-label" htmlFor="admin-pin">
              PIN
            </label>
            <input
              id="admin-pin"
              className="field-input pin-input"
              type="password"
              value={pin}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="######"
            />
          </div>

          <button
            className="primary-button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError("");

              try {
                await api.login(pin);
                onLogin();
              } catch (caughtError) {
                setError(
                  caughtError instanceof Error ? caughtError.message : "Login fehlgeschlagen."
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Prüfe..." : "Login"}
          </button>

          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}

function OpenIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="open-icon">
      <path
        d="M14 5h5v5m0-5-8 8M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="open-icon">
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="open-icon">
      <path
        d="M3 6h18M8 6V4h8v2m-7 4v7m6-7v7M6 6l1 14h10l1-14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AdminApp({ onLogout }: { onLogout: () => void }) {
  const initialState = createInitialEditorState();
  const [title, setTitle] = useState(initialState.title);
  const [slug, setSlug] = useState(initialState.slug);
  const [recipientEmail, setRecipientEmail] = useState(initialState.recipientEmail);
  const [definitionText, setDefinitionText] = useState(initialState.definitionText);
  const [slugEditedManually, setSlugEditedManually] = useState(false);
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [pendingDeleteSurveyId, setPendingDeleteSurveyId] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewAnswers, setPreviewAnswers] = useState<SurveyAnswers>(
    createInitialAnswers(sampleSurveyDefinition)
  );

  const parsedDefinition = useMemo(() => {
    if (definitionText.trim() === "") {
      return { definition: null, error: "" };
    }

    try {
      const parsedJson = JSON.parse(definitionText);
      const definition = surveyDefinitionSchema.parse(parsedJson);
      return { definition, error: "" };
    } catch (caughtError) {
      return {
        definition: null,
        error: caughtError instanceof Error ? caughtError.message : "Ungültige Definition."
      };
    }
  }, [definitionText]);

  useEffect(() => {
    if (parsedDefinition.definition) {
      setPreviewAnswers(createInitialAnswers(parsedDefinition.definition));
    }
  }, [parsedDefinition.definition]);

  useEffect(() => {
    api
      .listSurveys()
      .then(setSurveys)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const storedRecipientEmail = window.localStorage.getItem(RECIPIENT_EMAIL_STORAGE_KEY);
    if (storedRecipientEmail) {
      setRecipientEmail(storedRecipientEmail);
    }
  }, []);

  useEffect(() => {
    if (!slugEditedManually) {
      setSlug(slugifyTitle(title));
    }
  }, [title, slugEditedManually]);

  useEffect(() => {
    if (!pendingDeleteSurveyId) {
      return;
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        setPendingDeleteSurveyId(null);
        return;
      }

      const deleteControl = target.closest("[data-delete-control-id]");
      if (
        deleteControl &&
        deleteControl.getAttribute("data-delete-control-id") === pendingDeleteSurveyId
      ) {
        return;
      }

      setPendingDeleteSurveyId(null);
    }

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [pendingDeleteSurveyId]);

  function resetEditor() {
    const nextState = createInitialEditorState();
    setTitle(nextState.title);
    setSlug(nextState.slug);
    setRecipientEmail(window.localStorage.getItem(RECIPIENT_EMAIL_STORAGE_KEY) ?? nextState.recipientEmail);
    setDefinitionText(nextState.definitionText);
    setSlugEditedManually(false);
    setEditingSurveyId(null);
    setMessage("");
  }

  function loadSurveyForEditing(survey: SurveyListItem) {
    setEditingSurveyId(survey.id);
    setTitle(survey.title);
    setSlug(survey.slug);
    setRecipientEmail(survey.recipientEmail);
    setDefinitionText(JSON.stringify(survey.definition, null, 2));
    setSlugEditedManually(survey.slug !== slugifyTitle(survey.title));
    setMessage(`Bearbeitung geladen: ${survey.title}`);
  }

  async function deleteSurvey(survey: SurveyListItem) {
    await api.deleteSurvey(survey.id);
    const refreshedSurveys = await api.listSurveys();
    setSurveys(refreshedSurveys);
    setPendingDeleteSurveyId(null);

    if (editingSurveyId === survey.id) {
      resetEditor();
    }

    setMessage(`Gelöscht: ${survey.title}`);
  }

  const allFieldsFilled =
    title.trim() !== "" &&
    slug.trim() !== "" &&
    recipientEmail.trim() !== "" &&
    definitionText.trim() !== "" &&
    Boolean(parsedDefinition.definition);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Online Fragebögen</span>
          <h1>Fragebögen verwalten</h1>
        </div>

        <button
          className="ghost-button"
          onClick={async () => {
            try {
              await api.logout();
            } finally {
              onLogout();
            }
          }}
        >
          Logout
        </button>
      </header>

      <section className="dashboard-grid">
        <div className="panel stack">
          <div className="panel-heading">
            <div>
            <h2>Fragebogen bearbeiten</h2>
            </div>
            <button className="primary-button new-button" type="button" onClick={resetEditor}>
              + Neu
            </button>
          </div>

          <label className="field-label">
            Titel
            <input
              className="field-input"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="field-label">
            Slug
            <input
              className="field-input"
              required
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEditedManually(true);
              }}
            />
          </label>

          <label className="field-label">
            Empfänger-E-Mail
            <input
              className="field-input"
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </label>

          <label className="field-label">
            Fragebogen-Definition
            <textarea
              className="field-input code-editor"
              required
              value={definitionText}
              onChange={(e) => setDefinitionText(e.target.value)}
            />
          </label>

          {parsedDefinition.error ? <p className="error-text">{parsedDefinition.error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}

          <button
            className="primary-button"
            disabled={!allFieldsFilled || saving}
            onClick={async () => {
              if (!parsedDefinition.definition || !allFieldsFilled) {
                return;
              }

              setSaving(true);
              setMessage("");

              try {
                const saved = editingSurveyId
                  ? await api.updateSurvey(editingSurveyId, {
                      title,
                      slug,
                      recipientEmail,
                      definition: parsedDefinition.definition
                    })
                  : await api.createSurvey({
                      title,
                      slug,
                      recipientEmail,
                      definition: parsedDefinition.definition
                    });

                window.localStorage.setItem(RECIPIENT_EMAIL_STORAGE_KEY, recipientEmail);
                setMessage(
                  `${editingSurveyId ? "Aktualisiert" : "Gespeichert"}. Öffentlicher Link: ${window.location.origin}/f/${saved.slug}`
                );
                setSurveys(await api.listSurveys());
              } catch (caughtError) {
                setMessage(
                  caughtError instanceof Error ? caughtError.message : "Speichern fehlgeschlagen."
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Speichere..." : editingSurveyId ? "Änderungen speichern" : "Fragebogen speichern"}
          </button>
        </div>

        <div className="stack">
          <section className="panel">
            {parsedDefinition.definition ? (
              <SurveyRenderer
                definition={{ ...parsedDefinition.definition, title }}
                answers={previewAnswers}
                eyebrow="Vorschau"
                onChange={(questionId, value) =>
                  setPreviewAnswers((current) => ({ ...current, [questionId]: value }))
                }
              />
            ) : (
              <div className="empty-state">
                <h2>Keine Vorschau möglich</h2>
                <p>Die JSON-Definition ist noch nicht valide.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Fragebögen</h2>
              <span className="badge">{surveys.length}</span>
            </div>

            <div className="survey-list survey-list-spaced">
              {surveys.map((survey) => (
                <article className="list-item" key={survey.id}>
                  <div>
                    <div className="title-row">
                      <h3>{survey.title}</h3>
                      <button
                        className="title-edit-button"
                        type="button"
                        title="Fragebogen bearbeiten"
                        aria-label={`Fragebogen ${survey.title} bearbeiten`}
                        onClick={() => loadSurveyForEditing(survey)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className={`title-delete-button${pendingDeleteSurveyId === survey.id ? " danger-confirm" : ""}`}
                        type="button"
                        title={
                          pendingDeleteSurveyId === survey.id
                            ? "Nochmal klicken, um Fragebogen und Antworten zu löschen"
                            : "Fragebogen löschen"
                        }
                        aria-label={
                          pendingDeleteSurveyId === survey.id
                            ? `Nochmal klicken, um ${survey.title} zu löschen`
                            : `Fragebogen ${survey.title} löschen`
                        }
                        data-delete-control-id={survey.id}
                        onClick={async (event) => {
                          event.stopPropagation();

                          if (pendingDeleteSurveyId === survey.id) {
                            try {
                              await deleteSurvey(survey);
                            } catch (caughtError) {
                              setMessage(
                                caughtError instanceof Error
                                  ? caughtError.message
                                  : "Löschen fehlgeschlagen."
                              );
                            }
                            return;
                          }

                          setPendingDeleteSurveyId(survey.id);
                        }}
                      >
                        {pendingDeleteSurveyId === survey.id ? "?" : <TrashIcon />}
                      </button>
                    </div>
                    <div className="link-row">
                      <a
                        className="survey-link"
                        href={`${window.location.origin}/f/${survey.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Formular in neuem Tab öffnen"
                      >
                        {`${window.location.origin}/f/${survey.slug}`}
                      </a>
                      <a
                        className="icon-link"
                        href={`${window.location.origin}/f/${survey.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Formular in neuem Tab öffnen"
                        aria-label={`Formular ${survey.title} in neuem Tab öffnen`}
                      >
                        <OpenIcon />
                      </a>
                    </div>
                  </div>
                  <div className="list-meta">
                    <span>{survey.responseCount} Antworten</span>
                    <span>{survey.recipientEmail}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function PublicDummy({ slug }: { slug: string }) {
  const [definition, setDefinition] = useState<SurveyDefinition | null>(null);
  const [title, setTitle] = useState(sampleSurveyDefinition.title);
  const [answers, setAnswers] = useState<SurveyAnswers>(createInitialAnswers(sampleSurveyDefinition));
  const [submitted, setSubmitted] = useState<null | {
    submittedAt: string;
    answers: SurveyAnswers;
  }>(null);

  useEffect(() => {
    api
      .getPublicSurvey(slug)
      .then((survey) => {
        setDefinition(survey.definition);
        setTitle(survey.title);
        setAnswers(createInitialAnswers(survey.definition));
      })
      .catch(() => {
        setDefinition(sampleSurveyDefinition);
        setTitle(sampleSurveyDefinition.title);
        setAnswers(createInitialAnswers(sampleSurveyDefinition));
      });
  }, [slug]);

  const activeDefinition = definition ?? sampleSurveyDefinition;

  if (submitted) {
    return (
      <main className="shell">
        <section className="panel stack">
          <div className="thanks-header">
            <span className="eyebrow">Danke</span>
            <h1>Antwort erfolgreich gesendet</h1>
            <p className="muted">Gesendet am {new Date(submitted.submittedAt).toLocaleString("de-DE")}</p>
            <p>Ihre Antworten. Sie können diese Seite als PDF für Ihre Unterlagen speichern.</p>
          </div>
          <SubmissionSummary definition={activeDefinition} answers={submitted.answers} />
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="panel stack">
        <SurveyRenderer
          definition={{ ...activeDefinition, title }}
          answers={answers}
          showDescription={false}
          onChange={(questionId, value) => setAnswers((current) => ({ ...current, [questionId]: value }))}
        />

        <button
          className="primary-button"
          onClick={async () => {
            const result = await api.submitResponse(slug, answers);
            setSubmitted({
              submittedAt: result.submittedAt,
              answers: result.answers
            });
          }}
        >
          Antworten absenden
        </button>
      </section>
    </main>
  );
}

export function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const pathname = window.location.pathname;
  const slug = pathname.startsWith("/f/") ? pathname.slice(3).split("/")[0] : "";

  useEffect(() => {
    api
      .getSession()
      .then((result) => setAuthenticated(result.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);

  if (pathname.startsWith("/f/")) {
    return <PublicDummy slug={slug} />;
  }

  if (checking) {
    return (
      <main className="shell login-shell">
        <section className="hero-card">
          <h1>Lade Admin-Bereich...</h1>
        </section>
      </main>
    );
  }

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  return <AdminApp onLogout={() => setAuthenticated(false)} />;
}
