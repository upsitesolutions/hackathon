const DEFAULT_API_BASE_URL = 'http://localhost:7071/api';
const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');

export const API_BASE_URL =
  configuredApiBaseUrl && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl
    : DEFAULT_API_BASE_URL;

export type MessageVerdict = 'on_track' | 'adjust' | 'done';

export type CreateSessionResponse = {
  sessionId: string;
  recipeId: string;
};

export type SendMessageRequest = {
  sessionId: string;
  recipeId: string;
  stepId: string;
  question: string;
  imageBase64?: string;
};

export type SendMessageResponse = {
  verdict: MessageVerdict;
  advice: string;
  confidence: number;
  imageUrl?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function createSession(recipeId: string): Promise<CreateSessionResponse> {
  const data = await postJson<unknown>('/session', { recipeId });

  if (!isCreateSessionResponse(data)) {
    throw new ApiError('Session API returned an unexpected response.', 0, 'INVALID_RESPONSE');
  }

  return data;
}

export async function sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
  const data = await postJson<unknown>('/message', request);

  if (!isSendMessageResponse(data)) {
    throw new ApiError('Message API returned an unexpected response.', 0, 'INVALID_RESPONSE');
  }

  return data;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(
      `Unable to reach SousAI API at ${API_BASE_URL}. Check your connection and API server.`,
      0,
      error instanceof Error ? error.name : 'NETWORK_ERROR'
    );
  }

  const responseBody = await parseJsonSafely(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(responseBody, response.status), response.status);
  }

  return responseBody as T;
}

function buildUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(body: unknown, status: number) {
  if (isObjectRecord(body)) {
    const error = getString(body.error);
    const message = getString(body.message);

    if (error) {
      return error;
    }

    if (message) {
      return message;
    }
  }

  if (typeof body === 'string' && body.trim().length > 0) {
    return body.trim();
  }

  return `SousAI API request failed with HTTP ${status}.`;
}

function isCreateSessionResponse(value: unknown): value is CreateSessionResponse {
  return (
    isObjectRecord(value) &&
    typeof value.sessionId === 'string' &&
    value.sessionId.length > 0 &&
    typeof value.recipeId === 'string' &&
    value.recipeId.length > 0
  );
}

function isSendMessageResponse(value: unknown): value is SendMessageResponse {
  return (
    isObjectRecord(value) &&
    isMessageVerdict(value.verdict) &&
    typeof value.advice === 'string' &&
    value.advice.length > 0 &&
    typeof value.confidence === 'number' &&
    Number.isFinite(value.confidence) &&
    (value.imageUrl === undefined || typeof value.imageUrl === 'string')
  );
}

function isMessageVerdict(value: unknown): value is MessageVerdict {
  return value === 'on_track' || value === 'adjust' || value === 'done';
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
