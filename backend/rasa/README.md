# Rasa Setup (Nira Chatbot)

This folder contains starter Rasa training data for the GTTC LMS chatbot named Nira.

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

Default webhook endpoint used by backend:

`http://localhost:5005/webhooks/rest/webhook`

Set backend environment variables:

- `APP_CHATBOT_RASA_WEBHOOK_URL`
- `APP_CHATBOT_RASA_AUTH_TOKEN` (optional)
