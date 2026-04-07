# Legacy Rasa Starter (Nira Chatbot)

This folder contains starter Rasa training data for the GTTC LMS chatbot named Nira.

Runtime note:

- The live backend chatbot integration now uses Gemini API through Spring Boot.
- This Rasa folder is optional reference/training data and is not required for normal runtime.

## Files

- `domain.yml`: intents and responses
- `nlu.yml`: training examples
- `stories.yml`: simple dialogue flows
- `config.yml`: pipeline and policies

## Run locally

```bash
rasa train
rasa run --enable-api --cors "*"
```

Set backend environment variables:

- `APP_CHATBOT_GEMINI_API_KEY`
- `APP_CHATBOT_GEMINI_MODEL` (optional, default: `gemini-flash-latest`)
- `APP_CHATBOT_GEMINI_BASE_URL` (optional, default: `https://generativelanguage.googleapis.com/v1beta`)
