import {
  type SurveyAnswers,
  type SurveyContentBlock,
  type SurveyDefinition,
  type SurveyQuestion,
  getSurveyQuestions
} from "@fragebogen/shared";

type SurveyRendererProps = {
  definition: SurveyDefinition;
  answers: SurveyAnswers;
  onChange?: (questionId: string, value: SurveyAnswers[string]) => void;
  readOnly?: boolean;
  eyebrow?: string;
  showDescription?: boolean;
};

function renderQuestionValue(
  question: SurveyQuestion,
  value: SurveyAnswers[string],
  onChange?: (value: SurveyAnswers[string]) => void,
  readOnly?: boolean
) {
  switch (question.type) {
    case "text":
    case "email":
      return (
        <input
          className="field-input"
          type={question.type === "email" ? "email" : "text"}
          value={typeof value === "string" ? value : ""}
          placeholder={question.placeholder}
          disabled={readOnly}
          onChange={(event) => onChange?.(event.target.value)}
        />
      );

    case "number":
      return (
        <input
          className="field-input"
          type="number"
          value={typeof value === "number" ? value : ""}
          min={question.min}
          max={question.max}
          step={question.step}
          disabled={readOnly}
          onChange={(event) =>
            onChange?.(event.target.value === "" ? null : Number(event.target.value))
          }
        />
      );

    case "date":
      return (
        <input
          className="field-input"
          type="date"
          value={typeof value === "string" ? value : ""}
          min={question.min}
          max={question.max}
          disabled={readOnly}
          onChange={(event) => onChange?.(event.target.value)}
        />
      );

    case "textarea":
      return (
        <textarea
          className="field-input field-textarea"
          rows={question.rows}
          value={typeof value === "string" ? value : ""}
          placeholder={question.placeholder}
          disabled={readOnly}
          onChange={(event) => onChange?.(event.target.value)}
        />
      );

    case "singleChoice":
      return (
        <div className="choice-list">
          {question.options.map((option) => (
            <label className="choice-item" key={option.value}>
              <input
                type="radio"
                name={question.id}
                checked={value === option.value}
                disabled={readOnly}
                onChange={() => onChange?.(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      );

    case "multiChoice": {
      const selected = Array.isArray(value) ? value : [];

      return (
        <div className="choice-list">
          {question.options.map((option) => (
            <label className="choice-item" key={option.value}>
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                disabled={readOnly}
                onChange={(event) => {
                  const nextValue = event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((current) => current !== option.value);
                  onChange?.(nextValue);
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      );
    }
  }
}

function renderContentBlock(content: SurveyContentBlock) {
  return (
    <section className="content-card" key={content.id}>
      <p>{content.textMd}</p>
    </section>
  );
}

export function SurveyRenderer({
  definition,
  answers,
  onChange,
  readOnly = false,
  eyebrow,
  showDescription = true
}: SurveyRendererProps) {
  return (
    <div className="survey-frame">
      <div className="survey-header">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2>{definition.title}</h2>
        {showDescription && definition.descriptionMd ? <p>{definition.descriptionMd}</p> : null}
      </div>

      {definition.sections && definition.sections.length > 0 ? (
        <div className="section-list">
          {definition.sections.map((section) => (
            <section className="section-card" key={section.id}>
              <div className="section-header">
                <h3>{section.title}</h3>
                {section.descriptionMd ? <p className="muted">{section.descriptionMd}</p> : null}
              </div>
              <div className="question-list">
                {section.items.map((item) =>
                  item.kind === "content" ? (
                    renderContentBlock(item)
                  ) : (
                    <section className="question-card" key={item.id}>
                      <div className="question-title-row">
                        <h3>
                          {item.label}
                          {item.required ? <span className="required-star"> *</span> : null}
                        </h3>
                      </div>
                      {item.helpTextMd ? <p className="muted">{item.helpTextMd}</p> : null}
                      {renderQuestionValue(
                        item,
                        answers[item.id] ?? (item.type === "multiChoice" ? [] : ""),
                        (value) => onChange?.(item.id, value),
                        readOnly
                      )}
                    </section>
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="question-list">
          {getSurveyQuestions(definition).map((question) => (
            <section className="question-card" key={question.id}>
              <div className="question-title-row">
                <h3>
                  {question.label}
                  {question.required ? <span className="required-star"> *</span> : null}
                </h3>
              </div>
              {question.helpTextMd ? <p className="muted">{question.helpTextMd}</p> : null}
              {renderQuestionValue(
                question,
                answers[question.id] ?? (question.type === "multiChoice" ? [] : ""),
                (value) => onChange?.(question.id, value),
                readOnly
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
