import { getInput, getMultilineInput, info } from "@actions/core";
import { AIProviderType } from "./ai";

export class Config {
  public llmApiKey: string | undefined;
  public llmModel: string | undefined;
  public llmProvider: string;
  public githubToken: string | undefined;
  public styleGuideRules: string | undefined;
  public githubApiUrl: string;
  public githubServerUrl: string;

  public sapAiCoreClientId: string | undefined;
  public sapAiCoreClientSecret: string | undefined;
  public sapAiCoreTokenUrl: string | undefined;
  public sapAiCoreBaseUrl: string | undefined;
  public sapAiResourceGroup: string | undefined;

  public gcpProjectId: string | undefined;
  public gcpLocation: string | undefined;
  public language: string | undefined;

  constructor() {
    // Try to get token from input first, then fall back to environment variable
    this.githubToken = getInput("github_token") || process.env.GITHUB_TOKEN;
    info(`Value of github_token: ${this.githubToken ? "[SET]" : "[NOT SET]"}`);
    if (!this.githubToken) {
      throw new Error(
        "GITHUB_TOKEN is not set. Please provide it as an input 'github_token' or environment variable 'GITHUB_TOKEN'",
      );
    }

    this.llmModel = process.env.LLM_MODEL || getInput("llm_model");
    if (!this.llmModel?.length) {
      throw new Error("LLM_MODEL is not set");
    }

    this.llmProvider = process.env.LLM_PROVIDER || getInput("llm_provider");
    if (!this.llmProvider?.length) {
      this.llmProvider = AIProviderType.AI_SDK;
      console.log(`Using default LLM_PROVIDER '${this.llmProvider}'`);
    }

    this.llmApiKey = process.env.LLM_API_KEY;
    const isSapAiSdk = this.llmProvider === AIProviderType.SAP_AI_SDK;
    // SAP AI SDK does not require an API key
    if (!this.llmApiKey && !isSapAiSdk) {
      throw new Error("LLM_API_KEY is not set");
    }

    // SAP AI Core configuration
    this.sapAiCoreClientId = process.env.SAP_AI_CORE_CLIENT_ID;
    this.sapAiCoreClientSecret = process.env.SAP_AI_CORE_CLIENT_SECRET;
    this.sapAiCoreTokenUrl = process.env.SAP_AI_CORE_TOKEN_URL;
    this.sapAiCoreBaseUrl = process.env.SAP_AI_CORE_BASE_URL;
    this.sapAiResourceGroup = process.env.SAP_AI_RESOURCE_GROUP;

    const isVertexAi = this.llmProvider === AIProviderType.VERTEX_AI;
    this.gcpProjectId =
      process.env.GCP_PROJECT_ID || getInput("gcp_project_id");
    this.gcpLocation = process.env.GCP_LOCATION || getInput("gcp_location");

    if (
      isSapAiSdk &&
      (!this.sapAiCoreClientId ||
        !this.sapAiCoreClientSecret ||
        !this.sapAiCoreTokenUrl ||
        !this.sapAiCoreBaseUrl)
    ) {
      throw new Error(
        "SAP AI Core configuration is not set. Please set SAP_AI_CORE_CLIENT_ID, SAP_AI_CORE_CLIENT_SECRET, SAP_AI_CORE_TOKEN_URL, and SAP_AI_CORE_BASE_URL.",
      );
    } else if (isVertexAi && (!this.gcpProjectId || !this.gcpLocation)) {
      throw new Error(
        "Vertex AI configuration is not set. Please set GCP_PROJECT_ID and GCP_LOCATION.",
      );
    }

    // GitHub Enterprise Server support
    this.githubApiUrl =
      process.env.GITHUB_API_URL ||
      getInput("github_api_url") ||
      "https://api.github.com";
    this.githubServerUrl =
      process.env.GITHUB_SERVER_URL ||
      getInput("github_server_url") ||
      "https://github.com";

    if (!process.env.DEBUG) {
      return;
    }
    console.log("[debug] loading extra inputs from .env");

    this.styleGuideRules = process.env.STYLE_GUIDE_RULES;
    this.language = process.env.LANGUAGE || getInput("language");
  }

  public loadInputs() {
    if (process.env.DEBUG) {
      console.log("[debug] skip loading inputs");
      return;
    }

    // Custom style guide rules
    try {
      const styleGuideRules = getMultilineInput("style_guide_rules") || [];
      if (
        Array.isArray(styleGuideRules) &&
        styleGuideRules.length &&
        styleGuideRules[0].trim().length
      ) {
        this.styleGuideRules = styleGuideRules.join("\n");
      }
    } catch (e) {
      console.error("Error loading style guide rules:", e);
    }
  }
}

// For testing, we'll modify how the config instance is created
// This prevents the automatic loading when the module is imported
let configInstance: Config | null = null;

// If not in test environment, create and configure the instance
if (process.env.NODE_ENV !== "test") {
  configInstance = new Config();
  configInstance.loadInputs();
}

// Export the instance or a function to create one for tests
export default process.env.NODE_ENV === "test"
  ? {
      // Default values for tests
      githubToken: "mock-token",
      llmApiKey: "mock-api-key",
      llmModel: "mock-model",
      llmProvider: "mock-provider",
      styleGuideRules: "",
      sapAiCoreClientId: "mock-client-id",
      sapAiCoreClientSecret: "mock-client-secret",
      sapAiCoreTokenUrl: "mock-token-url",
      sapAiCoreBaseUrl: "mock-base-url",
      sapAiResourceGroup: "default",
      githubApiUrl: "https://api.github.com",
      githubServerUrl: "https://github.com",
      gcpProjectId: "mock-project-id",
      gcpLocation: "mock-location",
      language: "en",
      loadInputs: jest.fn(),
    }
  : configInstance!;
